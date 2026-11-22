import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client.ts";
import { fulfillmentPermissions, packableOrders, reservingOrders } from "../lib/fulfillment.ts";
import { handOffOrder } from "../lib/handoff.ts";
import { availableBatches, allocate, invoiceDueOn } from "../lib/orders.ts";
import { paymentFollowup, runPaymentFollowup } from "../lib/payment-followup.ts";

import { confirmationDelivery, dispatchMessages } from "../lib/message-delivery.ts";

const confirmedAt = new Date("2026-10-23T22:15:00Z");
const order = { confirmedAt, cancelledAt: null, handedOffAt: null, loyal: false, partnerDiscountPercent: null, payment: null };

test("SPEC 5.1: private deadlines use Berlin calendar dates across the clock change", () => {
  for (const [loyal, dates] of [
    [false, ["2026-10-26", "2026-10-27", "2026-10-30", "2026-10-31"]],
    [true, ["2026-10-28", "2026-10-29", "2026-11-02", "2026-11-03"]],
  ]) {
    const customerOrder = { ...order, loyal };
    assert.deepEqual(dates.map(today => paymentFollowup(customerOrder, today)), [null, "remind", "remind", "cancel"]);
    assert.equal(paymentFollowup({ ...customerOrder, handedOffAt: confirmedAt }, dates[3]), "deliveredDebt");
    assert.equal(paymentFollowup({ ...customerOrder, payment: { status: "paid" } }, dates[3]), null);
    assert.equal(paymentFollowup({ ...customerOrder, confirmedAt: null }, dates[3]), null);
  }
});

test("BR3: 30 calendar days on invoice, overdue from the day after and ignored once paid", () => {
  const dueOn = invoiceDueOn("2026-10-24");
  assert.equal(dueOn, "2026-11-23");
  const partner = { ...order, partnerDiscountPercent: 0, payment: { status: "open", dueOn } };
  assert.equal(paymentFollowup(partner, "2026-11-23"), null);
  assert.equal(paymentFollowup(partner, "2026-11-24"), "invoiceOverdue");
  assert.equal(paymentFollowup({ ...partner, payment: { ...partner.payment, status: "paid" } }, "2026-11-24"), null);
});

test("BR4 and SPEC 5.1: reminders are unique and cancellation releases only reserved quantities", async t => {
  const dir = await mkdtemp(join(tmpdir(), "wolffs-payments-"));
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
  const product = await db.product.create({ data: { name: "Testseife", standardPriceCent: 500 } });
  const batch = await db.batch.create({ data: {
    productId: product.id, manufacturedOn: "2026-10-01", bestBefore: "2026-12-01", quantity: 20,
  } });
  async function fixture(token, extras = {}) {
    return db.privateOrder.create({ data: {
      ...order, payment: undefined,
      customer: { create: { name: "Testkunde", loyal: false } },
      token, delivery: "pickup", subtotal: 500, loyaltyDiscount: 0, promotionDiscount: 0, shipping: 0, total: 500,
      lines: { create: { productId: product.id, quantity: 1, unitPrice: 500,
        allocations: { create: { batchId: batch.id, quantity: 1, ingredients: [] } } } },
      ...extras,
    } });
  }
  const regular = await fixture("regular");
  const loyal = await fixture("loyal", { loyal: true, packedAt: confirmedAt });
  const delivered = await fixture("delivered", { handedOffAt: confirmedAt });
  const paid = await fixture("paid", { payment: { create: { method: "unspecified", status: "paid", paidAt: confirmedAt } } });
  const partner = await fixture("partner", { partnerDiscountPercent: 0, payment: { create: { method: "invoice", status: "open", dueOn: "2026-11-23" } } });
  const draft = await fixture("draft", { confirmedAt: null });

  async function reminders() {
    return (await db.outgoingMessage.findMany({ where: { kind: "payment-reminder" }, orderBy: { orderId: "asc" } })).map(row => row.orderId);
  }
  async function available() {
    return availableBatches(await db.batch.findMany({ include: {
      allocations: { where: { line: { order: reservingOrders } } },
    } }));
  }
  assert.equal((await available())[0].quantity, 15);
  await runPaymentFollowup(db, new Date("2026-10-27T00:00:00Z"), {});
  assert.deepEqual(await reminders(), [regular.id, delivered.id]);
  await runPaymentFollowup(db, new Date("2026-10-29T00:00:00Z"), {});
  assert.deepEqual(await reminders(), [regular.id, loyal.id, delivered.id]);

  const next = new Date("2026-10-31T00:00:00Z");
  await runPaymentFollowup(db, next, {});
  assert.equal(await db.privateOrder.count({ where: { ...packableOrders, id: loyal.id } }), 1);
  assert.equal((await available())[0].quantity, 16);
  const later = new Date("2026-11-24T00:00:00Z");
  await runPaymentFollowup(db, later, {});
  await runPaymentFollowup(db, later, {});

  const stored = await db.privateOrder.findMany({ include: { payment: true }, orderBy: { id: "asc" } });
  assert.deepEqual(stored.map(row => [row.id, row.cancelledAt]), [
    [regular.id, next], [loyal.id, later], [delivered.id, null], [paid.id, null], [partner.id, null], [draft.id, null],
  ]);
  assert.equal(paymentFollowup(stored[2], "2026-11-24"), "deliveredDebt");
  assert.equal(paymentFollowup(stored[4], "2026-11-24"), "invoiceOverdue");
  assert.deepEqual(await reminders(), [regular.id, loyal.id, delivered.id]);
  assert.equal(await db.allocation.count(), 6);
  assert.equal((await db.batch.findUnique({ where: { id: batch.id } })).quantity, 20);
  const released = await available();
  assert.equal(released[0].quantity, 17);
  assert.equal(allocate(released, 17, "2026-11-24")[0].quantity, 17);
  assert.equal(await db.privateOrder.count({ where: { ...packableOrders, id: loyal.id } }), 0);
  assert.equal(fulfillmentPermissions(stored[1]).canPack, false);
  await assert.rejects(handOffOrder(db, loyal.id, new FormData(), later), /Zahlungsfreigabe/);

  let now = new Date("2026-11-26T10:00:00Z");
  const clock = () => now;
  const env = {
    WOLFFS_MESSAGE_CHANNEL: "email",
    WOLFFS_MESSAGE_GATEWAY_URL: "https://gateway.example.invalid/send",
    WOLFFS_MESSAGE_GATEWAY_TOKEN: "fiktiv",
  };
  const confirmedOn = new Date("2026-11-23T10:00:00Z");
  const email = await fixture("email", { confirmedAt: confirmedOn });
  const newlyPaid = await fixture("newly-paid", { confirmedAt: confirmedOn });
  const missing = await fixture("missing-address", { confirmedAt: confirmedOn });
  const legacy = await fixture("legacy", { confirmedAt: confirmedOn, reminder: { create: { body: "Testnachricht" } } });
  const expired = await fixture("expired", { confirmedAt: new Date("2026-11-20T10:00:00Z") });
  for (const customer of [email, newlyPaid, expired]) {
    await db.outgoingMessage.create({ data: {
      ...confirmationDelivery("test@example.invalid", "Testbestätigung", customer.id, env),
      orderId: customer.id, status: "sent",
    } });
  }
  await runPaymentFollowup(db, now, env);
  await runPaymentFollowup(db, now, env);
  await db.payment.create({ data: { orderId: newlyPaid.id, method: "unspecified", status: "paid", paidAt: now } });

  now = new Date("2026-11-27T10:00:00Z");
  const attempts = [];
  const request = async (_url, options) => {
    const payload = JSON.parse(options.body);
    assert.equal(payload.to, "test@example.invalid");
    assert.equal(payload.subject, `Zahlungserinnerung #${email.id}`);
    attempts.push(options.headers["Idempotency-Key"]);
    return new Response(null, { status: attempts.length === 1 ? 503 : 202 });
  };
  await dispatchMessages(db, clock, env, request);
  now = new Date(now.getTime() + 60_000);
  await dispatchMessages(db, clock, env, request);
  const outgoing = await db.outgoingMessage.findMany({ where: { kind: "payment-reminder" } });
  const messageFor = order => outgoing.find(message => message.orderId === order.id);
  assert.equal(messageFor(email).status, "sent");
  assert.deepEqual(attempts, [messageFor(email).id, messageFor(email).id]);
  assert.equal(messageFor(newlyPaid).status, "skipped");
  assert.equal(messageFor(expired).status, "skipped");
  assert.equal(messageFor(missing).errorCode, "recipient");
  assert.equal(messageFor(legacy), undefined);
});
