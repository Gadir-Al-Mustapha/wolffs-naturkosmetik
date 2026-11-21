import { notFound } from "next/navigation";
import { db } from "../../../../lib/db";
import { berlinMonth, selectedPause } from "../../../../lib/monthly-box";
import { resumeBox } from "../../actions";
import { BoxContents, BoxStatus } from "../../details";
import { PauseForm } from "../../form";

export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "same-origin" as const,
};

export default async function ManageBox({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const box = await db.monthlyBox.findUnique({
    where: { managementToken: token },
    include: { products: { orderBy: { name: "asc" } }, pauses: true },
  });
  if (!box?.activatedAt) notFound();
  const month = berlinMonth(new Date());
  const pause = selectedPause(box.pauses, month);

  return (
    <main className="shell allergen-page">
      <header className="page-heading"><h1>Dein Self-Care-Monthly-Abo</h1></header>
      <section className="panel order-stack">
        <BoxStatus {...box} month={month} />
        <BoxContents {...box} />
        <p>Speichere die Adresse dieser Seite als privaten Verwaltungslink.</p>
        {pause
          ? <form action={resumeBox.bind(null, token)}>
            <button>{pause.startMonth > month ? "Geplante Pause zurücknehmen" : "Abo wieder aufnehmen"}</button>
          </form>
          : <PauseForm token={token} />}
      </section>
    </main>
  );
}
