import assert from "node:assert/strict";
import { test } from "node:test";
import { allocate, availableBatches, invoiceDueOn, needsConfirmation, orderPrices, partnerPriceApplies, partnerUnitPrice, promotionCode } from "../lib/orders.ts";

test("BR1: DHL compares discounted merchandise to the exact threshold", () => {
  const promotion = { percent: 20, combinable: true };
  assert.equal(orderPrices(4875, false, "dhl", promotion).shipping, 0);
  assert.equal(orderPrices(4874, false, "dhl", promotion).shipping, 390);
  assert.equal(orderPrices(2800, true, "dhl").total, 2520);
  assert.equal(orderPrices(2000, false, "bicycle").shipping, 0);
  assert.equal(orderPrices(2000, false, "pickup").shipping, 0);
});

test("BR2: loyalty precedes a combinable code and survives an incompatible code", () => {
  assert.deepEqual(orderPrices(2800, true, "dhl", { percent: 15, combinable: true }), {
    subtotal: 2800, loyaltyDiscount: 280, promotionDiscount: 378, shipping: 0, total: 2142,
  });
  assert.equal(orderPrices(2800, true, "dhl", { percent: 15, combinable: false }).total, 2520);
  assert.equal(orderPrices(2800, false, "pickup", { percent: 15, combinable: false }).total, 2380);
  assert.equal(promotionCode(" herbst-15 "), "HERBST-15");
  assert.throws(() => promotionCode("HERBST-15 SOMMER"), /genau einen/);
  assert.throws(() => promotionCode("HERBST-15,SOMMER"), /genau einen/);
});

test("BR4: split by earliest MHD, counting only free and unexpired pieces", () => {
  const batches = [
    { id: 1, manufacturedOn: "2026-02-01", bestBefore: "2026-12-31", quantity: 5, allocations: [] },
    { id: 2, manufacturedOn: "2026-04-01", bestBefore: "2026-11-18", quantity: 4, allocations: [{ quantity: 2 }] },
    { id: 3, manufacturedOn: "2026-01-01", bestBefore: "2026-11-17", quantity: 10, allocations: [] },
  ];
  const today = "2026-11-18";
  const free = availableBatches(batches);
  assert.deepEqual(allocate(free, 4, today).map(({ batch, quantity }) => [batch.id, quantity]), [[2, 2], [1, 2]]);
  assert.equal(allocate(free, 8, today), null);
  assert.equal(allocate(availableBatches([{ ...batches[1], allocations: [] }]), 4, today)[0].quantity, 4);
});

test("BR5: confirmation is required individually for allergenic allocations", () => {
  const allergic = { ingredients: [{ name: "Duftstoff A", isAllergen: true }], confirmedAt: null };
  const safe = { ingredients: [{ name: "Öl B", isAllergen: false }], confirmedAt: null };
  assert.equal(needsConfirmation(safe), false);
  assert.equal(needsConfirmation(allergic), true);
  assert.equal(needsConfirmation({ ...allergic, confirmedAt: new Date() }), false);
  assert.equal(needsConfirmation({ ...allergic, confirmedAt: null }), true);
});

test("BR1: partner DHL is free even below 39 euros and the 50-unit threshold", () => {
  assert.equal(partnerPriceApplies([20, 29], "", false), false);
  for (const delivery of ["dhl", "bicycle", "pickup"]) {
    assert.equal(orderPrices(3000, false, delivery, null, true).shipping, 0);
  }
});

test("BR3: aggregate all lines and require owner approval with a reason for exceptions", () => {
  assert.equal(partnerPriceApplies([20, 29], "", false), false);
  assert.equal(partnerPriceApplies([20, 30], "", false), true);
  assert.equal(partnerPriceApplies([30], "", true), false);
  assert.throws(() => partnerPriceApplies([30], "Kulanz", false), /Freigabe/);
  assert.equal(partnerPriceApplies([30], "Kulanz", true), true);
  assert.throws(() => partnerPriceApplies([50], "Kulanz", true), /automatisch/);
  assert.equal(partnerUnitPrice(1199, 15), 1019);
  assert.equal(invoiceDueOn("2026-10-20"), "2026-11-19");
  assert.equal(invoiceDueOn("2026-12-20"), "2027-01-19");
});
