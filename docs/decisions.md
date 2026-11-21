# Entscheidungen

## 2026-11-18 · F-001

- **Gestaltung.** Die Produktionsansicht nutzt warmes Off-White, Tannengrün für Hauptaktionen, Instrument Serif für Überschriften und DM Sans für Formulare und Tabellen. So sind Bestände, MHD und Allergenhinweise in einer ruhigen Oberfläche schnell erfassbar.
- **MHD in der Bestandsanzeige.** Das angegebene Datum zählt als letzter Tag der Restlaufzeit. Die Berechnung nutzt den Kalendertag in Berlin. Chargen mit 0 bis 29 Tagen Restlaufzeit sind Restposten. Abgelaufene Chargen bleiben sichtbar und zählen gemäß freigegebenem Plan vorläufig nicht zur verfügbaren Menge.
- **Rezeptur je Charge.** Beim Einbuchen speichert die App die ausgewählten Inhaltsstoffe mit ihrer aktuellen Bezeichnung, Allergenkennzeichnung und ihrem Hinweis. So bleiben die Angaben zur hergestellten Charge nachvollziehbar.

## 2026-11-18 · F-002

- **Offene Entscheidung zu Rabatten (SPEC § 8.1).** Vorläufig gilt höchstens ein Aktionscode pro Bestellung. Die App zieht zuerst den Treuerabatt und danach einen kombinierbaren prozentualen Aktionsrabatt vom verbleibenden Warenwert ab. Beide Beträge werden jeweils auf Cent gerundet. Bei einer als nicht kombinierbar gekennzeichneten Aktion hat der Treuerabatt Vorrang. Aktionscodes unterstützen vorläufig ganze Prozentsätze. So bleiben Preis und DHL-Schwelle nachvollziehbar, bis Reihenfolge, Rundung, Codearten und Mehrfachcodes geklärt sind.
- **Offene Entscheidung zu MHD und Restposten (SPEC § 8.2).** Abgelaufene Ware bleibt wie in F-001 sichtbar und wird vorläufig von der Zuteilung ausgeschlossen. Bei weniger als 30 Tagen Restlaufzeit erscheint die Restpostenkennzeichnung. Die App berechnet dafür bis zur Klärung der Höhe keinen automatischen Nachlass.
- **Offene Entscheidung zur Reservierung (SPEC § 8.6).** Die App reserviert beim Speichern der Chargenzuteilung. Eine Änderung ersetzt die Reservierung in einem Schritt, Verwerfen gibt sie frei. Entwürfe laufen vorläufig nicht automatisch ab. Reservierungen bleiben beim verbindlichen Abschluss bestehen. Die endgültige Abbuchung bei Übergabe und die Rückgabe bei Stornierung sind Teil der Folgefeatures.
- **Offene Entscheidung zur Kundenkommunikation.** Die Kundin bestätigt die Angaben über einen privaten Link, den die Inhaberin weitergibt. Eine neu gespeicherte Zuteilung erzeugt einen neuen Link und setzt die Kenntnisnahme zurück. Der verbindliche Abschluss legt genau eine Nachricht im lokalen Testpostfach ab. Der spätere Kanal für echte Bestellbestätigungen bleibt offen.

## 2026-11-21 · F-003

- **Partnerpreise (SPEC § 8.4).** Bei der Neuanlage eines Wiederverkäufers hinterlegt die Inhaberin vorläufig einen individuellen ganzzahligen Prozentnachlass auf den Standardpreis. Der vereinbarte Stückpreis wird auf Cent gerundet und je Position gespeichert. Unter 50 Stück gilt ohne Ausnahme der Standardpreis. Treuerabatt und Aktionscodes sind Privatbestellungen vorbehalten.
- **Ausnahmen (BR3).** Bis zur Einführung der Rollen prüft der Server ein Freigabekennwort der Inhaberin aus der Umgebungsvariable `OWNER_APPROVAL_SECRET`. Setze die Variable beim lokalen Start über die Shell und verwahre das Kennwort bei der Inhaberin. Die App speichert die Begründung bei der Bestellung. Bei erneuter Zuteilung muss eine beibehaltene Ausnahme erneut freigegeben werden.
- **Rechnung (BR3).** Die offene Zahlung wird beim verbindlichen Abschluss angelegt. Das Zahlungsziel liegt 30 Kalendertage nach dem Bestätigungsdatum in Berlin. Die Bestellbestätigung mit Fälligkeit erscheint im bestehenden lokalen Testpostfach.

## 2026-11-21 · F-004

- **Lokale Anmeldung (SPEC § 5.2).** Die Inhaberin meldet sich mit `OWNER_APPROVAL_SECRET` an, Packhilfen teilen sich vorläufig ein anderes Kennwort über `PACKING_SECRET`. Beide Kennwörter werden außerhalb des Repositories gesetzt. Die Sitzung gilt acht Stunden. Die Packansicht lädt nur die Daten zum Packen freigegebener Aufträge und deren Statusaktion. Der private Link zur Allergenbestätigung bleibt für die Kundschaft erreichbar.
- **Zahlungseingang (SPEC § 5.1).** Die Inhaberin bestätigt einen tatsächlich eingegangenen Betrag manuell. Die App hält Status und Zeitpunkt fest. Bei Privatbestellungen legt sie den Zahlungseintrag bei dieser Bestätigung an. Bei Partnerrechnungen bleibt das bestehende Zahlungsziel erhalten.
- **DHL-Etikett und Fahrradlieferung (SPEC §§ 5.2–5.3).** Die Inhaberin erstellt und druckt das Etikett vorläufig außerhalb der App. Sie markiert es in der App als bereit, damit der DHL-Auftrag in der Packansicht erscheint, sobald auch dessen Zahlungsfreigabe vorliegt. Fahrradlieferungen gehen vorläufig von „Ausstehend“ über „Unterwegs“ zu „Übergeben“.
- **Bestandsabbuchung (SPEC § 8.6).** Die zugeteilten Mengen bleiben bis zur Erfassung des DHL-Versands beziehungsweise der tatsächlichen persönlichen oder Fahrradübergabe reserviert. Die App bucht sie zusammen mit diesem Statuswechsel ab und behält die Zuordnung zur Charge in der Bestellung. Bereits bestätigte Bestellungen beginnen bei Einführung von F-004 als unverpackt und ohne erfasste Übergabe.

## 2026-11-21 · F-005

- **Fristen (SPEC § 5.1).** Der Tag der verbindlichen Bestätigung zählt als Tag 0, gerechnet in Berliner Kalendertagen. Bei Partnerrechnungen gilt das vorhandene Fälligkeitsdatum einschließlich. Hinweise auf überfällige Rechnungen und offene Forderungen nach Übergabe erscheinen in der Abwicklung, solange die Zahlung offen ist.
- **Lokale Fristenprüfung und Erinnerung (SPEC § 5.1).** Die App prüft beim Serverstart und danach einmal pro Minute. Während der Server aus ist, ruht die Prüfung. Beim Neustart holt die App fällige Schritte nach. Hat eine Bestellung inzwischen die Stornierungs- oder Mahnfrist erreicht, entfällt die frühere freundliche Erinnerung. Erinnerungen erscheinen je Bestellung einmal im lokalen Testpostfach. Der Kanal für den echten Versand bleibt offen.
- **Bestandsfreigabe (SPEC § 8.6).** Eine Stornierung lässt Bestellung, Chargenzuteilung und gegebenenfalls Allergenbestätigungen zur Nachverfolgung erhalten. Ab der Stornierung zählen die Mengen wieder zum verfügbaren Bestand, soweit die Chargen weiterhin verkäuflich sind. Eine bereits erfasste Übergabe lässt keine Stornierung mit Bestandsfreigabe zu.

## 2026-11-21 · F-006

- **Abschluss und Zusammenstellung (SPEC §§ 7–8).** Die Inhaberin wählt eine vorhandene Kundin und vier verschiedene vorhandene Produkte aus und gibt den privaten Einladungslink weiter. Die Kundin schließt das Abo darüber selbst zum Festpreis von 39 € pro Monat ab. Die Einladung ist einmalig einlösbar. Danach verwaltet die Kundin das Abo über einen separaten privaten Link, den die Inhaberin bei Bedarf erneut weitergeben kann.
- **Pausen (SPEC § 7).** Eine Pause beginnt vorläufig am ersten Tag des nächsten Kalendermonats in Berlin. Sie endet automatisch nach einem oder zwei Monaten. Die Kundin kann eine geplante Pause zurücknehmen oder eine laufende Pause sofort beenden. Ein bereits begonnener Pausenmonat zählt zur Höchstgrenze. Nach zwei aufeinanderfolgenden Pausenmonaten muss mindestens ein Kalendermonat ohne Pause liegen.
- **Zahlung und Abwicklung (SPEC §§ 7–8).** Beim Abschluss wird der monatliche Preis gespeichert. Der Zahlungs- und Versandrhythmus, Kündigung und Produktersatz bleiben offen. Fällige Boxen und Gutschriften gehören zu F-007.
