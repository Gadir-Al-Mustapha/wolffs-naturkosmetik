import { monthLabel, selectedPause, type BoxPause } from "../../lib/monthly-box";

export function BoxContents({ products, priceCent }: {
  products: { id: number; name: string }[];
  priceCent: number;
}) {
  const price = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(priceCent / 100);
  return (
    <>
      <p className="badge">{price} pro Monat</p>
      <ul className="list-disc pl-5">{products.map((product) => <li key={product.id}>{product.name}</li>)}</ul>
    </>
  );
}

export function BoxStatus({ activatedAt, pauses, month }: {
  activatedAt: Date | null;
  pauses: BoxPause[];
  month: number;
}) {
  if (!activatedAt) return <p className="badge">Eingeladen</p>;
  const pause = selectedPause(pauses, month);
  if (!pause) return <p className="badge available">Aktiv</p>;
  const scheduled = pause.startMonth > month;
  return (
    <>
      <p className="badge Restposten">{scheduled ? "Pause geplant" : "Pausiert"}</p>
      <p>{monthLabel(pause.startMonth)} bis {monthLabel(pause.endMonth - 1)}.
        Automatisch wieder aktiv ab {monthLabel(pause.endMonth)}.</p>
    </>
  );
}
