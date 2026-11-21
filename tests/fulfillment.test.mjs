import assert from "node:assert/strict";
import { test } from "node:test";
import { batchDebits, fulfillmentPermissions, handoffDetails } from "../lib/fulfillment.ts";
import { allocate, availableBatches } from "../lib/orders.ts";
import { createSession, matchesSecret, readSession, sessionSeconds } from "../lib/session.ts";

const now = new Date("2026-11-21T12:00:00Z");
const order = {
  confirmedAt: now,
  packedAt: null,
  handedOffAt: null,
  cancelledAt: null,
  labelReadyAt: null,
  bicycleStartedAt: null,
  delivery: "pickup",
  loyal: false,
  partnerDiscountPercent: null,
  payment: null,
};
const paid = { status: "paid" };

test("SPEC 5.1 and BR3: each customer group has independent packing and handoff gates", () => {
  for (const [customer, canPack, canHandOff] of [
    [{}, false, false],
    [{ loyal: true }, true, false],
    [{ partnerDiscountPercent: 0, payment: { status: "open" } }, true, true],
    [{ payment: paid }, true, true],
    [{ loyal: true, payment: paid }, true, true],
  ]) {
    const unpacked = { ...order, ...customer };
    assert.equal(fulfillmentPermissions(unpacked).canPack, canPack);
    assert.equal(fulfillmentPermissions(unpacked).canHandOff, false);
    assert.equal(fulfillmentPermissions({ ...unpacked, packedAt: now }).canHandOff, canHandOff);
    assert.equal(fulfillmentPermissions({ ...unpacked, confirmedAt: null }).canPack, false);
    assert.equal(fulfillmentPermissions({ ...unpacked, packedAt: now, handedOffAt: now }).canHandOff, false);
  }
});

test("BR1 and SPEC 5.3: each handoff requires its own details", () => {
  const packed = { ...order, packedAt: now, payment: paid };
  const today = "2026-11-21";
  const dhl = { ...packed, delivery: "dhl" };
  assert.equal(fulfillmentPermissions(dhl).canPack, false);
  assert.throws(() => handoffDetails(dhl, "DHL123", today), /Zahlungsfreigabe/);
  const labeled = { ...dhl, labelReadyAt: now };
  assert.throws(() => handoffDetails(labeled, "", today), /Trackingnummer/);
  assert.deepEqual(handoffDetails(labeled, "DHL123", today), { trackingNumber: "DHL123" });
  assert.throws(() => handoffDetails(packed, "2026-11-22", today), /Zukunft/);
  assert.throws(() => handoffDetails(packed, "2026-02-30", today), /Übergabedatum/);
  assert.deepEqual(handoffDetails(packed, today, today), { pickupOn: today });
  const bicycle = { ...packed, delivery: "bicycle" };
  assert.throws(() => handoffDetails(bicycle, "", today), /unterwegs/);
  assert.deepEqual(handoffDetails({ ...bicycle, bicycleStartedAt: now }, "", today), {});
});

test("BR4: handoff consumes the assigned FEFO quantities and preserves available stock", () => {
  const today = "2026-11-21";
  const batches = [
    { id: 1, bestBefore: "2026-12-10", quantity: 8, allocations: [{ quantity: 2 }] },
    { id: 2, bestBefore: "2026-12-01", quantity: 4, allocations: [] },
  ];
  const picked = allocate(availableBatches(batches), 7, today);
  const allocation = picked.map(({ batch, quantity }) => ({ batchId: batch.id, quantity }));
  assert.deepEqual([...batchDebits(allocation)], [[2, 4], [1, 3]]);
  const reserved = batches.map(batch => ({
    ...batch,
    allocations: [...batch.allocations, ...allocation.filter(entry => entry.batchId === batch.id)],
  }));
  const delivered = batches.map(batch => ({ ...batch, quantity: batch.quantity - batchDebits(allocation).get(batch.id) }));
  assert.deepEqual(availableBatches(reserved).map(batch => batch.quantity),
    availableBatches(delivered).map(batch => batch.quantity));
  assert.deepEqual([...batchDebits([...allocation, { batchId: 1, quantity: 2 }])], [[2, 4], [1, 5]]);
});

test("SPEC 5.2: packing sessions cannot claim owner access or survive expiry", t => {
  const previousOwner = process.env.OWNER_APPROVAL_SECRET;
  const previousPacker = process.env.PACKING_SECRET;
  t.after(() => {
    if (previousOwner === undefined) delete process.env.OWNER_APPROVAL_SECRET;
    else process.env.OWNER_APPROVAL_SECRET = previousOwner;
    if (previousPacker === undefined) delete process.env.PACKING_SECRET;
    else process.env.PACKING_SECRET = previousPacker;
  });
  process.env.OWNER_APPROVAL_SECRET = "test-owner";
  process.env.PACKING_SECRET = "test-packer";
  assert.equal(matchesSecret("test-packer", "test-owner"), false);
  const time = now.getTime();
  const packing = createSession("packer", "test-packer", time);
  assert.equal(readSession(packing, time), "packer");
  assert.equal(readSession(packing.replace("packer", "owner"), time), null);
  assert.equal(readSession(createSession("owner", "test-packer", time), time), null);
  assert.equal(readSession(packing, time + sessionSeconds * 1000), null);
  process.env.PACKING_SECRET = "test-owner";
  assert.equal(readSession(createSession("packer", "test-owner", time), time), null);
});

test("BR4: SQLite handoff rolls back incomplete debits and preserves allocations on retry", async t => {
  const { mkdtemp, readdir, readFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { DatabaseSync } = await import("node:sqlite");
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  const { PrismaClient } = await import("../generated/prisma/client.ts");
  const { handOffOrder } = await import("../lib/handoff.ts");
  const { packableOrders } = await import("../lib/fulfillment.ts");
  const dir = await mkdtemp(join(tmpdir(), "wolffs-fulfillment-"));
  const path = join(dir, "orders.db");
  const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${path}` }) });
  t.after(async () => {
    await db.$disconnect();
    await rm(dir, { recursive: true, force: true });
  });
  const migrations = new URL("../prisma/migrations/", import.meta.url);
  const sqlite = new DatabaseSync(path);
  try {
    const entries = await readdir(migrations, { withFileTypes: true });
    for (const name of entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort()) {
      sqlite.exec(await readFile(new URL(`${name}/migration.sql`, migrations), "utf8"));
    }
  } finally {
    sqlite.close();
  }
  const product = await db.product.create({
    data: { name: "Testprodukt", standardPriceCent: 100 },
  });
  const first = await db.batch.create({ data: {
    productId: product.id, manufacturedOn: "2026-10-01", bestBefore: "2026-12-01", quantity: 5,
  } });
  const second = await db.batch.create({ data: {
    productId: product.id, manufacturedOn: "2026-10-01", bestBefore: "2026-12-02", quantity: 1,
  } });
  const saved = await db.privateOrder.create({ data: {
    customer: { create: { name: "Testkunde", loyal: false } },
    token: "test-order", confirmedAt: now, delivery: "pickup", loyal: false,
    subtotal: 400, loyaltyDiscount: 0, promotionDiscount: 0, shipping: 0, total: 400,
    lines: { create: { productId: product.id, quantity: 4, unitPrice: 100, allocations: { create: [
      { batchId: first.id, quantity: 2, ingredients: [] },
      { batchId: second.id, quantity: 2, ingredients: [] },
    ] } } },
  } });
  const where = { id: saved.id };
  assert.equal(await db.privateOrder.count({ where: { ...where, ...packableOrders, packedAt: null } }), 0);
  await db.payment.create({ data: { orderId: saved.id, method: "unspecified", status: "paid", paidAt: now } });
  const packResult = await db.privateOrder.updateMany({
    where: { ...where, ...packableOrders, packedAt: null }, data: { packedAt: now },
  });
  assert.equal(packResult.count, 1);
  const form = new FormData();
  form.set("pickupOn", "2026-11-21");
  await assert.rejects(handOffOrder(db, saved.id, form, now), /Bestand/);
  assert.equal((await db.privateOrder.findUnique({ where })).handedOffAt, null);
  assert.equal((await db.batch.findUnique({ where: { id: first.id } })).quantity, 5);
  await db.batch.update({ where: { id: second.id }, data: { quantity: 2 } });
  await handOffOrder(db, saved.id, form, now);
  await handOffOrder(db, saved.id, form, now);
  const stored = await db.privateOrder.findUnique({ where });
  assert.deepEqual(stored.handedOffAt, now);
  assert.equal(stored.pickupOn, "2026-11-21");
  assert.deepEqual((await db.batch.findMany({ orderBy: { id: "asc" } })).map(batch => batch.quantity), [3, 0]);
  assert.equal(await db.allocation.count(), 2);
  assert.equal(await db.allocation.count({ where: { line: { order: { handedOffAt: null } } } }), 0);
});
