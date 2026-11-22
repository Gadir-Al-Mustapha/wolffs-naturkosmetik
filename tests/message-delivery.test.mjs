import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client.ts";
import { confirmationDelivery, dispatchMessages } from "../lib/message-delivery.ts";

test("SPEC 5.2: Bestellbestätigungen werden einmal eingereiht und sicher verarbeitet", async t => {
  const dir = await mkdtemp(join(tmpdir(), "wolffs-delivery-"));
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

  let now = new Date("2026-11-22T12:00:00Z");
  const clock = () => now;
  const env = {
    WOLFFS_MESSAGE_CHANNEL: "email",
    WOLFFS_MESSAGE_GATEWAY_URL: "https://gateway.example.invalid/send",
    WOLFFS_MESSAGE_GATEWAY_TOKEN: "fiktiver-testwert",
  };
  async function fixture(mode, recipient = "") {
    const order = await db.privateOrder.create({ data: {
      confirmedAt: now, token: randomUUID(), delivery: "pickup", loyal: false,
      subtotal: 500, loyaltyDiscount: 0, promotionDiscount: 0, shipping: 0, total: 500,
      customer: { create: { name: "Fiktive Testkundin", loyal: false } },
    } });
    const data = { ...confirmationDelivery(recipient, "Fiktive Bestellbestätigung", order.id, mode),
      orderId: order.id, nextAttempt: now };
    const message = await db.outgoingMessage.create({ data });
    return { data, id: message.id, read: () => db.outgoingMessage.findUniqueOrThrow({ where: { id: message.id } }) };
  }

  const local = await fixture({});
  const email = await fixture(env, "kundin@example.invalid");
  const missing = await fixture(env);
  await assert.rejects(db.outgoingMessage.create({ data: local.data }), { code: "P2002" });

  const keys = [];
  const request = async (url, options) => {
    assert.equal(String(url), env.WOLFFS_MESSAGE_GATEWAY_URL);
    assert.equal(JSON.parse(options.body).to, "kundin@example.invalid");
    keys.push(options.headers["Idempotency-Key"]);
    if (keys.length === 1) throw new Error("Simulierter Verbindungsabbruch nach Annahme");
    return new Response(null, { status: 202 });
  };

  await Promise.all([dispatchMessages(db, clock, env, request), dispatchMessages(db, clock, env, request)]);
  assert.equal((await local.read()).status, "simulated");
  assert.equal((await missing.read()).errorCode, "recipient");
  assert.equal((await email.read()).status, "pending");
  await dispatchMessages(db, clock, env, request);
  assert.deepEqual(keys, [email.id]);

  now = new Date(now.getTime() + 60_000);
  await dispatchMessages(db, clock, env, request);
  assert.equal((await email.read()).status, "sent");
  assert.deepEqual(keys, [email.id, email.id]);

  const interrupted = await fixture(env, "kundin@example.invalid");
  await db.outgoingMessage.update({
    where: { id: interrupted.id },
    data: { status: "sending", attempts: 1, nextAttempt: now },
  });
  await dispatchMessages(db, clock, env, request);
  assert.equal((await interrupted.read()).status, "sent");
  assert.deepEqual(keys, [email.id, email.id, interrupted.id]);

  const rejected = await fixture(env, "kundin@example.invalid");
  await dispatchMessages(db, clock, env, async () => new Response(null, { status: 422 }));
  assert.equal((await rejected.read()).status, "failed");
  assert.equal((await rejected.read()).errorCode, "rejected");

  const exhausted = await fixture(env, "kundin@example.invalid");
  for (let attempt = 1; attempt <= 5; attempt++) {
    await dispatchMessages(db, clock, env, async () => new Response(null, { status: 503 }));
    now = new Date(now.getTime() + 60_000 * 2 ** (attempt - 1));
  }
  assert.equal((await exhausted.read()).status, "failed");
  assert.equal((await exhausted.read()).errorCode, "uncertain");
  assert.equal((await exhausted.read()).attempts, 5);
});
