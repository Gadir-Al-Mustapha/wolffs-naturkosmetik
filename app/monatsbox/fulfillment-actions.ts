"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "../../lib/access";
import { db } from "../../lib/db";
import { availableBoxCredit, berlinMonth, boxDue, readBoxCredit } from "../../lib/monthly-box";
import { allocateOrderLines, OrderError } from "../../lib/order-allocation";
import { deliveries } from "../../lib/orders";

function refreshBoxViews() {
  for (const path of ["/", "/monatsbox", "/bestellungen", "/abwicklung", "/packen"]) revalidatePath(path);
}

export async function prepareBox(boxId: number, month: number, revision: string | null, form: FormData) {
  await requireRole("owner");
  const delivery = String(form.get("delivery"));
  if (!Object.hasOwn(deliveries, delivery)) return { error: "Bitte wähle eine Übergabeart." };

  let orderId: number;
  try {
    orderId = await db.$transaction(async tx => {
      const box = await tx.monthlyBox.findUnique({
        where: { id: boxId },
        include: { customer: true, products: { orderBy: { id: "asc" } }, pauses: true, runs: { include: { order: true } } },
      });
      const run = box?.runs.find(run => run.month === month);
      const current = run?.order;
      if (!box || run?.failureReason || current?.cancelledAt ||
          (!current && (month !== berlinMonth(new Date()) || !boxDue(box.activatedAt, box.pauses, month)))) {
        throw new OrderError("Diese Monatsbox ist nicht zur Vorbereitung verfügbar.");
      }
      if (current && (current.confirmedAt || current.token !== revision)) return current.id;
      if (box.products.length !== 4) throw new OrderError("Für die Box werden vier Produkte benötigt.");

      const quantities = new Map(box.products.map(product => [product.id, 1]));
      const unitPrices = new Map(box.products.map((product, index) => [
        product.id, Math.floor(box.priceCent / 4) + Number(index < box.priceCent % 4),
      ]));
      const lines = await allocateOrderLines(tx, quantities, product => unitPrices.get(product.id)!, current?.id);
      const appliedCent = Math.min(box.priceCent, availableBoxCredit(box.runs, month));
      const data = {
        customerId: box.customerId, loyal: box.customer.loyal, delivery, token: randomUUID(),
        subtotal: box.priceCent, loyaltyDiscount: 0, promotionDiscount: 0, shipping: 0,
        total: box.priceCent - appliedCent, lines: { create: lines },
      };
      if (current) await tx.orderLine.deleteMany({ where: { orderId: current.id } });
      const order = current
        ? await tx.privateOrder.update({ where: { id: current.id }, data })
        : await tx.privateOrder.create({ data });
      await tx.monthlyBoxRun.upsert({
        where: { boxId_month: { boxId, month } },
        create: { boxId, month, orderId: order.id, appliedCent },
        update: { appliedCent },
      });
      return order.id;
    });
  } catch (error) {
    if (error instanceof OrderError) return { error: error.message };
    console.error(error);
    return { error: "Die Box konnte gerade nicht gespeichert werden. Bitte versuche es erneut." };
  }
  refreshBoxViews();
  redirect(`/bestellungen?auftrag=${orderId}`);
}

export async function recordBoxFailure(boxId: number, month: number, form: FormData) {
  await requireRole("owner");
  const reason = String(form.get("reason") ?? "").trim();
  const creditCent = readBoxCredit(String(form.get("credit") ?? "").trim());
  if (!reason || reason.length > 1000) return { error: "Bitte beschreibe den Ausfall in höchstens 1.000 Zeichen.", field: "reason" };
  if (creditCent === null) return { error: "Bitte gib einen Betrag zwischen 0,01 € und 39,00 € ein.", field: "credit" };

  try {
    await db.$transaction(async tx => {
      const box = await tx.monthlyBox.findUnique({
        where: { id: boxId }, include: { pauses: true, runs: { where: { month }, include: { order: true } } },
      });
      const run = box?.runs[0];
      if (run?.failureReason) return;
      if (!box || run?.order?.handedOffAt ||
          (!run && (month !== berlinMonth(new Date()) || !boxDue(box.activatedAt, box.pauses, month)))) {
        throw new OrderError("Für diese Box kann kein Ausfall erfasst werden.");
      }
      if (run?.order && !run.order.cancelledAt) {
        await tx.privateOrder.update({ where: { id: run.order.id }, data: { cancelledAt: new Date() } });
      }
      await tx.monthlyBoxRun.upsert({
        where: { boxId_month: { boxId, month } },
        create: { boxId, month, failureReason: reason, creditCent },
        update: { failureReason: reason, creditCent },
      });
    });
  } catch (error) {
    if (error instanceof OrderError) return { error: error.message };
    console.error(error);
    return { error: "Der Ausfall konnte gerade nicht gespeichert werden. Bitte versuche es erneut." };
  }
  refreshBoxViews();
  return { success: "Ausfall erfasst und Gutschrift angelegt." };
}
