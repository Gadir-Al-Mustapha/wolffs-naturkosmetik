import type { Metadata } from "next";
import { connection } from "next/server";
import { db } from "../../../lib/db";
import { needsConfirmation, type IngredientInfo } from "../../../lib/orders";
import { acknowledge } from "../../bestellungen/actions";
import { FieldError, OrderForm } from "../../bestellungen/form";

export const metadata: Metadata = {
  title: "Allergeninformationen · Wolff’s Naturkosmetik",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function Allergens({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const order = await db.privateOrder.findUnique({
    where: { token }, include: { lines: { include: { product: true, allocations: true } } },
  });
  const affected = order?.lines.flatMap(line => line.allocations
    .filter(allocation => needsConfirmation({ ...allocation, confirmedAt: null }))
    .map(allocation => ({ ...allocation, product: line.product.name }))) ?? [];
  const waiting = affected.some(needsConfirmation);
  return (
    <main className="shell order-stack allergen-page">
      <h1>Allergeninformationen</h1>
      {!order || !affected.length ? (
        <section className="panel"><p>Dieser Bestätigungslink ist nicht verfügbar. Bitte wende dich an Wolff’s Naturkosmetik.</p></section>
      ) : (
        <>
          <p>Bestellung #{order.id}</p>
          {affected.map(allocation => (
            <section className="panel" key={allocation.batchId}>
              <h2>{allocation.product} · Charge #{allocation.batchId}</h2>
              <p>{allocation.quantity} Stück</p>
              <ul className="batch-ingredients">
                {(allocation.ingredients as IngredientInfo[]).map((ingredient, index) => (
                  <li key={index}>
                    {ingredient.name}
                    {ingredient.isAllergen && <span className="badge Restposten">Potenziell allergen</span>}
                    {ingredient.note && <small>{ingredient.note}</small>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {waiting && !order.confirmedAt ? (
            <section className="panel">
              <OrderForm action={acknowledge.bind(null, token)} submit="Kenntnisnahme bestätigen">
                <label className="check"><input type="checkbox" name="read" value="yes" required />
                  Ich habe die Inhaltsstoff- und Allergeninformationen zu allen oben aufgeführten Chargen gelesen.
                </label>
                <FieldError field="read" />
              </OrderForm>
            </section>
          ) : <p className="success">Die Kenntnisnahme ist erfasst.</p>}
        </>
      )}
    </main>
  );
}
