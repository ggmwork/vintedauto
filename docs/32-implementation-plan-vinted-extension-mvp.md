# Implementation Plan: Vinted Extension MVP

Last updated: 2026-04-30

## Purpose

This plan turns the research and architecture into an executable build sequence.

The target milestone is:

`seller clicks Fill on Vinted -> extension fills Vinted web form -> seller reviews -> seller submits`

## Guiding rule

Keep the first version simple enough to debug.

If a more complex idea does not clearly improve the first reliable version, defer it.

## Phase A - Finalize the handoff contract

Goal:

Make the app produce one stable payload that the extension can consume.

Current repo alignment:

- `lib/vinted/handoff.ts` already builds the Vinted payload used by the export panel
- `app/api/drafts/[draftId]/images/[imageId]/route.ts` already serves draft image binaries
- no extension-fetchable payload route exists yet

Tasks:

- confirm field scope from [31-vinted-extension-field-contract.md](./31-vinted-extension-field-contract.md)
- add `GET /api/drafts/[draftId]/vinted-handoff`
- return `createVintedHandoffPayload(draft)` from `lib/vinted/handoff.ts`
- expose ordered image URLs that resolve through the existing draft image route
- expose ready / missing field status
- return `404` for missing drafts
- return `200` with `handoff.ready=false` for incomplete drafts

Deliverable:

Extension can fetch a deterministic payload from the app.

Verification:

- request a real draft id and confirm JSON contains `version`, `source.draftId`, `handoff`, `listing`, and ordered `images`
- request a missing draft id and confirm `404`
- open one image URL from the payload and confirm the binary response loads
- run `corepack pnpm lint`
- run `corepack pnpm typecheck`

## Phase B - Scaffold the extension

Goal:

Create a clean MV3 extension shell.

Tasks:

- create extension directory
- add `manifest.json`
- add service worker
- add popup
- add content script
- add options or settings page if needed for local app origin

Deliverable:

Loadable unpacked extension with no app integration yet.

## Phase C - Connect extension to the app

Goal:

Allow the extension to retrieve payload from the local app.

Tasks:

- store configurable app origin
- fetch latest payload from app
- show payload status in popup
- show meaningful connection errors

Deliverable:

Extension can confirm app connectivity and payload availability.

## Phase D - Detect supported Vinted pages

Goal:

Make the extension understand where it can operate.

Tasks:

- define supported Vinted domains in first market scope
- detect create-listing page
- return unsupported-page errors clearly

Deliverable:

Extension knows whether current tab is fillable.

## Phase E - Fill core text and metadata fields

Goal:

Fill title, description, price, and core structured attributes.

Tasks:

- build Vinted form adapter
- fill title
- fill description
- fill price
- fill brand
- fill category
- fill condition
- fill color
- fill material
- fill size
- return field-level result report

Deliverable:

Text and structured fields fill reliably on the supported listing page.

## Phase F - Upload ordered images

Goal:

Add image upload to the extension fill flow.

Tasks:

- fetch image blobs from app URLs
- build `File` objects
- attach via file input using `DataTransfer`
- dispatch the events Vinted expects
- report upload success or failure

Deliverable:

Ordered images upload into the Vinted form from app URLs.

## Phase G - Add app-side trigger

Goal:

Make the app launch the autofill workflow.

Tasks:

- add `Fill on Vinted` action in app UI
- open or focus Vinted listing tab
- coordinate extension and payload retrieval
- return user to review queue context afterward if needed

Deliverable:

Seller can start autofill from the app, not from extension internals.

## Phase H - Add queue workflow polish

Goal:

Turn extension autofill into an operational seller loop.

Tasks:

- add `fill and next`
- add fill result state in queue
- mark listing as handed off
- allow retry after fill failure

Deliverable:

Seller can process multiple listings quickly.

## Phase I - Hardening and selector maintenance

Goal:

Make the extension survivable when Vinted changes.

Tasks:

- isolate selectors in one adapter
- add DOM smoke-test checklist
- add selector debug logs
- add market-specific overrides only if needed

Deliverable:

Field failures are quick to diagnose and repair.

## Recommended first release scope

Ship only:

- one supported Vinted market you use most
- create-listing page
- text fields
- core metadata
- images
- manual final submit

Defer:

- edit-listing support
- multi-account-aware autofill behavior
- market-generalization
- advanced shipping or promo controls

## Testing checklist

Each release should verify:

1. extension loads in Chrome
2. popup connects to app origin
3. payload fetch succeeds
4. unsupported page is reported correctly
5. title fills
6. description fills
7. price fills
8. structured fields fill
9. images upload in order
10. publish remains manual

## Failure policy

When a field fails:

- continue where safe
- report exactly which field failed
- never auto-submit
- never silently fake success

## Definition of done

This milestone is done when:

- the app exposes stable handoff payloads
- the extension loads and connects to the app
- the extension fills the Vinted listing form with the agreed MVP fields
- images upload from app URLs
- user reviews and submits manually
- queue can continue after autofill
