import { createHmac, timingSafeEqual } from "node:crypto";

export type Role = "owner" | "packer";
export const sessionSeconds = 8 * 60 * 60;

export function secretFor(role: Role) {
  const owner = process.env.OWNER_APPROVAL_SECRET;
  const packer = process.env.PACKING_SECRET;
  return role === "owner" ? owner : packer === owner ? undefined : packer;
}

function digest(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest();
}

export function matchesSecret(candidate: string, secret: string) {
  return timingSafeEqual(digest("login", candidate), digest("login", secret));
}

export function createSession(role: Role, secret: string, now = Date.now()) {
  const payload = `${role}.${now + sessionSeconds * 1000}`;
  return `${payload}.${digest(payload, secret).toString("hex")}`;
}

export function readSession(token: string, now = Date.now()): Role | null {
  const match = /^(owner|packer)\.(\d+)\.([0-9a-f]{64})$/.exec(token);
  if (!match) return null;
  const [, role, expires, signature] = match;
  if (role !== "owner" && role !== "packer") return null;
  const secret = secretFor(role);
  if (!secret || Number(expires) <= now) return null;
  return timingSafeEqual(digest(`${role}.${expires}`, secret), Buffer.from(signature, "hex")) ? role : null;
}
