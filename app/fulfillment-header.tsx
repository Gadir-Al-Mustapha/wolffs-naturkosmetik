import { Leaf } from "lucide-react";
import { signOut } from "./anmeldung/actions";

export function FulfillmentHeader({ packing, active = "abwicklung" }: { packing?: boolean; active?: "produktion" | "bestellungen" | "abwicklung" | "monatsbox" | "messe" | "partnerauswertung" }) {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        {packing
          ? <span className="brand"><Leaf size={21} aria-hidden="true" /> Wolff’s Naturkosmetik</span>
          : <a className="brand" href="/"><Leaf size={21} aria-hidden="true" /> Wolff’s Naturkosmetik</a>}
        {!packing && <nav className="main-nav" aria-label="Hauptnavigation">
          <a href="/" aria-current={active === "produktion" ? "page" : undefined}>Produktion</a>
          <a href="/bestellungen" aria-current={active === "bestellungen" ? "page" : undefined}>Bestellungen</a>
          <a href="/abwicklung" aria-current={active === "abwicklung" ? "page" : undefined}>Abwicklung</a>
          <a href="/monatsbox" aria-current={active === "monatsbox" ? "page" : undefined}>Monatsbox</a>
          <a href="/messe" aria-current={active === "messe" ? "page" : undefined}>Messe</a>
          <a href="/partnerauswertung" aria-current={active === "partnerauswertung" ? "page" : undefined}>Partnerauswertung</a>
        </nav>}
        <form action={signOut}><button className="secondary">Abmelden</button></form>
      </div>
    </header>
  );
}
