# Next-Phase Roadmap

Last updated: 2026-04-29

## Purpose

This roadmap covers the next product cycle after the current local listing workflow.

The current goal is now:

`review in app -> fill Vinted web via extension -> manual submit -> manage accounts, orders, and profit internally`

## Phase A - Listing payload stabilization

Goal:

Create one reliable handoff payload between the app and future Chrome extension.

Tasks:

- normalize listing fields
- normalize ordered image payload
- include account context
- keep one shared handoff contract

Deliverable:

The app can produce one clean Vinted fill payload from any reviewed listing.

## Phase B - Chrome extension MVP

Goal:

Build the first safe Vinted web autofill workflow.

Tasks:

- extension scaffold
- Vinted page detection
- field filling
- image upload
- manual final submit only

Detailed execution source of truth:

- [29-vinted-extension-research.md](./29-vinted-extension-research.md)
- [30-vinted-extension-architecture.md](./30-vinted-extension-architecture.md)
- [31-vinted-extension-field-contract.md](./31-vinted-extension-field-contract.md)
- [32-implementation-plan-vinted-extension-mvp.md](./32-implementation-plan-vinted-extension-mvp.md)

Deliverable:

Seller can open Vinted web and have the form filled from the app.

## Phase C - Handoff workflow polish

Goal:

Make repeated listing publication fast.

Tasks:

- `Fill on Vinted`
- `fill and next`
- handoff success state
- handoff failure state
- account-aware queue actions

Deliverable:

Seller can move through many listings with low friction.

## Phase D - Multi-account management

Goal:

Add safe internal support for multiple Vinted accounts.

Tasks:

- account profiles
- account assignment on stock and listings
- per-account presets
- per-account queue views

Deliverable:

Seller can manage multiple accounts without risky cross-account automation.

## Phase E - Orders and stock admin

Goal:

Turn the app into a stronger seller operations workspace.

Tasks:

- SKU
- location
- sale records
- order status
- sold-state tracking

Deliverable:

Listing work stays connected to real stock and sales operations.

## Phase F - Profit tracking

Goal:

Add simple seller finance visibility.

Tasks:

- cost basis
- packaging and extra costs
- profit and margin
- per-account and monthly summaries

Deliverable:

Seller can measure profit, not only activity.

## Phase G - CSV and accounting export

Goal:

Make the data portable.

Tasks:

- stock export
- orders export
- profit export

Deliverable:

Seller can move the data into accounting or analysis workflows.

## Phase H - Selected safe operations modules

Goal:

Add secondary features that improve workflow without crossing the safety boundary.

Tasks:

- quick replies
- shipping label helpers
- order filters
- account stats

Deliverable:

Seller operations get faster without aggressive platform automation.

## Priority order

Recommended order:

1. listing payload stabilization
2. Chrome extension MVP
3. handoff workflow polish
4. multi-account management
5. orders and stock admin
6. profit tracking
7. CSV export
8. selected safe operations modules

## Why this order

This order follows the actual target:

- reduce Vinted web publishing friction first
- add internal management second
- add finance visibility third

## Anti-roadmap

Do not prioritize these ahead of the roadmap above:

- private Vinted API automation
- unattended publishing
- auto messages to likes
- smart negotiation
- auto reposting
- cross-account cloning/import
- mobile app automation
