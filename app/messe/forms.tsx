"use client";

import { useActionState, useState } from "react";
import { closeFair, dispatchFair, saveFair, type FairFormState } from "./actions";

function FormError({ state, field }: { state: FairFormState; field?: string }) {
  if (!state.error || state.field !== field) return null;
  return <p id={field ? `${field}-error` : undefined} className="field-error" role="alert">{state.error}</p>;
}

function errorProps(state: FairFormState, field: string) {
  return state.field === field
    ? { "aria-invalid": true as const, "aria-describedby": `${field}-error` }
    : {};
}

type Draft = { id: number; name: string; eventDate: string; requests: { productId: number; quantity: number }[] };

export function FairDraftForm({ products, draft }: { products: { id: number; name: string }[]; draft?: Draft }) {
  const [state, action, pending] = useActionState(saveFair.bind(null, draft?.id ?? null), {});
  const [name, setName] = useState(draft?.name ?? "");
  const [eventDate, setEventDate] = useState(draft?.eventDate ?? "");
  const [quantities, setQuantities] = useState<Record<number, string>>(
    () => Object.fromEntries(draft?.requests.map(({ productId, quantity }) => [productId, String(quantity)]) ?? []),
  );

  return (
    <form action={action} className="form-fields">
      <label className="field">Name *
        <input name="name" value={name} onChange={event => setName(event.target.value)} required maxLength={100} {...errorProps(state, "name")} />
        <FormError state={state} field="name" />
      </label>
      <label className="field">Messedatum *
        <input name="eventDate" type="date" value={eventDate} onChange={event => setEventDate(event.target.value)} required {...errorProps(state, "eventDate")} />
        <FormError state={state} field="eventDate" />
      </label>
      <fieldset className="form-fields ingredient-picker">
        <legend>Stückzahl je Produkt</legend>
        {products.map(product => {
          const field = `product-${product.id}`;
          return (
            <label className="field" key={product.id}>{product.name}
              <input name={field} type="number" min={0} max={2_147_483_647} step={1}
                value={quantities[product.id] ?? ""}
                onChange={event => setQuantities({ ...quantities, [product.id]: event.target.value })}
                {...errorProps(state, field)} />
              <FormError state={state} field={field} />
            </label>
          );
        })}
      </fieldset>
      <FormError state={state} />
      <button disabled={pending}>{draft ? "Planung aktualisieren" : "Chargen vorschlagen"}</button>
    </form>
  );
}

export function DispatchForm({ id, proposal }: { id: number; proposal: string }) {
  const [state, action, pending] = useActionState(dispatchFair.bind(null, id), {});
  return (
    <form action={action} className="order-actions form-fields">
      <input type="hidden" name="proposal" value={proposal} />
      <FormError state={state} />
      <button disabled={pending}>Mitnahme buchen</button>
    </form>
  );
}

type Stock = { batchId: number; taken: number; batch: { product: { name: string }; bestBefore: string } };

export function ReturnForm({ id, stock }: { id: number; stock: Stock[] }) {
  const [state, action, pending] = useActionState(closeFair.bind(null, id), {});
  const [returns, setReturns] = useState<Record<number, string>>({});
  return (
    <form action={action} className="form-fields">
      {stock.map(({ batchId, taken, batch }) => {
        const field = `batch-${batchId}`;
        return (
          <label className="field" key={batchId}>{batch.product.name}, Charge #{batchId} · {taken} mitgenommen
            <input type="number" name={field} required min={0} max={taken} step={1}
              value={returns[batchId] ?? ""}
              onChange={event => setReturns({ ...returns, [batchId]: event.target.value })}
              {...errorProps(state, field)} />
            <FormError state={state} field={field} />
          </label>
        );
      })}
      <FormError state={state} />
      <button disabled={pending}>Rückgabe buchen und Messe abschließen</button>
    </form>
  );
}
