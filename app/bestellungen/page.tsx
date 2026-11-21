import { randomUUID } from "node:crypto";
import { ClipboardList, Leaf } from "lucide-react";
import { connection } from "next/server";
import { db } from "../../lib/db";
import { inventoryFor, todayInBerlin } from "../../lib/inventory";
import { availableBatches, deliveries, euros, needsConfirmation } from "../../lib/orders";
import { discardOrder, finalizeOrder, saveOrder, savePromotion } from "./actions";
import { FieldError, OrderForm } from "./form";

export default async function Orders({ searchParams }: {
  searchParams: Promise<{ auftrag?: string }>;
}) {
  await connection();
  const id = Number((await searchParams).auftrag);
  const [customers, products, orders, promotions] = await Promise.all([
    db.customer.findMany({ orderBy: { name: "asc" } }),
    db.product.findMany({ orderBy: { name: "asc" }, include: { batches: { include: { allocations: true } } } }),
    db.privateOrder.findMany({
      orderBy: { id: "desc" },
      include: { customer: true, message: true, payment: true, lines: {
        include: { product: true, allocations: { include: { batch: true }, orderBy: { batch: { bestBefore: "asc" } } } },
      } },
    }),
    db.promotion.findMany({ orderBy: { code: "asc" } }),
  ]);
  const selected = orders.find(order => order.id === id);
  const draft = selected?.confirmedAt ? undefined : selected;
  const waiting = draft?.lines.some(line => line.allocations.some(needsConfirmation));
  const affected = draft?.lines.flatMap(line => line.allocations).some(allocation =>
    needsConfirmation({ ...allocation, confirmedAt: null }),
  );
  const today = todayInBerlin();

  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <a className="brand" href="/"><Leaf size={21} aria-hidden="true" /> Wolff’s Naturkosmetik</a>
          <nav className="main-nav" aria-label="Hauptnavigation">
            <a href="/">Produktion</a><a href="/bestellungen" aria-current="page">Bestellungen</a>
          </nav>
        </div>
      </header>
      <main className="shell">
        <div className="page-heading">
          <div><h1>Bestellungen</h1><p>Ware zuteilen, Preise prüfen und Bestellungen bestätigen.</p></div>
          {selected && <a href="/bestellungen" className="button"><ClipboardList size={18} aria-hidden="true" /> Neue Bestellung</a>}
        </div>

        <div className="order-layout">
          <div className="order-stack">
            {selected && (
              <section className="panel">
                <div className="product-heading">
                  <h2>Bestellung #{selected.id}</h2>
                  <span className={selected.confirmedAt ? "badge available" : "badge Restposten"}>
                    {selected.confirmedAt ? "Bestätigt" : "Entwurf"}
                  </span>
                </div>
                <p>{selected.customer.name} · {deliveries[selected.delivery]}</p>
                {selected.partnerDiscountPercent !== null && <p>
                  Wiederverkauf · {selected.partnerPriceApplied
                    ? `Partnerpreis mit ${selected.partnerDiscountPercent} % Nachlass`
                    : "Standardpreis bei weniger als 50 Stück"}
                </p>}
                {selected.partnerExceptionReason && <p>Genehmigte Ausnahme · {selected.partnerExceptionReason}</p>}
                {selected.payment && <p>Rechnung offen · Fällig am {selected.payment.dueOn}</p>}
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>Produkt und Chargen</th><th className="numeric">Einzelpreis</th></tr></thead>
                    <tbody>
                      {selected.lines.map(line => (
                        <tr key={line.id}>
                          <td>
                            <strong>{line.quantity} × {line.product.name}</strong>
                            <ul>{line.allocations.map(allocation => {
                              const status = inventoryFor([allocation.batch], today).entries[0].status;
                              return (
                                <li key={allocation.batchId}>
                                  {allocation.quantity} Stück aus Charge #{allocation.batchId} · MHD {allocation.batch.bestBefore}
                                  {status !== "Regulär" && <> <span className={`badge ${status}`}>{status}</span></>}
                                </li>
                              );
                            })}</ul>
                          </td>
                          <td className="numeric">{euros(line.unitPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <dl className="order-totals">
                  <dt>Warenwert</dt><dd>{euros(selected.subtotal)}</dd>
                  {selected.partnerDiscountPercent === null && <>
                    <dt>Treuerabatt</dt><dd>{euros(selected.loyaltyDiscount)}</dd>
                    <dt>Aktionsrabatt {selected.code}</dt><dd>{euros(selected.promotionDiscount)}</dd>
                  </>}
                  <dt>Versandkosten</dt><dd>{euros(selected.shipping)}</dd>
                  <dt><strong>Gesamtbetrag</strong></dt><dd><strong>{euros(selected.total)}</strong></dd>
                </dl>
                {selected.promotionExcluded && <p>Der Aktionscode ist mit dem Treuerabatt nicht kombinierbar. Der Treuerabatt wurde angewandt.</p>}
                {draft && (
                  <div className="order-stack order-actions">
                    {affected && <p>
                      {waiting ? "Allergenbestätigung steht aus." : "Allergeninformationen bestätigt."}{" "}
                      <a className="text-link" href={`/allergene/${draft.token}`} target="_blank" rel="noreferrer">Privaten Bestätigungslink öffnen</a>
                      {waiting && <>{" · "}<a className="text-link" href={`?auftrag=${draft.id}`}>Status aktualisieren</a></>}
                    </p>}
                    {!waiting && <OrderForm action={finalizeOrder.bind(null, draft.id, draft.token)} submit={draft.partnerDiscountPercent !== null ? "Auf Rechnung bestätigen" : "Verbindlich bestätigen"} />}
                    <OrderForm action={discardOrder.bind(null, draft.id, draft.token)} submit="Entwurf verwerfen" secondary />
                  </div>
                )}
              </section>
            )}
            {!selected?.confirmedAt && (
              <section className="panel">
                <h2>{draft ? "Entwurf bearbeiten" : "Neue Bestellung"}</h2>
                {!products.length ? (
                  <p>Lege in der <a className="text-link" href="/">Produktion</a> ein Produkt mit Bestand an.</p>
                ) : (
                  <OrderForm key={draft?.token ?? "new"} action={saveOrder.bind(null, draft?.id ?? null, draft?.token ?? randomUUID())}
                    submit={draft ? "Zuteilung neu speichern" : "Chargen zuteilen und Preise berechnen"}>
                    <label className="field">Kunde oder Wiederverkäufer
                      <select name="customer" defaultValue={draft?.customerId ?? ""}>
                        <option value="">Neuen Kontakt anlegen</option>
                        {customers.map(customer => <option key={customer.id} value={customer.id}>
                          {customer.name}{customer.partnerDiscountPercent !== null ? ` · Wiederverkauf (${customer.partnerDiscountPercent} %)` : customer.loyal ? " · Stammkundin" : ""}
                        </option>)}
                      </select>
                    </label>
                    <label className="field">Name bei Neuanlage <input name="name" maxLength={120} /></label>
                    <FieldError field="customer" />
                    <label className="field">Kundenart bei Neuanlage
                      <select name="customerType">
                        <option value="private">Privat</option>
                        <option value="partner">Wiederverkauf</option>
                      </select>
                    </label>
                    <label className="check"><input type="checkbox" name="loyal" /> Stammkundin bei Neuanlage</label>
                    <label className="field">Partnernachlass bei Neuanlage (%)
                      <input name="partnerPercent" type="number" min="0" max="100" step="1" />
                    </label>
                    <FieldError field="partnerPercent" />
                    <fieldset className="ingredient-picker">
                      <legend>Stückzahl je Produkt *</legend>
                      <FieldError field="quantities" />
                      <div className="form-fields">
                        {products.map(product => {
                          const line = draft?.lines.find(line => line.productId === product.id);
                          const batches = product.batches.map(batch => ({
                            ...batch, allocations: batch.allocations.filter(allocation =>
                              !line || allocation.lineId !== line.id,
                            ),
                          }));
                          const { available } = inventoryFor(availableBatches(batches), today);
                          return <label className="field" key={product.id}>
                            <span>{product.name} <small className="muted">· {euros(product.standardPriceCent)} · {available} verfügbar</small></span>
                            <input name={`quantity-${product.id}`} type="number" min="0" step="1" defaultValue={line?.quantity} placeholder="0" />
                          </label>;
                        })}
                      </div>
                    </fieldset>
                    <label className="field">Übergabe *
                      <select name="delivery" aria-label="Übergabe" defaultValue={draft?.delivery ?? "dhl"}>
                        {Object.entries(deliveries).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <FieldError field="delivery" />
                    <label className="field">Aktionscode <input name="code" defaultValue={draft?.code ?? ""} /></label>
                    <FieldError field="code" />
                    <details className="batch-form" open={Boolean(draft?.partnerExceptionReason)}>
                      <summary>Partnerpreis unter 50 Stück genehmigen</summary>
                      <div className="form-fields">
                        <label className="field">Begründung der Inhaberin
                          <textarea name="partnerExceptionReason" maxLength={1000} defaultValue={draft?.partnerExceptionReason ?? ""} />
                        </label>
                        <label className="field">Freigabekennwort der Inhaberin
                          <input name="ownerApproval" type="password" autoComplete="off" />
                        </label>
                      </div>
                    </details>
                    <FieldError field="partnerExceptionReason" />
                    {draft && affected && <p className="muted">Beim erneuten Speichern wird ein neuer Bestätigungslink für die Zuteilung erstellt.</p>}
                  </OrderForm>
                )}
              </section>
            )}
            <section className="panel" id="testpostfach">
              <h2>Lokales Testpostfach</h2>
              {orders.every(order => !order.message) && <p className="muted">Sobald eine Bestellung bestätigt ist, erscheint hier ihre Nachricht.</p>}
              {orders.filter(order => order.message).map(order => (
                <details key={order.id} open={order.id === selected?.id}>
                  <summary>Bestellbestätigung #{order.id}</summary>
                  <pre className="order-message">{order.message!.body}</pre>
                </details>
              ))}
            </section>
          </div>

          <aside className="order-stack">
            <section className="panel">
              <h2>Bestellungen</h2>
              {orders.length ? (
                <ul className="order-list">
                  {orders.map(order => <li key={order.id}>
                    <a className="text-link" href={`?auftrag=${order.id}`}>#{order.id} · {order.customer.name}</a>
                    <span className={order.confirmedAt ? "badge available" : "badge Restposten"}>{order.confirmedAt ? "Bestätigt" : "Entwurf"}</span>
                  </li>)}
                </ul>
              ) : <p className="muted">Hier erscheinen deine Entwürfe und bestätigten Bestellungen.</p>}
            </section>
            <section className="panel">
              <h2>Aktionscodes</h2>
              {promotions.length > 0 && <ul className="order-list">
                {promotions.map(promotion => <li key={promotion.code}>
                  <strong>{promotion.code}</strong><span>{promotion.percent} % · {promotion.combinable ? "kombinierbar" : "nicht kombinierbar"}</span>
                </li>)}
              </ul>}
              <details className="batch-form">
                <summary>Code anlegen oder aktualisieren</summary>
                <OrderForm action={savePromotion} submit="Aktionscode speichern">
                  <label className="field">Code * <input name="code" required maxLength={40} /></label>
                  <FieldError field="code" />
                  <label className="field">Rabatt in Prozent * <input name="percent" type="number" min="1" max="100" required /></label>
                  <FieldError field="percent" />
                  <label className="check"><input type="checkbox" name="combinable" defaultChecked /> Mit Treuerabatt kombinierbar</label>
                </OrderForm>
              </details>
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}
