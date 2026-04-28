# Implementation Plan - Reliable Ingest And Hybrid Grouping

Last updated: 2026-04-28

## Purpose

This is the next implementation plan after testing the watched-folder flow.

The new priority order is:

1. fix ingest reliability
2. add strong manual grouping tools
3. improve automatic grouping quality

## End-state target

Desired workflow:

1. seller pastes photos into watched folder
2. app reliably notices them
3. app imports them
4. app leaves new loose photos ready for manual grouping by default
5. seller groups photos into items directly
6. app can optionally suggest groups for ambiguous batches
7. stock items continue into Review later

## Scope

This plan is about:

- reliable watched-folder ingest
- clear ingest and grouping status
- hybrid automatic plus manual grouping

This plan is not about:

- Vinted autofill
- deployment
- cloud sync
- background OS service while app is closed

## Build order

Do not add more grouping intelligence first.

Build in this order:

1. ingest reliability
2. grouping observability
3. manual grouping tools
4. stronger clustering
5. optional dedicated local watcher later

## Phase 1 - Reliable automatic scanning

Goal:

Replace fragile passive watcher behavior with dependable automatic scanning.

Tasks:

- scan watched folder automatically on Inbox load
- add polling scan while app is open
- keep explicit `Scan now`
- debounce overlapping scans
- persist last scan result

Deliverable:

New files are detected consistently without relying only on in-process `fs.watch`,
and loose photos remain available for manual grouping.

Verification:

- paste files into watched folder
- app notices them within expected scan interval
- import count updates
- no manual debugging needed

## Phase 2 - Ingest and grouping observability

Goal:

Make it obvious what happened after files arrive.

Tasks:

- show last scan time
- show last import time
- show last grouping run time
- show counts:
  - imported
  - auto-grouped
  - needs review
  - failed
- persist grouping run notes and errors

Deliverable:

Seller can tell whether the app imported files, grouped them, or needs intervention.

Verification:

- status changes after real ingest
- failures are visible instead of silent

## Phase 3 - Strong manual grouping workflow

Goal:

Make correction cheap when automatic grouping is not enough.

Tasks:

- select photos and create one stock item
- assign selected photos to existing stock item
- move photos between items
- merge groups
- split groups
- set cover image

Deliverable:

Seller can build stock items directly without waiting on auto-grouping.

Verification:

- user can group one ambiguous batch without leaving Inbox/Stock workflow

## Phase 4 - Safer automatic grouping

Goal:

Improve grouping quality after ingest is dependable.

Tasks:

- keep folder-per-item as strongest signal
- keep manual grouping as the default Inbox path
- improve descriptor extraction
- improve similarity scoring
- tune confidence thresholds
- send uncertain clusters to review

Deliverable:

Obvious cases auto-create stock items when strong signals exist; otherwise the app
offers suggestions without blocking manual grouping.

Verification:

- high-confidence groups auto-commit
- medium-confidence groups appear in review
- low-confidence cases stay loose

## Phase 5 - Real batch evaluation

Goal:

Tune the grouping system with actual seller-like batches.

Tasks:

- collect test sets:
  - folder-per-item
  - flat-folder mixed batch
  - similar items
  - ambiguous detail shots
- record:
  - expected group count
  - false merges
  - false splits
  - unresolved loose photos

Deliverable:

Grouping quality can be improved with evidence instead of guesswork.

Verification:

- batch results can be compared over time after each change

## Phase 6 - Optional watcher companion

Goal:

Move to a dedicated local watcher only if the polling-based approach proves insufficient.

Tasks:

- design small local background watcher
- separate watcher process from web app runtime
- write imports/grouping triggers into shared app storage

Deliverable:

True desktop-style background watching.

Verification:

- watcher remains reliable independently of page lifecycle

## Immediate recommendation

Start with:

1. reliable automatic scanning
2. better status/error visibility
3. strong manual grouping tools

Only after that:

4. improve auto-grouping sophistication

## Acceptance criteria

This cycle is successful if all are true:

- watched-folder ingest works reliably without manual debugging
- seller can see whether ingest and grouping ran
- manual grouping is the primary successful path in Inbox
- obvious groups can still become stock automatically
- ambiguous cases can be fixed quickly by hand
- downstream Stock and Review flow remains intact

## Recommendation summary

The next cycle should build:

`reliable ingest -> manual-first Inbox -> optional suggestions -> stronger clustering`

That is the shortest path to a trustworthy workflow.
