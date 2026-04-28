# Implementation Plan: Extension And Seller Admin

Last updated: 2026-04-28

## Purpose

This plan covers the next major product cycle after the current local listing workflow.

The new priority is:

`safe Vinted web autofill first, then internal multi-account admin, then orders and profit tracking`

## Phase A - Stabilize current listing payload

Goal:

Make the app produce one reliable listing payload that can drive both copy/export and browser autofill.

Tasks:

- define shared listing payload shape
- normalize ordered image payload
- include structured listing metadata
- include target account id
- include handoff status

Deliverable:

App can produce one clean payload for Vinted web handoff.

## Phase B - Chrome extension MVP

Goal:

Create the first browser extension that fills Vinted web forms.

Tasks:

- create extension scaffold
- detect supported Vinted listing page
- read app payload
- fill title, description, price, and structured fields
- upload images
- require manual final submit

Deliverable:

Seller can click from the app and have Vinted web form filled by the extension.

## Phase C - Handoff workflow polish

Goal:

Make the transition from app to Vinted fast and predictable.

Tasks:

- `Fill on Vinted` action
- `fill and next` queue workflow
- account-aware fill actions
- clear success and failure states

Deliverable:

Seller can process multiple listings quickly from the review queue.

## Phase D - Multi-account model

Goal:

Add internal account profiles and assignment logic.

Tasks:

- account entity
- account CRUD
- assign stock items to account
- assign listings to account
- per-account presets

Deliverable:

Seller can manage multiple Vinted accounts inside the app without cross-account cloning automation.

## Phase E - Stock and order admin

Goal:

Expand the seller workspace beyond listing creation.

Tasks:

- SKU field
- storage location field
- sold status flow
- order record creation
- order status tracking

Deliverable:

Seller can connect listing work to real stock and sales operations.

## Phase F - Profit layer

Goal:

Add simple finance visibility.

Tasks:

- cost basis per item
- packaging / extra cost fields
- net profit calculation
- margin calculation
- account and monthly summaries

Deliverable:

Seller can understand what is actually profitable.

## Phase G - Export and accounting basics

Goal:

Make the data usable outside the app.

Tasks:

- CSV export for stock
- CSV export for orders
- CSV export for profit views

Deliverable:

Seller can use the data for accounting and analysis.

## Phase H - Selected later modules

Goal:

Add secondary Dotb-like features without breaking the safety boundary.

Tasks:

- quick replies
- shipping label helpers
- order filters
- account-level stats

Deliverable:

Seller operations get faster without moving into risky automation.

## Explicit non-goals for this cycle

Do not include:

- auto messages to likes
- smart negotiation
- auto reposting
- restocker automation
- cross-account listing import
- unattended publish flow

## Recommended build order

1. listing payload stabilization
2. Chrome extension MVP
3. handoff workflow polish
4. multi-account model
5. stock and order admin
6. profit layer
7. CSV export
8. selected later modules

## Why this order

This order keeps the next cycle aligned with the actual seller need:

- faster publishing on Vinted web
- better internal account control
- better operational visibility
- profit awareness

## Definition of done for the next major milestone

The next milestone is done when:

- seller reviews a listing in the app
- seller chooses a target account
- extension fills the Vinted web form
- seller submits manually
- stock item remains linked to account context
- sale and profit data can be recorded afterward
