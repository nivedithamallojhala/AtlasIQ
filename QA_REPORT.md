# AtlasIQ v3 QA Report

## Automated checks completed

- `app.js` syntax: passed
- `enhancements.js` syntax: passed
- duplicate HTML IDs: none found
- required runtime assets: present
- profile onboarding and guest mode: passed
- profile creation and identity refresh: passed
- non-Purdue generic course defaults: passed
- custom campus route calculation: passed
- Opportunity Radar sample analysis: passed
- Decision Memory entry and calibration calculation: passed
- dynamic ProofGraph evidence creation: passed
- education sample profiling: passed
- browser-native AutoML execution: passed; linear regression selected in the sample smoke test
- Amy context-aware dataset explanation: passed
- Atlas Passport preview: passed
- profile switching and scoped state refresh: passed
- JavaScript page errors during tested workflows: none

## Environment note

The automated browser sandbox blocks navigation to local HTTP/file origins. UI testing therefore used the real HTML/CSS/JavaScript with a temporary localStorage test double. The IndexedDB Data Vault code is included and designed for normal HTTPS/GitHub Pages origins; deploy or run `python3 -m http.server 8000` to exercise that browser feature under a persistent origin.
