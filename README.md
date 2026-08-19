# AtlasIQ — Data, Understood

AtlasIQ is a privacy-first, browser-native decision intelligence platform created by Niveditha Mallojhala with product collaboration from Shriyan Avadhanula.

## This release is fully unified

There is **no iframe and no embedded legacy app**. `index.html` contains the complete product surface and loads only `styles.css` and `app.js`.

### Core experiences

- Public Data Observatory with official source attribution and live/cached-state labeling
- Atlas Nexus cross-workspace intelligence layer
- AtlasIQ Campus
  - Command Center
  - Semester Simulator
  - Ripple Engine
  - Career Intelligence
  - Opportunity Radar
  - Decision Memory
  - Campus Navigator
- AtlasIQ Studio
  - CSV upload and profiling
  - missingness / outlier / correlation analysis
  - interactive visualizations
  - lightweight browser-native AutoML
  - what-if sensitivity analysis
  - local dataset analyst
  - IndexedDB Data Vault
- ProofGraph evidence network
- Amy on-device decision copilot
- Methodology Hub
- User Guide + command palette
- private local profile and Atlas Passport export

## Public data

The static site attempts read-only browser requests to:

- World Bank Indicators API (`SP.POP.TOTL` for the United States)
- USGS M2.5+ earthquake GeoJSON 7-day feed
- U.S. Bureau of Labor Statistics public time-series API (`CUUR0000SA0`)

If a live request fails, the UI clearly labels the card as a **cached example** rather than presenting it as live.

## Privacy

Personal profile data and decision state use browser local storage. Saved datasets use IndexedDB. Uploaded CSV files are analyzed in the browser. The site has no account server and does not send personal workspace content to a backend.

## GitHub Pages deployment

Delete the old repository contents if you intend to replace the project completely, then upload the **contents of this folder** to the repository root:

```text
index.html
styles.css
app.js
favicon.svg
manifest.webmanifest
sw.js
README.md
LICENSE
```

Then deploy GitHub Pages from the repository root on `main`.

## Methodology boundary

AtlasIQ is an educational decision-support prototype. Scores and simulations are explainable heuristics, lightweight statistical models, or sensitivity analyses. They are not guarantees, professional advice, clinical predictions, or production model validation.
