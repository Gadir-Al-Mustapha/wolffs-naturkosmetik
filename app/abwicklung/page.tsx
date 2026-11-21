import { ClipboardList } from "lucide-react";
import { requireRole } from "../../lib/access";
import { db } from "../../lib/db";
import { fulfillmentPermissions } from "../../lib/fulfillment";
import { todayInBerlin } from "../../lib/inventory";
import { paymentFollowup } from "../../lib/payment-followup";
import { deliveries, euros } from "../../lib/orders";
import { FulfillmentForm } from "../fulfillment-form";
import { FulfillmentHeader } from "../fulfillment-header";
import { updateFulfillment } from "./actions";

export default async function FulfillmentPage() {
  await requireRole("owner");
  const orders = await db.privateOrder.findMany({
    where: { confirmedAt: { not: null } },
    orderBy: { id: "desc" },
    include: { customer: { select: { name: true } }, payment: true, monthlyBoxRun: { select: { failureReason: true } } },
  });
  const today = todayInBerlin();
  return (
    <>
      <FulfillmentHeader />
      <main className="shell">
        <div className="page-heading"><div><h1>Abwicklung</h1><p>Zahlungseingänge und offene Forderungen im Blick behalten, Packaufträge freigeben und Übergaben erfassen.</p></div></div>
        <div className="order-stack">
          {orders.length === 0 && <section className="panel empty">
            <ClipboardList size={30} aria-hidden="true" /><h2>Noch keine bestätigten Bestellungen</h2>
            <a href="/bestellungen">Zu den Bestellungen</a>
          </section>}
          {orders.map(order => {
            const { paid, canPack, canHandOff } = fulfillmentPermissions(order);
            const followup = paymentFollowup(order, today);
            const isDhl = order.delivery === "dhl";
            const isPickup = order.delivery === "pickup";
            const isBicycle = order.delivery === "bicycle";
            return <section className="panel" key={order.id} id={`auftrag-${order.id}`}>
              <div className="product-heading">
                <h2><a className="text-link" href={`/bestellungen?auftrag=${order.id}`}>Bestellung #{order.id}</a></h2>
                <span>{order.customer.name} · {deliveries[order.delivery as keyof typeof deliveries]} · {euros(order.total)}</span>
              </div>
              <ul className="fulfillment-status">
                <li>Zahlung <span className={paid ? "badge available" : "badge Restposten"}>{order.payment?.method === "credit" ? "Durch Gutschrift gedeckt" : paid ? "Eingegangen" : "Offen"}</span></li>
                <li>Verpackung <span className="badge">{order.packedAt ? "Gepackt" : canPack ? "Freigegeben" : order.cancelledAt ? "Geschlossen" : "Wartet auf Freigabe"}</span></li>
                <li>Übergabe <span className="badge">{order.handedOffAt ? (isDhl ? "Versendet" : "Übergeben") : order.cancelledAt ? "Storniert" : order.bicycleStartedAt ? "Unterwegs" : "Ausstehend"}</span></li>
              </ul>
              {order.cancelledAt && <p><strong>Storniert.</strong> {order.monthlyBoxRun?.failureReason
                ? "Die Monatsbox ist ausgefallen. Der reservierte Bestand wurde freigegeben."
                : "Wegen fehlender Zahlung wurde der reservierte Bestand freigegeben."}</p>}
              {followup === "deliveredDebt" && <p className="field-error"><strong>Mahnung nötig.</strong> Die Ware wurde bereits übergeben. Die Forderung bleibt offen.</p>}
              {followup === "invoiceOverdue" && <p className="field-error"><strong>Partnerrechnung überfällig.</strong> Die Forderung bleibt offen.</p>}
              {order.payment?.dueOn && <p>Zahlungsziel <time dateTime={order.payment.dueOn}>{order.payment.dueOn.split("-").reverse().join(".")}</time></p>}
              {isDhl && !order.cancelledAt && <p>DHL-Etikett {order.labelReadyAt ? "bereitgelegt" : "noch vorzubereiten"}</p>}
              {order.trackingNumber && <p>Trackingnummer <strong>{order.trackingNumber}</strong></p>}
              {order.pickupOn && <p>Übergeben am <time dateTime={order.pickupOn}>{order.pickupOn.split("-").reverse().join(".")}</time></p>}
              {!paid && !order.cancelledAt && <FulfillmentForm action={updateFulfillment.bind(null, order.id, "payment")} label="Zahlungseingang speichern">
                <label className="check"><input type="checkbox" name="received" value="yes" required /> Zahlung ist tatsächlich eingegangen</label>
              </FulfillmentForm>}
              {isDhl && !order.cancelledAt && !order.labelReadyAt && !order.handedOffAt &&
                <FulfillmentForm action={updateFulfillment.bind(null, order.id, "label")} label="DHL-Etikett als bereit markieren" />}
              {canHandOff && isBicycle && !order.bicycleStartedAt &&
                <FulfillmentForm action={updateFulfillment.bind(null, order.id, "startBicycle")} label="Fahrradlieferung als unterwegs markieren" />}
              {canHandOff && (isDhl || isPickup || (isBicycle && order.bicycleStartedAt)) &&
                <FulfillmentForm action={updateFulfillment.bind(null, order.id, "handOff")}
                  label={isDhl ? "Versand erfassen" : "Übergabe bestätigen"}>
                  {isDhl && <label className="field">Trackingnummer <input name="tracking" required maxLength={64} /></label>}
                  {isPickup && <label className="field">Übergabedatum <input name="pickupOn" type="date" required max={today} /></label>}
                </FulfillmentForm>}
            </section>;
          })}
        </div>
      </main>
    </>
  );
}
