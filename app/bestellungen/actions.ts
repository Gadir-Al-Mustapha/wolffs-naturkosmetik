"use server";

import { reservingOrders } from "../../lib/fulfillment";
import { requireRole } from "../../lib/access";
import { matchesSecret } from "../../lib/session";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { todayInBerlin } from "../../lib/inventory";
import { allocate, availableBatches, deliveries, euros, invoiceDueOn, needsConfirmation, orderPrices, partnerPriceApplies, partnerUnitPrice, promotionCode } from "../../lib/orders";

class OrderError extends Error {
  constructor(message: string, readonly field?: string) {
    super(message);
  }
}

const text = (form: FormData, field: string) => String(form.get(field) ?? "").trim();

function ownerAuthorized(candidate: FormDataEntryValue | null) {
  const secret = process.env.OWNER_APPROVAL_SECRET;
  return !!secret && typeof candidate === "string" && matchesSecret(candidate, secret);
}

async function runOrderAction(work: () => Promise<string | void>) {
  let destination: string | void;
  try {
    destination = await work();
  } catch (error) {
    if (error instanceof OrderError) return { error: error.message, field: error.field };
    console.error(error);
    return { error: "Speichern war gerade nicht möglich. Bitte versuche es erneut." };
  }
  revalidatePath("/");
  revalidatePath("/bestellungen");
  if (destination) redirect(destination);
  return { success: "Gespeichert." };
}

function readCode(form: FormData) {
  if (form.getAll("code").length > 1) throw new OrderError("Pro Bestellung ist nur ein Aktionscode möglich.", "code");
  try {
    return promotionCode(text(form, "code"));
  } catch (error) {
    if (error instanceof Error) throw new OrderError(error.message, "code");
    throw error;
  }
}

export async function savePromotion(form: FormData) {
  await requireRole("owner");
  return runOrderAction(async () => {
    const code = readCode(form);
    const percent = Number(text(form, "percent"));
    if (!code) throw new OrderError("Bitte gib einen Aktionscode ein.", "code");
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
      throw new OrderError("Bitte gib einen ganzen Prozentsatz von 1 bis 100 ein.", "percent");
    }
    const combinable = form.has("combinable");
    await db.promotion.upsert({ where: { code }, create: { code, percent, combinable }, update: { percent, combinable } });
  });
}

export async function saveOrder(id: number | null, revision: string, form: FormData) {
  await requireRole("owner");
  return runOrderAction(async () => {
    const code = readCode(form);
    const delivery = text(form, "delivery") as keyof typeof deliveries;
    if (!Object.hasOwn(deliveries, delivery)) throw new OrderError("Bitte wähle eine Übergabeart.", "delivery");
    const quantities = new Map<number, number>();
    for (const [field, value] of form) {
      if (!/^quantity-\d+$/.test(field) || value === "" || value === "0") continue;
      const productId = Number(field.slice(9));
      const quantity = Number(value);
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 2_147_483_647 || quantities.has(productId)) {
        throw new OrderError("Bitte gib pro Produkt eine gültige ganze Stückzahl ein.", "quantities");
      }
      quantities.set(productId, quantity);
    }
    if (!quantities.size) throw new OrderError("Bitte wähle mindestens ein Produkt.", "quantities");

    const orderId = await db.$transaction(async tx => {
      const current = await tx.privateOrder.findUnique({ where: { token: revision } });
      if (!id && current) return current.id;
      if (id && (current?.id !== id || current.confirmedAt)) {
        throw new OrderError("Dieser Entwurf wurde inzwischen geändert. Bitte lade ihn erneut.");
      }

      const customerId = Number(text(form, "customer"));
      const name = text(form, "name");
      if (!customerId && name.length > 120) throw new OrderError("Bitte kürze den Namen auf höchstens 120 Zeichen.", "customer");
      if (customerId && (!Number.isSafeInteger(customerId) || customerId < 1 || customerId > 2_147_483_647)) {
        throw new OrderError("Bitte wähle einen gültigen Kundeneintrag.", "customer");
      }
      const newPartner = !customerId && text(form, "customerType") === "partner";
      const percent = text(form, "partnerPercent");
      if (newPartner && (!/^\d{1,3}$/.test(percent) || Number(percent) > 100)) {
        throw new OrderError("Bitte gib einen ganzen Prozentsatz von 0 bis 100 ein.", "partnerPercent");
      }
      const customer = customerId
        ? await tx.customer.findUnique({ where: { id: customerId } })
        : name && await tx.customer.create({ data: { name, loyal: !newPartner && form.has("loyal"), partnerDiscountPercent: newPartner ? Number(percent) : null } });
      if (!customer) throw new OrderError("Bitte wähle eine Kundin oder gib einen Namen ein.", "customer");
      const partnerDiscountPercent = customer.partnerDiscountPercent;
      const partner = partnerDiscountPercent !== null;
      const partnerExceptionReason = text(form, "partnerExceptionReason");
      const approval = form.get("ownerApproval");
      if ((partnerExceptionReason || approval) && !partner) {
        throw new OrderError("Die Ausnahme ist nur für Wiederverkäufer vorgesehen.", "partnerExceptionReason");
      }
      if ((approval && !partnerExceptionReason) || partnerExceptionReason.length > 1000) {
        throw new OrderError("Bitte gib eine Begründung mit höchstens 1.000 Zeichen ein.", "partnerExceptionReason");
      }
      let partnerPriceApplied = false;
      if (partner) {
        if (code) throw new OrderError("Aktionscodes gelten für Privatbestellungen.", "code");
        try {
          partnerPriceApplied = partnerPriceApplies(quantities.values(), partnerExceptionReason, ownerAuthorized(approval));
        } catch (error) {
          if (error instanceof Error) throw new OrderError(error.message, "partnerExceptionReason");
          throw error;
        }
      }
      const promotion = code ? await tx.promotion.findUnique({ where: { code } }) : null;
      if (code && !promotion) throw new OrderError("Dieser Aktionscode ist unbekannt.", "code");

      const products = await tx.product.findMany({
        where: { id: { in: [...quantities.keys()] } },
        include: { batches: { include: {
          ingredients: { orderBy: { ingredientId: "asc" } },
          allocations: { where: { line: { orderId: { not: id ?? 0 }, order: reservingOrders } } },
        } } },
      });
      if (products.length !== quantities.size) throw new OrderError("Ein Produkt ist nicht mehr verfügbar.", "quantities");

      const today = todayInBerlin();
      const lines = products.map(product => {
        const quantity = quantities.get(product.id)!;
        const assignments = allocate(availableBatches(product.batches), quantity, today);
        if (!assignments) throw new OrderError(`Für „${product.name}“ sind weniger als ${quantity} Stück verfügbar.`, "quantities");
        return {
          productId: product.id, quantity,
          unitPrice: partnerPriceApplied
            ? partnerUnitPrice(product.standardPriceCent, partnerDiscountPercent!)
            : product.standardPriceCent,
          allocations: { create: assignments.map(({ batch, quantity }) => ({
            batchId: batch.id, quantity,
            ingredients: batch.ingredients.map(({ name, isAllergen, note }) => ({ name, isAllergen, note })),
          })) },
        };
      });
      const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
      if (!Number.isSafeInteger(subtotal) || subtotal > 2_147_483_257) {
        throw new OrderError("Der Bestellwert ist zu hoch.");
      }
      const prices = orderPrices(subtotal, customer.loyal, delivery, promotion, partner);
      const data = {
        ...prices, partnerDiscountPercent, partnerPriceApplied,
        partnerExceptionReason: partnerExceptionReason || null, delivery, customerId: customer.id, loyal: customer.loyal, code: code || null,
        token: id ? randomUUID() : revision,
        promotionExcluded: !!promotion && customer.loyal && !promotion.combinable,
      };
      if (!id) return (await tx.privateOrder.create({ data: { ...data, lines: { create: lines } } })).id;

      await tx.orderLine.deleteMany({ where: { orderId: id } });
      await tx.privateOrder.update({ where: { id }, data: { ...data, lines: { create: lines } } });
      return id;
    });
    return `/bestellungen?auftrag=${orderId}`;
  });
}

export async function discardOrder(id: number, token: string, _form: FormData) {
  await requireRole("owner");
  return runOrderAction(async () => {
    const deleted = await db.privateOrder.deleteMany({ where: { id, token, confirmedAt: null } });
    if (!deleted.count) throw new OrderError("Der Entwurf ist nicht mehr verfügbar.");
    return "/bestellungen";
  });
}

export async function acknowledge(token: string, form: FormData) {
  return runOrderAction(async () => {
    if (form.get("read") !== "yes") throw new OrderError("Bitte bestätige, dass du die Angaben gelesen hast.", "read");
    await db.$transaction(async tx => {
      const order = await tx.privateOrder.findUnique({
        where: { token }, include: { lines: { include: { allocations: true } } },
      });
      if (!order || order.confirmedAt) throw new OrderError("Dieser Bestätigungslink ist nicht mehr gültig.");
      const confirmedAt = new Date();
      for (const allocation of order.lines.flatMap(line => line.allocations).filter(needsConfirmation)) {
        const { lineId, batchId } = allocation;
        await tx.allocation.update({ where: { lineId_batchId: { lineId, batchId } }, data: { confirmedAt } });
      }
    });
    revalidatePath(`/allergene/${token}`);
  });
}

export async function finalizeOrder(id: number, token: string, _form: FormData) {
  await requireRole("owner");
  return runOrderAction(async () => {
    await db.$transaction(async tx => {
      const order = await tx.privateOrder.findUnique({
        where: { id },
        include: { customer: true, lines: { include: { product: true, allocations: { include: { batch: true } } } } },
      });
      if (!order || order.token !== token) throw new OrderError("Dieser Entwurf wurde inzwischen geändert.");
      if (order.confirmedAt) return;
      const allocations = order.lines.flatMap(line => line.allocations);
      if (allocations.some(needsConfirmation)) throw new OrderError("Die Allergenbestätigung fehlt noch.");
      const confirmedAt = new Date();
      const today = todayInBerlin(confirmedAt);
      if (allocations.some(({ batch }) => batch.bestBefore < today)) {
        throw new OrderError("Eine reservierte Charge ist abgelaufen. Bitte speichere die Zuteilung erneut.");
      }
      const dueOn = order.partnerDiscountPercent !== null ? invoiceDueOn(today) : null;
      const body = [
        `Bestellbestätigung #${id}`,
        `Hallo ${order.customer.name},`,
        "wir haben deine Bestellung bestätigt.",
        ...order.lines.map(line => `${line.quantity} × ${line.product.name} · ${euros(line.unitPrice)} je Stück`),
        `Warenwert: ${euros(order.subtotal)}`,
        ...(dueOn ? [`Zahlung auf Rechnung · Fällig am ${dueOn}`] : [
          `Treuerabatt: ${euros(order.loyaltyDiscount)}`,
          `Aktionsrabatt: ${euros(order.promotionDiscount)}`,
        ]),
        `Übergabe: ${deliveries[order.delivery]}`,
        `Versandkosten: ${euros(order.shipping)}`,
        `Gesamtbetrag: ${euros(order.total)}`,
      ].join("\n");
      await tx.privateOrder.update({
        where: { id },
        data: {
          confirmedAt, message: { create: { body } },
          payment: dueOn ? { create: { method: "invoice", status: "open", dueOn } } : undefined,
        },
      });
    });
    return `/bestellungen?auftrag=${id}#testpostfach`;
  });
}
