"use client";

import { useActionState, type ReactNode } from "react";

export type ActionState = { error?: string; field?: string };

export function FulfillmentForm({ action, children, label }: {
  action: (previous: ActionState, form: FormData) => Promise<ActionState>;
  children?: ReactNode;
  label: string;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} className="form-fields order-actions">
      {children}
      {state.error && <p role="alert" className="field-error">{state.error}</p>}
      <button disabled={pending}>{pending ? "Bitte warten …" : label}</button>
    </form>
  );
}
