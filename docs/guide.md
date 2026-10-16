# User guide

## Find a market

Use **Radar** for notable weekly changes or **Screener** to search by market,
exchange or CFTC contract code. Selecting a result opens **Analysis**.

The global controls select the **report type**, **focus category** and **historical
window**. Report types have different trader categories and must be interpreted
separately. Open **About this report** for the selected report's description.

## Analysis

The analysis is split into four tabs. The selected report date applies to all four.

| Tab | Contents |
| --- | --- |
| Overview | Net positions by trader category and the main position chart |
| History | Historical ranks, rolling percentile chart and exact 1W/4W/13W changes |
| Compare | Selected market plus up to three additional markets from the same report |
| Data | Contract units, previous observation date, position table, exports and methodology |

Use **Report date**, **Older report**, **Newer report** or **Back to latest** to review
available observations. Historical analysis excludes later observations from all
four tabs. Radar, Screener, Watchlist and on-page rules continue to use the latest
published dataset; a historical-view banner reminds you of this distinction.

**Chart range** changes the displayed period. **Chart scale** switches between
contracts and a share of open interest. **Show positions** selects net, long, short
or spreading. The optional open-interest overlay uses the right-hand axis.

In **History**, the selected focus category determines the rank chart. The historical
window is independent of the visible chart range: earlier records may still be
needed to calculate a visible point. Expand the explanation or coverage details
when needed. A data table is available below the chart, including missing values.

In **Compare**, search for a market and choose **Add market +**. Remove an entry using
its × button. All series use net positions divided by their own open interest.
Dates and missing values remain specific to each market; relative positions do not
represent equal economic exposure.

Tab navigation supports arrow keys and Home/End. **Copy analysis link** preserves
the selected tab and analysis settings. Old links without a tab open Overview.

## Screener

Search and filter by current series, minimum open interest, historical extremes,
net-sign changes or watchlist membership. Sort by weekly movement, rank, open
interest, net/OI or name. There are 20 results per page.

**Category heatmap** shows all trader categories side by side. Peach indicates a
lower historical rank, lavender a higher rank; “—” means unavailable. Select a cell
to open its market and category. Filters and order still follow the focus category.
The CSV contains every filtered result, not just the current page.

## Personal workspace

Watchlists, saved views, display preferences and rules are stored in this browser's
localStorage. No account or cloud sync is involved. Private browsing, clearing site
data or changing browsers can lose these settings. Use **Export workspace** and
**Import workspace** to keep or move them.

Backups are limited to 1 MiB. Imports merge watchlists, views and rules, with limits
of 100 watchlist entries, 20 saved views and 50 rules. Duplicate watchlist entries
are removed; repeatedly imported views/rules may need manual removal. The current
browser's table/heatmap display preference is retained during merging.

Rules evaluate the latest dataset when the page starts or workspace controls change.
They do not send messages or run background monitoring. A historical contract without
a current snapshot is not treated as a current alert.

**Check published update** checks for a newer published catalog. It does not trigger
a CFTC import. If new data is available, **Load new dataset** reloads it when chosen.

## Exports

| Export | Contents |
| --- | --- |
| Chart-period CSV | All position fields/groups in the selected chart range and date |
| Percentile CSV | Displayed focus-category rank history, including calculation coverage |
| Weekly changes CSV | All groups, exact expected/available comparison dates and changes |
| Full history JSON | Complete normalized history for the selected report/contract |
| Complete source JSON | All original source columns and values for that contract |
| Filtered CSV | All matching screener rows; all categories when using the heatmap |
| Briefing | Latest radar summary as Markdown |
| Workspace | Local watchlist, saved views, rules and display preference as JSON |

The source and full-history JSON downloads include the complete imported contract
history, even when viewing an earlier date. Chart-period and percentile CSV exports
respect the chosen date. See [data methodology](data.md) for calculation definitions.
