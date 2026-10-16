/* Per-observation history and exact-week comparisons. No additional data source. */
const marketResearch = { records: null, ranks: new Map(), visible: [], weekly: [], plotVersion: 0 };

function clearMarketResearch() {
  marketResearch.visible = [];
  marketResearch.weekly = [];
  marketResearch.plotVersion++;
  for (const id of ['olderReport', 'newerReport', 'latestReport', 'rankExport', 'weeklyExport']) el(id).disabled = true;
  for (const id of ['rankBody', 'weeklyBody']) el(id).replaceChildren();
  el('rankContext').textContent = '';
  el('weeklyContext').textContent = '';
  el('rankStatus').textContent = 'Select a market to see its historical context.';
  el('observationPosition').textContent = 'Select a market to browse reports.';
  if (typeof Plotly !== 'undefined') Plotly.purge('rankChart');
}

function renderMarketResearch(series, summary) {
  if (!series.length || !activeMarket) return;
  const group = activeReport.groups.find((g) => g.id === focusID());
  if (marketResearch.records !== history) {
    marketResearch.records = history;
    marketResearch.ranks.clear();
  }
  const key = `${group.id}/${lookback()}`;
  if (!marketResearch.ranks.has(key)) marketResearch.ranks.set(key, COTMath.rankHistory(history, group.id, Number(lookback())));
  marketResearch.visible = COTMath.range(marketResearch.ranks.get(key), summary.date, el('rangeSelect').value === 'all' ? null : Number(el('rangeSelect').value));
  const rows = marketResearch.visible;
  const valid = rows.filter((r) => finite(r.percentile));
  el('rankContext').textContent = `${group.label} · ${lookback()}W window · ${rows[0].date} — ${rows.at(-1).date}`;
  el('rankStatus').textContent = valid.length
    ? `${valid.length} of ${rows.length} displayed observations have sufficient comparable history. Last available percentile: ${pct(valid.at(-1).percentile)} on ${valid.at(-1).date}.`
    : `No displayed observation has sufficient comparable history for the ${lookback()}W percentile. Try a shorter historical window or a different market.`;
  const coverage = el('rankStatus').closest('details');
  if (!valid.length) { coverage.open = true; coverage.dataset.autoOpen = 'true'; }
  else if (coverage.dataset.autoOpen) { coverage.open = false; delete coverage.dataset.autoOpen; }
  el('rankBody').replaceChildren();
  for (const record of rows.slice().reverse()) {
    const tr = node('tr'), th = node('th', '', record.date); th.scope = 'row'; tr.appendChild(th);
    for (const value of [format(record.net, true), pct(record.percentile), finite(record.cot_index) ? record.cot_index.toFixed(1) : '—', `${record.n} / ${record.required}`]) tr.appendChild(node('td', '', value));
    el('rankBody').appendChild(tr);
  }
  const select = el('observationSelect'), index = select.selectedIndex;
  el('olderReport').disabled = index >= select.options.length - 1;
  el('newerReport').disabled = index <= 0;
  el('latestReport').disabled = index <= 0;
  el('observationPosition').textContent = index === 0 ? 'Latest report' : `Historical · ${summary.date}`;
  el('rankExport').disabled = false;
  el('weeklyExport').disabled = false;
  el('weeklyContext').textContent = `As of ${summary.date} · net contracts and change in net / OI`;
  for (const weeks of [1, 4, 13]) {
    const th = el(`weeklyHead${weeks}`); th.replaceChildren(node('span', '', `${weeks}W change`), node('small', 'weekly-date', `vs. ${COTMath.shift(summary.date, -weeks * 7)}`));
  }
  marketResearch.weekly = [];
  el('weeklyBody').replaceChildren();
  for (const category of activeReport.groups) {
    const tr = node('tr'), th = node('th', '', category.label); th.scope = 'row'; tr.appendChild(th);
    for (const weeks of [1, 4, 13]) {
      const delta = summary.groups[category.id].changes[weeks], td = node('td'), amount = node('strong', '', format(delta.net, true));
      colorChange(amount, delta.net);
      td.append(amount, node('small', 'weekly-share', pp(delta.share_pp)));
      td.title = delta.date ? `${summary.date} compared with ${delta.date}` : 'Exact earlier observation unavailable in the same unit segment';
      tr.appendChild(td);
      marketResearch.weekly.push([activeReport.id, activeMarket.code, category.id, summary.date, weeks, COTMath.shift(summary.date, -weeks * 7), delta.date, delta.net, delta.share_pp]);
    }
    el('weeklyBody').appendChild(tr);
  }
  drawRankHistory();
}

async function drawRankHistory() {
  if (!marketResearch.visible.length || workspaceState.activeSection !== 'dashboard' || workspaceState.activePanel !== 'history' || typeof Plotly === 'undefined') return;
  const rows = marketResearch.visible, points = [];
  rows.forEach((row, index) => {
    // Explicit gaps at missing weeks and changed unit descriptions.
    if (index && (row.unit !== rows[index - 1].unit || row.date !== COTMath.shift(rows[index - 1].date, 7))) points.push({date: row.date, percentile: null, n: null, required: null});
    points.push(row);
  });
  const version = ++marketResearch.plotVersion;
  const mobile = window.innerWidth < 600;
  try {
    await Plotly.react('rankChart', [{
      x: points.map((p) => p.date), y: points.map((p) => p.percentile),
      customdata: points.map((p) => [p.n, p.required]),
      name: `${lookback()}W percentile`, type: 'scatter', mode: 'lines+markers',
      connectgaps: false, marker: {size: 3, color: '#c197ff'}, line: {color: '#c197ff', width: 2},
      hovertemplate: '%{x}<br>Percentile %{y:.1f}<br>%{customdata[0]} valid / %{customdata[1]} required<extra></extra>',
    }], {
      paper_bgcolor: '#1b1825', plot_bgcolor: '#1b1825',
      font: {color: '#aaa3ba', family: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif', size: 10},
      margin: {l: mobile ? 42 : 55, r: 18, t: 12, b: 42},
      xaxis: {gridcolor: '#ffffff06', nticks: mobile ? 4 : 8},
      yaxis: {range: [0, 100], fixedrange: true, tickvals: [0, 10, 50, 90, 100], gridcolor: '#ffffff08'},
      shapes: [
        {type: 'rect', xref: 'paper', x0: 0, x1: 1, y0: 0, y1: 10, fillcolor: '#ffb98b18', line: {width: 0}, layer: 'below'},
        {type: 'rect', xref: 'paper', x0: 0, x1: 1, y0: 90, y1: 100, fillcolor: '#c197ff18', line: {width: 0}, layer: 'below'},
      ],
      hovermode: 'closest', showlegend: false, autosize: true,
      uirevision: `${activeReport.id}/${activeMarket.code}/${focusID()}/${lookback()}/${el('rangeSelect').value}/${el('observationSelect').value}`,
    }, {responsive: true, displayModeBar: false, scrollZoom: false});
  } catch {
    if (version === marketResearch.plotVersion) {
      el('rankStatus').textContent = 'Percentile chart could not be displayed. The data table and CSV remain available.';
      el('rankStatus').closest('details').open = true;
    }
  }
}

function initializeMarketResearch() {
  const step = (offset) => {
    const select = el('observationSelect');
    if (select.disabled) return;
    select.selectedIndex = Math.max(0, Math.min(select.options.length - 1, select.selectedIndex + offset));
    select.dispatchEvent(new Event('change'));
  };
  el('olderReport').addEventListener('click', () => step(1));
  el('newerReport').addEventListener('click', () => step(-1));
  el('latestReport').addEventListener('click', () => step(-el('observationSelect').selectedIndex));
  el('rankExport').addEventListener('click', () => {
    if (!activeMarket || !marketResearch.visible.length) return;
    const header = ['report','code','category','window_weeks','date','unit','net_contracts','open_interest','percentile','cot_index','valid_observations','required_observations','window_min','window_max'];
    const rows = marketResearch.visible.map((r) => [activeReport.id,activeMarket.code,focusID(),lookback(),r.date,r.unit,r.net,r.open_interest,r.percentile,r.cot_index,r.n,r.required,r.min,r.max]);
    saveFile(`COTInsight-percentile-${activeReport.id}-${activeMarket.code}.csv`, csv([header,...rows]), 'text/csv;charset=utf-8');
  });
  el('weeklyExport').addEventListener('click', () => {
    if (!marketResearch.weekly.length) return;
    const header = ['report','code','category','asof','weeks','expected_comparison_date','available_comparison_date','net_contract_change','net_oi_change_pp'];
    saveFile(`COTInsight-weekly-changes-${activeReport.id}-${activeMarket.code}.csv`, csv([header,...marketResearch.weekly]), 'text/csv;charset=utf-8');
  });
}
