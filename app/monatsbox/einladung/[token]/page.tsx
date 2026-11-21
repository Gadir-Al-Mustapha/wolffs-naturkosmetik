import { notFound } from "next/navigation";
import { db } from "../../../../lib/db";
import { activateBox } from "../../actions";
import { BoxContents } from "../../details";

export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "same-origin" as const,
};

export default async function BoxInvitation({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const box = await db.monthlyBox.findUnique({
    where: { inviteToken: token }, include: { products: { orderBy: { name: "asc" } } },
  });
  if (!box) notFound();

  return (
    <main className="shell allergen-page">
      <header className="page-heading"><h1>Self-Care-Monthly</h1></header>
      <section className="panel order-stack">
        <h2>Deine Einladung</h2>
        <BoxContents {...box} />
        {box.activatedAt
          ? <p>Diese Einladung wurde bereits angenommen. Öffne deinen privaten Verwaltungslink, um dein Abo aufzurufen.</p>
          : <form action={activateBox.bind(null, token)}>
            <button>Zahlungspflichtig abonnieren</button>
          </form>}
      </section>
    </main>
  );
}
