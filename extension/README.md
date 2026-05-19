# Vinted Auto Extension

Unpacked Chrome Manifest V3 extension for the Vinted autofill MVP.

## What it does

- reads a reviewed draft handoff from the local app
- detects the supported Vinted create-listing page
- fills title, description, price, core metadata, and ordered images
- fills the first PT later-field profile block from the app handoff
- stops before publish

## Load in Chrome

1. Open `chrome://extensions`
2. Turn on `Developer mode`
3. Click `Load unpacked`
4. Select the repo `extension/` folder

After code changes, click `Reload` on the unpacked extension card so Chrome
uses the latest manifest and service worker.

Expected stable ID for this repo extension:

- `jjlanfbmjhiodmoamflpjclhfcjhcemb`

## First-run settings

Open the extension side panel and confirm:

- `Local app origin`
- `Vinted create-listing URL`

Optional app-side bridge setting:

- the app now defaults to the stable repo extension ID
- keep `NEXT_PUBLIC_VINTED_EXTENSION_ID` only if you want to override that ID
- the app button now keeps the simple `/api/drafts/:draftId/fill-on-vinted` launch route
- clicking the extension toolbar icon opens the Chrome side panel
- the side panel can stay open beside Vinted and fill one queued item at a time

Default values assume:

- app: `http://127.0.0.1:3000`
- market: `https://www.vinted.pt/items/new`

## App-side trigger

From a ready draft in the app:

- click `Fill on Vinted`
- or click `Fill and next` from the review queue
- app path:
  the app opens `/api/drafts/:draftId/fill-on-vinted`, which redirects to Vinted
  with query params for content-script priming
- side panel path:
  open Vinted create listing, open the extension side panel, click `Fill this`
  on one ready app item, review the page, then submit manually on Vinted
- the extension service worker fetches `/api/drafts/:draftId/vinted-handoff`
- the extension service worker also fetches the draft images from the app and
  relays them to the content script as prepared upload files
- image fetches use the app's Vinted upload variant, which converts decodable
  images to JPEG and compresses them under Vinted's 9 MB limit
- image relay uses smaller per-image messages so larger drafts do not hit
  Chrome's extension message size cap
- the content script fills the page
- the service worker posts the fill result back to `/api/drafts/:draftId/vinted-fill-result`

Important:

- the extension now reads drafted stock items from the local app
- items still need a linked draft before the extension can fill them
- incomplete drafted items stay visible with their missing fields

## Current scope

- supported flow: create-listing page
- supported fields: title, description, price, brand, category, size, condition, color, material, images
- supported PT later fields:
  - live category suggestions, with saved category path preferred when present
  - package size
  - AI-photo checkbox
  - shirt measurements
- PT price fill now uses masked-input typing with post-fill numeric verification
- images upload before field fill so Vinted can generate category suggestions
- PT category fill now uses live option scoring plus visible breadcrumb-path matching
- side panel can save the current Vinted category back to the loaded app draft
- side panel exposes the same drafted-stock queue and per-item `Fill this` action
- later fields now come from `listing.profile`, not only flat metadata
- app tracks `handed off`, `filled on Vinted`, `needs manual fix`, and `fill failed`
- side panel exposes page diagnostics and last fill diagnostics for selector debugging
- manual final submit remains required
- no iframe is used; Vinted stays in the main tab and the extension is only the assistant panel

## Debug workflow

- use the side panel `Page diagnostics` block when the page is unsupported or not ready
- use the side panel `Last fill diagnostics` block when a field fill partially fails
- use the app draft `Selector diagnostics` block to compare the latest persisted callback result
- use [docs/34-vinted-extension-dom-smoke-test.md](../docs/34-vinted-extension-dom-smoke-test.md) as the repeatable repair checklist
- use [docs/39-vinted-dynamic-fields-research.md](../docs/39-vinted-dynamic-fields-research.md),
  [docs/40-vinted-dynamic-field-reference-pt.md](../docs/40-vinted-dynamic-field-reference-pt.md),
  and [docs/41-vinted-dynamic-fields-rollout.md](../docs/41-vinted-dynamic-fields-rollout.md)
  for the schema-driven later-field model
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
