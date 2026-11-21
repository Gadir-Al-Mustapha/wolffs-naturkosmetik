"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "../../lib/access";
import { db } from "../../lib/db";
import { berlinMonth, boxProductIds, monthlyBoxPriceCent, schedulePause, selectedPause } from "../../lib/monthly-box";

export async function createInvitation(_previous: { error?: string }, form: FormData) {
  await requireRole("owner");
  const customerId = Number(form.get("customer"));
  const productIds = boxProductIds(form.getAll("product"));
  if (!productIds) return { error: "Bitte wähle genau vier verschiedene Produkte." };
  if (!Number.isSafeInteger(customerId) || customerId < 1) {
    return { error: "Bitte wähle eine Kundin." };
  }

  const created = await db.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    if (!customer || products.length !== 4) return false;
    await tx.monthlyBox.create({
      data: {
        customerId,
        products: { connect: productIds.map((id) => ({ id })) },
        inviteToken: randomBytes(32).toString("base64url"),
        managementToken: randomBytes(32).toString("base64url"),
        priceCent: monthlyBoxPriceCent,
      },
    });
    return true;
  });
  if (!created) return { error: "Bitte prüfe die Kundin und die ausgewählten Produkte." };
  revalidatePath("/monatsbox");
  return {};
}

export async function activateBox(token: string) {
  const box = await db.$transaction(async (tx) => {
    const updated = await tx.monthlyBox.updateMany({
      where: { inviteToken: token, activatedAt: null },
      data: { activatedAt: new Date() },
    });
    if (!updated.count) return null;
    return tx.monthlyBox.findUnique({ where: { inviteToken: token }, select: { managementToken: true } });
  });
  revalidatePath("/monatsbox");
  redirect(box ? `/monatsbox/abo/${box.managementToken}` : `/monatsbox/einladung/${token}`);
}

export async function pauseBox(token: string, _previous: { error?: string }, form: FormData) {
  const duration = Number(form.get("duration"));
  const saved = await db.$transaction(async (tx) => {
    const box = await tx.monthlyBox.findUnique({
      where: { managementToken: token }, include: { pauses: true },
    });
    if (!box?.activatedAt) return false;
    const period = schedulePause(box.pauses, berlinMonth(new Date()), duration);
    if (!period) return false;
    await tx.monthlyBoxPause.create({ data: { boxId: box.id, ...period } });
    return true;
  });
  if (!saved) return { error: "Die Pause konnte nicht eingeplant werden. Es sind höchstens zwei Monate am Stück möglich." };
  revalidatePath("/monatsbox");
  revalidatePath(`/monatsbox/abo/${token}`);
  return {};
}

export async function resumeBox(token: string) {
  const now = new Date();
  await db.$transaction(async (tx) => {
    const box = await tx.monthlyBox.findUnique({
      where: { managementToken: token }, include: { pauses: true },
    });
    if (!box?.activatedAt) return;
    const pause = selectedPause(box.pauses, berlinMonth(now));
    if (pause) await tx.monthlyBoxPause.update({ where: { id: pause.id }, data: { resumedAt: now } });
  });
  revalidatePath("/monatsbox");
  revalidatePath(`/monatsbox/abo/${token}`);
}
