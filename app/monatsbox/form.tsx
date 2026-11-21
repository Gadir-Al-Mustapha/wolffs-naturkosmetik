"use client";

import { useActionState } from "react";
import { createInvitation, pauseBox } from "./actions";

type Option = { id: number; name: string };

export function InvitationForm({ customers, products }: { customers: Option[]; products: Option[] }) {
  const [state, action, pending] = useActionState(createInvitation, {});
  return (
    <form action={action} className="order-stack">
      <label className="field">Kundin *
        <select name="customer" required defaultValue="">
          <option value="" disabled>Bitte auswählen</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </select>
      </label>
      <fieldset className="ingredient-picker" aria-describedby={state.error ? "invitation-error" : undefined}>
        <legend>Vier verschiedene Produkte *</legend>
        {products.map((product) => (
          <label className="check" key={product.id}>
            <input type="checkbox" name="product" value={product.id} /> {product.name}
          </label>
        ))}
        {state.error && <p id="invitation-error" role="alert" className="field-error">{state.error}</p>}
      </fieldset>
      <button disabled={pending}>{pending ? "Einladung wird erstellt …" : "Einladung erstellen"}</button>
    </form>
  );
}

export function PauseForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(pauseBox.bind(null, token), {});
  return (
    <form action={action} className="order-stack">
      <label className="field">Pause ab nächstem Monat *
        <select name="duration" aria-describedby={state.error ? "pause-error" : undefined}>
          <option value="1">Ein Monat</option>
          <option value="2">Zwei Monate</option>
        </select>
      </label>
      {state.error && <p id="pause-error" role="alert" className="field-error">{state.error}</p>}
      <button disabled={pending}>{pending ? "Pause wird eingeplant …" : "Pause einplanen"}</button>
    </form>
  );
}
