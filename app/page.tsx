import { reservingOrders } from "../lib/fulfillment";
import { requireRole } from "../lib/access";
import { ArrowDown, Boxes, Leaf, PackagePlus } from "lucide-react";
import { connection } from "next/server";
import { db } from "../lib/db";
import { inventoryFor, todayInBerlin } from "../lib/inventory";
import { availableBatches } from "../lib/orders";
import { EntryForm } from "./forms";

const currency = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const number = new Intl.NumberFormat("de-DE");
const date = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "UTC" });

export default async function Home() {
  await connection();
  await requireRole("owner");
  const [ingredients, products] = await Promise.all([
    db.ingredient.findMany({ orderBy: { name: "asc" } }),
    db.product.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      include: { recipe: true, batches: { include: { allocations: { where: { line: { order: reservingOrders } } }, ingredients: { orderBy: { name: "asc" } } } } },
    }),
  ]);
  const today = todayInBerlin();

  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <a className="brand" href="/"><Leaf size={21} aria-hidden="true" /> Wolff’s Naturkosmetik</a>
          <nav className="main-nav" aria-label="Hauptnavigation"><a href="/" aria-current="page">Produktion</a><a href="/bestellungen">Bestellungen</a><a href="/abwicklung">Abwicklung</a></nav>
        </div>
      </header>
      <main className="shell">
        <div className="page-heading">
          <div>
            <h1>Produktion &amp; Bestand</h1>
            <p>Produkte pflegen, Chargen einbuchen und verfügbare Ware im Blick behalten.</p>
          </div>
          <a className="button" href="#produkt-anlegen"><PackagePlus size={18} aria-hidden="true" /> Produkt anlegen</a>
        </div>

        <section className="stock" aria-labelledby="stock-heading">
          <h2 id="stock-heading">Bestandsübersicht</h2>
          {products.length === 0 && (
            <div className="panel empty">
              <Boxes size={30} aria-hidden="true" />
              <h3>Noch keine Produkte erfasst</h3>
              <p>Lege Inhaltsstoffe und ein Produkt an, um die erste Charge einzubuchen.</p>
              <a href="#inhaltsstoff-anlegen"><ArrowDown size={16} aria-hidden="true" /> Inhaltsstoff anlegen</a>
            </div>
          )}
          {products.map((product) => {
            const { available, entries } = inventoryFor(availableBatches(product.batches), today);
            return (
              <article className="panel product" key={product.id}>
                <div className="product-heading">
                  <div>
                    <h3>{product.name}</h3>
                    <p>{currency.format(product.standardPriceCent / 100)} Standardpreis</p>
                  </div>
                  <span className={available ? "badge available" : "badge"}>{number.format(available)} Stück verfügbar</span>
                </div>
                <p className="recipe"><strong>Grundrezeptur</strong> {product.recipe.map(({ name }) => name).join(", ")}</p>
                {entries.length === 0 ? <p className="muted">Für dieses Produkt wurde noch keine Charge eingebucht.</p> : (
                  <div className="table-scroll" role="region" tabIndex={0} aria-label={`Chargen für ${product.name}`}>
                    <table>
                      <thead>
                        <tr><th scope="col">Charge</th><th scope="col">Hergestellt</th><th scope="col" aria-sort="ascending">MHD ↑</th><th scope="col">Status</th><th scope="col">Inhaltsstoffe</th><th scope="col" className="numeric">Freie Stück</th></tr>
                      </thead>
                      <tbody>
                        {entries.map((batch) => (
                          <tr key={batch.id}>
                            <th scope="row">#{batch.id}</th>
                            <td>{date.format(new Date(batch.manufacturedOn))}</td>
                            <td>{date.format(new Date(batch.bestBefore))}</td>
                            <td><span className={`badge ${batch.status}`}>{batch.status}</span></td>
                            <td>
                              <ul className="batch-ingredients">
                                {batch.ingredients.map((ingredient) => (
                                  <li key={ingredient.ingredientId}>
                                    {ingredient.name}{ingredient.isAllergen && <span className="badge Restposten">Potenziell allergen</span>}
                                    {ingredient.note && <small>{ingredient.note}</small>}
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td className="numeric">{number.format(batch.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <details className="batch-form">
                  <summary>Charge einbuchen</summary>
                  <EntryForm kind="batch" productId={product.id} recipe={product.recipe.map(({ id }) => id)} ingredients={ingredients} />
                </details>
              </article>
            );
          })}
        </section>

        <div className="setup-grid">
          <section className="panel" id="inhaltsstoff-anlegen">
            <h2>Inhaltsstoff anlegen</h2>
            <EntryForm kind="ingredient" ingredients={ingredients} />
          </section>
          <section className="panel" id="produkt-anlegen">
            <h2>Produkt anlegen</h2>
            <EntryForm kind="product" ingredients={ingredients} />
          </section>
        </div>
      </main>
    </>
  );
}
