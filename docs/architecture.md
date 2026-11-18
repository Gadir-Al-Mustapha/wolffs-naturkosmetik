# Architektur

Stand: 18. November 2026

- **Next.js mit App Router und TypeScript.** Die Seiten liegen in `app/`. So können Oberfläche und serverseitige Abläufe in einem Projekt entwickelt werden. TypeScript prüft die Datenstrukturen zwischen diesen Teilen. [Next.js-Dokumentation](https://nextjs.org/docs/app/getting-started/installation)
- **Tailwind CSS 4.** Die Styles werden über PostCSS eingebunden. Das ermöglicht einheitliche Abstände, Farben und Zustände ohne separate UI-Bibliothek. Die Gestaltungsrichtung wird mit dem ersten fachlichen Ablauf festgelegt.
- **SQLite mit Prisma 7.** Die lokale Datenbank liegt in `prisma/local.db` und braucht keinen eigenen Server. Die Verbindung steht in `prisma.config.ts`. Das erste fachliche Datenmodell, der SQLite-Treiber für den Prisma-Client und die erste Migration kommen mit F-001. Änderungen am Datenmodell werden mit `npx prisma migrate dev` als Migration gespeichert.

## Lokal starten

Mit einer für Prisma 7 unterstützten Node.js-Version, etwa Node.js 22 ab 22.12:

```sh
npm ci
npm run dev
```

Die Startseite ist unter <http://localhost:3000> erreichbar. Für sie wird noch keine Datenbankdatei benötigt. `npm run build` erstellt die Produktionsfassung.
