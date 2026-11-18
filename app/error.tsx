"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="shell">
      <section className="panel empty" role="alert">
        <h1>Bestand konnte nicht geladen werden</h1>
        <button onClick={reset}>Erneut versuchen</button>
      </section>
    </main>
  );
}
