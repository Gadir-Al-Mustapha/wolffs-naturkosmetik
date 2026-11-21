export const monthlyBoxPriceCent = 3900;

export type BoxPause = {
  startMonth: number;
  endMonth: number;
  resumedAt: Date | null;
};

const berlinCalendar = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin", year: "numeric", month: "numeric",
});

export function berlinMonth(date: Date) {
  const parts = berlinCalendar.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return year * 12 + month - 1;
}

export function monthLabel(month: number) {
  return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(Math.floor(month / 12), month % 12, 1)));
}

export function selectedPause<T extends BoxPause>(pauses: T[], month: number) {
  return pauses.find((pause) => !pause.resumedAt && pause.endMonth > month);
}

export function schedulePause(pauses: BoxPause[], month: number, duration: number) {
  if (duration !== 1 && duration !== 2) return null;
  if (selectedPause(pauses, month)) return null;

  const startMonth = month + 1;
  const endMonth = startMonth + duration;

  // A month in which a pause has already started counts toward the limit.
  const countedMonths = new Set<number>();
  for (const pause of pauses) {
    const end = pause.resumedAt
      ? Math.min(pause.endMonth, berlinMonth(pause.resumedAt) + 1)
      : pause.endMonth;
    for (let pausedMonth = pause.startMonth; pausedMonth < end; pausedMonth++) {
      countedMonths.add(pausedMonth);
    }
  }

  let consecutive = duration;
  for (let previous = startMonth - 1; countedMonths.has(previous); previous--) {
    consecutive++;
  }
  return consecutive <= 2 ? { startMonth, endMonth } : null;
}

export function boxProductIds(values: FormDataEntryValue[]) {
  const ids = values.map(Number);
  return ids.length === 4 && new Set(ids).size === 4 &&
    ids.every((id) => Number.isSafeInteger(id) && id > 0) ? ids : null;
}
