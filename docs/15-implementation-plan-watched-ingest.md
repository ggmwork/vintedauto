# Implementation Plan - Watched Ingest Pivot

Last updated: 2026-04-27

## Purpose

This is the implementation plan for the next cycle after the current local MVP.

The goal is to simplify the product shape and automate intake.

## End-state target

The next strong milestone is:

1. user pastes photos into one watched folder
2. app detects them automatically
3. app imports them without manual folder selection
4. app creates stock items automatically when possible
5. user works mainly from Inbox, Stock, and Review
6. user still copies into Vinted manually later

## Scope note

This plan is about:

- watched-folder ingest
- UI simplification
- stock creation flow

This plan is not about:

- Vinted autofill
- deployment
- cloud sync
- advanced marketplace automation

## In scope

- hide sessions from the main workflow
- add local watcher service
- add watched-folder configuration
- add Inbox page
- automatic ingest into managed storage
- automatic stock-item creation rules
- simplify IA and repeated copy
- connect new items into Stock and Review

## Out of scope

- browser extension
- Vinted web autofill
- background watcher while app is closed
- perfect flat-folder auto-grouping
- multi-user
- hosted persistence migration

## Key assumptions

### Assumption 1

The app remains desktop-first and local-first.

### Assumption 2

Watching a local folder requires a small local companion process.

### Assumption 3

Automatic grouping is most reliable when one folder maps to one item.

### Assumption 4

Loose flat files may still need Inbox grouping help.

## Build strategy

Do not add more features on top of the current session-heavy flow.

First:

- simplify the user-facing model
- create watcher foundation
- then wire automatic ingest

## Phase 1 - IA and UX reset

Goal:

Stop exposing the old mental model as the main workflow.

Tasks:

- make Inbox the default landing surface
- reduce visible session language
- reduce repeated headers, badges, and helper text
- keep Draft list secondary
- keep advanced tools collapsed by default

Deliverable:

The app reads as Inbox, Stock, and Review.

Verification:

- top-level navigation feels simpler
- sessions no longer lead the workflow
- page copy is materially shorter

## Phase 2 - Watched-folder foundation

Goal:

Make local filesystem watching real.

Tasks:

- create watcher-service module
- configure one watched folder path
- start and stop watcher while app is open
- persist watcher status and last event timestamp

Deliverable:

The app can monitor one chosen local folder.

Verification:

- watcher starts
- watcher stops
- app shows current watcher status

## Phase 3 - Automatic ingest pipeline

Goal:

Remove manual import as the default action.

Tasks:

- detect new image files
- debounce partial writes
- copy files into managed app storage
- create internal ingest records
- surface imported files in Inbox automatically

Deliverable:

New files appear in the app without a manual import button.

Verification:

- paste images into watched folder
- app detects them
- files appear in Inbox

## Phase 4 - Automatic stock creation

Goal:

Turn imported files into stock work with minimal manual sorting.

Tasks:

- if file lives in a top-level subfolder, create one stock item for that subfolder
- if files are loose in the root, place them into Inbox as `needs grouping`
- choose default cover image
- keep import source traceable internally

Deliverable:

The app creates stock items automatically when the grouping signal is strong.

Verification:

- folder-per-item import creates stock items automatically
- loose files appear in Inbox with clear next action

## Phase 5 - Stock and Review connection

Goal:

Keep the existing generation and review work, but hang it off the new intake flow.

Tasks:

- route Inbox items into Stock
- keep generation entry from Stock
- keep Review queue as the main editing surface
- simplify Draft language where possible

Deliverable:

Automatic ingest feeds the existing review loop cleanly.

Verification:

- new watched-folder items can reach Stock
- stock items can reach Review
- queue actions still work

## Phase 6 - Grouping polish

Goal:

Handle the cases where full automation is not reliable.

Tasks:

- quick regroup in Inbox or Stock
- move photo between stock items
- merge items
- split item
- choose cover image

Deliverable:

Manual correction is fast when automatic grouping is not enough.

Verification:

- seller can fix bad grouping quickly
- corrected item still flows into Review cleanly

## Recommended implementation order

Start in this order:

1. IA and UX reset
2. watcher-service foundation
3. watched-folder config UI
4. automatic ingest pipeline
5. Inbox page
6. automatic stock creation
7. reconnect Stock and Review flow
8. grouping polish

## Important product decisions for this cycle

### Decision 1 - Sessions stay internal

Recommendation:

- keep internal batch or session records only if they help trace imports
- do not expose them as a required user-facing concept

### Decision 2 - Watcher lifecycle

Recommendation:

- watcher runs while the app is open
- background service later if needed

### Decision 3 - Generation timing

Recommendation:

- do not auto-generate on the first detected file
- wait until import is stable
- start with explicit generation from Stock
- evaluate auto-generation later

### Decision 4 - Source file handling

Recommendation:

- copy files into managed app storage
- do not depend on the watched folder as long-term storage

## Risks

### Risk 1 - Flat-folder grouping is unreliable

Mitigation:

- treat folder-per-item as strongest v1 automation path
- send loose files to Inbox for correction

### Risk 2 - Watcher complexity grows too fast

Mitigation:

- keep watcher small
- avoid background OS service in the first pass

### Risk 3 - UX cleanup slips behind feature work

Mitigation:

- do IA reset first
- do not bolt the watcher onto the old page model unchanged

## Acceptance criteria

The next cycle is successful if all are true:

- watched folder can be configured
- app detects newly pasted images automatically
- imported files show up without manual import
- strong grouping cases create stock items automatically
- sessions are no longer leading the UI
- Inbox, Stock, and Review are the main visible workflow
- existing review queue still works after the ingest pivot

## Recommendation summary

The next cycle should build:

`watched folder -> Inbox -> Stock -> Review`

That is the cleanest path from current MVP toward a real seller workstation.
