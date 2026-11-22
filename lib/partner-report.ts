import type { PrismaClient } from "../generated/prisma/client";
import { isCalendarDate, todayInBerlin } from "./inventory.ts";

type DateInput = string | string[] | undefined;

export function partnerReportPeriod(query: { von?: DateInput; bis?: DateInput }, today: string) {
  const defaultPeriod = query.von === undefined && query.bis === undefined;
  const from = defaultPeriod ? today.slice(0, 7) + "-01" : query.von;
  const to = defaultPeriod ? today : query.bis;
  const errors: { from?: string; to?: string } = {};
  if (typeof from !== "string" || !isCalendarDate(from) || from.startsWith("0000-")) {
    errors.from = "Bitte gib ein gültiges Startdatum ein.";
  }
  if (typeof to !== "string" || !isCalendarDate(to) || to.startsWith("0000-")) {
    errors.to = "Bitte gib ein gültiges Enddatum ein.";
  }
  if (typeof from === "string" && typeof to === "string" && !errors.from && !errors.to && from > to) {
    errors.to = "Das Enddatum muss am oder nach dem Startdatum liegen.";
  }
  return { from: typeof from === "string" ? from : "", to: typeof to === "string" ? to : "", errors };
}

export async function loadPartnerReport(db: PrismaClient, from: string, to: string) {
  // Bound the query in UTC, then check Berlin calendar dates on both edges.
  const earliest = new Date(from + "T00:00:00Z");
  earliest.setUTCDate(earliest.getUTCDate() - 1);
  const latest = new Date(to + "T00:00:00Z");
  latest.setUTCDate(latest.getUTCDate() + 1);
  const orders = await db.privateOrder.findMany({
    where: {
      partnerDiscountPercent: { not: null },
      cancelledAt: null,
      confirmedAt: { gte: earliest, lt: latest },
    },
    orderBy: [{ confirmedAt: "desc" }, { id: "desc" }],
    select: {
      id: true, confirmedAt: true, total: true,
      customer: { select: { name: true } },
      lines: { select: { quantity: true } },
      payment: { select: { status: true, dueOn: true, paidAt: true } },
    },
  });
  const rows = orders.flatMap(order => {
    if (!order.confirmedAt) return [];
    const confirmedOn = todayInBerlin(order.confirmedAt);
    if (confirmedOn < from || confirmedOn > to) return [];
    return [{
      id: order.id,
      confirmedOn,
      partner: order.customer.name,
      quantity: order.lines.reduce((sum, line) => sum + line.quantity, 0),
      total: order.total,
      payment: order.payment,
    }];
  });
  const totals = rows.reduce((sum, row) => ({
    quantity: sum.quantity + row.quantity,
    value: sum.value + row.total,
    open: sum.open + (row.payment?.status === "open" ? row.total : 0),
  }), { quantity: 0, value: 0, open: 0 });
  return { rows, totals };
}
