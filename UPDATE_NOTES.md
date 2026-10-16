# Update 2026-10-16

## Änderungen

- Historischer Perzentilverlauf mit festen 0–100-Achsen, Lücken, zugänglicher Datentabelle
  und CSV der angezeigten Daten samt Berechnungsbasis.
- Wochenvergleich für sämtliche Händlergruppen: exakte 1W-/4W-/13W-Nettoänderungen,
  Netto/OI-Änderungen in Prozentpunkten und ausdrücklich benannte Vergleichsdaten.
- Navigation zur älteren, neueren oder neuesten verfügbaren Beobachtung.

Keine neuen Pakete, Konten oder API-Schlüssel erforderlich. Die bestehende Pages-Pipeline
baut und veröffentlicht den vollständigen Datenstand nach dem Push.

## Prüfung

23 Python-Tests und zwölf Node-Tests bestanden. 1.920 Verlaufsergebnisse wurden
gegen Python-Momentaufnahmen aus 112 echten Historien/Stichtagen abgeglichen.
Zusätzliche DOM-Prüfungen decken neue Exporte, Berichtswechsel, Stichtage und Fehlerzustände ab.
Eine visuelle Prüfung der neuen Charts auf Desktop und Mobilgeräten steht noch aus.

## Übernehmen

Den Projektordner durch den Inhalt dieses ZIP ersetzen, den eigenen `.git`-Ordner
behalten, committen und pushen. Bestehende Browser-Watchlists und Ansichten bleiben
im gleichen lokalen Speicherformat. Keine Daten aus `site/data` manuell committen.

Commit-Message:

```text
Add rolling percentile history, weekly change matrix and report navigation
```
