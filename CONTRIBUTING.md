# Contributing

## Develop locally

Use Python 3.12+ and Node.js 22+ for the tests. No Python or npm packages are required.

```sh
python scripts/fetch_cot_data.py
python -m http.server 8000 --directory site
```

Open `http://localhost:8000`. Use `py` instead of `python` if required on Windows.
The importer also accepts `--years N` (1–10 calendar years). Generated `site/data/`
files must not be committed. Do not open `index.html` using a `file://` URL.

```sh
python -m unittest discover -s tests -v
node --test tests/test_analytics.cjs
```

## Code map

| Module | Responsibility |
| --- | --- |
| `scripts/fetch_cot_data.py` | Archive download, parsing, validation and data build |
| `scripts/cot_analysis.py` | Latest snapshots and historical calculation definitions |
| `site/assets/js/analytics.js` | Pure browser calculations; also imported by Node tests |
| `site/assets/js/charts.js` | Catalog loading, contract selection and main chart |
| `site/assets/js/workspace.js` | Research data, personal settings, sharing and exports |
| `site/assets/js/interface.js` | Main navigation, analysis tabs, heatmap and comparison picker |
| `site/assets/js/research.js` | Rolling history, weekly matrix and observation navigation |
| `site/assets/css/styles.css` | Shared design tokens, components and responsive layout |

The application uses deferred scripts in dependency order rather than a bundler.
Data URLs stay relative to `site/index.html`, not to the JavaScript directory.
Preserve this when moving modules or changing paths.

Keep typography and the peach/lavender/mint palette consistent. The Overview tab
should stay focused on position cards and the main chart. Put calculation explanations
in disclosure controls or documentation, while keeping errors, stale-data warnings
and historical-date notices immediately visible. Recheck chart sizing after revealing
any previously hidden panel. Tab navigation must remain keyboard accessible.

## Deployment

The Pages workflow tests the project, builds official data, then deploys `site/`.
It runs on pushes to `main`, manual dispatch and a daily best-effort schedule.
There is no Docker/Render runtime. Keep workflow paths in sync with renamed scripts.
GitHub can delay scheduled runs or disable them after repository inactivity;
check the Actions history when investigating stale publications.

Before proposing a change, run both test suites and check Overview, History, Compare
and Data at desktop and narrow widths. Include what changed and the checks performed
in the pull request. Do not add invented zeroes, merge contracts by display name or
relax source validation merely to get a successful build.
