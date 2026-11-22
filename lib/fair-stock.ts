import { allocate, availableBatches } from "./orders.ts";

type FairBatch = {
  id: number;
  bestBefore: string;
  quantity: number;
  allocations: { quantity: number }[];
};

export function proposeFairStock<T extends FairBatch>(batches: T[], quantity: number, useDate: string) {
  return allocate(availableBatches(batches), quantity, useDate);
}

export function readFairQuantity(value: FormDataEntryValue | null, maximum = 2_147_483_647) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity <= maximum ? quantity : null;
}
