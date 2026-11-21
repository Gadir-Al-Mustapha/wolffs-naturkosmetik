import { FulfillmentHeader } from "../fulfillment-header";
import { requireRole } from "../../lib/access";
import { db } from "../../lib/db";
import { availableBoxCredit, berlinMonth, boxDue } from "../../lib/monthly-box";
import { BoxContents, BoxStatus } from "./details";
import { BoxRunDetails } from "./box-run";
import { InvitationForm } from "./form";

export default async function MonthlyBoxes() {
  await requireRole("owner");
  const [customers, products, boxes] = await Promise.all([
    db.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.product.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.monthlyBox.findMany({
      orderBy: { id: "desc" },
      include: { customer: true, products: { orderBy: { name: "asc" } }, pauses: true,
        runs: { orderBy: { month: "desc" }, include: { order: true } } },
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
              <article className="panel" id={`box-${box.id}`} key={box.id}>
                <h3>{box.customer.name}</h3>
                <BoxStatus {...box} month={month} />
                <BoxContents {...box} />
                {boxDue(box.activatedAt, box.pauses, month) && !box.runs.some(run => run.month === month) &&
                  <BoxRunDetails boxId={box.id} month={month} credit={Math.min(box.priceCent, availableBoxCredit(box.runs, month))} />}
                {box.runs.map(run => <BoxRunDetails key={run.month} boxId={box.id} month={run.month}
                  run={run} credit={Math.min(box.priceCent, availableBoxCredit(box.runs, run.month))} />)}
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
