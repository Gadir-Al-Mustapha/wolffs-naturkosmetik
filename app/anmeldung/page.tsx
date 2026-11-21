import { Leaf } from "lucide-react";
import { FulfillmentForm } from "../fulfillment-form";
import { signIn } from "./actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ bereich?: string }> }) {
  const packing = (await searchParams).bereich === "packen";
  return (
    <main className="shell allergen-page">
      <div className="page-heading">
        <div><span className="brand"><Leaf size={21} aria-hidden="true" /> Wolff’s Naturkosmetik</span>
          <h1>{packing ? "Packansicht" : "Verwaltung"}</h1></div>
      </div>
      <section className="panel">
        <h2>Anmelden</h2>
        <FulfillmentForm action={signIn} label="Anmelden">
          <input type="hidden" name="role" value={packing ? "packer" : "owner"} />
          <label className="field">Kennwort <input name="password" type="password" required autoComplete="current-password" /></label>
        </FulfillmentForm>
        <p><a className="text-link" href={packing ? "/anmeldung" : "/anmeldung?bereich=packen"}>
          {packing ? "Zur Verwaltung" : "Zur Packansicht"}
        </a></p>
      </section>
    </main>
  );
}
