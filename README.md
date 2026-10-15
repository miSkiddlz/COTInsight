# COTInsight

Interactive CFTC Commitments of Traders dashboard, hosted on **GitHub Pages**.
The browser loads static HTML, JavaScript and JSON. There is no application
server, Docker setup or server wake-up time. Plotly is loaded from its CDN.

## Einmalig auf GitHub einrichten

1. Diese Projektdateien in dein bestehendes Repository übernehmen. Alte Dateien
   `Dockerfile`, `app/main.py`, `app/static/`, `requirements.txt` und
   `scripts/cot_reports.py` entfernen, falls du Dateien manuell hochlädst.
   Den neuen Ordner `.github/` unbedingt mit übernehmen.
2. Für GitHub Free muss das Repository **öffentlich** sein.
3. Im Repository **Settings → Pages → Build and deployment → Source → GitHub Actions** wählen.
4. Änderungen auf `main` hochladen. Falls der Upload schon vorher erfolgt ist:
   **Actions → Update data and deploy website → Run workflow → main**.
5. Nach erfolgreichem Durchlauf steht die Adresse unter **Settings → Pages**:
   `https://DEIN-GITHUB-NAME.github.io/COTInsight/` (bei anderem Repositorynamen entsprechend anders).
6. Erst wenn die neue Seite funktioniert, den alten Render-Service im
   Render-Dashboard löschen und gegebenenfalls die GitHub-Verknüpfung entfernen.
   Das lässt sich nicht allein durch Änderungen an diesen Projektdateien erledigen.

Der Workflow setzt den Branch `main` voraus. Bei einem anderen Standardbranch
`branches` in `.github/workflows/pages.yml` anpassen und von diesem Branch starten.
Keine Domain, API-Schlüssel oder eigenen Zugangsdaten nötig.

## Spätere Änderungen und Datenupdates

Website bearbeiten → committen/pushen → GitHub veröffentlicht automatisch.
Die Daten werden bei jeder Veröffentlichung und täglich gegen 22:17 UTC neu
von den offiziellen CFTC-Jahresarchiven geladen. Das ist eine tägliche Prüfung,
kein täglicher neuer COT-Bericht. Die Anzeige nennt das tatsächliche Berichtsdatum.

Der Build verarbeitet das laufende und die zwei vorherigen Kalenderjahre
(Legacy Futures Only). Schlägt der Download oder die Prüfung fehl, wird nichts
neu veröffentlicht; eine bereits veröffentlichte Seite bleibt verfügbar.
Beim allerersten fehlgeschlagenen Build existiert noch keine neue Website.
Fehler sind unter **Actions** sichtbar; dort kann man den Lauf erneut starten.
Zum Jahresanfang kann das neue Jahresarchiv anfangs noch fehlen.

GitHub kann Zeitpläne verzögert ausführen. Bei öffentlichen Repositories werden
geplante Workflows nach 60 Tagen ohne Repository-Aktivität deaktiviert. Dann
unter **Actions** wieder aktivieren. Die veröffentlichte Website bleibt erreichbar.

## Lokal ansehen (Python 3.12, keine Zusatzpakete)

Im Projektordner:

```sh
python scripts/fetch_cot_api.py
python -m http.server 8000 --directory site
```

Dann `http://localhost:8000` öffnen. Unter Windows funktioniert gegebenenfalls
`py` statt `python`. Nicht per Doppelklick als `file://` öffnen.
Die erzeugte JSON-Datei wird nicht ins Repository committed; GitHub baut sie neu.

```sh
python -m unittest discover -s tests -v
```

## Struktur

- `site/`: veröffentlichte Website
- `scripts/fetch_cot_api.py`: Download, Prüfung und Erstellung von `site/data/cot_data.json`
- `.github/workflows/pages.yml`: automatischer Build und Veröffentlichung
- `tests/`: Prüfungen der Datenverarbeitung ohne Netzwerk

Positionen werden in **Kontrakten** angezeigt. Nonreportable-Positionen sind
keine exakte Abgrenzung von Privatanlegern; die bestehende Bezeichnung „Retail“
ist nur eine vereinfachte Beschriftung.
