import { inventoryFor } from "./inventory.ts";

export const deliveries = {
  dhl: "DHL",
  pickup: "Persönliche Übergabe",
  bicycle: "Fahrradlieferung",
};

export const euros = (cents: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);

export function promotionCode(value: string) {
  const code = value.trim().toUpperCase();
  if (code && !/^[A-Z0-9_-]{1,40}$/.test(code)) {
    throw new Error("Bitte gib genau einen gültigen Aktionscode ein.");
  }
  return code;
}

export function orderPrices(
  subtotal: number,
  loyal: boolean,
  delivery: keyof typeof deliveries,
  promotion?: { percent: number; combinable: boolean } | null,
  partner = false,
) {
  const loyaltyDiscount = loyal ? Math.round(subtotal / 10) : 0;
  const promotionDiscount = promotion && (!loyal || promotion.combinable)
    ? Math.round((subtotal - loyaltyDiscount) * promotion.percent / 100)
    : 0;
  const merchandise = subtotal - loyaltyDiscount - promotionDiscount;
  const shipping = delivery === "dhl" && !partner && !loyal && merchandise < 3900 ? 390 : 0;
  return { subtotal, loyaltyDiscount, promotionDiscount, shipping, total: merchandise + shipping };
}

export function availableBatches<T extends { quantity: number; allocations: { quantity: number }[] }>(batches: T[]) {
  return batches.map(batch => ({
    ...batch,
    quantity: batch.quantity - batch.allocations.reduce((sum, allocation) => sum + allocation.quantity, 0),
  }));
}

export function allocate<T extends { id: number; bestBefore: string; quantity: number }>(
  batches: T[], quantity: number, today: string,
) {
  const { entries, available } = inventoryFor(batches, today);
  if (quantity > available) return null;
  const allocations = [];
  for (const batch of entries) {
    if (!quantity) break;
    if (batch.status === "Abgelaufen" || batch.quantity <= 0) continue;
    const amount = Math.min(quantity, batch.quantity);
    allocations.push({ batch, quantity: amount });
    quantity -= amount;
  }
  return allocations;
}

export type IngredientInfo = { name: string; isAllergen: boolean; note: string | null };

export function needsConfirmation(allocation: { ingredients: unknown; confirmedAt: Date | null }) {
  return !allocation.confirmedAt && (allocation.ingredients as IngredientInfo[]).some(item => item.isAllergen);
}

export function partnerPriceApplies(
  quantities: Iterable<number>, reason: string, ownerAuthorized: boolean,
) {
  const units = Array.from(quantities).reduce((sum, quantity) => sum + quantity, 0);
  if (units >= 50) {
    if (reason) throw new Error("Ab 50 Stück gilt der Partnerpreis automatisch.");
    return true;
  }
  if (!reason) return false;
  if (!ownerAuthorized) throw new Error("Die Ausnahme benötigt die Freigabe der Inhaberin.");
  return true;
}

export function partnerUnitPrice(standardPrice: number, percent: number) {
  return Math.round(standardPrice * (100 - percent) / 100);
}

export function invoiceDueOn(confirmedOn: string) {
  const due = new Date(confirmedOn);
  due.setUTCDate(due.getUTCDate() + 30);
  return due.toISOString().slice(0, 10);
}
