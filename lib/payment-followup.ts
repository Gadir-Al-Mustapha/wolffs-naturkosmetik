import type { PrismaClient } from "../generated/prisma/client.ts";
import { todayInBerlin } from "./inventory.ts";
import { euros } from "./orders.ts";

import { reminderDelivery } from "./message-delivery.ts";
import { paymentFollowup } from "./payment-deadlines.ts";

export { paymentFollowup } from "./payment-deadlines.ts";

export async function runPaymentFollowup(db: PrismaClient, now = new Date(), env = process.env) {
  const today = todayInBerlin(now);
  const unpaidPrivate = {
    confirmedAt: { not: null },
    cancelledAt: null,
    partnerDiscountPercent: null,
    OR: [{ payment: null }, { payment: { status: { not: "paid" } } }],
  };
  await db.$transaction(async tx => {
    const orders = await tx.privateOrder.findMany({
      where: unpaidPrivate,
      include: {
        payment: true,
        reminder: { select: { orderId: true } },
        outgoingMessages: { select: { kind: true, recipient: true } },
      },
    });
    for (const order of orders) {
      const followup = paymentFollowup(order, today);
      if (followup === "cancel") {
        await tx.privateOrder.updateMany({
          where: { ...unpaidPrivate, id: order.id, handedOffAt: null },
          data: { cancelledAt: now },
        });
      } else if (followup === "remind" && !order.reminder &&
          !order.outgoingMessages.some(message => message.kind === "payment-reminder")) {
        const confirmation = order.outgoingMessages.find(message => message.kind === "order-confirmation");
        const body = `Hallo! Für deine Bestellung #${order.id} sind noch ${euros(order.total)} offen. Bitte prüfe, ob du die Zahlung bereits veranlasst hast. Vielen Dank!`;
        await tx.outgoingMessage.create({
          data: {
            ...reminderDelivery(confirmation?.recipient ?? "", body, order.id, env),
            orderId: order.id,
            nextAttempt: now,
          },
        });
      }
    }
  });
}
