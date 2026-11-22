import { todayInBerlin } from "./inventory.ts";
import { invoiceDueOn } from "./orders.ts";

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
