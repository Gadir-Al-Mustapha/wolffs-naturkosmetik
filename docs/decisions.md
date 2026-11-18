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
