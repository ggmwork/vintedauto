# Next-Phase Roadmap

Last updated: 2026-04-27

## Purpose

This roadmap covers the next cycle after the current local MVP and first batch-workstation prototype.

The product direction has changed.

The next goal is:

`watched folder -> Inbox -> Stock -> Review`

## Phase A - UX and IA reset

Goal:

Simplify the app before adding more automation.

Tasks:

- make Inbox the main landing surface
- hide sessions from main navigation
- reduce repeated text, badges, and nav clusters
- de-emphasize Draft list as a primary workflow

Deliverable:

The product reads as one simple operator flow instead of several internal concepts.

## Phase B - Watched-folder foundation

Goal:

Make automatic local ingest real.

Tasks:

- add watched-folder configuration
- add local watcher companion
- support start and stop while app is open
- surface watcher status

Deliverable:

The app can monitor one chosen local folder.

## Phase C - Automatic ingest pipeline

Goal:

Remove manual import as the default action.

Tasks:

- detect new image files
- debounce partial writes
- copy files into managed app storage
- create ingest records
- show imported files in Inbox automatically

Deliverable:

New files appear in the app without a manual import step.

## Phase D - Automatic stock creation

Goal:

Create stock items automatically when the grouping signal is strong.

Tasks:

- map top-level subfolder to one stock item
- choose default cover image
- route loose root files into Inbox as `needs grouping`
- keep internal import traceability

Deliverable:

The app creates stock items automatically for the strong cases and flags the weak cases clearly.

## Phase E - Stock and Review alignment

Goal:

Preserve the working review loop while re-centering it on automatic ingest.

Tasks:

- connect Inbox to Stock
- keep generation entry from Stock
- keep Review as the main editing surface
- simplify user-facing Draft language where possible

Deliverable:

Automatically imported items can move cleanly into the existing review workflow.

## Phase F - Grouping polish

Goal:

Handle the cases where full automation is not reliable.

Tasks:

- regroup
- move photo between items
- merge items
- split item
- choose cover image

Deliverable:

Seller can correct grouping quickly without fighting the app.

## Phase G - Seller presets

Goal:

Turn repeated prompt behavior into reusable settings.

Tasks:

- listing style presets
- output language
- description tone
- pricing style
- category instructions

Deliverable:

Generation becomes more consistent and less manual.

## Phase H - Real persistence and deployment

Goal:

Move from local prototype to durable product.

Tasks:

- replace local `.data` persistence with Supabase
- move images into Supabase Storage
- persist watcher and Inbox state cleanly
- deploy app

Deliverable:

App becomes reusable beyond one machine.

## Phase I - Stronger Vinted handoff

Goal:

Reduce final copy friction without expanding platform risk too early.

Tasks:

- improve handoff formatting
- keep `copy and next`
- later evaluate narrow Vinted web autofill

Deliverable:

Publishing gets faster without changing the current safety boundary.

## Priority order

Recommended order:

1. UX and IA reset
2. watched-folder foundation
3. automatic ingest pipeline
4. automatic stock creation
5. Stock and Review alignment
6. grouping polish
7. seller presets
8. persistence/deploy
9. stronger Vinted handoff

## Why this order

This order attacks the actual time sinks first:

- manual import friction
- photo organization overhead
- too many visible workflow concepts
- repeated review
- repeated prompt setup

## Anti-roadmap

Do not prioritize these ahead of the roadmap above:

- native mobile
- advanced analytics
- multi-marketplace support
- aggressive Vinted automation
- buyer messaging features
- complex business dashboards
