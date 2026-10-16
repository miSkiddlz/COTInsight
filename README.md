# COTInsight

A focused workspace for the CFTC Commitments of Traders reports.

**[Open COTInsight](https://miskiddlz.github.io/COTInsight/)**

## Explore positioning

- **Radar** — weekly position changes, historical extremes and open interest moves.
- **Analysis** — positions and charts first; history, comparisons and source data in separate tabs.
- **Screener** — search, filter and rank markets, with a category heatmap and CSV export.
- **Watchlist** — browser-local markets, saved views and on-page rules, with backup/import.

Analysis links preserve the market, selected date and chart settings. No account or API key is required.

## Official data

Data comes directly from the [CFTC historical archives](https://www.cftc.gov/MarketReports/CommitmentsofTraders/HistoricalCompressed/index.htm).
All seven report variants are supported: Legacy, Disaggregated and TFF in Futures Only
and Combined form, plus Supplemental CIT. By default, coverage includes the current
calendar year and the preceding two years.

Markets retain their original names, exchanges and CFTC contract codes. Missing
values remain missing. Historical views use currently published archives, which may
include later revisions; they are not archived release vintages.

## Repository

| Path | Purpose |
| --- | --- |
| `site/index.html` | Application layout |
| `site/assets/` | JavaScript, styles and favicon |
| `site/data/` | Generated catalog and reports; excluded from Git |
| `scripts/` | CFTC archive import and analysis calculations |
| `tests/` | Python/JavaScript tests and source fixtures |
| `docs/` | User guide and data methodology |
| `.github/workflows/` | Test, build and GitHub Pages deployment |

## Documentation

- [User guide](docs/guide.md)
- [Data and methodology](docs/data.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

Built with static HTML, CSS and JavaScript, Plotly, and Python's standard library.
GitHub Pages hosts the site; Docker and a backend server are not required.
