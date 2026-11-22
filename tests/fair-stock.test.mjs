import assert from "node:assert/strict";
import { test } from "node:test";
import { proposeFairStock, readFairQuantity } from "../lib/fair-stock.ts";

const batches = [
  { id: 1, bestBefore: "2027-03-01", quantity: 6, allocations: [] },
  { id: 2, bestBefore: "2027-02-01", quantity: 5, allocations: [{ quantity: 3 }] },
  { id: 3, bestBefore: "2027-01-01", quantity: 9, allocations: [] },
];

test("BR4: Messeware nach frühestem MHD über mehrere freie Chargen verteilen", () => {
  const stock = proposeFairStock(batches, 4, "2027-02-01");
  assert.deepEqual(stock.map(({ batch, quantity }) => [batch.id, quantity]), [[2, 2], [1, 2]]);
  assert.equal(stock[0].batch.status, "Restposten");
  assert.equal(batches[1].quantity, 5);
});

test("BR4: Reservierter und bis zur Messe abgelaufener Bestand bleibt außen vor", () => {
  assert.equal(proposeFairStock(batches, 9, "2027-02-01"), null);
  assert.deepEqual(
    proposeFairStock(batches, 6, "2027-02-02").map(({ batch, quantity }) => [batch.id, quantity]),
    [[1, 6]],
  );
});

test("F-008: Rückgabe je Charge ist eine Pflichtangabe zwischen null und der Mitnahmemenge", () => {
  assert.equal(readFairQuantity("0", 2), 0);
  assert.equal(readFairQuantity("2", 2), 2);
  for (const value of [null, "", "-1", "3", "1.5", "1e0", " 1", "2147483648"]) {
    assert.equal(readFairQuantity(value, 2), null);
  }
  assert.equal(readFairQuantity("2147483648"), null);
});
