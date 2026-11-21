"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "../../lib/access";
import { db } from "../../lib/db";
import { fulfillmentPermissions, FulfillmentError, packableOrders } from "../../lib/fulfillment";
import { handOffOrder } from "../../lib/handoff";
import type { ActionState } from "../fulfillment-form";

async function save(work: () => Promise<void>): Promise<ActionState> {
  try {
    await work();
  } catch (error) {
    if (error instanceof FulfillmentError) return { error: error.message, field: error.field };
    console.error(error);
    return { error: "Speichern war gerade nicht möglich. Bitte versuche es erneut." };
  }
  for (const path of ["/", "/bestellungen", "/packen", "/abwicklung"]) revalidatePath(path);
  return {};
}

export async function markPacked(id: number, _previous: ActionState, _form: FormData) {
  await requireRole("packer");
  return save(async () => {
    const result = await db.privateOrder.updateMany({
      where: { id, ...packableOrders, packedAt: null },
      data: { packedAt: new Date() },
    });
    if (!result.count) throw new FulfillmentError("Dieser Packauftrag ist bereits bearbeitet oder nicht mehr freigegeben.");
  });
}

type OwnerCommand = "payment" | "label" | "startBicycle" | "handOff";

export async function updateFulfillment(id: number, command: OwnerCommand, _previous: ActionState, form: FormData) {
  await requireRole("owner");
  if (command === "handOff") return save(() => handOffOrder(db, id, form));
  return save(() => db.$transaction(async tx => {
    const order = await tx.privateOrder.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!order?.confirmedAt) throw new FulfillmentError("Diese Bestellung ist noch nicht bestätigt.");
    const now = new Date();
    const permissions = fulfillmentPermissions(order);

    switch (command) {
      case "payment":
        if (form.get("received") !== "yes") throw new FulfillmentError("Bitte bestätige den tatsächlichen Zahlungseingang.");
        if (permissions.paid) return;
        await tx.payment.upsert({
          where: { orderId: id },
          update: { status: "paid", paidAt: now },
          create: { orderId: id, method: "unspecified", status: "paid", paidAt: now },
        });
        return;
      case "label":
        if (order.delivery !== "dhl" || order.handedOffAt) throw new FulfillmentError("Für diese Bestellung kann kein DHL-Etikett bereitgelegt werden.");
        if (order.labelReadyAt) return;
        await tx.privateOrder.update({ where: { id }, data: { labelReadyAt: now } });
        return;
      case "startBicycle":
        if (order.delivery !== "bicycle" || !permissions.canHandOff) {
          throw new FulfillmentError("Die Fahrradlieferung kann noch nicht beginnen.");
        }
        if (order.bicycleStartedAt) return;
        await tx.privateOrder.update({ where: { id }, data: { bicycleStartedAt: now } });
        return;
    }
  }));
}
