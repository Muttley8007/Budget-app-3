# Payday Planner v3 Beta

Version **3.0.0-beta.3**.

This beta adds two major planning modules while retaining the v2.4 Pay Cards and Bills experience:

- **Annualizer** — track annual expenses, funding progress, the next annualisation target, and monthly cash flow released when an item is fully funded.
- **Home Loans** — support multiple mortgages, dated credits/debits, recurring transactions, dated interest-rate changes, a generated daily forward schedule, collapsible years/months, and a payoff-date headline.

## Mortgage calculation beta assumption

Interest is calculated daily from the simulated balance and accumulated interest is charged to the loan at month end. Rate changes apply from their effective date. This is intended as a planning forecast; bank posting dates and lender-specific interest charging rules can differ.

## Data compatibility

The v3 app uses a new local-storage key but will automatically migrate data found under the v2 beta key on first load. v2-style JSON backups can also be imported; missing v3 fields are created automatically.

# Budget App

Static GitHub Pages app for planning pay cycles.

## Files
- `index.html`
- `styles.css`
- `app.js`

## Deploy on GitHub
1. Create a repo.
2. Upload these files to the repo root.
3. Enable GitHub Pages from the main branch / root.
4. Open the Pages URL.

## Notes
- Data is stored in browser localStorage.
- Use Export / Import in the app to back up and restore data.


## PWA setup
This repo is now PWA-ready.

### Files added
- `manifest.json`
- `service-worker.js`
- `icon.svg`
- `icon-192.svg`
- `icon-512.svg`

### To use on phone
1. Open the GitHub Pages site in Chrome.
2. Open the browser menu.
3. Choose **Add to Home screen** or **Install app**.

### Note
If you change files and do not see updates straight away, refresh once or clear the app/site cache because the service worker caches assets for offline use.
