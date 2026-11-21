import { ClipboardList } from "lucide-react";
import { requireRole } from "../../lib/access";
import { db } from "../../lib/db";
import { fulfillmentPermissions } from "../../lib/fulfillment";
import { todayInBerlin } from "../../lib/inventory";
import { deliveries } from "../../lib/orders";
import { FulfillmentForm } from "../fulfillment-form";
import { FulfillmentHeader } from "../fulfillment-header";
import { updateFulfillment } from "./actions";

export default async function FulfillmentPage() {
  await requireRole("owner");
  const orders = await db.privateOrder.findMany({
    where: { confirmedAt: { not: null } },
    orderBy: { id: "desc" },
    include: { customer: { select: { name: true } }, payment: true },
  });
  const today = todayInBerlin();
  return (
    <>
      <FulfillmentHeader />
      <main className="shell">
        <div className="page-heading"><div><h1>Abwicklung</h1><p>Zahlungen bestätigen, Packaufträge freigeben und Übergaben erfassen.</p></div></div>
        <div className="order-stack">
          {orders.length === 0 && <section className="panel empty">
            <ClipboardList size={30} aria-hidden="true" /><h2>Noch keine bestätigten Bestellungen</h2>
            <a href="/bestellungen">Zu den Bestellungen</a>
          </section>}
          {orders.map(order => {
            const { paid, canPack, canHandOff } = fulfillmentPermissions(order);
            const isDhl = order.delivery === "dhl";
            const isPickup = order.delivery === "pickup";
            const isBicycle = order.delivery === "bicycle";
            return <section className="panel" key={order.id} id={`auftrag-${order.id}`}>
              <div className="product-heading">
                <h2><a className="text-link" href={`/bestellungen?auftrag=${order.id}`}>Bestellung #{order.id}</a></h2>
                <span>{order.customer.name} · {deliveries[order.delivery as keyof typeof deliveries]}</span>
              </div>
              <ul className="fulfillment-status">
                <li>Zahlung <span className={paid ? "badge available" : "badge Restposten"}>{paid ? "Eingegangen" : "Offen"}</span></li>
                <li>Verpackung <span className="badge">{order.packedAt ? "Gepackt" : canPack ? "Freigegeben" : "Wartet auf Freigabe"}</span></li>
                <li>Übergabe <span className="badge">{order.handedOffAt ? (isDhl ? "Versendet" : "Übergeben") : order.bicycleStartedAt ? "Unterwegs" : "Ausstehend"}</span></li>
              </ul>
              {isDhl && <p>DHL-Etikett {order.labelReadyAt ? "bereitgelegt" : "noch vorzubereiten"}</p>}
              {order.trackingNumber && <p>Trackingnummer <strong>{order.trackingNumber}</strong></p>}
              {order.pickupOn && <p>Übergeben am <time dateTime={order.pickupOn}>{order.pickupOn.split("-").reverse().join(".")}</time></p>}
              {!paid && <FulfillmentForm action={updateFulfillment.bind(null, order.id, "payment")} label="Zahlungseingang speichern">
                <label className="check"><input type="checkbox" name="received" value="yes" required /> Zahlung ist tatsächlich eingegangen</label>
              </FulfillmentForm>}
              {isDhl && !order.labelReadyAt && !order.handedOffAt &&
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
