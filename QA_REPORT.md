# AtlasIQ Full Release — QA Report

## Structural checks

- Unified `index.html`: PASS
- Iframes: 0
- References to `AtlasIQ_Single_File.html`: 0
- References to old `atlas-shell` wrapper: 0
- Duplicate HTML IDs: 0
- Required local assets present: PASS
- JavaScript syntax (`node --check`): PASS
- Web manifest JSON parse: PASS

## Core flows included

- Home + restored Campus/Studio showcase cards
- Public Data Observatory with live/fallback labeling
- Atlas Nexus connected-score engine
- Campus Command Center
- Semester Simulator + A/B/C scenarios
- Ripple Engine
- Career Intelligence
- Opportunity Radar
- Decision Memory
- Campus Navigator
- Studio CSV parsing + profiling
- Studio visualizations + correlation map
- Browser-native AutoML comparison
- What-if simulation
- Local dataset analyst
- IndexedDB Data Vault
- ProofGraph
- Amy on-device copilot
- Methodology Hub
- User Guide + command palette
- Local profile + Atlas Passport
- PWA manifest + service worker

## Important runtime note

Live public-data retrieval depends on the visitor's browser/network allowing requests to the official provider. AtlasIQ visibly labels a failed live request as a cached example rather than representing it as current.
