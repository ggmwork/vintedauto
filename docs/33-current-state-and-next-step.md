# Current State And Next Step

Last updated: 2026-05-17

## Purpose

This checkpoint answers two questions:

- what this project is currently building
- what the next implementation step should be

Use this after reading the older roadmap docs. It reflects the current repo state,
not only the earlier plans.

## Current Product Direction

The project is a desktop-first Vinted listing assistant for a seller workflow.

Current implemented workflow:

`watched folder -> Inbox grouping -> Stock items -> AI listing draft -> Review -> Vinted web handoff -> manual submit`

Target seller workflow for the next UX slice:

`watched folder -> Workbench item creation -> Inventory management -> listing editor -> Vinted fill -> manual submit -> mark listed`

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
- top navigation for Workbench, Listings, and Settings
- watched-folder Inbox with manual scan, watcher controls, and live refresh
- local JSON/file storage under `.data`
- photo intake and image API routes
- manual grouping from loose photos into stock items
- optional AI-assisted grouping suggestions
- Stock workspace with rename, cover image, move-back, remove, and draft generation
- Review queue and draft detail workflow
- AI listing generation from item photos
- editable title, description, metadata, keywords, and price fields
- schema-driven Vinted PT profile fields in Draft review and Stock
- export/copy panel for Vinted handoff text and JSON
- `GET /api/drafts/[draftId]/vinted-handoff` for a stable extension payload
- `GET /api/drafts/[draftId]/fill-on-vinted` to launch the supported Vinted create page
- `POST /api/drafts/[draftId]/vinted-fill-result` to persist extension fill results
- review-queue `Fill on Vinted` and `Fill and next` actions
- persisted queue state for `handed_off`, `filled_on_vinted`, `needs_manual_fix`, and `fill_failed`
- unpacked Chrome MV3 extension with popup, service worker, and content script
- direct route launch from the app plus popup-side drafted-stock picker in the extension
- service-worker-owned image transport relay instead of content-script fetches
- category-path and later-field handoff through `listing.profile`
- multi-provider AI routing for Ollama, OpenAI, and Anthropic
- AI settings page with task-specific provider/model config
- experimental local CLI listing provider using Codex CLI
- AI settings page can enable Local CLI, choose engine, choose listing model, and test provider setup

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
- stable extension ID and install workflow for the direct bridge
- broader diagnostics for field mismatches across markets
- edit-listing support
- market-generalization beyond the first supported create-listing flow
- shipping, discounts, promo, and other advanced Vinted controls
- more PT profile coverage beyond the first apparel branches
- local CLI AI benchmarking against Ollama/API providers
- Inventory management UX replacing the queue-first `/review` page

## Existing Docs For This Feature

These markdown files cover the extension, API, and hardening work:

- [10-next-phase-roadmap.md](./10-next-phase-roadmap.md) defines listing payload stabilization, Chrome extension MVP, `Fill on Vinted`, and manual final submit.
- [25-implementation-plan-extension-and-admin.md](./25-implementation-plan-extension-and-admin.md) defines the larger extension/admin cycle and puts payload stabilization before the extension.
- [29-vinted-extension-research.md](./29-vinted-extension-research.md) explains the safety boundary, MV3 choice, service worker, content script, popup, and app-as-source-of-truth model.
- [30-vinted-extension-architecture.md](./30-vinted-extension-architecture.md) defines the app endpoint, service worker, content script, popup, image upload, error model, and versioning rule.
- [31-vinted-extension-field-contract.md](./31-vinted-extension-field-contract.md) defines fields, required payload data, fill rules, image rules, status result, and future queue events.
- [32-implementation-plan-vinted-extension-mvp.md](./32-implementation-plan-vinted-extension-mvp.md) is the implemented MVP plan and remaining selector-hardening reference.
- [34-vinted-extension-dom-smoke-test.md](./34-vinted-extension-dom-smoke-test.md) is the repeatable selector-repair and smoke-test checklist for the supported Vinted page.
- [35-vinted-extension-handoff-research-2026-05-03.md](./35-vinted-extension-handoff-research-2026-05-03.md) captures the current Chrome extension research and compares launch/handoff options.
- [36-vinted-extension-recommended-bridge-architecture.md](./36-vinted-extension-recommended-bridge-architecture.md) defines the recommended direct app-to-extension bridge plus the fallback route.
- [37-vinted-extension-message-reference.md](./37-vinted-extension-message-reference.md) records the protocol, storage keys, and launch/fill state machine.
- [38-vinted-extension-stable-id-setup.md](./38-vinted-extension-stable-id-setup.md) records the stable unpacked extension ID setup and the next manual Chrome step.
- This file records the current repo-state gap and recommends selector hardening as the next extension step.

## Main Gap

The immediate UX gap is management clarity.

The app can create items, generate listing drafts, review fields, and fill
Vinted, but daily work is split across Workbench, Stock, Review, and Drafts.
The seller needs one Inventory surface that answers:

`what items do I have, what state are they in, and what should I do next?`

Use [54-inventory-management-ux-plan.md](./54-inventory-management-ux-plan.md)
and [55-inventory-management-reference.md](./55-inventory-management-reference.md)
as the current implementation guide for this UX slice.

## Extension Hardening Gap

The MVP handoff loop is present, including the first later-field profile layer:

`draft -> stable payload API -> extension fill -> result callback -> queue continues`

The next gap is survivability:

`real PT later-field selectors -> fast diagnosis -> fast repair`

The wider UI track started with the simplified Workbench UX in
[43-simplified-ux-redesign-plan.md](./43-simplified-ux-redesign-plan.md). The
current UX priority is now the Inventory surface defined in documents `54` and
`55`.

The local CLI AI provider track is implemented for the first Codex listing
slice. The remaining AI work is quality benchmarking and optional Claude Code
support after the `claude` CLI is installed and its image path is verified.

## Recommended Next Step

Build the Inventory management UX slice:

`replace queue-first /review with a unified item/listing management surface`

Scope:

- change the primary nav label from `Listings` to `Inventory`
- keep `/review` as the first route to avoid route churn
- combine stock items and linked drafts into one table/card page
- derive seller-facing statuses from existing stock, draft, readiness, and
  Vinted fill state
- use filters such as `Action needed`, `Needs listing`, `Needs review`,
  `Ready to fill`, `Filled / fix needed`, `Listed`, and `All`
- keep the existing listing editor and Vinted fill routes
- do not change storage, AI generation, or cross-computer stock sync in this
  slice

First acceptance criteria:

- `/review` no longer opens the first queue item automatically
- items without generated listings appear as `Needs listing`
- incomplete listings appear as `Needs review`
- ready listings expose `Fill on Vinted`
- filled listings expose `Mark listed`
- every row has one obvious next action

## Why This Next

This is the best next step because:

- the current naming and page split make seller work harder than the underlying
  workflow requires
- better AI output will be easier to judge once listings are easier to review
- portable stock will be safer after the item/listing lifecycle is clearer
- the first slice can reuse existing data, actions, and routes
- it preserves the manual-submit safety boundary

## Extension Hardening Next Step

After the Inventory UX is stable, build the next hardening pass for the new
dynamic fields:

`live PT validation and selector maintenance`

Scope:

- isolate and document fragile Vinted selectors
- add a repeatable DOM smoke-test checklist for the supported page
- add clearer debug logging for field-match failures
- capture market-specific overrides only when one shared selector path fails
- verify package size, AI-photo checkbox, and measurement controls on live PT listings

Extension hardening acceptance criteria:

- one broken field can be diagnosed quickly from logs
- supported-page detection failures are explicit
- field mismatch reports name the exact failed field
- selector changes can be repaired without changing the app payload contract

## Next Three Milestones

1. Inventory management UX

Deliverable:

`/review` becomes a unified Inventory table/card surface with seller-facing
statuses and next actions.

2. Selector hardening

Deliverable:

Supported page detection and field-fill failures are fast to debug.

3. AI quality benchmark

Deliverable:

Local CLI, Ollama, and any configured API providers are compared against real
product-photo fixtures before changing defaults.

## Current Recommendation

Do not start multi-account admin, orders, profit tracking, CSV export, or
cross-computer stock sync next.

Those matter later, but the daily item/listing management flow needs to be
clear before widening scope.
