# Next-Phase Roadmap

Last updated: 2026-04-28

## Purpose

This roadmap covers the next cycle after the current local MVP, watched-folder pivot, and first round of real ingest testing.

The target workflow still is:

`watched folder -> Inbox -> Stock -> Review`

But the sequencing changed.

The next goal is now:

`make watched-folder ingest reliable before adding more grouping sophistication`

## Phase A - Ingest reliability

Goal:

Make automatic intake dependable.

Tasks:

- replace fragile passive watcher dependence with reliable auto-scan / polling
- keep explicit `Scan now`
- prevent overlapping scans
- persist last scan and import state clearly

Deliverable:

Pasting files into the watched folder causes dependable import behavior while the app is open.

## Phase B - Ingest observability

Goal:

Make it obvious what the ingest pipeline actually did.

Tasks:

- show last scan
- show last import
- show last grouping run
- show counts for:
  - imported
  - auto-grouped
  - needs review
  - failed

Deliverable:

Seller can tell whether the app imported files and whether grouping succeeded.

## Phase C - Manual grouping tools

Goal:

Make uncertain grouping cases fast to resolve.

Tasks:

- select photos and create one stock item
- assign selected photos to existing stock item
- move photos between items
- merge and split groups
- set cover image

Deliverable:

Seller can fix ambiguous batches quickly instead of fighting the app.

## Phase D - Stronger auto-grouping

Goal:

Improve grouping quality only after ingest is dependable.

Tasks:

- keep folder-per-item as strongest signal
- improve per-image descriptor extraction
- improve similarity scoring
- tune confidence thresholds
- auto-commit only strong groups

Deliverable:

Obvious cases become stock automatically; uncertain cases go to review.

## Phase E - Batch evaluation

Goal:

Tune grouping with evidence.

Tasks:

- test folder-per-item batches
- test flat-folder mixed batches
- test similar items
- record false merges and false splits

Deliverable:

Grouping quality can be improved against real cases, not guesswork.

## Phase F - Dedicated local watcher later

Goal:

Move to a true watcher companion only if polling-based ingest is not enough.

Tasks:

- build small local background watcher
- separate watcher lifecycle from Next runtime
- write imports/grouping triggers into shared app storage

Deliverable:

True desktop watched-folder behavior outside request-driven app runtime.

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

1. ingest reliability
2. ingest observability
3. manual grouping tools
4. stronger auto-grouping
5. batch evaluation
6. dedicated local watcher later
7. seller presets
8. persistence/deploy
9. stronger Vinted handoff

## Why this order

This order attacks the actual blockers first:

- unreliable watched-folder behavior
- lack of clear ingest/grouping feedback
- grouping correction friction
- only then clustering quality

## Anti-roadmap

Do not prioritize these ahead of the roadmap above:

- native mobile
- advanced analytics
- multi-marketplace support
- aggressive Vinted automation
- buyer messaging features
- complex business dashboards
