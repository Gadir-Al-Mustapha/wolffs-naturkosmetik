# SPEC.md – Wolff's Naturkosmetik (K6)

**Version:** 1.0 – Arbeitsfassung nach Meeting 1  
**Stand:** 07.11.2026  
**Kundin:** Nina Wolff  
**Quellengrundlage:** eigenes Kundeninterview, Meeting 1, Antworten **M1-A1 bis M1-A12** (12 Nachrichten).  
**Status:** Noch **nicht final**. Offene Details und Modellannahmen sind in Meeting 2 zu prüfen.

## 1. Ausgangssituation und Ziel

Nina Wolff verkauft Naturkosmetik bisher überwiegend über Instagram-Direktnachrichten. Sie verwaltet Produkte, Chargen und Bestellungen manuell in Excel und überprüft Zahlungen selbst. Dabei entstehen Fehler bei Preisen, Rabatten, Beständen und Versand. Wiederverkäufer erhalten gesonderte Konditionen. Die App soll diese Abläufe nachvollziehbar abbilden und vermeidbare manuelle Arbeit reduzieren. **Belege:** M1-A1, A2, A4, A6, A10.

**Ziel für die erste Version (v1):** Bestellungen mit Positionen, Kundenarten, Preis- und Versandlogik, chargenbezogenem Bestand, Inhaltsstoffinformationen sowie Zahlungs- und Übergabestatus verwalten. Die genaue Ausgestaltung wird nach Meeting 2 präzisiert.

## 2. Entitäten (8) und Attribute

Die Schlüssel sind eindeutige Identifikatoren des jeweiligen Datentyps. Vorgeschlagene technische IDs sind **Modellierungsentscheidungen**, keine wörtlichen Kundenangaben.

| Nr. | Entität | Attribute (Schlüssel fett) | Beleg |
|---|---|---|---|
| E1 | **Kunde** | **kunden_id**, name, kundenart (B2C/B2B), ist_stammkundin, b2b_rabatt_prozent (optional) | M1-A1, A2, A6 |
| E2 | **Produkt** | **produkt_id**, bezeichnung, standardpreis_eur, verfuegbarkeitsstatus | M1-A1, A2, A4 |
| E3 | **Charge** | **charge_id**, produkt_id, herstellungsdatum, mindesthaltbarkeitsdatum, bestand_stueck | M1-A4, A5 |
| E4 | **Inhaltsstoff** | **inhaltsstoff_id**, bezeichnung, potentiell_allergen, hinweistext | M1-A1, A5 |
| E5 | **Bestellung** | **bestellung_id**, kunden_id, bestellzeitpunkt, bestellstatus, gesamtbetrag_eur | M1-A1–A3, A10 |
| E6 | **Bestellposition** | **position_id**, bestellung_id, produkt_id, anzahl, einzelpreis_eur | M1-A1, A2, A7 |
| E7 | **Zahlung** | **zahlung_id**, bestellung_id, zahlungsart, zahlungsstatus, faellig_am (optional) | M1-A1, A6, A10 |
| E8 | **Übergabe** | **uebergabe_id**, bestellung_id, uebergabeart (zunächst DHL/Abholung), status, trackingnummer (optional) | M1-A1, A12 |

**Modellhinweise:**
- E6 erfasst die verschiedenen Produkte und Mengen innerhalb einer Bestellung; die vereinbarten Preise werden bei der Position festgehalten.
- E4 beschreibt Inhaltsstoffe als wiederverwendbare Objekte. Da Nina Abweichungen zwischen Chargen nennt, muss die **tatsächliche Rezeptur je Charge** berücksichtigt werden (M1-A5).
- „Übergabe“ ist bewusst ein vorläufiger Oberbegriff: Neben DHL und Abholung sind laut M1-A12 weitere Fälle möglich; diese werden in Meeting 2 geklärt.
- Rabattcodes und Benutzerrollen sind bisher noch **keine eigenen Entitäten**. Ob sie später gesondert modelliert werden müssen, ist offen.

## 3. Beziehungen (8)

Die Kardinalitäten bezeichnen, wie viele Objekte jeweils zugeordnet sein können. Wo der Kunde keine eindeutige Aussage machte, sind sie **vorläufige Modellannahmen**, die nachzufragen sind.

| Nr. | Beziehung und Kardinalität | Bedeutung | Beleg / Sicherheit |
|---|---|---|---|
| B1 | **Kunde 1 : n Bestellung** | Ein Kunde kann mehrere Bestellungen haben; jede Bestellung gehört einem Kunden. | M1-A1, A6; plausibel |
| B2 | **Bestellung 1 : n Bestellposition** | Eine Bestellung enthält eine oder mehrere Positionen. | M1-A1, A7; plausibel |
| B3 | **Produkt 1 : n Bestellposition** | Dasselbe Produkt kann in verschiedenen Bestellungen vorkommen. | M1-A1, A7; plausibel |
| B4 | **Produkt 1 : n Charge** | Ein Produkt kann in mehreren Produktionschargen vorliegen. | M1-A4; bestätigt |
| B5 | **Produkt n : m Inhaltsstoff** | Die normale Rezeptur eines Produkts besteht aus mehreren Inhaltsstoffen; ein Inhaltsstoff kann in mehreren Produkten stecken. | M1-A5; plausibel |
| B6 | **Charge n : m Inhaltsstoff** | Die Inhaltsstoffzusammensetzung kann pro Charge von der Grundrezeptur abweichen. | M1-A5; fachlich begründet, Detailmodell offen |
| B7 | **Bestellung 1 : 0..1 Zahlung** | Der zugehörige Zahlungsstatus wird einer Bestellung zugeordnet. | M1-A10; **Annahme:** keine Teilzahlungen |
| B8 | **Bestellung 1 : 0..1 Übergabe** | Eine Bestellung wird versendet oder auf andere Weise übergeben. | M1-A1, A12; **Annahme:** eine Übergabe je Bestellung |

**Mindestens eine n:m-Beziehung:** B5 und B6 erfüllen diese Anforderung. Zusätzlich ergibt sich fachlich **Bestellung n:m Produkt**, aufgelöst durch die Entität **Bestellposition** (B2 + B3).

**Noch zu klären:** Welche **konkrete Charge** erfüllt eine Bestellposition? Ob eine Position auf mehrere Chargen verteilt werden darf, ist aus M1-A4 nicht eindeutig. Diese Zuordnung muss vor der Umsetzung ergänzt werden.

## 4. Business Rules (5 zentrale Regelkomplexe)

Die folgenden fünf Regelkomplexe sind aus Kundenantworten abgeleitet. Einzelheiten ohne ausdrückliche Bestätigung werden nicht als feststehend ausgegeben.

**BR1 – Versandkosten nach Kundenart und Bestellwert**  
Bei **B2C-Bestellungen** werden normalerweise **3,90 €** Versandkosten erhoben; **ab 39 € Bestellwert** ist der Versand kostenlos. Für **B2B-Partner** ist der Versand unabhängig vom Bestellwert kostenlos.  
**Belege:** M1-A2, A6. **Offen:** Ob der Schwellenwert vor oder nach Rabatten geprüft wird und welche Kosten bei Abholung gelten.

**BR2 – Stammkundenrabatt und Rabattcodes**  
Berechtigte Stammkundinnen erhalten **10 % Rabatt**. Ein Aktions-Rabattcode kann zusätzlich angewendet werden, **außer der Code ist ausdrücklich als nicht kombinierbar gekennzeichnet**. Die Kombinierbarkeit soll pro Aktion festlegbar sein.  
**Belege:** M1-A2, A3. **Offen:** Berechnungsreihenfolge mehrerer prozentualer Nachlässe und Anwendung auf Versandkosten.

**BR3 – B2B-Mindestmenge und genehmigte Ausnahme**  
Der **B2B-Preis gilt ab 50 Einheiten insgesamt je Bestellung**, auch wenn diese aus mehreren Produkten bestehen. Bei **weniger als 50 Einheiten gilt grundsätzlich der B2C-Preis**. Nur **Nina** darf eine Ausnahme ausdrücklich genehmigen; dabei muss ein **Grund als Pflichtangabe** dokumentiert werden. B2B-Konditionen und Rabatte sind partnerindividuell.  
**Belege:** M1-A6, A7, A8.

**BR4 – Chargenreihenfolge und MHD-Sonderfall**  
Bei mehreren Chargen desselben Produkts sollen die **älteren Chargen zuerst** ausgegeben werden. Bei einer Charge mit **weniger als 30 Tagen Restlaufzeit bis zum MHD** bietet Nina die Ware reduziert als Restposten an. Der aktuelle Bestand soll pro Charge erfasst werden.  
**Belege:** M1-A4. **Offen:** genaue Vergabelogik nach Herstellungsdatum oder MHD, Höhe des Restpostenrabatts und Umgang mit abgelaufener Ware.

**BR5 – Aktive Allergenbestätigung**  
Bei Produkten mit **potenziell allergenen Inhaltsstoffen** müssen die Informationen vor der Bestellung sichtbar sein; der Kunde muss **aktiv bestätigen**, dass er sie gelesen hat, bevor die Bestellung abgeschlossen wird. Chargenabhängige Abweichungen in der Zusammensetzung müssen dokumentierbar sein.  
**Belege:** M1-A1, A5. **Offen:** genauer Bezug der Bestätigung zur konkret ausgewählten Charge.

### Weitere bestätigte Prozessangaben (nicht als zusätzliche BR nummeriert)

- B2B-Partner bezahlen laut Nina **auf Rechnung mit 30 Tagen Zahlungsziel** (M1-A6, A10).
- Privatkunden senden bislang Überweisungsnachweise per Instagram; der tatsächliche Geldeingang wird teils erst später abgeglichen. Die App soll offene Zahlungen und Zahlungsstatus sichtbar machen (M1-A1, A10).
- Nina nimmt Bestellungen an, bestätigt Preise und kommuniziert mit Kundinnen. Mutter und Freundin Jessi helfen beim Verpacken und Etikettieren. Sie sollen allenfalls Packaufträge, nicht jedoch Preise oder Kundendaten sehen (M1-A9). Das konkrete Rollenmodell ist noch zu präzisieren.
- Bei ausverkauften Produkten kam es bislang zu Fehlbestellungen. Verfügbarkeiten müssen im Bestellprozess zuverlässig sichtbar sein (M1-A4).

## 5. Widersprüche und Auflösung (2)

**W1 – Rabatte werden uneinheitlich kombiniert**  
**Aussage/Problem:** Nina hat Rabattcodes und Stammkundenrabatte bisher teilweise zusammen und teilweise alternativ angewendet (M1-A2, A3).  
**Klärung:** Sie legt in M1-A3 fest: **10 % Stammkundenrabatt gelten grundsätzlich; ein Rabattcode kommt hinzu, sofern er nicht als „nicht kombinierbar“ markiert ist.**  
**Konsequenz für v1:** Kombinierbarkeit einer Aktion ist explizit zu speichern; die genaue Rechenreihenfolge ist noch offen.

**W2 – B2B-Mindestmenge vs. Kulanzbestellung**  
**Aussage/Problem:** Zunächst gilt unter **50 Einheiten** der normale B2C-Preis (M1-A6), zugleich berichtet Nina von einem neuen Wiederverkäufer, der einmalig **30 Einheiten zum B2B-Preis** erhielt (M1-A7).  
**Klärung:** In M1-A8 bestätigt Nina: Die Grundregel wird **automatisch** durchgesetzt; nur **sie selbst** kann mit **pflichtiger Begründung** eine Ausnahme freigeben.  
**Konsequenz für v1:** Keine stillschweigende Ausnahme; dokumentierte, ausdrücklich genehmigte Übersteuerung.

**Noch nicht als aufgelöster Widerspruch gewertet:** „DHL ist Standard“ gegenüber weiteren Übergabearten (M1-A1, A12). Die konkreten Sonderfälle müssen in Meeting 2 erfragt werden.

## 6. Prioritäten (vorläufig)

| Priorität | Umfang | Grundlage |
|---|---|---|
| **v1 / Muss** | Produkte, Kunden, Bestellungen mit Positionen; B2C-/B2B-Preislogik und Ausnahmen; Bestände nach Charge; Inhaltsstoffe und Allergenbestätigung; Zahlungs- und Übergabestatus | M1-A1–A10 |
| **v1 / zu klären** | Weitere Übergabearten und Bedingungen; Rollen-/Packansicht; konkrete Berechnungsreihenfolge und Zahlungsfreigabe | M1-A3, A9, A10, A12 |
| **später / vorläufig** | Messebestände; erweiterte B2B-Auswertung; Abo-Box „Self-Care-Monthly“ mit vier Produkten für 39 € monatlich | M1-A8, A11 |

Die Einstufung „v1“ bzw. „später“ ist ein **Arbeitsvorschlag**, nicht bereits die ausdrückliche Freigabe von Nina. Besonders die Abo-Box gilt **noch nicht** als bestätigte neue Anforderung aus Meeting 2.

## 7. Offene Fragen für Meeting 2

1. **Übergabe:** Welche konkreten Alternativen zu DHL gibt es (Abholung, persönliche Übergabe, weitere)? Wer entscheidet, und welche Gebühren oder Status gelten? (M1-A12)
2. **Preiskalkulation:** Sind die 39 € vor oder nach Stammkunden-/Aktionsrabatt maßgeblich? Wie werden beide Rabatte der Reihenfolge nach angewendet? (M1-A2, A3)
3. **Zahlung/Versand:** Unter welchen Bedingungen darf vor bestätigtem Geldeingang gepackt oder übergeben werden? Gibt es feste Fristen für Zahlungserinnerung und Stornierung? (M1-A10)
4. **Chargen:** Bedeutet „ältere zuerst“ immer frühestes Herstellungsdatum oder tatsächlich kürzestes MHD? Wie wird bei überschrittenem MHD gehandelt? (M1-A4)
5. **Allergene:** Welche Inhaltsstoffinformationen gelten im Bestellvorgang bei chargenbedingten Rezepturänderungen, und wann genau ist die Bestätigung erforderlich? (M1-A5)
6. **B2B-Ausnahme:** Gelten bei einer genehmigten Bestellung unter 50 Stück weiterhin kostenloser B2B-Versand und 30 Tage Zahlungsziel? (M1-A6–A8)
7. **Berechtigungen:** Welche Angaben müssen Mama/Jessi auf einem Packauftrag sehen, damit sie packen können, ohne unzulässige Kundendaten oder Preise zu erhalten? (M1-A9)
8. **Neue Anforderung in Meeting 2:** Die vorgeschriebene Zukunftsfrage ausdrücklich **im selben Chat in Meeting 2** stellen: „Was planst du als Nächstes?“; die Antwort von den bereits genannten Zukunftsideen aus M1-A11 trennen.

## 8. Nächste Arbeitsschritte

1. **Diese Arbeitsfassung als `SPEC.md` (Version 1)** im öffentlichen GitHub-Repository im Hauptverzeichnis ablegen (Commit-Nachricht: `SPEC.md v1 nach Meeting 1`).
2. **Meeting 2 im bestehenden K6-Chat** führen: 8 weitere Nachrichten, gezielt nach offenen Punkten fragen und die Zukunftsfrage dort stellen. Die Antworten als **M2-A1 bis M2-A8** dokumentieren.
3. Die SPEC.md anhand der tatsächlichen Aussagen überarbeiten und Entitäten, Beziehungen/Kardinalitäten, genau fünf zentrale Regelkomplexe, zwei Widerspruchsauflösungen, Prioritäten und offene Fragen mit dem professoralen **Anforderungsmodell** abgleichen.
4. **Version 2 der `SPEC.md`** mit dem Commit `SPEC.md v2 nach Meeting 2` auf GitHub sichern. Den **öffentlichen Repo-Link** bis **08.11.2026, 23:59 Uhr**, in Moodle einreichen.

> **Abgrenzung:** Diese Version modelliert Anforderungen (ER-Modell-Niveau). Relationale Tabellen, Programmcode und externe Anbindungen gehören noch nicht zu dieser Abgabe.
