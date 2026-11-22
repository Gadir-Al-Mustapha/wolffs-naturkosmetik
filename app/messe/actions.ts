"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "../../lib/access";
import { db } from "../../lib/db";
import { readFairQuantity } from "../../lib/fair-stock";
import { fairProposal, fairRequests } from "../../lib/fairs";
import { isCalendarDate } from "../../lib/inventory";

export type FairFormState = { error?: string; field?: string };

class FairError extends Error {
  constructor(message: string, readonly field?: string) {
    super(message);
  }
}

function refreshStock() {
  for (const path of ["/messe", "/", "/bestellungen", "/monatsbox"]) revalidatePath(path);
}

export async function saveFair(id: number | null, _previous: FairFormState, form: FormData): Promise<FairFormState> {
  await requireRole("owner");
  const name = String(form.get("name") ?? "").trim();
  const eventDate = String(form.get("eventDate") ?? "");
  if (!name || name.length > 100) return { error: "Gib einen Namen mit bis zu 100 Zeichen ein.", field: "name" };
  if (!isCalendarDate(eventDate)) return { error: "Gib ein gültiges Messedatum ein.", field: "eventDate" };

  try {
    const fairId = await db.$transaction(async tx => {
      const requests = [];
      const products = await tx.product.findMany({ select: { id: true } });
      for (const { id: productId } of products) {
        const field = `product-${productId}`;
        const raw = form.get(field);
        if (raw === null || raw === "") continue;
        const quantity = readFairQuantity(raw);
        if (quantity === null) throw new FairError("Gib eine gültige ganze Stückzahl ein.", field);
        if (quantity > 0) requests.push({ productId, quantity });
      }
      if (!requests.length) throw new FairError("Gib für mindestens ein Produkt eine Stückzahl ein.");
      if (id === null) {
        return (await tx.fair.create({ data: { name, eventDate, requests: { create: requests } } })).id;
      }
      const updated = await tx.fair.updateMany({ where: { id, dispatchedAt: null }, data: { name, eventDate } });
      if (!updated.count) throw new FairError("Die Mitnahme wurde bereits gebucht.");
      await tx.fairRequest.deleteMany({ where: { fairId: id } });
      await tx.fairRequest.createMany({ data: requests.map(request => ({ fairId: id, ...request })) });
      return id;
    });
    revalidatePath("/messe");
    redirect(`/messe?messe=${fairId}`);
  } catch (error) {
    if (error instanceof FairError) return { error: error.message, field: error.field };
    throw error;
  }
}

export async function dispatchFair(id: number, _previous: FairFormState, form: FormData): Promise<FairFormState> {
  await requireRole("owner");
  try {
    await db.$transaction(async tx => {
      const claimed = await tx.fair.updateMany({ where: { id, dispatchedAt: null }, data: { dispatchedAt: new Date() } });
      if (!claimed.count) throw new FairError("Die Mitnahme wurde bereits gebucht.");

      const fair = await tx.fair.findUniqueOrThrow({ where: { id }, include: { requests: fairRequests } });
      const stock = fairProposal(fair.requests, fair.eventDate).flatMap(({ product, assignments }) => {
        if (!assignments) throw new FairError(`Für „${product.name}“ ist inzwischen zu wenig Ware verfügbar.`);
        return assignments.map(({ batch, quantity }) => ({ fairId: id, batchId: batch.id, taken: quantity }));
      });
      if (!stock.length || JSON.stringify(stock) !== form.get("proposal")) {
        throw new FairError("Die Chargenauswahl hat sich geändert. Prüfe den aktualisierten Vorschlag.");
      }
      for (const { batchId, taken } of stock) {
        await tx.batch.update({ where: { id: batchId }, data: { quantity: { decrement: taken } } });
      }
      await tx.fairStock.createMany({ data: stock });
    });
    refreshStock();
    return {};
  } catch (error) {
    if (error instanceof FairError) {
      revalidatePath("/messe");
      return { error: error.message };
    }
    throw error;
  }
}

export async function closeFair(id: number, _previous: FairFormState, form: FormData): Promise<FairFormState> {
  await requireRole("owner");
  try {
    await db.$transaction(async tx => {
      const claimed = await tx.fair.updateMany({
        where: { id, dispatchedAt: { not: null }, closedAt: null }, data: { closedAt: new Date() },
      });
      if (!claimed.count) throw new FairError("Die Messe kann nicht erneut abgerechnet werden.");
      const stock = await tx.fairStock.findMany({ where: { fairId: id } });
      const returns = stock.map(({ batchId, taken }) => {
        const field = `batch-${batchId}`;
        const returned = readFairQuantity(form.get(field), taken);
        if (returned === null) throw new FairError(`Gib eine ganze Stückzahl von 0 bis ${taken} ein.`, field);
        return { batchId, returned };
      });
      for (const { batchId, returned } of returns) {
        await tx.fairStock.update({ where: { fairId_batchId: { fairId: id, batchId } }, data: { returned } });
        if (returned > 0) {
          await tx.batch.update({ where: { id: batchId }, data: { quantity: { increment: returned } } });
        }
      }
    });
    refreshStock();
    return {};
  } catch (error) {
    if (error instanceof FairError) return { error: error.message, field: error.field };
    throw error;
  }
}
