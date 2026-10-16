# Changelog

## 2026-10-16 — Interface and repository cleanup

- Split market analysis into Overview, History, Compare and Data tabs.
- Removed duplicate percentile/sample-size text from position cards.
- Moved explanatory copy behind disclosure controls; kept warnings visible.
- Removed the decorative hero illustration and shortened the browser title to COTInsight.
- Grouped styles, scripts and the favicon under `site/assets/`.
- Renamed the archive importer to `scripts/fetch_cot_data.py` and updated CI/tests.
- Replaced session-specific root documents with an English README, user guide,
  methodology and contribution guide.

## 2026-10-16 — Historical analysis

- Added rolling percentile charts, accessible data tables and CSV exports.
- Added exact-week change matrices and older/newer/latest observation navigation.

## 2026-10-15 — Research workspace

- Added radar, screener, category heatmap, market comparison and published-update checks.
- Added browser-local watchlists, saved views, rules and backup/import.
- Built the data pipeline around direct official archives and static GitHub Pages hosting.
