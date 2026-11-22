import { ChartNoAxesColumn } from "lucide-react";
import { requireRole } from "../../lib/access";
import { db } from "../../lib/db";
import { todayInBerlin } from "../../lib/inventory";
import { euros } from "../../lib/orders";
import { loadPartnerReport, partnerReportPeriod } from "../../lib/partner-report";
import { FulfillmentHeader } from "../fulfillment-header";

type Query = { von?: string | string[]; bis?: string | string[] };

function ReportDate({ date }: { date: string }) {
  return <time dateTime={date}>{date.split("-").reverse().join(".")}</time>;
}

export default async function PartnerReportPage({ searchParams }: { searchParams: Promise<Query> }) {
  await requireRole("owner");
  const { from, to, errors } = partnerReportPeriod(await searchParams, todayInBerlin());
  const report = errors.from || errors.to ? null : await loadPartnerReport(db, from, to);
  const number = new Intl.NumberFormat("de-DE");

  return (
    <>
      <FulfillmentHeader active="partnerauswertung" />
      <main className="shell">
        <div className="page-heading"><div>
          <h1>Partnerauswertung</h1>
          <p>Bestätigte Partnerbestellungen nach Bestätigungsdatum und ihr aktueller Zahlungsstand.</p>
        </div></div>
        <div className="order-stack">
          <form className="panel form-fields" action="/partnerauswertung" method="get" aria-label="Zeitraum auswählen">
            <div className="date-fields">
              <label className="field">Von *
                <input type="date" name="von" defaultValue={from} required
                  aria-invalid={!!errors.from} aria-describedby={errors.from ? "report-from-error" : undefined} />
                {errors.from && <span id="report-from-error" className="field-error" role="alert">{errors.from}</span>}
              </label>
              <label className="field">Bis *
                <input type="date" name="bis" defaultValue={to} required
                  aria-invalid={!!errors.to} aria-describedby={errors.to ? "report-to-error" : undefined} />
                {errors.to && <span id="report-to-error" className="field-error" role="alert">{errors.to}</span>}
              </label>
            </div>
            <button>Auswerten</button>
          </form>

          {report && <dl className="report-metrics" aria-label="Kennzahlen">
            <div className="panel"><dt>Bestellungen</dt><dd>{number.format(report.rows.length)}</dd></div>
            <div className="panel"><dt>Bestellte Stück</dt><dd>{number.format(report.totals.quantity)}</dd></div>
            <div className="panel"><dt>Bestellwert</dt><dd>{euros(report.totals.value)}</dd></div>
            <div className="panel"><dt>Offener Betrag</dt><dd>{euros(report.totals.open)}</dd></div>
          </dl>}

          {report && (report.rows.length ? <section className="panel">
            <h2 id="partner-orders">Partnerbestellungen</h2>
            <div className="table-scroll" role="region" tabIndex={0} aria-labelledby="partner-orders">
              <table>
                <thead><tr>
                  <th scope="col">Bestellung</th><th scope="col">Bestätigt am</th><th scope="col">Partner</th>
                  <th scope="col" className="numeric">Stück</th><th scope="col" className="numeric">Bestellwert</th>
                  <th scope="col">Zahlung</th>
                </tr></thead>
                <tbody>{report.rows.map(order => {
                  const paid = order.payment?.status === "paid";
                  const open = order.payment?.status === "open";
                  return <tr key={order.id}>
                    <th scope="row"><a className="text-link" href={`/bestellungen?auftrag=${order.id}`}>#{order.id}</a></th>
                    <td><ReportDate date={order.confirmedOn} /></td>
                    <td>{order.partner}</td>
                    <td className="numeric">{number.format(order.quantity)}</td>
                    <td className="numeric">{euros(order.total)}</td>
                    <td>
                      <span className={paid ? "badge available" : open ? "badge Restposten" : "badge"}>
                        {paid ? "Bezahlt" : open ? "Offen" : "Nicht erfasst"}
                      </span>
                      {paid && order.payment?.paidAt && <div>Eingang <ReportDate date={todayInBerlin(order.payment.paidAt)} /></div>}
                      {open && order.payment?.dueOn && <div>Fällig am <ReportDate date={order.payment.dueOn} /></div>}
                    </td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          </section> : <section className="panel empty">
            <ChartNoAxesColumn size={30} aria-hidden="true" />
            <h2>Keine Partnerbestellungen in diesem Zeitraum</h2>
            <p>Wähle einen anderen Zeitraum, um weitere Bestellungen zu sehen.</p>
          </section>)}
        </div>
      </main>
    </>
  );
}
