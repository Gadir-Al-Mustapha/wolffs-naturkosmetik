import { CalendarDays } from "lucide-react";
import { requireRole } from "../../lib/access";
import { db } from "../../lib/db";
import { fairProposal, fairRequests } from "../../lib/fairs";
import { FulfillmentHeader } from "../fulfillment-header";
import { DispatchForm, FairDraftForm, ReturnForm } from "./forms";

const date = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "UTC" });
const formatDate = (value: string) => date.format(new Date(value));

export default async function FairPage({ searchParams }: { searchParams: Promise<{ messe?: string }> }) {
  await requireRole("owner");
  const id = Number((await searchParams).messe);
  const [fairs, products, fair] = await Promise.all([
    db.fair.findMany({
      select: { id: true, name: true, eventDate: true, dispatchedAt: true, closedAt: true },
      orderBy: [{ eventDate: "desc" }, { id: "desc" }],
    }),
    db.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    Number.isInteger(id) && id > 0 && id <= 2_147_483_647
      ? db.fair.findUnique({
        where: { id },
        include: {
          requests: fairRequests,
          stock: { orderBy: { batchId: "asc" }, include: { batch: { include: { product: true } } } },
        },
      })
      : null,
  ]);
  const proposal = fair && !fair.dispatchedAt ? fairProposal(fair.requests, fair.eventDate) : [];
  const preview = proposal.flatMap(({ product, assignments }) =>
    (assignments ?? []).map(({ batch, quantity }) => ({
      batchId: batch.id, taken: quantity, returned: null, batch: { bestBefore: batch.bestBefore, product },
    })),
  );

  return (
    <>
      <FulfillmentHeader active="messe" />
      <main className="shell">
        <div className="page-heading">
          <div><h1>Messevorrat</h1><p>Ware für eine Messe zusammenstellen und Rückläufer je Charge einbuchen.</p></div>
          {fair && <a className="button" href="/messe">Neue Messe</a>}
        </div>
        <div className="order-layout">
          <div className="order-stack">
            {!fair && (
              <section className="panel">
                <h2>Messe vorbereiten</h2>
                {products.length ? <FairDraftForm key="new" products={products} /> : (
                  <p>Lege zuerst ein <a className="text-link" href="/#produkt-anlegen">Produkt in der Produktion</a> an.</p>
                )}
              </section>
            )}
            {fair && (
              <>
                <section className="panel">
                  <div className="product-heading">
                    <div><h2>{fair.name}</h2><time dateTime={fair.eventDate}>{formatDate(fair.eventDate)}</time></div>
                    <span className={fair.closedAt ? "badge available" : fair.dispatchedAt ? "badge Restposten" : "badge"}>
                      {fair.closedAt ? "Abgerechnet" : fair.dispatchedAt ? "Mitnahme gebucht" : "In Vorbereitung"}
                    </span>
                  </div>
                  <h3 className="order-actions">{fair.dispatchedAt ? "Gebuchte Chargen" : "Vorgeschlagene Chargen"}</h3>
                  {!fair.dispatchedAt && <p>Der Bestand bleibt bis zur Buchung für Bestellungen verfügbar.</p>}
                  {proposal.filter(item => !item.assignments).map(({ product, quantity }) => (
                    <p key={product.id} className="field-error">Für „{product.name}“ sind zum Messetermin weniger als {quantity} Stück verfügbar.</p>
                  ))}
                  <StockTable stock={fair.dispatchedAt ? fair.stock : preview} stage={fair.closedAt ? "closed" : fair.dispatchedAt ? "dispatched" : "draft"} />
                  {!fair.dispatchedAt && proposal.length > 0 && proposal.every(item => item.assignments) && (
                    <DispatchForm key={fair.id} id={fair.id} proposal={JSON.stringify(preview.map(({ batchId, taken }) => ({ fairId: fair.id, batchId, taken })))} />
                  )}
                </section>
                {!fair.dispatchedAt && (
                  <section className="panel"><h2>Planung bearbeiten</h2><FairDraftForm key={fair.id} products={products} draft={fair} /></section>
                )}
                {fair.dispatchedAt && !fair.closedAt && (
                  <section className="panel">
                    <h2>Zurückgebrachte Stücke</h2>
                    <p className="muted">Gib je Charge an, wie viele Stück zurückkommen. Trage 0 ein, wenn keine zurückkommen.</p>
                    <div className="order-actions"><ReturnForm key={fair.id} id={fair.id} stock={fair.stock} /></div>
                  </section>
                )}
              </>
            )}
          </div>
          <aside className="panel">
            <h2>Messen</h2>
            {fairs.length ? (
              <ul className="order-list">{fairs.map(item => (
                <li key={item.id}>
                  <a className="text-link" href={`/messe?messe=${item.id}`} aria-current={fair?.id === item.id ? "page" : undefined}>{item.name}</a>
                  <time dateTime={item.eventDate}>{formatDate(item.eventDate)}</time>
                  <span className={item.closedAt ? "badge available" : item.dispatchedAt ? "badge Restposten" : "badge"}>
                    {item.closedAt ? "Abgerechnet" : item.dispatchedAt ? "Mitnahme gebucht" : "In Vorbereitung"}
                  </span>
                </li>
              ))}</ul>
            ) : <div className="empty"><CalendarDays size={28} aria-hidden="true" /><p>Hier erscheinen deine vorbereiteten und abgerechneten Messen.</p></div>}
          </aside>
        </div>
      </main>
    </>
  );
}

function StockTable({ stock, stage }: {
  stock: { batchId: number; taken: number; returned: number | null; batch: { bestBefore: string; product: { name: string } } }[];
  stage: "draft" | "dispatched" | "closed";
}) {
  if (!stock.length) return null;
  return (
    <div className="table-scroll" role="region" tabIndex={0} aria-label="Messechargen">
      <table>
        <thead><tr>
          <th scope="col">Produkt</th><th scope="col">Charge</th><th scope="col">MHD</th>
          <th scope="col" className="numeric">{stage === "draft" ? "Vorgeschlagen" : "Mitgenommen"}</th>
          {stage === "closed" && <><th scope="col" className="numeric">Zurück</th><th scope="col" className="numeric">Nicht zurückgebracht</th></>}
        </tr></thead>
        <tbody>{stock.map(({ batchId, taken, returned, batch }) => (
          <tr key={batchId}>
            <th scope="row">{batch.product.name}</th><td>#{batchId}</td><td>{formatDate(batch.bestBefore)}</td>
            <td className="numeric">{taken}</td>
            {returned !== null && <><td className="numeric">{returned}</td><td className="numeric">{taken - returned}</td></>}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
