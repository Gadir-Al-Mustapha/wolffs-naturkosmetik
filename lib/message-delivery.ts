import { createHash } from "node:crypto";
import type { OutgoingMessage, PrismaClient } from "../generated/prisma/client.ts";

const maxAttempts = 5;
const leaseMs = 60_000;

function gatewayFingerprint(url?: string) {
  return url ? createHash("sha256").update(url).digest("hex") : null;
}

export function confirmationDelivery(recipient: string, body: string, orderId: number, env = process.env) {
  const channel = env.WOLFFS_MESSAGE_CHANNEL ?? "local";
  return {
    kind: "order-confirmation",
    channel,
    gateway: channel === "email" ? gatewayFingerprint(env.WOLFFS_MESSAGE_GATEWAY_URL) : null,
    recipient: recipient || null,
    subject: `Bestellbestätigung #${orderId}`,
    body,
  };
}

type Result = { status: string; errorCode: string | null };

async function deliver(message: OutgoingMessage, env: NodeJS.ProcessEnv, request: typeof fetch): Promise<Result> {
  if (message.channel === "local") return { status: "simulated", errorCode: null };
  if (message.channel !== "email") return { status: "failed", errorCode: "configuration" };
  if (!message.recipient) return { status: "failed", errorCode: "recipient" };

  const url = env.WOLFFS_MESSAGE_GATEWAY_URL;
  const gateway = url && URL.canParse(url) ? new URL(url) : null;
  if (!gateway || gateway.protocol !== "https:" || gateway.username || gateway.password ||
      gateway.search || gateway.hash || env.WOLFFS_MESSAGE_CHANNEL !== "email" ||
      message.gateway !== gatewayFingerprint(url) || !env.WOLFFS_MESSAGE_GATEWAY_TOKEN) {
    return { status: "failed", errorCode: "configuration" };
  }

  try {
    const response = await request(gateway, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.WOLFFS_MESSAGE_GATEWAY_TOKEN}`,
        "Idempotency-Key": message.id,
      },
      body: JSON.stringify({ to: message.recipient, subject: message.subject, text: message.body }),
    });
    if (response.ok) return { status: "sent", errorCode: null };
    if (response.status === 408 || response.status === 429 || response.status >= 500) {
      return { status: "pending", errorCode: "uncertain" };
    }
    return { status: "failed", errorCode: "rejected" };
  } catch {
    return { status: "pending", errorCode: "uncertain" };
  }
}

export async function dispatchMessages(
  db: PrismaClient, clock = () => new Date(), env = process.env, request = fetch,
) {
  const due = { status: { in: ["pending", "sending"] }, nextAttempt: { lte: clock() } };
  const messages = await db.outgoingMessage.findMany({ where: due, orderBy: { nextAttempt: "asc" }, take: 20 });
  for (const message of messages) {
    const where = { ...due, id: message.id, attempts: message.attempts };
    if (message.attempts >= maxAttempts) {
      await db.outgoingMessage.updateMany({ where, data: { status: "failed", errorCode: "uncertain" } });
      continue;
    }

    const attempt = message.attempts + 1;
    const claim = await db.outgoingMessage.updateMany({
      where,
      data: { status: "sending", attempts: attempt, nextAttempt: new Date(clock().getTime() + leaseMs) },
    });
    if (!claim.count) continue;

    const result = await deliver(message, env, request);
    if (result.status === "pending" && attempt === maxAttempts) result.status = "failed";
    await db.outgoingMessage.updateMany({
      where: { id: message.id, status: "sending", attempts: attempt },
      data: {
        ...result,
        nextAttempt: new Date(clock().getTime() + leaseMs * 2 ** (attempt - 1)),
      },
    });
  }
}
