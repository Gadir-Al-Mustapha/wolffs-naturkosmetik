import type { PrismaClient } from "../generated/prisma/client.ts";
import { batchDebits, FulfillmentError, handoffDetails } from "./fulfillment.ts";
import { todayInBerlin } from "./inventory.ts";

export async function handOffOrder(db: PrismaClient, id: number, form: FormData, now = new Date()) {
  await db.$transaction(async tx => {
    const order = await tx.privateOrder.findUnique({
      where: { id },
      include: { payment: true, lines: { select: { allocations: { select: { batchId: true, quantity: true } } } } },
    });
    if (!order) throw new FulfillmentError("Diese Bestellung ist nicht verfügbar.");
    if (order.handedOffAt) return;
    const value = form.get(order.delivery === "dhl" ? "tracking" : "pickupOn");
    const details = handoffDetails(order, typeof value === "string" ? value.trim() : "", todayInBerlin(now));
    const result = await tx.privateOrder.updateMany({
      where: { id, handedOffAt: null },
      data: { ...details, handedOffAt: now },
    });
    if (!result.count) return;
    const debits = batchDebits(order.lines.flatMap(line => line.allocations));
    for (const [batchId, quantity] of debits) {
      const updated = await tx.batch.updateMany({
        where: { id: batchId, quantity: { gte: quantity } },
        data: { quantity: { decrement: quantity } },
      });
      if (!updated.count) throw new FulfillmentError(`Für Charge #${batchId} reicht der Bestand nicht aus.`);
    }
  });
}
