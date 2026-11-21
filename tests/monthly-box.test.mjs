import assert from "node:assert/strict";
import { test } from "node:test";
import {
  berlinMonth, boxProductIds, monthlyBoxPriceCent, schedulePause, selectedPause,
} from "../lib/monthly-box.ts";

const month = (date) => berlinMonth(new Date(date));
const november = month("2026-11-15");
const december = november + 1;
const january = december + 1;

test("SPEC § 7: the box costs €39 per month and contains four different products", () => {
  assert.equal(monthlyBoxPriceCent, 3900);
  assert.deepEqual(boxProductIds(["1", "2", "3", "4"]), [1, 2, 3, 4]);
  for (const invalid of [["1", "2", "3"], ["1", "2", "3", "3"], ["1", "2", "3", "4", "5"], ["1", "2", "3", ""]]) {
    assert.equal(boxProductIds(invalid), null);
  }
});

test("SPEC § 7: pauses start next Berlin month, last at most two months and expire automatically", () => {
  const period = schedulePause([], november, 2);
  assert.deepEqual(period, { startMonth: december, endMonth: january + 1 });
  const pause = { ...period, resumedAt: null };
  assert.equal(month("2026-12-31T22:59:59Z"), december);
  assert.equal(month("2026-12-31T23:00:00Z"), january);
  assert.equal(selectedPause([pause], november), pause);
  assert.equal(selectedPause([pause], january), pause);
  assert.equal(selectedPause([pause], january + 1), undefined);
  assert.equal(schedulePause([pause], january, 1), null);
  for (const invalid of [0, 3, 1.5, NaN]) {
    assert.equal(schedulePause([], november, invalid), null);
  }
});

test("SPEC § 7: early resumption counts elapsed pause months and prevents chained pauses", () => {
  const original = schedulePause([], november, 2);
  const withdrawn = { ...original, resumedAt: new Date("2026-11-21") };
  assert.deepEqual(schedulePause([withdrawn], november, 2), original);

  const resumed = { ...original, resumedAt: new Date("2026-12-15") };
  assert.equal(selectedPause([resumed], december), undefined);
  assert.equal(schedulePause([resumed], december, 2), null);
  const second = schedulePause([resumed], december, 1);
  assert.deepEqual(second, { startMonth: january, endMonth: january + 1 });

  const history = [resumed, { ...second, resumedAt: new Date("2027-01-15") }];
  assert.equal(schedulePause(history, january, 1), null);
  assert.deepEqual(schedulePause(history, january + 1, 2), {
    startMonth: january + 2, endMonth: january + 4,
  });
});
