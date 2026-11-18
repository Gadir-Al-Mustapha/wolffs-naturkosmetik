"use client";

import { startTransition, useActionState, useId } from "react";
import { addBatch, addIngredient, addProduct, type FormState } from "./actions";

export type IngredientOption = {
  id: number;
  name: string;
  isAllergen: boolean;
};

type EntryFormProps = {
  ingredients: IngredientOption[];
} & (
  | { kind: "ingredient" }
  | { kind: "product" }
  | { kind: "batch"; productId: number; recipe: number[] }
);

export function EntryForm(props: EntryFormProps) {
  const { kind, ingredients } = props;
  const action = kind === "ingredient" ? addIngredient : kind === "product" ? addProduct :
    addBatch.bind(null, props.productId);
  const [state, dispatch, pending] = useActionState(
    async (previous: FormState, submission: { form: HTMLFormElement; data: FormData }) => {
      const result = await action(previous, submission.data);
      if (result.success) submission.form.reset();
      return result;
    },
    {},
  );
  const id = useId();
  const error = (field: string) => state.errors?.[field] &&
    <small className="field-error" id={id + field}>{state.errors[field]}</small>;
  const input = (
    name: string, label: string,
    options: { type?: string; required?: boolean; placeholder?: string; inputMode?: "decimal" | "numeric" } = {},
  ) => (
    <label className="field">
      <span>{label}{options.required && <span aria-hidden="true"> *</span>}</span>
      <input
        name={name}
        aria-invalid={!!state.errors?.[name]}
        aria-describedby={state.errors?.[name] ? id + name : undefined}
        {...options}
      />
      {error(name)}
    </label>
  );

  const submitLabel = {
    ingredient: "Inhaltsstoff speichern",
    product: "Produkt speichern",
    batch: "Charge einbuchen",
  }[kind];

  return (
    <form
      className="entry-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        startTransition(() => dispatch({ form, data }));
      }}
    >
      <fieldset disabled={pending} className="form-fields">
        {kind !== "batch" && input("name", "Bezeichnung", { required: true })}
        {kind === "ingredient" ? (
          <>
            <label className="check"><input type="checkbox" name="allergen" /> Potenziell allergen</label>
            {input("note", "Hinweis zum Inhaltsstoff")}
          </>
        ) : (
          <>
            {kind === "product" ? (
              input("price", "Standardpreis in Euro", { required: true, inputMode: "decimal", placeholder: "12,50" })
            ) : (
              <div className="date-fields">
                {input("manufacturedOn", "Herstellungsdatum", { type: "date", required: true })}
                {input("bestBefore", "Mindesthaltbarkeitsdatum", { type: "date", required: true })}
                {input("quantity", "Stückzahl", { inputMode: "numeric", required: true })}
              </div>
            )}
            <fieldset className="ingredient-picker" aria-describedby={state.errors?.ingredients ? id + "ingredients" : undefined}>
              <legend>{kind === "product" ? "Grundrezeptur" : "Tatsächlich verwendete Inhaltsstoffe"} *</legend>
              {ingredients.length === 0 && <p>Lege zuerst einen Inhaltsstoff an.</p>}
              {ingredients.map((ingredient) => (
                <label key={ingredient.id} className="check">
                  <input
                    type="checkbox"
                    name="ingredients"
                    value={ingredient.id}
                    defaultChecked={kind === "batch" && props.recipe.includes(ingredient.id)}
                  />
                  {ingredient.name}{ingredient.isAllergen && <span className="badge Restposten">Potenziell allergen</span>}
                </label>
              ))}
              {error("ingredients")}
            </fieldset>
          </>
        )}
        <button disabled={kind !== "ingredient" && ingredients.length === 0}>
          {pending ? "Wird gespeichert …" : submitLabel}
        </button>
      </fieldset>
      {state.failure && <p role="alert" className="field-error">{state.failure}</p>}
      {state.success && <p role="status" className="success">{state.success}</p>}
    </form>
  );
}
