import { db } from "./db";
import { dispatchMessages } from "./message-delivery";

const schedule = globalThis as typeof globalThis & { messageDeliveryStarted?: boolean };

export function startMessageDelivery() {
  if (schedule.messageDeliveryStarted) return;
  schedule.messageDeliveryStarted = true;

  async function check() {
    try {
      await dispatchMessages(db);
    } catch {
      console.error("Das Versandpostfach konnte nicht verarbeitet werden.");
    } finally {
      setTimeout(check, 5_000).unref();
    }
  }

  void check();
}
