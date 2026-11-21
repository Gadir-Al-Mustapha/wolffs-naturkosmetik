import { PackageOpen } from "lucide-react";
import { requireRole } from "../../lib/access";
import { db } from "../../lib/db";
import { packableOrders } from "../../lib/fulfillment";
import { markPacked } from "../abwicklung/actions";
import { FulfillmentForm } from "../fulfillment-form";
import { FulfillmentHeader } from "../fulfillment-header";

export default async function PackingPage() {
  await requireRole("packer");
  const orders = await db.privateOrder.findMany({
    where: { ...packableOrders, packedAt: null },
    orderBy: { id: "asc" },
    select: { id: true, delivery: true, lines: { select: {
      id: true,
      product: { select: { name: true } },
      allocations: { orderBy: { batchId: "asc" }, select: { batchId: true, quantity: true } },
    } } },
  });
  return (
    <>
      <FulfillmentHeader packing />
      <main className="shell">
        <div className="page-heading"><h1>Packaufträge</h1></div>
        <div className="order-stack">
          {orders.length === 0 && <section className="panel empty">
            <PackageOpen size={30} aria-hidden="true" /><h2>Alles gepackt</h2>
            <p>Gerade sind keine neuen Packaufträge freigegeben.</p>
          </section>}
          {orders.map(order => <section className="panel" key={order.id}>
            <h2>Auftrag #{order.id}</h2>
            <div className="table-scroll">
              <table>
                <thead><tr><th scope="col">Produkt</th><th scope="col">Charge</th><th scope="col" className="numeric">Stück</th></tr></thead>
                <tbody>{order.lines.flatMap(line => line.allocations.map(({ batchId, quantity }) =>
                  <tr key={`${line.id}-${batchId}`}>
                    <td>{line.product.name}</td><td>#{batchId}</td><td className="numeric">{quantity}</td>
                  </tr>,
                ))}</tbody>
              </table>
            </div>
            {order.delivery === "dhl" && <p>Bringe das bereitgelegte DHL-Etikett an.</p>}
            <FulfillmentForm action={markPacked.bind(null, order.id)} label="Als gepackt markieren" />
          </section>)}
        </div>
      </main>
    </>
  );
}
