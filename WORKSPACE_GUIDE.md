# COTInsight – der Analyse-Arbeitsbereich

## Ein sinnvoller Einstieg

Die Navigation trennt **Radar**, **Analysis**, **Screener** und **Watchlist** in eigene
Ansichten. Marktlinks öffnen die Analyse; geteilte URLs merken sich auch den Bereich.

1. Oben **Berichtstyp**, **Focus Category** und **Historical Window** auswählen.
   Legacy/Non-Commercials ist der Standard. TFF und Disaggregated haben bewusst
   andere Händlergruppen.
2. Das **Weekly Radar** zeigt, welche aktuellen Märkte bei derselben Kategorie
   durch relative Positionsbewegungen, historische Randbereiche oder OI-Änderungen auffallen.
3. Einen Markt anklicken oder im **Screener** suchen, filtern und sortieren.
4. In der **Marktanalyse** Zeitraum, Stichtag, Skala und OI-Overlay wählen.
   Mit **Older report**, **Newer report** und **Back to latest** durch die tatsächlich
   verfügbaren Beobachtungen blättern. Lücken werden dabei nicht aufgefüllt.
5. Mit **☆** speichern oder mit **Copy analysis link** genau diese Ansicht teilen.

Das Radar verwendet aktuelle Serien des jeweiligen Berichtstyps und denselben
Mindest-OI-Filter wie der Screener. Die Textzusammenfassung entsteht deterministisch
aus diesen Zahlen; es gibt keine externen KI-Aufrufe und keine Kursprognose.

## Was welcher Regler verändert

| Regler | Wirkung |
| --- | --- |
| Report Type | Berichtsfamilie und Futures-/Combined-Variante; gilt für Radar, Screener und Einzelanalyse. |
| Focus Category | Kategorie für Radar, Screener, historische Zusatzkennzahlen und Vergleichschart. Die Einzelmarkt-Karten zeigen weiterhin sämtliche Gruppen des Reports. |
| Historical Window | Historische Einordnung über 26, 52, 104 oder 156 Kalenderwochen. |
| Analyse As Of | Nur die Einzelanalyse und deren Vergleich verwenden Beobachtungen bis zu diesem Stichtag. |
| Chart Period | 13, 26, 52, 104 Wochen oder alle importierten Daten bis zum gewählten Stichtag. |
| Position Scale | Rohkontrakte oder Anteil am jeweiligen Open Interest. Verändert nicht die Definition des historischen Perzentils/COT-Index. |
| Overlay Open Interest | Zusätzliche OI-Kurve auf rechter Kontraktachse. |
| Show Positions | Netto-, Long-, Short- oder Spreading-Zeitreihen. Historische Einordnung bleibt auf Nettopositionen bezogen. |

**Wichtig:** Radar, Screener, Watchlist und Regeln zeigen stets die letzte verfügbare
Momentaufnahme. Ein früherer Stichtag in der Einzelanalyse verändert diese Bereiche
nicht. Ein Banner erinnert bei historischen Analysen daran.

Historische Ansichten verwenden die derzeit veröffentlichten Archive. Spätere
CFTC-Korrekturen können darin enthalten sein. Das Ausblenden späterer Beobachtungen
macht daraus keine revisionssichere Sammlung damaliger Veröffentlichungsstände.

## Berechnungen ohne versteckte Ersatzwerte

### Historisches Perzentil

Das Perzentil ordnet die aktuelle **Nettokontraktposition** innerhalb ihres eigenen
historischen Fensters ein. Gleichstände erhalten den mittleren Rang:

`100 × (Anzahl kleinerer Werte + 0,5 × Anzahl gleicher Werte) / Anzahl gültiger Werte`.

Die betrachtete Beobachtung ist Bestandteil des Fensters. Deshalb ist der höchste
Rang bei einer endlichen Stichprobe normalerweise etwas kleiner als 100. Bei einer
vollständig konstanten Reihe beträgt das Perzentil 50.

### COT-Spannenindex

`100 × (aktuelle Nettoposition − Minimum) / (Maximum − Minimum)`.

0 und 100 kennzeichnen das Minimum/Maximum des gewählten historischen Fensters.
Wenn alle Werte identisch sind, ist der Index nicht definiert und bleibt leer.
Das ist eine andere Kennzahl als das Perzentil.

### Mindesthistorie und Einheiten

Ein Fenster umfasst Beobachtungen **nach Stichtag minus N Kalenderwochen bis
einschließlich Stichtag**. Es verlangt mindestens `ceil(0,8 × N)` gültige
Beobachtungen: etwa 42 von 52 oder 125 von 156. Es wird ausschließlich der
zusammenhängende Abschnitt mit exakt derselben Original-Einheitsbeschreibung genutzt.
Auch reine Formulierungsänderungen der Quelle können diese vorsichtige Grenze auslösen.

Bei zu kurzer Historie oder fehlender aktueller Nettoposition werden Perzentil
und COT-Index nicht berechnet. Die Zahl gültiger und benötigter Beobachtungen steht
in der Einzelanalyse. Ein historischer Rang ist keine Wahrscheinlichkeit einer Kursbewegung.

### Vergleich von Veränderungen

Für 1W, 4W und 13W muss innerhalb desselben Einheitenabschnitts eine Beobachtung
**exakt 7, 28 bzw. 91 Tage vorher** existieren. Es wird keine andere Woche eingesetzt.

- Nettoänderung: `Netto heute − Netto Vergleichstag`.
- Netto/OI: `100 × Netto / Open Interest`.
- Änderung in Prozentpunkten: `Netto/OI heute − Netto/OI Vergleichstag`.
- OI-Änderung: `100 × (OI heute / OI Vergleichstag − 1)`, nur bei vorherigem OI > 0.

Im Screener werden verschiedene Märkte anhand von relativen Größen verglichen.
Das vermeidet eine bloße Rangliste unterschiedlicher Kontraktgrößen; gleiche
OI-Anteile entsprechen trotzdem nicht derselben wirtschaftlichen Exposition.
Nullnenner und fehlende Werte bleiben leer.

Die ursprünglichen Nettoänderungen auf den Hauptkarten vergleichen weiterhin
zwei aufeinanderfolgende **verfügbare** Beobachtungen und zeigen deren Daten an.
Das kann bei Lücken ein anderer Abstand sein als die expliziten 1W-/4W-/13W-Metriken.

## Screener und Radar

Der Screener sucht nach vollständigem Marktnamen, Börse oder Code und bietet:

- Mindest-Open-Interest; Standard ist 1.000 Kontrakte, frei veränderbar.
- Aktuelle Serien oder zusätzlich historische Kontrakte im importierten Zeitraum.
- Perzentil ≥90, ≤10, beide Randbereiche, wöchentliche Netto-Vorzeichenwechsel oder Watchlist.
- Sortierung nach absoluter relativer Wochenbewegung, Perzentil, OI, Netto/OI oder Name.
- 20 Ergebnisse pro Seite; der CSV-Export enthält **alle gefilterten Ergebnisse**, nicht nur die Seite.

**Heatmap:** Im Screener zwischen Tabelle und Heatmap wechseln. Die Heatmap zeigt
die historischen Netto-Perzentile aller Händlergruppen nebeneinander: Pfirsich für
niedrige, Lavendel für hohe Ränge. Fehlende Werte bleiben als „—“ sichtbar.
Filter, Sortierung und Seiteneinteilung bleiben aktiv; die Sortierung folgt weiterhin
der Focus Category. Eine Zelle öffnet die Marktanalyse mit ihrer Händlergruppe.
Der Heatmap-CSV-Export enthält alle gefilterten Märkte mit Perzentil, COT-Index
und Beobachtungszahl für jede Gruppe. Die Ansichtspräferenz wird lokal gespeichert.

Im Radar erscheinen höchstens fünf Einträge pro Kategorie. Eine fehlende Berechnungsbasis
wird nicht durch 0 ersetzt. Beim Vorzeichenwechsel werden zwei echte, von null verschiedene
Nettopositionen mit entgegengesetztem Vorzeichen verlangt.

## Vergleich mehrerer Märkte

Der gewählte Markt ist die Basis. Nach Name, Börse oder Code suchen und mit
**Add market +** bis zu drei weitere aktuelle Kontrakte desselben Reports ergänzen.
Jeder Vergleich lässt sich über das × an seinem Eintrag entfernen.
Verglichen wird die Focus Category als Nettoanteil am jeweiligen OI.

Stichtag und Chartzeitraum gelten für alle Serien. Jede behält ihre tatsächlichen
Berichtszeitpunkte; Lücken werden nicht aufgefüllt. Geänderte Einheitsbeschreibungen
unterbrechen Linien. Kategorie, Datenstand und Normierung werden unter dem Feld erklärt.

## Perzentilverlauf und Wochenmatrix

**Historical percentile over time** zeigt die Focus Category im ausgewählten
historischen Fenster. Jeder Punkt berechnet seinen Rang nur aus Beobachtungen bis
zu seinem eigenen Datum. Der **Chart Period** schneidet anschließend den sichtbaren
Verlauf zu: Frühere Beobachtungen außerhalb der Anzeige können weiterhin zur
historischen Berechnungsbasis eines sichtbaren Punkts gehören. Ein anderer Stichtag
blendet sämtliche späteren Punkte aus, auch in Tabelle und Export.

Die schattierten Bereiche markieren Ränge ≤10 und ≥90. Die y-Achse bleibt bei 0–100;
diese Zahlen sind historische Ränge, keine erwarteten Renditen. Fehlende Wochen,
Einheitenwechsel und nicht berechenbare Werte unterbrechen die Linie. Bei fehlender
Mindesthistorie bleibt der Punkt leer; der Hinweis zeigt, wie viele angezeigte Werte
berechenbar sind und auf welches Datum sich der letzte verfügbare Rang bezieht.

Unter **View percentile data as a table** stehen dieselben Werte mit Nettokontrakten,
COT-Index und gültiger/benötigter Beobachtungszahl. **Percentile CSV** enthält alle
angezeigten Beobachtungen inklusive fehlender Werte, Einheit, OI und Fensterminimum/
-maximum. Der Export bleibt verfügbar, falls das Diagramm nicht gezeichnet werden kann.

**Exact-week changes by trader category** vergleicht alle Händlergruppen des gewählten
Reports am Analysestichtag mit exakt 7, 28 und 91 Tagen zuvor. Die Spalten benennen das
erwartete Vergleichsdatum. Pro Zelle stehen die Änderung der Nettokontrakte und die
Änderung von Netto/OI in **Prozentpunkten**. Die OI-Nenner stammen jeweils vom zugehörigen
Datum. Fehlt ein exakter Vergleich im gleichen Einheitenabschnitt, erscheint „—“.

**Weekly changes CSV** enthält alle Gruppen und Zeitabstände mit erwartetem und
verfügbarem Vergleichsdatum. Die Matrix verwendet immer Nettopositionen, unabhängig
von **Show Positions** oder **Position Scale** im Hauptdiagramm. Sie verwendet denselben
Stichtag wie die Einzelanalyse. Im Gegensatz dazu bleibt der Screener auf dem letzten
veröffentlichten Stand.

## Persönliche Einstellungen

Alles bleibt unter dem Ursprung der Website im **localStorage dieses Browsers**:

- Watchlist: bis zu 100 Kombinationen aus Bericht und Kontrakt; beim Speichern wird
  die gewählte Händlergruppe mitgespeichert und auf der Karte benannt.
- Gespeicherte Ansichten: bis zu 20; Markt, Bericht, Gruppe, Fenster, Skala, Zeitraum,
  optionaler historischer Stichtag, OI-Overlay und Vergleichsmärkte.
- Lokale Regeln: bis zu 50; obere/untere Perzentilschwelle, absolute relative Wochenbewegung
  oder Netto-Vorzeichenwechsel für Markt/Kategorie und gegebenenfalls historisches Fenster.

Bei **Latest** bleibt eine Ansicht dynamisch auf der neuesten Beobachtung des Kontrakts.
Ein ausdrücklich gewählter älterer Stichtag bleibt fest. Geteilte URLs enthalten diese
Analyseeinstellungen, aber keine persönliche Watchlist oder Regeldefinitionen.

Mit **Export workspace** eine JSON-Sicherung herunterladen. **Import workspace** führt
eine gültige Sicherung mit den vorhandenen Einstellungen zusammen; Watchlist-Dubletten
werden entfernt, Größenlimits bleiben bestehen. Fehlende Kontrakte werden nicht erfunden.
Die Importdatei darf höchstens 1 MiB groß sein. Regeln und Ansichten können sich durch
wiederholten Import duplizieren und lassen sich einzeln entfernen.

Privater Browsermodus, gelöschte Websitedaten oder ein anderer Browser können diese
Einstellungen verlieren. Ist lokales Speichern blockiert, zeigt die Seite einen Hinweis;
der Arbeitsbereich funktioniert für die aktuelle Sitzung weiter und kann exportiert werden.
Es gibt keine automatische Cloud-Synchronisierung.

### Lokale Regeln sind keine Hintergrundüberwachung

Regeln werden anhand der letzten vorberechneten Momentaufnahme geprüft, wenn die
Website startet oder der Arbeitsbereich geändert wird. Angezeigt werden Treffer,
Nichttreffer oder unzureichende Daten samt Datum des geprüften Datensatzes.
Für historische, nicht mehr aktuelle Kontrakte wird kein aktueller Treffer behauptet.

Es werden **keine E-Mails, Push-Nachrichten oder Hintergrundjobs** eingerichtet.
Das GitHub-Datenupdate bleibt täglich; **Check published update** prüft den veröffentlichten Katalog. Ist ein neuer Stand
vorhanden, lädt **Load new dataset** ihn auf Wunsch; die offene Analyse wird zuvor
nicht ersetzt. Diese Prüfung startet keinen neuen Import. Eine bereits offene Seite empfängt keinen Echtzeit-Feed.

## Exporte

- **Percentile CSV:** angezeigter Perzentilverlauf mit Berechnungsbasis und fehlenden Werten.
- **Weekly changes CSV:** alle Händlergruppen, exakte Vergleichsdaten und Netto-/Netto-OI-Änderungen.
- **Chart-period CSV:** alle Gruppen/Positionsfelder, gefiltert auf sichtbaren Zeitraum und Stichtag.
- **Full history JSON:** vollständige normalisierte Historie des gewählten Kontrakts.
- **Complete source JSON:** sämtliche Originalspalten und Quellwerte, unabhängig vom Chartzeitraum.
- **Filtered CSV:** sämtliche aktuell gefilterten Screener-Ergebnisse, mit Gruppen- und Fensterangabe.
- **Export briefing:** datenbasierte Radar-Zusammenfassung als Markdown.
- **Export workspace:** persönliche Watchlist, Ansichten und Regeln als wieder importierbares JSON.

## Technische Aufteilung und Prüfungen

`cot_analysis.py` berechnet die neuesten Momentaufnahmen beim Build.
`site/analytics.js` verwendet dieselben Definitionen für historische Ansichten.
Die Momentaufnahmen liegen in separaten, inhaltsabhängig benannten Dateien je Bericht;
der Browser muss dafür nicht sämtliche Markthistorien herunterladen.
`workspace.js` koordiniert Bedienung, lokalen Speicher und die zusätzlichen Bereiche.
`interface.js` ergänzt Bereichsnavigation, Vergleichsauswahl und Heatmap.
Markthistorien werden in einem auf zwölf Einträge begrenzten Sitzungscache wiederverwendet.
Datenanfragen haben ein Zeitlimit von 20 Sekunden.
Es gibt keine npm-Abhängigkeiten im Produkt oder Datenimport.

Automatisierte Prüfungen: 23 Python-Tests und zwölf Node-Tests. Zusätzlich wurden
112 echte Historien/Stichtage zwischen Python- und JavaScript-Berechnung abgeglichen
und die Bedienabläufe in einer DOM-Testumgebung geprüft. Diese ersetzt keine visuelle
Browserprüfung der Plotly-Grafiken oder der Layoutdetails.

Die zuvor veröffentlichte Desktop-Version wurde zusätzlich visuell im Browser geprüft:
Plotly-Diagramme, Berichtwechsel und OI-Overlay funktionierten. Die neuen Bedienelemente
sind per DOM-Ablauftests geprüft; eine visuelle Mobilprüfung steht noch aus.

Die Erweiterung des Perzentilverlaufs wurde zusätzlich für 1.920 Gruppen-/Fensterwerte
gegen die Python-Momentaufnahmen aus 112 echten Historien/Stichtagen abgeglichen.
DOM-Ablauftests prüfen Berichte durchblättern, früheste/neueste Beobachtung,
Stichtagsgrenzen im Verlauf, beide neuen CSV-Exporte und das Zurücksetzen nach Ladefehlern.
Die neue Chartdarstellung ist noch nicht visuell im Browser geprüft.
