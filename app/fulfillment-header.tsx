import { Leaf } from "lucide-react";
import { signOut } from "./anmeldung/actions";

export function FulfillmentHeader({ packing }: { packing?: boolean }) {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <span className="brand"><Leaf size={21} aria-hidden="true" /> Wolff’s Naturkosmetik</span>
        {!packing && <nav className="main-nav" aria-label="Hauptnavigation">
          <a href="/">Produktion</a><a href="/bestellungen">Bestellungen</a>
          <a href="/abwicklung" aria-current="page">Abwicklung</a>
        </nav>}
        <form action={signOut}><button className="secondary">Abmelden</button></form>
      </div>
    </header>
  );
}
