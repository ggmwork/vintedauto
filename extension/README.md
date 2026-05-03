# Vinted Auto Extension

Unpacked Chrome Manifest V3 extension for the Vinted autofill MVP.

## What it does

- reads a reviewed draft handoff from the local app
- detects the supported Vinted create-listing page
- fills title, description, price, core metadata, and ordered images
- stops before publish

## Load in Chrome

1. Open `chrome://extensions`
2. Turn on `Developer mode`
3. Click `Load unpacked`
4. Select the repo `extension/` folder

## First-run settings

Open the extension popup and confirm:

- `Local app origin`
- `Vinted create-listing URL`

Optional app-side bridge setting:

- set `NEXT_PUBLIC_VINTED_EXTENSION_ID` in the app when you want the app page to
  message the extension directly
- keep the older `/api/drafts/:draftId/fill-on-vinted` launch route as the fallback

Default values assume:

- app: `http://127.0.0.1:3000`
- market: `https://www.vinted.pt/items/new`

## App-side trigger

From a ready draft in the app:

- click `Fill on Vinted`
- or click `Fill and next` from the review queue
- preferred path:
  the app page sends `vinted-auto:launch-handoff` to the extension with the
  configured extension ID, and the extension opens a clean Vinted create page
- fallback path:
  the app opens `/api/drafts/:draftId/fill-on-vinted`, which redirects to Vinted
  with query params for content-script priming
- the extension fetches `/api/drafts/:draftId/vinted-handoff`
- the content script fills the page
- the service worker posts the fill result back to `/api/drafts/:draftId/vinted-fill-result`

## Current scope

- supported flow: create-listing page
- supported fields: title, description, price, brand, category, size, condition, color, material, images
- app tracks `handed off`, `filled on Vinted`, `needs manual fix`, and `fill failed`
- popup exposes page diagnostics and last fill diagnostics for selector debugging
- manual final submit remains required

## Debug workflow

- use the popup `Page diagnostics` block when the page is unsupported or not ready
- use the popup `Last fill diagnostics` block when a field fill partially fails
- use the app draft `Selector diagnostics` block to compare the latest persisted callback result
- use [docs/34-vinted-extension-dom-smoke-test.md](../docs/34-vinted-extension-dom-smoke-test.md) as the repeatable repair checklist
- use [docs/35-vinted-extension-handoff-research-2026-05-03.md](../docs/35-vinted-extension-handoff-research-2026-05-03.md),
  [docs/36-vinted-extension-recommended-bridge-architecture.md](../docs/36-vinted-extension-recommended-bridge-architecture.md),
  and [docs/37-vinted-extension-message-reference.md](../docs/37-vinted-extension-message-reference.md)
  for the direct-bridge protocol and state model

## Out of scope for this MVP

- edit-listing support
- unattended publish
- background retries
- multi-market selector abstraction
- buyer messaging or repost automation
