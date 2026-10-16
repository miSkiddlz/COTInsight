# Data and methodology

## Sources and identity

The importer reads CSV text files inside the [official CFTC annual ZIP archives](https://www.cftc.gov/MarketReports/CommitmentsofTraders/HistoricalCompressed/index.htm).
No HTML scraping, third-party data provider, API token or JSON API is required.
All published contract codes in the imported years are included.

| Report family | Variants | Trader categories |
| --- | --- | --- |
| Legacy | Futures Only; Combined | Commercials, Non-Commercials, Nonreportable |
| Disaggregated | Futures Only; Combined | Producer/Merchant/Processor/User, Swap Dealer, Managed Money, Other Reportables, Nonreportable |
| TFF | Futures Only; Combined | Dealer/Intermediary, Asset Manager/Institutional, Leveraged Funds, Other Reportables, Nonreportable |
| Supplemental CIT | Combined | Commercials excluding CIT, Non-Commercials excluding CIT, Commodity Index Traders, Nonreportable |

Combined reports include options converted to futures equivalents. They are not
added to Futures Only reports. Categories across families are not interchangeable.
Nonreportable does not mean exclusively retail traders.

Identity is **report type + CFTC contract code**. Codes remain strings, including
leading zeroes, letters and plus signs. Original names, exchanges and units are
preserved per observation. Mini, Micro, consolidated and exchange-specific contracts
are not merged by name.

The default import covers the current calendar year and the preceding two years.
It is not the full CFTC historical database. The UI uses All-maturities position
fields; complete source exports retain other published columns, including changes,
percentages, trader counts, concentration and Old/Other maturity fields when present.

## Positions and changes

- Net = Long − Short. Spreading contributes to both sides, not to net positions.
- Net/OI = 100 × Net / Open Interest. A missing or nonpositive denominator yields no ratio.
- Missing/suppressed values remain null and appear as “—”, including inapplicable fields.
- Dates identify the position reference date, not the publication or import date.
- Card changes compare consecutive available observations with identical units. A gap
  may make this different from the exact one-week change in the weekly matrix.
- Exact 1W, 4W and 13W comparisons require the observation exactly 7, 28 or 91 days
  earlier in the same contiguous unit-description segment. No other week is substituted.
- Net/OI changes subtract the two ratios and are measured in percentage points.
- OI percentage change requires a positive previous OI.
- Directional colors do not represent profit, a forecast or a trade recommendation.

Unit-description changes break chart lines and reset comparable windows. Even a
wording-only source change can trigger this conservative boundary. No automatic
unit conversion is performed.

## Historical windows

Windows are 26, 52, 104 or 156 calendar weeks. Include observations strictly after
**reference date minus N weeks**, through and including the reference observation.
Require at least **ceil(0.8 × N)** valid observations within a contiguous segment of
identical original unit descriptions. Missing current net positions withhold the metrics.

**Empirical percentile**:

`100 × (count below current + 0.5 × count equal to current) / valid count`

Ties receive the middle rank. The current observation is included, so the highest
rank in a finite sample is normally below 100. A constant series has percentile 50.

**COT range index**:

`100 × (current net − minimum net) / (maximum net − minimum net)`

It reaches 0/100 at the window's extremes and is undefined for a constant series.
It is a different metric from the empirical percentile.

Both use net contracts regardless of the chart's position field or scale. Each
rolling chart point uses only records available up to its own date. A chart range
clips the resulting series after calculation. Missing weeks and missing metrics
remain gaps. Historical views use currently published archives and can contain
later corrections; they are not revision-free release vintages or backtests.

## Generated files

Schema version: **2**. Generated data is excluded from Git.

| Path under `site/data/` | Contents |
| --- | --- |
| `catalog.json` | Reports, markets, units, coverage, source hashes and quality statistics |
| `summaries/` | Content-hashed latest snapshots per report |
| `<report>/<code>-<hash>.json` | Normalized contract history |
| `raw/<report>/<code>-<hash>.json` | Complete original columns and values per contract |

In raw exports, `schemas` lists original column names. Each row identifies its
schema and retains CSV cells in that schema's order. The browser initially loads
the catalog and requested summaries/histories; original columns are downloaded only
when the source export is requested. The session history cache is bounded to 12 entries.

## Validation and publication

The importer checks schemas, column uniqueness, dates, duplicates, numeric formats,
contract identities and position balances. Small source rounding discrepancies are
preserved and flagged; large discrepancies fail the build. Unknown columns remain
in raw exports. New files are staged outside the published site and promoted only
after all requested reports/years succeed.

Temporary download failures are retried. Missing archives are errors except for an
explicit January exception allowing HTTP 404 for an as-yet-unpublished current-year
archive. Such coverage omissions remain explicit in the catalog. A failed deployment
keeps the previous published site. Catalog timestamps and source hashes provide
provenance; a reference date older than 14 days triggers a visible warning, without
claiming a report should already have been published.

Python and browser formulas share the same definitions. Fixtures include original
CFTC example rows and an independent official-API comparison. Automated tests cover
missing data, unit boundaries, calendar windows and future-data exclusion. A separate
review compared 1,920 rolling ranks against Python snapshots across 112 real
histories/cutoffs from all seven variants. See [contributing](../CONTRIBUTING.md).
