# Architektur

- **Next.js mit App Router und TypeScript.** In `app/` liegen Seiten, Formulare und serverseitige Aktionen. Fachlogik für Preise, Chargenzuteilung, Zahlungsfristen, Monatsboxen, Messen und die Partnerauswertung liegt in `lib/`.
- **Tailwind CSS 4.** Die Styles werden über PostCSS eingebunden. Die Gestaltungsrichtung steht in den [Entscheidungen](decisions.md).
- **SQLite mit Prisma 7.** Die App und die Prisma-Befehle verwenden standardmäßig `prisma/local.db`. Für eine separate Datenbank kann `WOLFFS_DATABASE_URL` gesetzt werden. Neue Änderungen am Datenmodell werden mit `npx prisma migrate dev` als Migration angelegt.
- **Rollen.** Die Verwaltung und die Packansicht verwenden unterschiedliche lokale Kennwörter. Die Packansicht lädt Auftragsnummer, Produkte, Stückzahlen und konkrete Chargen für packbereite Aufträge. Kundennamen, Adressen, Preise und Zahlungsdetails werden dort nicht geladen.

Die [README](../README.md) beschreibt die Einrichtung, den Start und die Anmeldung. `npm test` prüft alle fünf Geschäftsregeln sowie Zahlung und Übergabe, Monatsboxen, Messevorrat und Partnerauswertung. Die Datenbanktests verwenden temporäre SQLite-Dateien. `npm run build` erstellt die Produktionsfassung.

Wenn Turbopack in einer eingeschränkten Prüfumgebung keinen lokalen Port öffnen darf, lässt sich die Produktionsfassung dort mit `npm run build -- --webpack` prüfen.

## Verbleibende Einschränkungen

- **Nachrichten.** F-002 verarbeitet Bestellbestätigungen über ein dauerhaftes Versandpostfach mit lokalem Testmodus und optionalem HTTPS-Gateway. Zahlungserinnerungen erscheinen im lokalen Testpostfach. Die Fristenprüfung läuft beim Serverstart und danach einmal pro Minute, solange der Server läuft.
- **DHL.** Die Inhaberin erstellt Etiketten mit Adresse außerhalb der App und markiert sie anschließend als bereit. Die Packhilfe bringt das vorbereitete Etikett an. Die Verwaltung erfasst die Trackingnummer. Die SPEC beschreibt diese Rollenverteilung und verlangt keine Schnittstelle für die Etikettenerstellung.
- **Offene Fachfragen.** Restposten werden markiert. Die Nachlasshöhe ist offen. Die Monatsbox verwendet derzeit den Festpreis mit 0 € Versandkosten. Ob bei DHL die reguläre Versandregel greifen soll, ist für das Abo offen. Weitere Festlegungen zu Rabatten, Reservierungen, Abo und Messe stehen in den [Entscheidungen](decisions.md).
