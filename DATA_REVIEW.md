# Prüfung der COT-Datenkette

Prüfstand: 15. Oktober 2026. Geprüft wurden Import, Feldzuordnung,
Identitäten, Vollständigkeit innerhalb des Importzeitraums, Berechnungen,
Frontend-Zustände, Darstellungseinheiten und Veröffentlichungsworkflow.

## Befunde und Korrekturen

| Befund im vorherigen Stand | Folge | Korrektur |
| --- | --- | --- |
| Teilstringfilter `EURO`, `GOLD`, `S&P 500` usw. | Erfasste unter anderem Aluminium EURO Premium, Euro-Zinsprodukte, Kreuzkurse und Micro-Kontrakte; viele andere Märkte fehlten. | Alle veröffentlichten Codes einlesen, keine fünf Suchwörter als Importfilter. |
| Kürzung derselben Teilstrings zu „Euro“, „Gold“ usw. | Unterschiedliche Produkte/Börsen erschienen unter identischen, teils sachlich falschen Labels. | Vollständiger CFTC-Originalname mit Kontraktcode. |
| Identität und Duplikatprüfung anhand des Namens | Namensänderungen konnten Historien trennen. | Berichtstyp + CFTC-Kontraktcode + Datum; Codes bleiben Strings, auch mit führenden Nullen, Buchstaben oder `+`. |
| Nur Legacy Futures Only und sechs Positionsfelder | Andere Reports, Gruppen und Zusatzspalten waren nicht verfügbar. | Sieben Berichtstypen, alle Märkte im Zeitfenster; sämtliche Originalspalten exportierbar. |
| „Retail“ als Name für Nonreportable | Teilnehmerkategorie zu eng und irreführend übersetzt. | Offizielle Bezeichnung Nonreportable mit Erklärung. |
| Ursprüngliches fremdes Skript: `fillna(0)` und weitgehend verschluckte Jahresfehler | Fehlende Werte konnten als echte Nullpositionen erscheinen; Teilhistorien konnten unbemerkt veröffentlicht werden. | Fehlende Werte als `null`; gesamter Build scheitert bei nicht ausdrücklich erlaubten Quellfehlern. Das Fremdskript ist entfernt. |
| Keine unabhängige Open-Interest-Abstimmung | Vertauschte oder falsche Zahlenfelder wären schwer zu erkennen. | Long- und Short-Seite einschließlich Spreading gegen OI abstimmen; zusätzlich Reportable + Nonreportable prüfen. |
| USD-Darstellung im ursprünglichen Dashboard | Kontraktzahlen sahen wie Dollarwerte aus. | Kontrakte bzw. Futures-Äquivalente mit Originaleinheit. Bereits beim Hosting-Umbau korrigiert und hier weiter präzisiert. |
| Änderung ohne klaren Vergleichszeitpunkt | Bei Datenlücken konnte ein mehrwöchiger Abstand wie eine Wochenänderung aussehen. | Vergleich der letzten verfügbaren Beobachtungen mit beiden Daten und Abstand. Keine erfundene vorherige Nullposition. |
| Rohfelder und Einheitsgeschichte verworfen | Spätere Erweiterungen oder Änderungen der Quellbeschreibung waren nicht nachvollziehbar. | Originalspalten bleiben erhalten, Einheit und Name je Beobachtung. Einheitswechsel werden markiert und nicht automatisch umgerechnet. |
| Monolithische Datenantwort | Ein vollständigerer Import würde jeden Besucher zum Gesamt-Download zwingen. | Katalog + einzelne Historien; Originalwerte nur auf Anforderung. Inhaltsabhängige Dateinamen. |
| Fehlende Fehlerbehandlung bei späteren Marktabrufen | Leere Ergebnisse und verspätete Antworten könnten alte Werte zur neuen Auswahl zeigen. | Alte Werte/Exportlinks leeren, Abrufe abbrechen, veraltete Antworten ignorieren und verständlichen Fehlerzustand anzeigen. |

## Wahl der Quelle

**Produktiv: direkte CSV-in-ZIP-Jahresarchive der CFTC.**
Sie bieten die für dieses statische Dashboard benötigten sieben Reportvarianten
als vollständige Jahresdateien. Ein eigener Konverter mit der Python-Standardbibliothek
reicht aus. Kein Paket eines fremden GitHub-Projekts, Drittanbieter oder Token ist nötig.

**Offizielle JSON-API: vorhanden und für kleine Abfragen ohne Token nutzbar.**
Am Prüftag wurde `publicreporting.cftc.gov/resource/6dca-aqww.json` ohne App-Token
abgerufen. Tokenfreie Zugriffe können nach IP gedrosselt werden. Für den Gesamtimport
wird die API nicht als zusätzliche Abhängigkeit eingebaut; insbesondere wird nicht
unbemerkt zwischen möglicherweise zu unterschiedlichen Zeitpunkten korrigierten
Quellen gewechselt.

## Verifikation mit echten Daten

Die 21 Archive für 2024, 2025 und 2026 wurden heruntergeladen und verarbeitet.
Kein Markt wurde anhand seines Namens ausgeschlossen. Alle 197.656 Quellzeilen
gingen in die entsprechenden Historien und Originalexporte ein.

| Berichtstyp | Kontraktcodes im Zeitraum | Quellzeilen |
| --- | ---: | ---: |
| Legacy Futures Only | 491 | 48.505 |
| Legacy Combined | 506 | 49.384 |
| Disaggregated Futures Only | 375 | 38.126 |
| Disaggregated Combined | 388 | 38.990 |
| TFF Futures Only | 116 | 10.379 |
| TFF Combined | 116 | 10.387 |
| Supplemental CIT | 13 | 1.885 |

Codes über verschiedene Berichtstypen sind keine unterschiedlichen Basiswerte
und werden deshalb nicht als eine Anzahl eindeutiger Assets zusammengezählt.
Neuester Referenzstichtag der geladenen Dateien: **2026-10-06**.

Unabhängige Gegenprobe: Gold (`088691`), Legacy Futures Only, 2026-10-06.
Open Interest und alle sechs Long-/Short-Werte aus dem Archivimport stimmen exakt
mit der getrennt abgerufenen offiziellen JSON-API überein:

| Kennzahl | Wert |
| --- | ---: |
| Open Interest | 396.109 |
| Commercials Net | −244.527 |
| Non-Commercials Net | +210.335 |
| Nonreportable Net | +34.192 |

Das ist eine konkrete Gegenprobe, kein Beweis für die Fehlerfreiheit jedes von der
CFTC gelieferten Wertes. Die Quelle selbst enthält etwa gerundete Summen und
veränderte Einheitsformulierungen. Diese Daten werden nicht nachträglich erraten.

## Prüfungen im Code

- Originalspalten je Report auflösen; fehlende oder mehrdeutige Pflichtspalten ablehnen.
- Exakte Datumswerte, Archivjahr, gültige Kontraktcodes und eindeutige Datumsbeobachtungen.
- Nichtnegative ganzzahlige Positionszahlen; Quellwert `-0` wird mathematisch zu 0.
- Fehlend/supprimiert bleibt fehlend; unbekannte Zusatzspalten bleiben im Originalexport.
- Long/Short plus Spreading gegen Open Interest, zusätzlich Reportable + Nonreportable.
- Begrenzte Rundungstoleranz: auf der Komponentenseite maximal `(Anzahl Summanden + 2) // 2`
  Kontrakte, beim Reportable/Nonreportable-Abgleich maximal 1. Abweichungen der ersten
  Prüfung stehen in `rounding_difference`; größere Differenzen führen zum Fehler.
- Aufbau in temporärem Verzeichnis; bestehende Daten erst nach vollständigem Erfolg ersetzen.
- Herkunft und SHA-256 der heruntergeladenen Archive im Katalog und Originalexport.
- Dateihash berücksichtigt auch Änderungen ausschließlich in Original-Zusatzfeldern.
- Netzunabhängige Regressionstests mit Originalbeispielen aller sieben Reportvarianten,
  eigenständigem JSON-API-Snapshot und gezielt beschädigten Eingaben.
- Frontend-Logik mit echtem DOM und den erzeugten Daten geprüft: sieben Berichtstypen,
  vier Kennzahlansichten, Namensfilter, historische Märkte, leere Auswahl und Abruffehler.
  Dies ersetzt keine visuelle Browserprüfung von Layout und Plotly-Rendering.

## Bewusste Grenzen

Vollständigkeit bedeutet: sämtliche Zeilen und Spalten der geladenen offiziellen
Jahresdateien im konfigurierten Zeitraum. Nicht enthalten sind die gesamte Historie
seit 1986, nicht veröffentlichte Märkte/Einzelhändler und unpublizierte Daten.
Die Oberfläche visualisiert die All-Laufzeitpositionsfelder; zusätzliche veröffentlichte
Felder stehen vollständig im Originalexport für spätere Erweiterungen bereit.
Eine erste Spaltendefinition oder ein Kontraktcode außerhalb des geprüften Schemas
führt absichtlich zu einem sichtbaren Buildfehler statt zu einer geratenen Zuordnung.

## Offizielle Referenzen

- [CFTC Historical Compressed: alle Jahresdateien und Variablendefinitionen](https://www.cftc.gov/MarketReports/CommitmentsofTraders/HistoricalCompressed/index.htm)
- [CFTC Explanatory Notes: Legacy, Open Interest, Futures-Äquivalente](https://www.cftc.gov/MarketReports/CommitmentsofTraders/ExplanatoryNotes/index.htm)
- [CFTC Disaggregated Explanatory Notes](https://www.cftc.gov/MarketReports/CommitmentsofTraders/DisaggregatedExplanatoryNotes/index.htm)
- [CFTC TFF Explanatory Notes](https://www.cftc.gov/idc/groups/public/@commitmentsoftraders/documents/file/tfmexplanatorynotes.pdf)
- [CFTC Public Reporting Environment](https://publicreporting.cftc.gov/stories/s/r4w3-av2u)
- [Socrata: App-Tokens und tokenfreie Zugriffe](https://dev.socrata.com/docs/app-tokens.html)

## Erweiterung: Analyse-Arbeitsbereich

Zusätzlich zur Datenbasis wurden Radar, Screener, historische Stichtagsanalysen,
Perzentile, COT-Spannenindex, relative Wochenvergleiche, normalisierte Marktvergleiche,
lokale Watchlist/Ansichten/Regeln sowie Exporte ergänzt. Die Definitionen und Grenzen
stehen in [WORKSPACE_GUIDE.md](WORKSPACE_GUIDE.md).

23 Python-Tests und sechs Node-Tests prüfen Import und Formeln. 112 Vergleiche mit
echten Historien und historischen Stichtagen zeigen Übereinstimmung zwischen der
Python-Buildberechnung und dem JavaScript-Browsermodul. Bedienprüfungen decken
insbesondere historische Datengrenzen, Exporte, URL-Wiederherstellung, Browser-Speicher,
Filter/Pagination und sichere Darstellung importierter Beschriftungen ab.

## Ergänzung: Navigation und Heatmap

Keine Änderung an Datenquellen oder Kennzahldefinitionen. Neue DOM-Ablauftests
prüfen Bereichswechsel, Heatmap mit fehlenden Werten/Leerzustand, Heatmap-CSV,
lokale Ansichtspräferenz, Vergleich hinzufügen/entfernen und Update-Prüfung
bei gleichem sowie neuerem Datenstand. 23 Python- und sechs Node-Tests bestanden.
Die zuvor veröffentlichte Desktop-Oberfläche wurde visuell im Browser geprüft,
einschließlich Plotly-Rendering, Berichtwechsel und OI-Overlay. Die neuen
Layoutänderungen wurden noch nicht visuell auf einem Mobilgerät geprüft.

## Ergänzung 2026-10-16: Historischer Verlauf und Wochenmatrix

- Neue Funktion `COTMath.rankHistory`: dieselbe Rangdefinition, 80%-Mindestabdeckung
  und zusammenhängende Einheitensegmente wie die bestehenden Momentaufnahmen.
- Jeder Punkt verwendet ausschließlich seine eigene Vergangenheit. Das sichtbare
  Zeitfenster wird erst nach der Berechnung zugeschnitten; der Stichtag bleibt strikt.
- 1.920 Gruppen-/Fensterwerte aus 112 echten Historien/Stichtagen stimmen mit den
  Python-Momentaufnahmen überein (Toleranz 1e-9).
- Zwölf Node-Tests einschließlich sechs neuer Prüfungen für Verlauf, Zukunftsausschluss,
  Einheitenwechsel, fehlende Werte, Kalenderlücken und ungültige Fenster.
- 23 Python-Tests weiterhin bestanden. DOM-Tests prüfen Navigation, Rang-/Wochen-CSV,
  früheste/neueste Beobachtung und leere Bedienfelder nach einem Ladefehler.
- Keine Änderung am Import oder an den bisherigen Definitionen. Neue Diagramme
  basieren auf bereits geladenen Markthistorien; keine neuen Abhängigkeiten.
- Visuelle Browserprüfung der neuen Diagramme sowie Mobilprüfung stehen noch aus.
