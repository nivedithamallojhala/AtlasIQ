# AtlasIQ Massive Upgrade — Drop-in Shell

This package is designed to be copied into the existing `nivedithamallojhala/AtlasIQ` repository.

## Files

- `index.html` — new premium public-facing AtlasIQ shell
- `atlas-shell.css` — full responsive visual system
- `atlas-shell.js` — public data, Atlas Nexus, guide, workspace integration, theme, and UI injection

The package intentionally reuses the existing `AtlasIQ_Single_File.html` as the underlying functional workspace so the current Campus, Studio, ProofGraph, Opportunity Radar, Decision Memory, Amy, and other logic stays intact.

## Major upgrades

1. **Completely rebuilt homepage and navigation**
   - Premium decision-intelligence positioning
   - Responsive dark/light visual system
   - Stronger information hierarchy and motion
   - Clear routes to Public Data, Nexus, Methodology, Guide, and Workspace

2. **Public Data Observatory on the homepage**
   - World Bank U.S. GDP-per-capita signal
   - USGS real-time M2.5+ earthquake feed
   - U.S. Bureau of Labor Statistics unemployment series
   - Visible provenance and retrieval state
   - Graceful fallback when a source endpoint is blocked
   - One-click "Open in Studio" for live datasets

3. **Atlas Nexus — new flagship connecting feature**
   - Reads the active AtlasIQ profile and live workspace scores
   - Connects Semester Balance, Career Readiness, Route Resilience, evidence, Decision Memory, and active dataset quality
   - Produces a connected score and a next-best-action queue
   - Routes the user directly into the highest-priority AtlasIQ tool

4. **Methodology Hub**
   - Campus scoring explanation
   - Ripple Engine assumptions and uncertainty
   - Opportunity / skill-matching methodology
   - Studio analytics and lightweight AutoML explanation
   - Nexus aggregation methodology
   - Privacy and public-data provenance

5. **User Guide / outcome-based onboarding**
   - Plan a semester
   - Test a decision
   - Target an internship
   - Analyze a dataset
   - Understand methodology
   - Direct navigation into the existing workspace

6. **Existing workspace UI upgrade without breaking its logic**
   - Same-origin iframe integration
   - Injected premium embedded styling
   - Simplified embedded experience (old marketing sections hidden inside the frame)
   - Improved cards, tabs, top bar, buttons, spacing, and mobile behavior
   - Focus mode and refresh controls

## Deployment

Copy the three web files into the repository root, replacing the existing `index.html` and adding the two new shell assets. Keep the existing `AtlasIQ_Single_File.html` in the root.

No backend, package manager, or API key is required for the shell itself. Public-source requests are made from the visitor's browser and may be subject to source-side availability/CORS rules.

## Public source endpoints

- World Bank Indicators API — no API authentication required for the Indicators API.
- USGS GeoJSON summary feed — intended for programmatic real-time earthquake display.
- BLS Public Data API v1 — public/unregistered access supported with tighter usage limits.

## GitHub connector note

During this build, the connected GitHub app returned HTTP 403 `Resource not accessible by integration` for both repository file writes and low-level Git blob writes, so these files were generated as a ready-to-apply package rather than falsely claiming they were pushed.
