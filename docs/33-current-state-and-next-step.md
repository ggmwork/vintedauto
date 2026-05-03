# Current State And Next Step

Last updated: 2026-04-30

## Purpose

This checkpoint answers two questions:

- what this project is currently building
- what the next implementation step should be

Use this after reading the older roadmap docs. It reflects the current repo state,
not only the earlier plans.

## Current Product Direction

The project is a desktop-first Vinted listing assistant for a seller workflow.

Current target workflow:

`watched folder -> Inbox grouping -> Stock items -> AI listing draft -> Review -> Vinted web handoff -> manual submit`

The important product boundary remains:

- app can organize stock
- app can generate listing fields
- app can prepare and hand off data to Vinted web
- user must make the final publish decision manually

Avoid private Vinted API automation, unattended publishing, auto-reposting, and
cross-account cloning automation.

## What Exists Now

Implemented app surface:

- Next.js app with App Router
- top navigation for Inbox, Stock, Review, and AI settings
- watched-folder Inbox with manual scan, watcher controls, and live refresh
- local JSON/file storage under `.data`
- photo intake and image API routes
- manual grouping from loose photos into stock items
- optional AI-assisted grouping suggestions
- Stock workspace with rename, cover image, move-back, remove, and draft generation
- Review queue and draft detail workflow
- AI listing generation from item photos
- editable title, description, metadata, keywords, and price fields
- export/copy panel for Vinted handoff text and JSON
- `GET /api/drafts/[draftId]/vinted-handoff` for a stable extension payload
- `GET /api/drafts/[draftId]/fill-on-vinted` to launch the supported Vinted create page
- `POST /api/drafts/[draftId]/vinted-fill-result` to persist extension fill results
- review-queue `Fill on Vinted` and `Fill and next` actions
- persisted queue state for `handed_off`, `filled_on_vinted`, `needs_manual_fix`, and `fill_failed`
- unpacked Chrome MV3 extension with popup, service worker, and content script
- multi-provider AI routing for Ollama, OpenAI, and Anthropic
- AI settings page with task-specific provider/model config

Current local data snapshot:

- watched folder: `C:\Users\USER\Pictures\vintedauto\watched-inbox`
- watcher health: `watching`
- imported files: `14`
- sessions: `1`
- stock items: `2`
- drafts: `1`

## What Is Still Planned

The extension MVP exists now. The remaining gap is hardening, not first build.

Missing or still narrow pieces:

- selector hardening and maintenance workflow when Vinted changes
- broader diagnostics for field mismatches across markets
- edit-listing support
- market-generalization beyond the first supported create-listing flow
- shipping, discounts, promo, and other advanced Vinted controls

## Existing Docs For This Feature

These markdown files already cover the missing extension and API work:

- [10-next-phase-roadmap.md](./10-next-phase-roadmap.md) defines listing payload stabilization, Chrome extension MVP, `Fill on Vinted`, and manual final submit.
- [25-implementation-plan-extension-and-admin.md](./25-implementation-plan-extension-and-admin.md) defines the larger extension/admin cycle and puts payload stabilization before the extension.
- [29-vinted-extension-research.md](./29-vinted-extension-research.md) explains the safety boundary, MV3 choice, service worker, content script, popup, and app-as-source-of-truth model.
- [30-vinted-extension-architecture.md](./30-vinted-extension-architecture.md) defines the app endpoint, service worker, content script, popup, image upload, error model, and versioning rule.
- [31-vinted-extension-field-contract.md](./31-vinted-extension-field-contract.md) defines fields, required payload data, fill rules, image rules, status result, and future queue events.
- [32-implementation-plan-vinted-extension-mvp.md](./32-implementation-plan-vinted-extension-mvp.md) is the build plan for payload endpoint, MV3 scaffold, app connection, page detection, field fill, image upload, app trigger, queue polish, and hardening.
- [34-vinted-extension-dom-smoke-test.md](./34-vinted-extension-dom-smoke-test.md) is the repeatable selector-repair and smoke-test checklist for the supported Vinted page.
- [35-vinted-extension-handoff-research-2026-05-03.md](./35-vinted-extension-handoff-research-2026-05-03.md) captures the current Chrome extension research and compares launch/handoff options.
- [36-vinted-extension-recommended-bridge-architecture.md](./36-vinted-extension-recommended-bridge-architecture.md) defines the recommended direct app-to-extension bridge plus the fallback route.
- [37-vinted-extension-message-reference.md](./37-vinted-extension-message-reference.md) records the protocol, storage keys, and launch/fill state machine.
- This file records the current repo-state gap and recommends the exact first endpoint: `GET /api/drafts/[draftId]/vinted-handoff`.

## Main Gap

The MVP handoff loop is present:

`draft -> stable payload API -> extension fill -> result callback -> queue continues`

The next gap is survivability:

`selector changes -> fast diagnosis -> fast repair`

## Recommended Next Step

Build Phase I of the extension MVP plan:

`hardening and selector maintenance`

Scope:

- isolate and document fragile Vinted selectors
- add a repeatable DOM smoke-test checklist for the supported page
- add clearer debug logging for field-match failures
- capture market-specific overrides only when one shared selector path fails

First acceptance criteria:

- one broken field can be diagnosed quickly from logs
- supported-page detection failures are explicit
- field mismatch reports name the exact failed field
- selector changes can be repaired without changing the app payload contract

## Why This Next

This is the best next step because:

- the MVP already proves the payload and fill loop
- Vinted DOM churn is now the main operational risk
- selector maintenance is cheaper while the scope is still narrow
- the manual-submit safety boundary stays intact

## Next Three Milestones

1. Selector hardening

Deliverable:

Supported page detection and field-fill failures are fast to debug.

2. Live smoke checklist

Deliverable:

One repeatable manual test path exists for title, description, price, metadata, images, and result callback.

3. Market expansion only if needed

Deliverable:

Additional market-specific selector overrides are added only after the first flow stays stable.

## Current Recommendation

Do not start multi-account admin, orders, profit tracking, or CSV export next.

Those matter later, but selector reliability is now the bottleneck. Harden the
supported extension flow before widening scope.
