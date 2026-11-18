import assert from "node:assert/strict";
import test from "node:test";
import { batchIngredientEntries, inventoryFor, todayInBerlin } from "../lib/inventory.ts";

test("BR4: charges are shown by earliest MHD, independent of manufacturing date", () => {
  const { entries } = inventoryFor([
    { id: 1, manufacturedOn: "2026-10-01", bestBefore: "2027-01-01", quantity: 2 },
    { id: 2, manufacturedOn: "2026-11-01", bestBefore: "2026-12-01", quantity: 4 },
  ], "2026-11-18");
  assert.deepEqual(entries.map(({ id }) => id), [2, 1]);
});

test("BR4: day 29 is a restposten, day 30 is regular, expired units are excluded", () => {
  const { entries, available } = inventoryFor([
    { id: 1, bestBefore: "2026-11-17", quantity: 8 },
    { id: 2, bestBefore: "2026-11-18", quantity: 1 },
    { id: 3, bestBefore: "2026-12-17", quantity: 2 },
    { id: 4, bestBefore: "2026-12-18", quantity: 3 },
  ], "2026-11-18");
  assert.deepEqual(entries.map(({ status }) => status), ["Abgelaufen", "Restposten", "Restposten", "Regulär"]);
  assert.equal(available, 6);
  assert.equal(inventoryFor([], "2026-11-18").available, 0);
  assert.equal(todayInBerlin(new Date("2026-11-17T23:30:00Z")), "2026-11-18");
});

test("BR5: batches retain the actual ingredient and its own allergen information", () => {
  const base = { id: 1, name: "Sheabutter", isAllergen: false, note: null };
  const substitute = { id: 2, name: "Mandelöl", isAllergen: true, note: "Enthält Mandelöl." };
  const first = batchIngredientEntries([base]);
  const second = batchIngredientEntries([substitute]);

  substitute.note = "Aktualisierter Hinweis";
  assert.deepEqual(first, [{ ingredientId: 1, name: "Sheabutter", isAllergen: false, note: null }]);
  assert.deepEqual(second, [{ ingredientId: 2, name: "Mandelöl", isAllergen: true, note: "Enthält Mandelöl." }]);
});
