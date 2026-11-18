"use client";

import { createContext, startTransition, useActionState, useContext, type ReactNode } from "react";

type State = { error?: string; field?: string; success?: string };

const FormFeedback = createContext<State>({});

export function FieldError({ field }: { field: string }) {
  const state = useContext(FormFeedback);
  return state.field === field && <small className="field-error" role="alert">{state.error}</small>;
}

export function OrderForm({ action, children, submit, secondary = false }: {
  action: (form: FormData) => Promise<State>;
  children?: ReactNode;
  submit: string;
  secondary?: boolean;
}) {
  const [state, dispatch, pending] = useActionState(
    async (_previous: State, data: FormData) => action(data), {},
  );
  return (
    <form className="form-fields" onSubmit={event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      startTransition(() => dispatch(data));
    }}>
      <FormFeedback.Provider value={state}>{children}</FormFeedback.Provider>
      {state.error && !state.field && <p className="field-error" role="alert">{state.error}</p>}
      {state.success && <p className="success" role="status">{state.success}</p>}
      <button className={secondary ? "secondary" : undefined} disabled={pending}>
        {pending ? "Wird gespeichert …" : submit}
      </button>
    </form>
  );
}
