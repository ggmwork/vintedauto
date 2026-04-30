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
- multi-provider AI routing for Ollama, OpenAI, and Anthropic
- AI settings page with task-specific provider/model config

Current local data snapshot:

- watched folder: `C:\Users\USER\Pictures\vintedauto\watched-inbox`
- watcher health: `watching`
- imported files: `14`
- sessions: `1`
- stock items: `2`
- drafts: `1`

## What Is Only Planned

The Vinted extension is planned but not implemented.

Missing pieces:

- no `extension/` or `extensions/` directory yet
- no Chrome MV3 manifest yet
- no extension service worker, popup, or content script
- no app endpoint for a versioned Vinted handoff payload
- no `Fill on Vinted` UI action
- no extension-side Vinted form adapter
- no fill result state in app

Important nuance:

`lib/vinted/handoff.ts` already builds a useful payload object for the export
panel, but it is not exposed through an API endpoint that an extension can fetch.
That makes the payload API the correct first implementation step.

## Main Gap

The app already has enough local listing workflow to justify the extension path.
The next missing contract is:

`draft -> stable Vinted payload API -> extension fetches payload`

Without that API, extension work would need to invent its own data shape or scrape
the app UI. That would add fragility immediately.

## Recommended Next Step

Build Phase A of the extension MVP:

`versioned Vinted handoff payload endpoint`

Scope:

- add `GET /api/drafts/[draftId]/vinted-handoff`
- return the existing `createVintedHandoffPayload(draft)` JSON shape
- include absolute image URLs when request origin allows it
- return `404` for missing drafts
- return `200` with `handoff.ready=false` when draft exists but required fields are missing
- keep image binary route unchanged
- add focused tests or at least typecheck/build verification

First acceptance criteria:

- opening `/api/drafts/<id>/vinted-handoff` returns deterministic JSON
- payload includes title, description, price, metadata, ready/missing fields, and ordered images
- image entries include fetchable URLs or paths usable by the future extension
- incomplete drafts are explicit, not hidden
- endpoint reuses current payload builder instead of duplicating field mapping

## Why This Before The Extension

This is the smallest useful step because:

- it turns current in-app export data into a real machine contract
- it lets the future extension stay dumb and debuggable
- it gives one endpoint to test before Chrome-specific complexity starts
- it preserves the manual-submit safety boundary

## Next Three Milestones

1. Payload API

Deliverable:

`GET /api/drafts/[draftId]/vinted-handoff` works and is documented.

2. Extension scaffold

Deliverable:

Loadable Chrome MV3 extension with popup, service worker, and content script.
Popup can connect to the local app and show payload readiness.

3. First Vinted form fill

Deliverable:

On one supported Vinted create-listing page, extension fills title,
description, price, core metadata, and ordered images. User submits manually.

## Current Recommendation

Do not start multi-account admin, orders, profit tracking, or CSV export next.

Those matter later, but publishing friction is the current bottleneck. Build the
payload endpoint first, then the extension scaffold, then the first form fill.

