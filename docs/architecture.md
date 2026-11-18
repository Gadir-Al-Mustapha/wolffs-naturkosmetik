# Architektur

Stand: 18. November 2026

- **Next.js mit App Router und TypeScript.** Die Seiten liegen in `app/`. So können Oberfläche und serverseitige Abläufe in einem Projekt entwickelt werden. TypeScript prüft die Datenstrukturen zwischen diesen Teilen. [Next.js-Dokumentation](https://nextjs.org/docs/app/getting-started/installation)
- **Tailwind CSS 4.** Die Styles werden über PostCSS eingebunden. Die Gestaltungsrichtung für F-001 steht in [docs/decisions.md](decisions.md).
- **SQLite mit Prisma 7.** Die lokale Datenbank liegt in `prisma/local.db` und braucht keinen eigenen Server. Prisma CLI und App greifen über `prisma.config.ts` beziehungsweise `lib/db.ts` darauf zu. Änderungen am Datenmodell werden mit `npx prisma migrate dev` als Migration gespeichert.

## Lokal starten

Mit einer für Prisma 7 unterstützten Node.js-Version, etwa Node.js 22 ab 22.18:

```sh
npm ci
npx prisma migrate dev
npx prisma generate
npm run dev
```

Die Produktionsansicht ist unter <http://localhost:3000> erreichbar. `npm test` prüft die Bestandsregeln und die Allergenangaben je Charge. `npm run build` erstellt die Produktionsfassung.
