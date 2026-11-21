import { db } from "./db";
import { runPaymentFollowup } from "./payment-followup";

const schedule = globalThis as typeof globalThis & { paymentFollowupStarted?: boolean };

export async function startPaymentFollowup() {
  if (schedule.paymentFollowupStarted) return;
  schedule.paymentFollowupStarted = true;

  async function check() {
    try {
      await runPaymentFollowup(db);
    } catch (error) {
      console.error("Zahlungsfristen konnten nicht geprüft werden.", error);
    } finally {
      setTimeout(check, 60_000).unref();
    }
  }

  await check();
}
