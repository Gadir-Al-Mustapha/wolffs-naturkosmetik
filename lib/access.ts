import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, type Role } from "./session";

export const sessionCookie = "wolffs-session";

export async function currentRole() {
  return readSession((await cookies()).get(sessionCookie)?.value ?? "");
}

export async function requireRole(role: Role) {
  const current = await currentRole();
  if (current === role) return;
  if (current === "packer") redirect("/packen");
  if (current === "owner") redirect("/abwicklung");
  redirect(`/anmeldung?bereich=${role === "owner" ? "verwaltung" : "packen"}`);
}
