"use server";

import { requireRole } from "../lib/access";

import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { batchIngredientEntries, isCalendarDate } from "../lib/inventory";

export type FormState = { errors?: Record<string, string>; failure?: string; success?: string };

function value(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function ingredientIds(form: FormData) {
  return [...new Set(form.getAll("ingredients").map(Number))];
}

export async function addIngredient(_state: FormState, form: FormData): Promise<FormState> {
  await requireRole("owner");
  const name = value(form, "name");
  if (!name) return { errors: { name: "Bitte gib eine Bezeichnung ein." } };
  try {
    await db.ingredient.create({
      data: { name, isAllergen: form.has("allergen"), note: value(form, "note") || null },
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return { errors: { name: "Diesen Inhaltsstoff gibt es bereits." } };
    }
    console.error(error);
    return { failure: "Der Inhaltsstoff konnte nicht gespeichert werden." };
  }
  revalidatePath("/");
  return { success: "Inhaltsstoff gespeichert." };
}

export async function addProduct(_state: FormState, form: FormData): Promise<FormState> {
  await requireRole("owner");
  const name = value(form, "name");
  const price = value(form, "price");
  const [euros, cents = ""] = price.replace(",", ".").split(".");
  const standardPriceCent = Number(euros) * 100 + Number(cents.padEnd(2, "0"));
  const ids = ingredientIds(form);
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Bitte gib eine Bezeichnung ein.";
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(price) || standardPriceCent > 2_147_483_647) {
    errors.price = "Bitte gib einen gültigen Preis in Euro ein.";
  }
  if (!ids.length || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    errors.ingredients = "Bitte wähle mindestens einen Inhaltsstoff.";
  }
  if (Object.keys(errors).length) return { errors };

  try {
    await db.product.create({
      data: { name, standardPriceCent, recipe: { connect: ids.map((id) => ({ id })) } },
    });
  } catch (error) {
    console.error(error);
    return { failure: "Das Produkt konnte nicht gespeichert werden." };
  }
  revalidatePath("/");
  return { success: "Produkt gespeichert." };
}

export async function addBatch(productId: number, _state: FormState, form: FormData): Promise<FormState> {
  await requireRole("owner");
  const manufacturedOn = value(form, "manufacturedOn");
  const bestBefore = value(form, "bestBefore");
  const rawQuantity = value(form, "quantity");
  const quantity = Number(rawQuantity);
  const ids = ingredientIds(form);
  const errors: Record<string, string> = {};
  if (!isCalendarDate(manufacturedOn)) errors.manufacturedOn = "Bitte gib ein gültiges Datum ein.";
  if (!isCalendarDate(bestBefore)) errors.bestBefore = "Bitte gib ein gültiges Datum ein.";
  else if (!errors.manufacturedOn && bestBefore < manufacturedOn) {
    errors.bestBefore = "Das MHD darf nicht vor der Herstellung liegen.";
  }
  if (!/^\d+$/.test(rawQuantity) || quantity < 1 || quantity > 2_147_483_647) {
    errors.quantity = "Bitte gib eine positive ganze Stückzahl ein.";
  }
  if (!ids.length || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    errors.ingredients = "Bitte wähle die tatsächlich verwendeten Inhaltsstoffe.";
  }
  if (Object.keys(errors).length) return { errors };

  try {
    const ingredients = await db.ingredient.findMany({ where: { id: { in: ids } } });
    if (ingredients.length !== ids.length) {
      return { errors: { ingredients: "Mindestens ein Inhaltsstoff ist nicht mehr verfügbar." } };
    }
    await db.batch.create({
      data: {
        productId, manufacturedOn, bestBefore, quantity,
        ingredients: { create: batchIngredientEntries(ingredients) },
      },
    });
  } catch (error) {
    console.error(error);
    return { failure: "Die Charge konnte nicht gespeichert werden." };
  }
  revalidatePath("/");
  return { success: "Charge eingebucht." };
}
