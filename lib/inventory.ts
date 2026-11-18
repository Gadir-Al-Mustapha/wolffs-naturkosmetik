const dayInMilliseconds = 86_400_000;

export function todayInBerlin(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(date);
}

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function inventoryFor<T extends { id: number; bestBefore: string; quantity: number }>(
  batches: T[],
  today: string,
) {
  const ordered = [...batches].sort((a, b) =>
    a.bestBefore.localeCompare(b.bestBefore) || a.id - b.id,
  );
  const entries = ordered.map((batch) => {
    const daysLeft = (Date.parse(batch.bestBefore) - Date.parse(today)) / dayInMilliseconds;
    return {
      ...batch,
      status: daysLeft < 0 ? "Abgelaufen" : daysLeft < 30 ? "Restposten" : "Regulär",
    };
  });
  const available = entries.reduce(
    (sum, batch) => sum + (batch.status === "Abgelaufen" ? 0 : batch.quantity), 0,
  );
  return { entries, available };
}

export function batchIngredientEntries(
  ingredients: { id: number; name: string; isAllergen: boolean; note: string | null }[],
) {
  return ingredients.map(({ id, name, isAllergen, note }) => ({
    ingredientId: id, name, isAllergen, note,
  }));
}
