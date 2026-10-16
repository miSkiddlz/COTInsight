# COTInsight

**Website: https://miskiddlz.github.io/COTInsight/**

Interactive dashboard for the official CFTC Commitments of Traders reports.
GitHub Pages serves static files. GitHub Actions builds the data without Docker,
a backend, API keys, paid data providers or Python dependencies.

## Neuer Analyse-Arbeitsbereich

- **Perzentilverlauf:** rollierende historische Netto-Perzentile als Chart, Datentabelle
  und CSV; jeder Punkt berücksichtigt ausschließlich seine eigene Vergangenheit.
- **Wochenvergleich:** Nettoänderungen und Netto/OI-Änderungen über exakt 1, 4 und
  13 Wochen für alle Händlergruppen, einschließlich Vergleichsdaten und CSV.
- **Berichte durchblättern:** älteren/neueren Bericht öffnen oder zum neuesten
  verfügbaren Stand zurückkehren; bestehende Analyse-Links behalten den Stichtag.

- **Weekly Positioning Radar:** relative Wochenbewegungen, historische Randbereiche
  und Veränderungen des Open Interest; Wochenbriefing als Markdown exportierbar.
- **Markt-Screener:** sortierbare Ergebnisse, Suche, Mindest-OI, historische Serien,
  Perzentil-/Vorzeichenfilter, Watchlist-Filter, Pagination und CSV-Export.
- **Historische Einordnung:** Perzentile und COT-Spannenindex über 26, 52, 104 oder
  156 Kalenderwochen; Veränderungen über exakt 1, 4 und 13 Wochen.
- **Stichtagsanalyse:** frühere Beobachtung auswählen; Kennzahlen und Charts
  verwenden keine späteren Beobachtungen. Keine revisionssicheren Backtest-Daten.
- **Chart-Werkzeuge:** Zeitraum 13W/26W/52W/104W/All, Kontrakte oder OI-Anteile,
  optionales Open-Interest-Overlay sowie Exporte für den gewählten Zeitraum.
- **Marktvergleich:** gewählter Kontrakt plus bis zu drei weitere Märkte, dieselbe
  Händlergruppe im selben Berichtstyp, als Nettoanteil am Open Interest.
- **Persönlicher Arbeitsbereich:** lokale Watchlist, benannte Ansichten, teilbare
  Analyse-URLs und Backup/Import für Browserwechsel.
- **Lokale Regeln:** Perzentilschwellen, absolute relative Wochenänderung oder
  Vorzeichenwechsel; auf der geöffneten Seite geprüft, ohne Nachrichtenversand.

Einstieg und genaue Berechnungsregeln: [WORKSPACE_GUIDE.md](WORKSPACE_GUIDE.md).
Es sind weiterhin keine Konten, zusätzliche Server oder bezahlten Datenquellen nötig.
Watchlist, Ansichten und Regeln gehören zum Browser und werden nicht in GitHub gespeichert.

## Datenquelle und Umfang

Der Import lädt die maschinenlesbaren, kommagetrennten Textdateien aus den
[offiziellen CFTC-Jahresarchiven](https://www.cftc.gov/MarketReports/CommitmentsofTraders/HistoricalCompressed/index.htm).
Das sind CSV-Dateien in ZIP-Archiven – keine aus HTML abgeschriebenen Tabellen.
Der Dateiname `fetch_cot_api.py` bleibt als bestehender Einstiegspunkt erhalten;
der reguläre Import benötigt keine JSON-API.

Standardmäßig werden **das laufende und die zwei vorherigen Kalenderjahre**
importiert, aktuell also 2024–2026. Das ist nicht die gesamte historische CFTC-Datenbank.
Alle veröffentlichten Kontraktcodes innerhalb dieses Zeitfensters werden verarbeitet:

| Bericht | Varianten | Händlergruppen im Dashboard |
| --- | --- | --- |
| Legacy | Futures Only; Futures + Options | Commercials, Non-Commercials, Nonreportable |
| Disaggregated | Futures Only; Futures + Options | Producer/Merchant/Processor/User, Swap Dealers, Managed Money, Other Reportables, Nonreportable |
| Traders in Financial Futures (TFF) | Futures Only; Futures + Options | Dealer/Intermediary, Asset Manager/Institutional, Leveraged Funds, Other Reportables, Nonreportable |
| Supplemental CIT | Futures + Options | Commercials und Non-Commercials jeweils ohne CIT, Commodity Index Traders, Nonreportable |

Die Berichtstypen werden nicht zusammengerechnet. TFF-Kategorien sind kein Ersatz
für gleich benannte oder vermeintlich ähnliche Legacy-Kategorien. Combined-Reports
enthalten Optionen auf Futures-Äquivalentbasis.

### Was auf der Website verfügbar ist

- Berichtsauswahl, Marktsuche und eindeutige Auswahl nach Originalname/Börse/CFTC-Code.
- Standardmäßig nur Märkte im neuesten Berichtsdatum des jeweiligen Berichtstyps;
  den Haken entfernen, um zusätzlich historische Serien im importierten Zeitraum zu sehen.
- Netto-, Long-, Short- und Spreading-Zeitreihen.
- Letzte Positionswerte, Open Interest, Nettoänderung und Netto/Open-Interest-Anteil.
- Berichtsdatum, vorheriges Beobachtungsdatum, Einheit und verfügbare Historie.
- Normalisierte Historie als JSON und **alle Originalspalten für den gewählten Markt**
  als vollständiger JSON-Export, einschließlich dort vorhandener Änderungen, Prozentwerte,
  Händlerzahlen, Konzentration und Old/Other-Laufzeitfelder.

Die Oberfläche zeigt die All-Laufzeitpositionsfelder; nicht jede Originalspalte
hat schon eine eigene Grafik oder Kennzahl. Keine kürzenden Marktübersetzungen:
Micro, Mini, Consolidated, Börsen und verschiedene Produkte bleiben unterscheidbar.
Nicht veröffentlichte Positionen, einzelne Händler oder Märkte, die die CFTC in
keinem der importierten Reports veröffentlicht, können nicht rekonstruiert werden.

### Korrekte Interpretation

- `Net = Long − Short`. Spreading gehört auf beide Seiten und erhöht die Nettoposition nicht.
- `Nonreportable` bedeutet nicht ausschließlich Privatanleger; die alte Beschriftung
  „Retail“ wurde entfernt.
- Veränderungswerte vergleichen die zwei letzten **verfügbaren Beobachtungen**.
  Ihre Daten stehen daneben. Bei Lücken wird nicht von einer Wochenänderung gesprochen.
- Fehlende Werte bleiben `null` und werden als `—` angezeigt. Nicht anwendbare
  Spreading-Felder werden ebenfalls als `—` dargestellt; sie sind keine Nullposition.
- Der Nenner bei `Net / OI` ist das Open Interest; bei OI = 0 bleibt die Quote leer.
- Das Berichtsdatum ist der Positionsstichtag. `Dataset built` nennt den Importzeitpunkt.
- Bei geänderten Einheitsbeschreibungen wird die Chartlinie unterbrochen. Der Import
  rechnet Einheiten nicht eigenmächtig um. Unterscheiden sich die Einheiten der beiden
  letzten Beobachtungen, wird keine Veränderung berechnet. Auch reine Formulierungsänderungen
  in der CFTC-Quelle können diesen vorsichtigen Hinweis auslösen.
- Kleine Rundungsdifferenzen der Originalquelle bleiben erhalten und werden markiert;
  größere Abstimmungsfehler brechen den Build ab. Die Quelle wird nicht passend gerechnet.
- Farben der Veränderung kennzeichnen die Richtung, keine Profitabilität oder Handelsempfehlung.

Details der Prüfung und frühere Fehler: [DATA_REVIEW.md](DATA_REVIEW.md).

## Einmalig auf GitHub einrichten

1. Den überarbeiteten Projektinhalt ins bestehende lokale Repository übernehmen.
   **Den eigenen `.git`-Ordner erhalten.** Entfernte Projektdateien müssen auch als
   Löschungen committed werden. `.github/` ist Teil des neuen Pakets.
2. Für GitHub Free muss das Repository öffentlich sein.
3. **Settings → Pages → Build and deployment → Source → GitHub Actions** wählen.
4. Auf `main` pushen. Der Workflow **Update data and deploy website** lädt und prüft
   die Reports und veröffentlicht die Website. Im ersten Lauf werden 21 Jahresarchive
   geladen; das dauert länger als die spätere Anzeige im Browser.
5. Die veröffentlichte Website ist **https://miskiddlz.github.io/COTInsight/**.

Bereits eingerichtet? Dann reicht der normale Commit/Push. Zum manuellen Start:
**Actions → Update data and deploy website → Run workflow → main**.
Bei einem anderen Standardbranch `branches` in `.github/workflows/pages.yml` anpassen.
Den alten Render-Service erst nach erfolgreicher Umstellung im Render-Dashboard löschen.

## Automatische Aktualisierung und Fehlerverhalten

Jeder Push auf `main` und ein täglicher Lauf um etwa **22:17 UTC** laden die
Quellen erneut. Eine tägliche Prüfung bedeutet nicht, dass täglich neue Reports erscheinen.
Die Originalarchive können nachträglich von der CFTC korrigiert werden; deshalb
werden auch die vorherigen Kalenderjahre erneut geladen.

Erst nach einem vollständig erfolgreichen Import aller gewählten Berichtstypen
und Jahre werden neue Dateien bereitgestellt. Bei Netzwerk-, Schema- oder
Datenfehlern schlägt der Build fehl und die veröffentlichte Website bleibt bestehen.
Vor der ersten erfolgreichen Veröffentlichung gibt es noch keine neue Seite.
Anfang Januar darf ausschließlich eine HTTP-404-Antwort für das noch nicht existierende
laufende Jahresarchiv übersprungen werden; das wird ausdrücklich im Katalog und auf
der Website vermerkt. Historische Fehlstellen und andere Fehler werden nicht verschluckt.

GitHub kann Zeitpläne verzögern und deaktiviert geplante Workflows öffentlicher Repositories
nach 60 Tagen ohne Repository-Aktivität. Dann unter **Actions** wieder aktivieren.
Ein Warnhinweis auf der Website kennzeichnet Referenzdaten, die älter als 14 Tage sind;
das ist keine Aussage darüber, ob ein Report bereits hätte veröffentlicht werden müssen.

## Lokal starten – Python 3.12, ohne Zusatzpakete

Im Projektordner:

```sh
python scripts/fetch_cot_api.py
python -m http.server 8000 --directory site
```

Dann **http://localhost:8000** öffnen. Unter Windows funktioniert gegebenenfalls
`py` statt `python`. Nicht per Doppelklick als `file://` öffnen.

Optional: Mit `--years 5` lässt sich die Anzahl importierter Kalenderjahre ändern
(1 bis 10). Mehr Historie bedeutet mehr Daten und muss innerhalb der Hosting-Limits bleiben.
Für die veröffentlichte Website das Argument im Workflow setzen.

```sh
python -m unittest discover -s tests -v
```

Optional mit installiertem Node.js (keine npm-Pakete nötig):

```sh
node --test tests/test_analytics.cjs
```

GitHub Actions führt beide Testgruppen automatisch aus. Node.js wird nur für
diese Tests benötigt; die Datenverarbeitung bleibt reine Python-Standardbibliothek.

Die Tests laufen ohne Netzwerk, einschließlich gespeicherter CFTC-Beispielzeilen
und eines unabhängigen Abgleichs mit einem offiziellen JSON-API-Ergebnis.

## Datenformat und Projektstruktur

- `scripts/fetch_cot_api.py`: Definitionen, Download, Schema- und Werteprüfung, Export.
- `scripts/cot_analysis.py`: vorab berechnete historische Kennzahlen und Wochenvergleiche.
- `site/index.html`, `site/styles.css`, `site/charts.js`: Oberfläche und Chartdarstellung.
- `site/analytics.js`: dieselben Berechnungsdefinitionen für historische Browseransichten.
- `site/workspace.js`: Radar, Screener, Vergleiche, lokale Einstellungen und Exporte.
- `site/interface.js`: Bereichsnavigation, Perzentil-Heatmap, Vergleichsauswahl und Update-Prüfung.
- `site/research.js`: Perzentilverlauf, Wochenmatrix, Beobachtungsnavigation und zugehörige Exporte.
- `site/data/summaries/`: vorberechnete Momentaufnahmen je Berichtstyp für Radar/Screener.
- `site/data/catalog.json`: Berichtstypen, Märkte, Zeiträume, Quellen, SHA-256-Prüfsummen
  der Originalarchive und Qualitätsstatistik.
- `site/data/<report>/<code>-<hash>.json`: normalisierte Historie eines Kontrakts.
- `site/data/raw/<report>/<code>-<hash>.json`: sämtliche Originalspalten/-werte dieses Kontrakts.
  `schemas` enthält die Spaltennamen, `rows[i].schema` den zugehörigen Schemaindex und
  `rows[i].values` die CSV-Zellen in derselben Reihenfolge. Codes bleiben Strings.
- `.github/workflows/pages.yml`: Tests, Import und Veröffentlichung.
- `tests/`: automatisierte Datenprüfungen und Originalbeispiele.

Schema-Version ist **2**. Ein Markt ist über **Berichtstyp + CFTC-Kontraktcode** eindeutig.
Es gibt keine Zuordnung anhand unscharfer Teilstrings. Vollständige Quellnamen und
Einheiten stehen auch in jeder einzelnen Beobachtung, damit historische Änderungen
nicht durch die neueste Beschriftung überschrieben werden.
Die erzeugten Daten werden nicht committed und sind nicht im Quellcode-ZIP enthalten.
Der Build erzeugt sie neu. Der Browser lädt nur Katalog und gewählte Markthistorie;
Originalspalten werden erst beim Export angefordert.

## Design

Zentrale Farben und Komponenten liegen in `site/styles.css`: Pfirsich `#ffb98b`,
Lavendel `#c197ff`, Mint `#8ed9c4` auf `#14121c`. Weitere Händlergruppen nutzen
passende zusätzliche Serienfarben. Neue Inhalte sollen diese Karten-, Tabellen-
und Steuerungsstile verwenden. Die Titelanimation berücksichtigt reduzierte Bewegung.

## Navigation und Marktübersicht

Radar, Analysis, Screener und Watchlist sind direkt über die Navigation erreichbar.
Der Screener bietet zusätzlich eine Perzentil-Heatmap für alle Händlergruppen.
Vergleichsmärkte werden per Suche und **Add market +** hinzugefügt und einzeln entfernt.
**Check published update** meldet neue veröffentlichte Daten, bevor ein bewusstes
Neuladen die offene Sitzung ersetzt. Details stehen in [WORKSPACE_GUIDE.md](WORKSPACE_GUIDE.md).
