import { isCalendarDate } from "./inventory.ts";

export const packableOrders = {
  confirmedAt: { not: null },
  handedOffAt: null,
  OR: [{ loyal: true }, { partnerDiscountPercent: { not: null } }, { payment: { status: "paid" } }],
  AND: [{ OR: [{ delivery: { not: "dhl" } }, { labelReadyAt: { not: null } }] }],
};

type FulfillmentOrder = {
  confirmedAt: Date | null;
  handedOffAt: Date | null;
  packedAt: Date | null;
  labelReadyAt: Date | null;
  bicycleStartedAt: Date | null;
  delivery: string;
  loyal: boolean;
  partnerDiscountPercent: number | null;
  payment: { status: string } | null;
};

export function fulfillmentPermissions(order: FulfillmentOrder) {
  const active = !!order.confirmedAt && !order.handedOffAt;
  const paid = order.payment?.status === "paid";
  const partner = order.partnerDiscountPercent !== null;
  return {
    paid,
    canPack: active && (paid || partner || order.loyal) && (order.delivery !== "dhl" || !!order.labelReadyAt),
    canHandOff: active && !!order.packedAt && (paid || partner) && (order.delivery !== "dhl" || !!order.labelReadyAt),
  };
}

export class FulfillmentError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}

export function handoffDetails(order: FulfillmentOrder, input: string, today: string) {
  if (!fulfillmentPermissions(order).canHandOff) {
    throw new FulfillmentError("Die Übergabe ist erst nach dem Packen und mit gültiger Zahlungsfreigabe möglich.");
  }
  switch (order.delivery) {
    case "dhl":
      if (!/^[A-Za-z0-9-]{1,64}$/.test(input)) {
        throw new FulfillmentError("Bitte gib eine gültige Trackingnummer ein.", "tracking");
      }
      return { trackingNumber: input };
    case "pickup":
      if (!isCalendarDate(input) || input > today) {
        throw new FulfillmentError("Bitte gib das tatsächliche Übergabedatum ein. Es darf nicht in der Zukunft liegen.", "pickupOn");
      }
      return { pickupOn: input };
    case "bicycle":
      if (!order.bicycleStartedAt) throw new FulfillmentError("Bitte markiere die Fahrradlieferung zuerst als unterwegs.");
      return {};
    default:
      throw new FulfillmentError("Die Übergabeart ist unbekannt.");
  }
}

export function batchDebits(allocations: { batchId: number; quantity: number }[]) {
  const quantities = new Map<number, number>();
  for (const { batchId, quantity } of allocations) {
    quantities.set(batchId, (quantities.get(batchId) ?? 0) + quantity);
  }
  return quantities;
}
