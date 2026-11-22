# Wolff’s Naturkosmetik

Die App verwaltet Produktion und Chargen, Bestellungen, Zahlungen und Übergaben. Sie unterstützt außerdem Monatsboxen, Messevorräte und die Auswertung von Partnerbestellungen.

## Lokal starten

Voraussetzung ist Node.js 22 ab Version 22.18 mit npm. Das Kennwortbeispiel nutzt OpenSSL. Führe im Projektordner aus:

```sh
npm ci
npx prisma migrate deploy
npx prisma generate
```

Die Migrationen erstellen beim ersten Start eine leere SQLite-Datenbank unter `prisma/local.db`. Ein eigener Datenbankserver ist nicht nötig.

Setze im selben Terminal zwei unterschiedliche Kennwörter und starte die App:

```sh
export OWNER_APPROVAL_SECRET="$(openssl rand -hex 24)"
export PACKING_SECRET="$(openssl rand -hex 24)"
printenv OWNER_APPROVAL_SECRET PACKING_SECRET
npm run dev
```

Die Ausgabe zeigt zuerst das Kennwort für die Verwaltung und dann das Kennwort für die Packansicht. Verwende die erzeugten Kennwörter nur lokal und speichere sie nicht im Repository.

- [Verwaltung öffnen](http://localhost:3000) und mit `OWNER_APPROVAL_SECRET` anmelden. Unter **Produktion** zuerst einen Inhaltsstoff, dann ein Produkt und anschließend eine Charge anlegen. Danach kann unter **Bestellungen** eine Bestellung mit neuer Kundschaft erfasst werden.
- [Packansicht öffnen](http://localhost:3000/packen) und in einem privaten Browserfenster mit `PACKING_SECRET` anmelden. Hier erscheinen freigegebene Packaufträge. Die Verwaltung prüft Zahlung und Übergabe unter **Abwicklung**.

## Versand von Privatbestätigungen und Zahlungserinnerungen

Standardmäßig läuft der Versand lokal. Unter **Bestellungen → Bestellnachrichten** zeigt die Verwaltung die Nachricht nach der Hintergrundverarbeitung als Testnachricht an. Verwende für lokale Prüfungen fiktive Bestellungen.

Zahlungserinnerungen verwenden die E-Mail-Adresse aus der Bestellbestätigung. Fehlt sie im E-Mail-Modus, erscheint ein Versandfehler unter **Bestellnachrichten**.

Für E-Mail müssen beim Start drei Umgebungsvariablen gesetzt werden.

| Variable | Bedeutung |
| --- | --- |
| `WOLFFS_MESSAGE_CHANNEL` | `email` wählt E-Mail, `local` wählt den lokalen Testmodus. |
| `WOLFFS_MESSAGE_GATEWAY_URL` | HTTPS-Adresse des eingerichteten Versand-Gateways ohne eingebettete Zugangsdaten oder URL-Parameter. |
| `WOLFFS_MESSAGE_GATEWAY_TOKEN` | Zugriffstoken aus der Laufzeitumgebung. |

Das Gateway erhält einen POST mit den JSON-Feldern `to`, `subject` und `text`, einem Bearer-Token und einem `Idempotency-Key`. Es muss die Annahme dauerhaft je Schlüssel speichern, parallele und wiederholte Anfragen mit demselben Schlüssel höchstens einmal zur Zustellung annehmen und erneute Anfragen für bereits angenommene Nachrichten mit 2xx beantworten. Das gilt auch nach Neustarts und längeren Ausfällen. Bei 2xx gilt die Nachricht in der App als vom Dienst angenommen. Das Gateway legt den Absender fest und kümmert sich um die Zustellung. Der E-Mail-Modus setzt ein Gateway voraus, das diesen Vertrag erfüllt.

## Tests und Produktionsbuild

```sh
npm test
npm run build
npm start
```

Beende den Entwicklungsserver vor `npm start`. Der Produktionsserver verwendet dieselben Kennwortvariablen und dieselbe lokale Datenbank.

## Dokumentation

- [Architektur und Einschränkungen](docs/architecture.md)
- [Fachliche Spezifikation](SPEC.md)
- [Feature-Backlog](docs/backlog.md)
- [Entscheidungen](docs/decisions.md)
