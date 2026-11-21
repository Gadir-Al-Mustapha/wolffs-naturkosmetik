import { FulfillmentHeader } from "../fulfillment-header";
import { requireRole } from "../../lib/access";
import { db } from "../../lib/db";
import { berlinMonth } from "../../lib/monthly-box";
import { BoxContents, BoxStatus } from "./details";
import { InvitationForm } from "./form";

export default async function MonthlyBoxes() {
  await requireRole("owner");
  const [customers, products, boxes] = await Promise.all([
    db.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.product.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.monthlyBox.findMany({
      orderBy: { id: "desc" },
      include: { customer: true, products: { orderBy: { name: "asc" } }, pauses: true },
    }),
  ]);
  const month = berlinMonth(new Date());

  return (
    <>
      <FulfillmentHeader active="monatsbox" />
      <main className="shell">
        <header className="page-heading"><h1>Self-Care-Monthly</h1></header>
        <div className="order-layout">
          <section className="panel">
            <h2>Einladung vorbereiten</h2>
            {customers.length > 0 && products.length >= 4
              ? <InvitationForm customers={customers} products={products} />
              : <p>Für eine Einladung brauchst du eine erfasste Kundin und mindestens vier Produkte.</p>}
          </section>
          <section className="order-stack" aria-labelledby="box-list">
            <h2 id="box-list">Einladungen und Abos</h2>
            {boxes.length === 0 && <p className="panel empty">Hier erscheinen deine Einladungen und Abos.</p>}
            {boxes.map((box) => (
              <article className="panel" key={box.id}>
                <h3>{box.customer.name}</h3>
                <BoxStatus {...box} month={month} />
                <BoxContents {...box} />
                <p>{box.activatedAt
                  ? <a className="text-link" href={`/monatsbox/abo/${box.managementToken}`}>Privaten Verwaltungslink öffnen</a>
                  : <a className="text-link" href={`/monatsbox/einladung/${box.inviteToken}`}>Privaten Einladungslink öffnen</a>}</p>
              </article>
            ))}
          </section>
        </div>
      </main>
    </>
  );
}
