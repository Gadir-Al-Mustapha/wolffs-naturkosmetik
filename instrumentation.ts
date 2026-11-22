export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPaymentFollowup } = await import("./lib/payment-schedule");
    await startPaymentFollowup();
    const { startMessageDelivery } = await import("./lib/message-schedule");
    startMessageDelivery();
  }
}
