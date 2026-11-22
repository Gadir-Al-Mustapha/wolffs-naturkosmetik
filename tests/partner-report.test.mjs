import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client.ts";
import { loadPartnerReport, partnerReportPeriod } from "../lib/partner-report.ts";

test("F-009: the date filter defaults to month-to-date and validates both inclusive dates", () => {
  const today = "2026-10-25";
  assert.deepEqual(partnerReportPeriod({}, today), { from: "2026-10-01", to: today, errors: {} });
  assert.deepEqual(partnerReportPeriod({ von: today, bis: today }, today).errors, {});
  assert.ok(partnerReportPeriod({ von: "2026-02-30", bis: today }, today).errors.from);
  assert.ok(partnerReportPeriod({ von: [today, today], bis: today }, today).errors.from);
  assert.ok(partnerReportPeriod({ von: today }, today).errors.to);
  assert.ok(partnerReportPeriod({ von: today, bis: "2026-10-24" }, today).errors.to);
});

test("F-009: confirmed partner orders and their current invoice balances on a Berlin clock-change day", async t => {
  const dir = await mkdtemp(join(tmpdir(), "wolffs-report-"));
  const path = join(dir, "report.db");
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
  const partner = await db.customer.create({ data: { name: "Testpartner", loyal: false, partnerDiscountPercent: 15 } });
  async function order(token, confirmedAt, extras = {}) {
    return db.privateOrder.create({ data: {
      token, confirmedAt, customerId: partner.id, partnerDiscountPercent: 15,
      delivery: "dhl", loyal: false, subtotal: 1500, loyaltyDiscount: 0, promotionDiscount: 0, shipping: 0, total: 1500,
      lines: { create: [
        { productId: product.id, quantity: 1, unitPrice: 500 },
        { productId: product.id, quantity: 2, unitPrice: 500 },
      ] },
      ...extras,
    } });
  }
  const open = await order("open", "2026-10-24T22:00:00Z", {
    partnerPriceApplied: false,
    payment: { create: { status: "open", method: "invoice", dueOn: "2026-11-24" } },
  });
  const paid = await order("paid", "2026-10-25T22:59:59Z", {
    partnerDiscountPercent: 0,
    payment: { create: { status: "paid", method: "invoice", dueOn: "2026-11-24", paidAt: "2026-11-01T23:00:00Z" } },
  });
  const missing = await order("missing-payment", "2026-10-25T12:00:00Z");
  await order("before", "2026-10-24T21:59:59Z");
  await order("after", "2026-10-25T23:00:00Z");
  await order("private", "2026-10-25T10:00:00Z", { partnerDiscountPercent: null });
  await order("cancelled", "2026-10-25T10:00:00Z", { cancelledAt: "2026-10-26T10:00:00Z" });
  await order("draft", null);

  const result = await loadPartnerReport(db, "2026-10-25", "2026-10-25");
  assert.deepEqual(result.rows.map(row => row.id), [paid.id, missing.id, open.id]);
  assert.ok(result.rows.every(row => row.confirmedOn === "2026-10-25" && row.partner === "Testpartner"));
  assert.deepEqual(result.totals, { quantity: 9, value: 4500, open: 1500 });
  assert.equal(result.rows[0].payment.paidAt.toISOString(), "2026-11-01T23:00:00.000Z");
  assert.equal(result.rows[1].payment, null);
  assert.equal(result.rows[2].payment.dueOn, "2026-11-24");
  await db.payment.update({ where: { orderId: open.id }, data: { status: "paid", paidAt: new Date() } });
  assert.equal((await loadPartnerReport(db, "2026-10-25", "2026-10-25")).totals.open, 0);
  assert.deepEqual(await loadPartnerReport(db, "2026-09-01", "2026-09-30"),
    { rows: [], totals: { quantity: 0, value: 0, open: 0 } });
});
