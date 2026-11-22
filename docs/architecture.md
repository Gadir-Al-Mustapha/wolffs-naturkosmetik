# Architektur

- **Next.js mit App Router und TypeScript.** In `app/` liegen Seiten, Formulare und serverseitige Aktionen. Fachlogik für Preise, Chargenzuteilung, Zahlungsfristen, Monatsboxen, Messen und die Partnerauswertung liegt in `lib/`.
- **Tailwind CSS 4.** Die Styles werden über PostCSS eingebunden. Die Gestaltungsrichtung steht in den [Entscheidungen](decisions.md).
- **SQLite mit Prisma 7.** Die App und die Prisma-Befehle verwenden standardmäßig `prisma/local.db`. Für eine separate Datenbank kann `WOLFFS_DATABASE_URL` gesetzt werden. Neue Änderungen am Datenmodell werden mit `npx prisma migrate dev` als Migration angelegt.
- **Rollen.** Die Verwaltung und die Packansicht verwenden unterschiedliche lokale Kennwörter. Die Packansicht lädt Auftragsnummer, Produkte, Stückzahlen und konkrete Chargen für packbereite Aufträge. Kundennamen, Adressen, Preise und Zahlungsdetails werden dort nicht geladen.

Die [README](../README.md) beschreibt die Einrichtung, den Start und die Anmeldung. `npm test` prüft alle fünf Geschäftsregeln sowie Zahlung und Übergabe, Monatsboxen, Messevorrat und Partnerauswertung. Die Datenbanktests verwenden temporäre SQLite-Dateien. `npm run build` erstellt die Produktionsfassung.

Wenn Turbopack in einer eingeschränkten Prüfumgebung keinen lokalen Port öffnen darf, lässt sich die Produktionsfassung dort mit `npm run build -- --webpack` prüfen.

## Bestellnachrichten und Zahlungserinnerungen

- **Privatbestellungen.** Beim verbindlichen Abschluss speichert die App einen Versandauftrag für die Bestellbestätigung. Fällige Zahlungserinnerungen nutzen dasselbe Versandpostfach und übernehmen die bei der Bestätigung erfasste E-Mail-Adresse. Im Standardbetrieb erscheinen beide Nachrichtenarten als lokale Testnachrichten. Im E-Mail-Modus nimmt ein eingerichtetes HTTPS-Gateway die Nachrichten an. Fehlt die Empfängeradresse, zeigt die Verwaltung unter **Bestellungen → Bestellnachrichten** einen Versandfehler. Die Einrichtung und den Gateway-Vertrag beschreibt die [README](../README.md#versand-von-privatbestätigungen-und-zahlungserinnerungen).
- **Hintergrundverarbeitung.** Der Versandlauf verarbeitet offene Aufträge beim Serverstart und danach alle fünf Sekunden. Die Zahlungsfristen werden beim Serverstart und danach einmal pro Minute geprüft. Vor jedem Versandversuch prüft die App erneut, ob die Zahlungserinnerung noch fällig ist. Beide Prüfungen setzen einen laufenden Server voraus.
- **Partnerbestellungen und Monatsboxen.** Beim verbindlichen Abschluss erzeugt die App automatisch eine Bestätigung im lokalen Postfach. Bei Partnerbestellungen enthält sie das Fälligkeitsdatum der Rechnung. Der optionale E-Mail-Versand für Bestellbestätigungen ist derzeit auf reguläre Privatbestellungen beschränkt. Hinweise zu überfälligen Partnerrechnungen erscheinen in der Verwaltung unter **Abwicklung**.
- **Anforderung an Partnerbestätigungen.** [SPEC § 5.2](../SPEC.md#52-rollen-einsichten-und-verantwortlichkeiten) fordert automatische Bestellbestätigungen allgemein. Die Formulierung umfasst damit auch Partnerbestellungen und lässt den Versandkanal offen. Die automatische Erstellung ist umgesetzt. Ob Partner die Bestätigung direkt erhalten sollen und welcher Kanal dafür genutzt wird, bleibt fachlich offen. Eine Pflicht zum E-Mail-Versand ergibt sich aus der SPEC nicht.

## Verbleibende Einschränkungen

- **DHL.** Die Inhaberin erstellt Etiketten mit Adresse außerhalb der App und markiert sie anschließend als bereit. Die Packhilfe bringt das vorbereitete Etikett an. Die Verwaltung erfasst die Trackingnummer. Die SPEC beschreibt diese Rollenverteilung und verlangt keine Schnittstelle für die Etikettenerstellung.
- **Offene Fachfragen.** Restposten werden markiert. Die Nachlasshöhe ist offen. Die Monatsbox verwendet derzeit den Festpreis mit 0 € Versandkosten. Ob bei DHL die reguläre Versandregel greifen soll, ist für das Abo offen. Weitere Festlegungen zu Rabatten, Reservierungen, Abo und Messe stehen in den [Entscheidungen](decisions.md).
