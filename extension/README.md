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

Default values assume:

- app: `http://127.0.0.1:3000`
- market: `https://www.vinted.pt/items/new`

## App-side trigger

From a ready draft in the app:

- click `Fill on Vinted`
- or click `Fill and next` from the review queue
- the app redirects to the configured Vinted create-listing page
- query params carry `draftId` and `appOrigin`
- the extension fetches `/api/drafts/:draftId/vinted-handoff`
- the content script fills the page
- the service worker posts the fill result back to `/api/drafts/:draftId/vinted-fill-result`

## Current scope

- supported flow: create-listing page
- supported fields: title, description, price, brand, category, size, condition, color, material, images
- app tracks `handed off`, `filled on Vinted`, `needs manual fix`, and `fill failed`
- manual final submit remains required

## Out of scope for this MVP

- edit-listing support
- unattended publish
- background retries
- multi-market selector abstraction
- buyer messaging or repost automation
