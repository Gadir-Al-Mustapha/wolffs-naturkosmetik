import { OrderForm, FieldError } from "../bestellungen/form";
import { monthLabel } from "../../lib/monthly-box";
import { deliveries, euros } from "../../lib/orders";
import { prepareBox, recordBoxFailure } from "./fulfillment-actions";

type BoxRun = {
  month: number;
  failureReason: string | null;
  creditCent: number;
  order: {
    id: number;
    token: string;
    delivery: string;
    confirmedAt: Date | null;
    cancelledAt: Date | null;
    handedOffAt: Date | null;
  } | null;
};

export function BoxRunDetails({ boxId, month, run, credit }: {
  boxId: number;
  month: number;
  run?: BoxRun;
  credit?: number;
}) {
  const order = run?.order;
  const draft = order && !order.confirmedAt && !order.cancelledAt;
  return (
    <section className="order-stack">
      <h4>{monthLabel(month)}</h4>
      {order && <p>
        <a className="text-link" href={`/bestellungen?auftrag=${order.id}`}>Bestellung #{order.id} öffnen</a>
        {" · "}{order.cancelledAt ? "Storniert" : order.handedOffAt ? "Übergeben" : order.confirmedAt ? "Bestätigt" : "Entwurf"}
      </p>}
      {run?.failureReason ? (
        <p><strong>Ausgefallen</strong> · {run.failureReason} · Gutschrift {euros(run.creditCent)}</p>
      ) : (
        <>
          {(!order || draft) && (
            <OrderForm action={prepareBox.bind(null, boxId, month, order?.token ?? null)}
              submit={draft ? "Chargen neu zuteilen" : "Box vorbereiten"}>
              {Boolean(credit) && <p>Gutschrift für diese Box verfügbar · {euros(credit!)}</p>}
              <label className="field">Übergabe *
                <select name="delivery" defaultValue={order?.delivery ?? "dhl"}>
                  {Object.entries(deliveries).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </OrderForm>
          )}
          {!order?.handedOffAt && (
            <details className="batch-form">
              <summary>Ausfall erfassen</summary>
              <OrderForm action={recordBoxFailure.bind(null, boxId, month)} submit="Ausfall und Gutschrift speichern" secondary>
                <label className="field">Grund für den von dir verursachten Ausfall *
                  <textarea name="reason" required maxLength={1000} />
                  <FieldError field="reason" />
                </label>
                <label className="field">Gutschrift in € *
                  <input name="credit" inputMode="decimal" required placeholder="39,00" />
                  <FieldError field="credit" />
                </label>
              </OrderForm>
            </details>
          )}
        </>
      )}
    </section>
  );
}
