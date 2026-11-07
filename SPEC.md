# SPEC.md – Wolff's Naturkosmetik (K6)

**Version:** 2.0 – überarbeitet nach Meeting 1 und Meeting 2  
**Stand:** 07.11.2026  
**Kundin:** Nina Wolff (K6 – Wolff's Naturkosmetik)  
**Grundlage:** Eigenes Interview mit K6; **Meeting 1: M1-A1 bis M1-A12 (12 Nachrichten)**, **Meeting 2: M2-A1 bis M2-A8 (8 Nachrichten)**, insgesamt 20 Nachrichten im selben Kundenchat.  
**Status:** Anforderungsmodell zur Abgabe; verbleibende fachliche Unklarheiten stehen ausdrücklich in Abschnitt 8.

## 1. Geschäftskontext, Problem und Ziel

Nina Wolff produziert und verkauft Naturkosmetik, vor allem über Instagram-Direktnachrichten. Produktpreise, Lagerbestände und Bestellungen werden manuell bzw. in Excel geführt; Rezepturen liegen zum Teil handschriftlich vor. Zahlungen, Versand und Kundenkommunikation erfordern viele Einzelschritte. Das führt zu falschen Preisen, vergessenen Rabatten oder Versandkosten, ungenauen Beständen und verspäteten Zahlungskontrollen. Neben Privatkundinnen (B2C) beliefert Nina Wiederverkäufer (B2B) mit individuellen Konditionen. Beim Verpacken helfen ihre Mutter und Jessi. **Belege:** M1-A1, A2, A4–A6, A9–A10.

**Ziel:** Die App soll den Weg von der Bestellung bis zur Zahlung und Übergabe nachvollziehbar unterstützen. Besonders wichtig sind korrekte Preis- und Versandentscheidungen, die Zuordnung zu konkreten Produktchargen, eine nachvollziehbare Allergenbestätigung, Zahlungsüberwachung sowie rollenabhängige Arbeitsansichten. **Belege:** M1-A1–A10; M2-A2–A8.

**Abgrenzung:** Diese SPEC beschreibt das **fachliche Anforderungsmodell (ER-Modell-Ebene)**, nicht bereits Datenbanktabellen, Programmiersprache, Layouts oder Schnittstellen. Technische IDs und optionale Statusbezeichnungen sind **Modellierungsvorschläge** und keine wörtlichen Aussagen von Nina.

## 2. Entitäten (8) und Attribute

Jede Entität steht für einen identifizierbaren Datentyp des Geschäfts. Der fett markierte Schlüssel identifiziert einzelne Datensätze eindeutig; Umfang jeweils 3–5 Attribute.

| Nr. | Entität | Attribute (Schlüssel fett) | Fachliche Begründung / Belege |
|---|---|---|---|
| E1 | **Kunde** | **kunden_id**, name, kundenart (B2C/B2B), stammkundenstatus, partnerkondition | Privatkundinnen, Stammkundinnen und Wiederverkäufer erhalten unterschiedliche Konditionen (M1-A1–A3, A6; M2-A4). |
| E2 | **Produkt** | **produkt_id**, bezeichnung, standardpreis_eur, verfuegbarkeitsstatus | Produkte werden bestellt und können ausverkauft sein; Preise bisher nicht zentral gepflegt (M1-A1, A2, A4). |
| E3 | **Charge** | **charge_id**, produkt_id, herstellungsdatum, mindesthaltbarkeitsdatum, bestand_stueck | Ein Produkt besitzt mehrere Chargen mit eigenem Bestand und MHD (M1-A4; M2-A7). |
| E4 | **Inhaltsstoff** | **inhaltsstoff_id**, bezeichnung, potenziell_allergen, hinweistext | Inhaltsstoffe und mögliche Allergene sind chargenbezogen nachzuweisen (M1-A5; M2-A7). |
| E5 | **Bestellung** | **bestellung_id**, kunden_id, bestellzeitpunkt, bestellstatus, gesamtbetrag_eur | Eine Bestellung verbindet Kundin, Artikel, Kalkulation und Abwicklung (M1-A1–A3, A10; M2-A5–A6). |
| E6 | **Bestellposition** | **position_id**, bestellung_id, produkt_id, anzahl, vereinbarter_einzelpreis_eur | Eine Bestellung kann mehrere Produkte und Stückzahlen enthalten (M1-A1, A7; M2-A7). |
| E7 | **Zahlung** | **zahlung_id**, bestellung_id, zahlungsart, zahlungsstatus, faellig_am | Zahlungseingänge, Fristen, Mahnungen und offene Forderungen müssen verfolgt werden (M1-A10; M2-A5–A6). |
| E8 | **Übergabe** | **uebergabe_id**, bestellung_id, uebergabeart, uebergabestatus, trackingnummer_optional | DHL, persönliche Übergabe und eigene Fahrradlieferung müssen unterschieden werden (M1-A1, A12; M2-A2). |

**Modellhinweise:**

- `partnerkondition` bei **Kunde** ist zunächst ein fachlicher Platzhalter für individuelle B2B-Preise/Rabatte, nicht die Entscheidung für ein einzelnes Datenbankfeld. Je Partner wurden z. B. 15 % oder 20 % genannt. **Beleg:** M1-A6.
- Der Bestand wird **pro Charge** und nicht nur als globale Produktzahl geführt. Die verfügbare Menge des Produkts lässt sich daraus ableiten. **Belege:** M1-A4; M2-A7.
- Die **Bestellposition–Charge-Zuordnung** und die **tatsächliche Rezeptur pro Charge** werden zunächst als Beziehungen mit eigenen Angaben beschrieben (Abschnitt 3); sie benötigen fachlich keine neunte Entität in dieser Modellstufe.
- **Abo-Box / Abonnement** ist eine in Meeting 2 ausdrücklich bestätigte Erweiterungsanforderung (Abschnitt 7). Ob dafür später ein eigener Entitätstyp ergänzt wird, gehört in die nächste Modellierungsstufe und wird nicht als neunte Kernentität ausgegeben.

## 3. Beziehungen (9) mit Kardinalitäten

`1:n` = ein Datensatz steht mit mehreren anderen in Beziehung. `n:m` = auf beiden Seiten sind mehrere Zuordnungen möglich. Wo Nina die Anzahl nicht festgelegt hat, wird die gewählte Kardinalität als **Modellannahme** gekennzeichnet.

| Nr. | Beziehung | Kardinalität | Bedeutung / Zuordnungsangaben | Belege und Status |
|---|---|---|---|---|
| B1 | Kunde – Bestellung | **1:n** | Ein Kunde kann mehrere Bestellungen tätigen; eine Bestellung gehört zu einem Kunden. | M1-A1, A6; naheliegende Modellannahme |
| B2 | Bestellung – Bestellposition | **1:n** | Eine Bestellung enthält eine oder mehrere Positionen. | M1-A1, A7; Modellannahme |
| B3 | Produkt – Bestellposition | **1:n** | Ein Produkt kann in vielen Bestellpositionen vorkommen; eine Position benennt ein Produkt. | M1-A1, A7; Modellannahme |
| B4 | Produkt – Charge | **1:n** | Ein Produkt besitzt mehrere Produktionschargen; eine Charge gehört zu einem Produkt. | M1-A4; bestätigt |
| B5 | Produkt – Inhaltsstoff (Grundrezeptur) | **n:m** | Ein Produkt kann viele Inhaltsstoffe enthalten; ein Inhaltsstoff in mehreren Produkten vorkommen. | M1-A5; fachlich abgeleitet |
| B6 | Charge – Inhaltsstoff (Ist-Rezeptur) | **n:m** | Je Charge wird die tatsächlich verwendete Zusammensetzung erfasst, auch bei Substitutionen. | M1-A5, M2-A7; bestätigt im Grundsatz |
| B7 | Bestellposition – Charge | **n:m** | Eine Position kann aus mehreren Chargen erfüllt werden; eine Charge kann mehrere Positionen bedienen. **Beziehungsattribut: zugeordnete_menge**. | M2-A7; ausdrücklich bestätigt |
| B8 | Bestellung – Zahlung | **1:0..1** | Einer Bestellung wird vorerst ein Zahlungsvorgang mit Status und Fälligkeit zugeordnet. | M1-A10, M2-A5–A6; **Annahme: keine Teilzahlungen** |
| B9 | Bestellung – Übergabe | **1:0..1** | Eine Bestellung erhält eine Übergabeart und einen entsprechenden Status. | M1-A1, A12, M2-A2; **Annahme: eine Übergabe je Bestellung** |

**Abgeleitete n:m-Beziehung:** **Bestellung n:m Produkt** entsteht über die **Bestellposition** (B2 + B3). Damit sind sowohl die direkte Chargenzuordnung (B7) als auch die notwendige n:m-Beziehung fachlich abgedeckt.

**Dokumentation der Allergenbestätigung:** Bezogen auf die konkrete Bestellung und jede ihr über B7 zugewiesene Charge soll festgehalten werden, **welche Chargeninformationen welcher Kunde aktiv bestätigt hat und wann**. Die Bestätigung ist ein fachlicher Vorgang/Beziehungsnachweis; das endgültige technische Speichermodell bleibt offen. **Belege:** M1-A5; M2-A7.

## 4. Business Rules – genau fünf zentrale Regelkomplexe

Die folgenden fünf **BR** sind die zentralen, aus dem Interview abgeleiteten Geschäftsregelkomplexe. Weitere Arbeitsabläufe und Berechtigungen stehen getrennt in Abschnitt 5, ohne neue BR-Nummern.

### BR1 – Übergabe und Versandkosten

**Wenn** die Übergabe per **DHL** erfolgt, **dann** gilt:

- **B2B-Partner:** DHL-Versand **immer kostenlos**.
- **B2C-Stammkundinnen:** DHL-Versand **immer kostenlos**, unabhängig vom Bestellwert.
- **Andere B2C-Kunden:** **3,90 €**, wenn der **Bestellwert nach allen anwendbaren Rabatten unter 39 €** liegt; bei **mindestens 39 €** kostenlos.

**Wenn** eine Bestellung persönlich übergeben oder von Nina per Fahrrad geliefert wird, **dann** fallen **keine Versandkosten** an. Bei DHL wird eine Trackingnummer geführt; bei persönlicher Übergabe und Fahrradlieferung ist keine DHL-Trackingnummer erforderlich. **Belege:** M1-A2, A6, A12; M2-A2–A4.

**Konkrete Klärung:** Ninas ursprüngliches Beispiel mit Lena (28 € Warenwert, 10 % Stammkundenrabatt) ergibt nach der **später verbindlich festgelegten** Regel **25,20 € ohne DHL-Versandkosten**. Die ältere Beispielrechnung von **29,10 €** aus M1-A3 war nur vor der Regeländerung gültig. **Belege:** M1-A3; M2-A4.

### BR2 – Stammkundenrabatt und Rabattcodes

**Wenn** ein B2C-Kunde als Stammkundin berechtigt ist, **dann** erhält er **10 % Treuerabatt**. Ein Aktions-Rabattcode darf **zusätzlich** gelten, **sofern der jeweilige Code nicht ausdrücklich als „nicht kombinierbar“ markiert ist**. Die Kombinierbarkeit wird **pro Aktion** festgelegt; die App darf nicht situativ zwischen unterschiedlichen Regeln wechseln. **Belege:** M1-A2–A3.

**Noch offen:** Exakte Verrechnungsreihenfolge zweier prozentualer Rabatte und mögliche Mehrfachcodes. Der DHL-Schwellenwert wird jedoch erst **nach** den tatsächlich anwendbaren Rabatten geprüft (BR1, M2-A4).

### BR3 – B2B-Mindestmenge, Partnerkonditionen und Ausnahmen

**Wenn** ein Wiederverkäufer **mindestens 50 Einheiten insgesamt pro Bestellung** bestellt (auch verteilt auf mehrere Produkte), **dann** gilt grundsätzlich sein individueller **B2B-Preis**. **Wenn** die Gesamtmenge **unter 50 Einheiten** liegt, **dann** gilt grundsätzlich der **B2C-Preis**. **Nur Nina** darf die Preisregel bei einer strategischen Ausnahme **aktiv übersteuern**; dafür ist **eine schriftliche Begründung als Pflichtangabe** zu erfassen. Partnerbezogene Preise/Rabatte bleiben individuell. **Belege:** M1-A6–A8.

**Ergänzende B2B-Konditionen:** Für B2B-Partner gelten grundsätzlich **kostenloser Versand** und **30 Tage Zahlungsziel** auf Rechnung. **Belege:** M1-A6, A10; M2-A4–A5. Die Verrechnung eines ausgehandelten B2B-Rabatts mit einem besonderen B2B-Grundpreis muss bei Bedarf noch konkretisiert werden.

### BR4 – Chargenbestände und MHD-basierte Entnahme

**Wenn** für dasselbe Produkt mehrere verfügbare Chargen existieren, **dann** wird **zuerst die Charge mit dem frühesten Mindesthaltbarkeitsdatum (MHD)** entnommen – **nicht zwingend die zuerst hergestellte Charge**. Nina beschreibt das als „MHD-basiert“; fachlich entspricht es dem **FEFO-Prinzip** (First Expired, First Out). Reicht eine Charge nicht aus, darf eine Bestellposition auf **mehrere Chargen** mit jeweiligen Mengen verteilt werden. **Belege:** M1-A4; M2-A7.

**Wenn** eine Charge **weniger als 30 Tage Restlaufzeit bis zum MHD** hat, **dann** wird sie als reduzierter Restposten betrachtet. Die Höhe des Nachlasses und der Umgang mit bereits abgelaufener Ware wurden **nicht** festgelegt. **Beleg:** M1-A4.

### BR5 – Chargenspezifische Allergeninformation und aktive Bestätigung

**Wenn** die tatsächlich für eine Bestellung ausgewählten Chargen potenziell allergene Inhaltsstoffe enthalten, **dann** muss die App **genau deren Inhaltsstoff- und Allergeninformationen vor dem verbindlichen Bestellabschluss** anzeigen. Der Kunde muss **aktiv bestätigen**, dass er die Informationen gelesen hat. Die Bestätigung darf erst erfolgen, **nachdem die betroffenen Chargen zugewiesen sind**; sie ist je Bestellung und zugewiesener Charge nachvollziehbar zu dokumentieren. Bei mehreren Chargen müssen die jeweiligen Unterschiede erkennbar sein. **Belege:** M1-A1, A5; M2-A7.

**Abgrenzung:** Die App dokumentiert die Kenntnisnahme der deklarierten Inhaltsstoffe; sie garantiert damit keine medizinische Verträglichkeit.

## 5. Weitere bestätigte Abläufe und Berechtigungen

Diese Punkte gehören zum fachlichen Prozessmodell, werden aber **nicht als zusätzliche Business Rules gezählt**.

### 5.1 Bestell- und Zahlungsvorgang

| Kundentyp | Packauftrag / Vorbereitung | Versand bzw. Übergabe | Zahlungserinnerung und Folgeprozess | Belege |
|---|---|---|---|---|
| **Normale B2C-Kunden** | Erst nach **tatsächlichem Zahlungseingang**; ein Überweisungs-Screenshot reicht nicht. | Erst nach bestätigtem Zahlungseingang. | **Tag 3** ohne Zahlung: freundliche Erinnerung; **Tag 7**: nicht übergebene Bestellung stornieren und Bestand freigeben. | M1-A10; M2-A5 |
| **B2C-Stammkundinnen** | **Sofort** nach Bestellung möglich, auch ohne Zahlungseingang. | **Erst nach tatsächlichem Zahlungseingang**. | **Tag 5:** Erinnerung; **Tag 10:** nicht übergebene Bestellung stornieren und Bestand freigeben. | M2-A5–A6 |
| **B2B-Partner** | Ware darf ohne vorherigen Zahlungseingang vorbereitet werden. | Versand vor Geldeingang zulässig; Zahlung auf Rechnung. | **30 Tage Zahlungsziel**; nach Fälligkeit Nina über ausstehende Zahlung informieren. | M1-A6, A10; M2-A5 |

**Wichtige Sonderfallauflösung:** Ist Ware trotz offener Zahlung **bereits an den Kunden übergeben** worden, kann sie **nicht als nicht gelieferte Bestellung storniert und wieder in den verfügbaren Bestand gebucht** werden. Stattdessen bleibt eine **offene Forderung** bestehen, über die Nina mit deutlicher Mahnung informiert wird. Dieser Fall ist insbesondere für Altvorgänge oder fehlerhafte Übergaben relevant. **Beleg:** M2-A6.

**Fachlich getrennte Status:** Zahlungsstatus, Packfreigabe, Verpackungsstatus und tatsächliche Übergabe müssen unterscheidbar sein. Damit bedeutet „gepackt“ nicht automatisch „bezahlt“ oder „versendet“. **Belege:** M2-A5–A6. Eine genaue Statusliste ist eine spätere Modellierungsentscheidung.

### 5.2 Rollen, Einsichten und Verantwortlichkeiten

| Rolle | Darf sehen / tun | Darf nicht sehen / tun | Belege |
|---|---|---|---|
| **Nina (Inhaberin)** | Vollständige Verwaltungsansicht; Bestellungen annehmen/bestätigen, Preise und Rabatte bestimmen, Zahlungen prüfen, Kunden kontaktieren, Versandetiketten mit Adresse erstellen, B2B-Ausnahmen mit Begründung genehmigen. | – | M1-A8–A9; M2-A8 |
| **Mutter und Jessi (Packhilfe)** | Reduzierter Packauftrag mit **Paket-/Auftragsnummer, Produkt, Menge und konkreter Charge**; Waren einpacken und **bereits von Nina erstellte/ausgedruckte** Versandetiketten anbringen. | **Keine Kundennamen, Adressen oder Preise** im Packauftrag; keine Preisentscheidung, Kundenkommunikation, Zahlungsprüfung, Etikettenerstellung oder B2B-Ausnahmegenehmigung. | M1-A9; M2-A8 |

Die App benötigt fachlich **zwei getrennte Ansichten**: eine reduzierte **Packansicht** und eine vollständige **Verwaltungsansicht**. Automatische Bestellbestätigungen sollen die bisherige manuelle Kommunikation entlasten; **individuelle** Bestell- und Preisentscheidungen bleiben bei Nina. **Belege:** M1-A9; M2-A8.

### 5.3 Bestandsanzeige und Übergabestatus

- Die verfügbare Stückzahl ist aus den chargenbezogenen Beständen und Reservierungen nachvollziehbar zu ermitteln, damit keine ausverkauften Produkte angenommen werden. **Belege:** M1-A4; M2-A5, A7. Die Reservierungslogik selbst ist noch nicht vollständig spezifiziert.
- Erfüllungsarten sind **DHL**, **persönliches Treffen/Selbstabholung** und **Fahrradlieferung durch Nina**. Bei DHL: Trackingnummer. Bei persönlicher Übergabe: bestätigtes Übergabedatum; bei Fahrradlieferung: Liefer-/Übergabestatus, ohne DHL-Tracking. **Belege:** M1-A1, A12; M2-A2.

## 6. Zwei Widersprüche und ihre ausdrückliche Auflösung

### W1 – Unklare Kombinierbarkeit von Treuerabatt und Aktionscode

- **Frühere Aussagen:** Rabattcodes wurden mit 10 % Stammkundenrabatt teilweise kombiniert und teilweise nicht; eine verlässliche Regel fehlte (M1-A2–A3).
- **Nachfrage / Entscheidung:** Nina legte fest, dass **10 % Treuerabatt grundsätzlich gelten** und ein Code **zusätzlich** genutzt werden darf, außer die Aktion ist ausdrücklich **nicht kombinierbar** (M1-A3).
- **Lösung in der SPEC:** Kombinierbarkeit als Merkmal der Rabattaktion vorgeben, nicht ad hoc entscheiden; nach Anwendung der gültigen Rabatte BR1 zur Versandkostenberechnung verwenden. **Offen** bleibt allein die genaue Reihenfolge zweier prozentualer Rabatte.

### W2 – B2B-Mindestmenge vs. genehmigte Kulanzbestellung

- **Frühere Aussagen:** B2B-Preise gelten erst ab **50 Einheiten**; Nina berichtete trotzdem von **30 Einheiten zum B2B-Preis** bei einem neuen Wiederverkäufer (M1-A6–A7).
- **Nachfrage / Entscheidung:** Bei **unter 50 Einheiten** gilt standardmäßig der **B2C-Preis**; Nina selbst darf eine **einmalige, bewusst genehmigte Ausnahme** machen, muss dafür aber einen **Grund dokumentieren** (M1-A8).
- **Lösung in der SPEC:** Automatischer Standardpreis nach Menge und **protokollierte, nur für Nina freigegebene Ausnahmefunktion mit Pflichtbegründung**. Keine stillschweigende Abweichung.

**Zusätzliche Präzisierungen aus Meeting 2 (nicht als weitere Widersprüche gezählt):**

- „DHL ist Standard“ bedeutet **nicht** „DHL ist die einzige Übergabeart“; drei Arten wurden konkret genannt (M1-A12; M2-A2).
- Der zunächst unklare kostenlose Versand für Stammkundinnen ist inzwischen **verbindlich entschieden** und ersetzt die frühere Beispielrechnung (M2-A3–A4).
- „Packauftrag freigeben“ und „Ware ausliefern“ sind **verschiedene Schritte**; bei Stammkundinnen ist nur ersterer vor Zahlungseingang erlaubt (M2-A5–A6).

## 7. Prioritäten und eine in Meeting 2 bestätigte neue Anforderung

| Einstufung | Umfang | Grundlage / Sicherheit |
|---|---|---|
| **v1 – Muss** | Kunden und Produkte, Bestellungen und Positionen, B2B-/B2C-Konditionen und Rabatte, DHL-/persönliche-/Fahrradübergabe, chargenbezogener Bestand und MHD-Entnahme, Allergenbestätigung pro Charge, getrennte Zahlungs-/Pack-/Übergabestatus, Fristen und Pack-/Verwaltungsrollen. | Kernprozesse und konkrete Entscheidungen: M1-A1–A10, A12; M2-A2–A8 |
| **Später / Umfang offen** | Messevorräte und erweiterte B2B-Auswertungen. | Zukunfts- und Zusatzwünsche: M1-A8, A11 |
| **Neue bestätigte Anforderung in Meeting 2** | **Abo-Box „Self-Care-Monthly“** als **Abonnementprozess** für vier Produkte zu **39 € pro Monat**. Nina fordert die Funktion nun ausdrücklich für die App. Ein Abo soll höchstens **zwei Monate am Stück pausieren** können; fällt eine Box durch einen von Nina verursachten Fehler aus, soll **automatisch eine Gutschrift für die nächste Box** entstehen. | Idee erstmals in M1-A11 genannt; **in M2-A1 ausdrücklich zur App-Anforderung gemacht und konkretisiert**. Umsetzungsphase noch nicht festgelegt. |

**Wichtige Trennung:** Die ungefähr **80 Instagram-Anmeldungen** sind laut Nina Interesse/Anmeldungen, **nicht nachweislich bereits bezahlte Abonnements**. Die Abo-Box war in Meeting 1 eine Zukunftsidee; in Meeting 2 wurde die Umsetzung **verbindlich gewünscht**. Für diese Abgabe wird sie als **eine neu bestätigte Anforderungsgruppe** erfasst, nicht als mehrere unabhängige neue Anforderungen. **Belege:** M1-A11; M2-A1.

**Noch ungeklärt für den Abo-Prozess:** Austausch fehlender Produkte, Berechnung/Höhe der Gutschrift, Zahlungs- und Versandrhythmus, Kündigung sowie Umsetzung im ersten oder späteren App-Ausbauschritt. Keine dieser Details wird ohne Interviewbeleg festgelegt.

## 8. Offene Fragen und bewusst nicht getroffene Annahmen

1. **Rabattberechnung:** In welcher Reihenfolge werden prozentuale Stammkunden- und kombinierbare Aktionsrabatte angewandt? Gibt es mehrere gleichzeitige Codes? (M1-A3; M2-A4)
2. **Restposten/MHD:** Wie hoch soll der Preisnachlass bei unter 30 Tagen Restlaufzeit sein? Wie wird Ware mit überschrittenem MHD behandelt? (M1-A4; M2-A7)
3. **Teilzahlung und Teillieferung:** Sind mehrere Zahlungen oder mehrere Sendungen pro Bestellung möglich? B8 und B9 enthalten deshalb vorläufige **0..1-Annahmen**. (Nicht eindeutig im Interview geklärt.)
4. **B2B-Sonderkonditionen:** Wie werden individueller B2B-Grundpreis und Partner-Rabatt exakt verrechnet? Welche Besonderheiten gelten bei einer genehmigten Bestellung unter 50 Einheiten? (M1-A6–A8)
5. **Abo-Box:** Wird ein nicht verfügbares Produkt ersetzt oder die Box verschoben? Welcher Betrag wird gutgeschrieben, und wie werden Abo-Pausen, Kündigung und Zahlung gehandhabt? (M2-A1)
6. **Bestandsreservierung:** Zu welchem Zeitpunkt werden Chargenmengen reserviert, bei Stornierung wieder freigegeben und bei tatsächlicher Übergabe endgültig abgebucht? (M1-A4; M2-A5–A7)

Diese offenen Fragen sind **keine erfundenen Geschäftsregeln**. Sie zeigen klar, welche Entscheidungen vor dem späteren App-Bau noch mit Nina zu klären sind.

## 9. Interview-Nachweis und Abgabestatus

| Abschnitt | Nachrichten | Besonders relevante Ergebnisse |
|---|---|---|
| **Meeting 1** | **M1-A1–M1-A12** | Bestellablauf, Preise/Rabatte, B2B, Chargen, Inhaltsstoffe, Rechte, Zahlung, Zukunftspläne und Hinweis auf weitere Übergabearten |
| **Meeting 2** | **M2-A1–M2-A8** | Bestätigte Abo-Anforderung, drei Übergabearten, finale Versandkostenentscheidung, Zahlungsfristen und Trennung von Packen/Versenden, MHD-Entnahme, Chargen-/Allergenbezug und Packansicht |

**Nachvollziehbarkeit:** Verweise wie `M2-A7` beziehen sich auf die **siebte Kundenantwort in Meeting 2** im vorhandenen K6-Chat, nicht auf eine erfundene externe Quelle. Das Interview wurde über dieselbe Kundensimulation geführt; für die Benotung sind die dort gespeicherten Fragen maßgeblich.

**Abgabe:** Diese Datei heißt **`SPEC.md`** und gehört ins **Hauptverzeichnis** des öffentlichen GitHub-Repositories. Version 1 ist bereits historisiert. Für diese Überarbeitung lautet die vorgesehene Commit-Nachricht: **`SPEC.md v2 nach Meeting 2`**. In Moodle wird **der Link auf das öffentliche Repository**, nicht die HTML-Leseansicht, bis **08.11.2026, 23:59 Uhr** eingereicht.
