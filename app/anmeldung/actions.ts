"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionCookie } from "../../lib/access";
import { createSession, matchesSecret, secretFor, sessionSeconds } from "../../lib/session";

export async function signIn(_previous: { error?: string }, form: FormData) {
  const role = form.get("role");
  const password = form.get("password");
  if (role !== "owner" && role !== "packer") return { error: "Bitte wähle einen Bereich." };
  const secret = secretFor(role);
  if (!secret || typeof password !== "string" || !matchesSecret(password, secret)) {
    return { error: "Die Anmeldung ist fehlgeschlagen. Prüfe das Kennwort für diesen Bereich." };
  }
  (await cookies()).set(sessionCookie, createSession(role, secret), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: sessionSeconds,
  });
  redirect(role === "owner" ? "/abwicklung" : "/packen");
}

export async function signOut() {
  (await cookies()).delete(sessionCookie);
  redirect("/anmeldung");
}
