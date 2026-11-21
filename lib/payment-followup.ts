import type { PrismaClient } from "../generated/prisma/client.ts";
import { todayInBerlin } from "./inventory.ts";
import { euros, invoiceDueOn } from "./orders.ts";

type PaymentOrder = {
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  handedOffAt: Date | null;
  loyal: boolean;
  partnerDiscountPercent: number | null;
  payment: { status: string; dueOn: string | null } | null;
};

export function paymentFollowup(order: PaymentOrder, today: string) {
  if (!order.confirmedAt || order.cancelledAt || order.payment?.status === "paid") return null;
  const confirmedOn = todayInBerlin(order.confirmedAt);
  if (order.partnerDiscountPercent !== null) {
    const dueOn = order.payment?.dueOn ?? invoiceDueOn(confirmedOn);
    return today > dueOn ? "invoiceOverdue" : null;
  }
  const days = (Date.parse(today) - Date.parse(confirmedOn)) / 86_400_000;
  if (days >= (order.loyal ? 10 : 7)) return order.handedOffAt ? "deliveredDebt" : "cancel";
  return days >= (order.loyal ? 5 : 3) ? "remind" : null;
}

export async function runPaymentFollowup(db: PrismaClient, now = new Date()) {
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
      include: { payment: true, reminder: { select: { orderId: true } } },
    });
    for (const order of orders) {
      const followup = paymentFollowup(order, today);
      if (followup === "cancel") {
        await tx.privateOrder.updateMany({
          where: { ...unpaidPrivate, id: order.id, handedOffAt: null },
          data: { cancelledAt: now },
        });
      } else if (followup === "remind" && !order.reminder) {
        await tx.testPaymentReminder.create({
          data: {
            orderId: order.id,
            createdAt: now,
            body: `Hallo! Für deine Bestellung #${order.id} sind noch ${euros(order.total)} offen. Bitte prüfe, ob du die Zahlung bereits veranlasst hast. Vielen Dank!`,
          },
        });
      }
    }
  });
}
