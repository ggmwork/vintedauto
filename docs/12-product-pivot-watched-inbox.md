# Product Pivot - Watched Inbox

Last updated: 2026-04-27

## Purpose

This document captures the product pivot after testing the current local MVP.

The core listing loop works.

The main remaining problem is no longer "can AI generate a listing?"

The main problem is "can intake and organization become automatic enough to save real time?"

## Main finding

The current app is too manual and too tool-like.

It asks the seller to think in terms of:

- import
- sessions
- stock grouping
- drafts
- review queue

The seller wants something closer to:

- paste photos into one watched folder
- let the app detect and process them
- see items appear automatically
- review and copy later

## Product reset

The app should shift from:

`manual listing workspace`

to:

`automatic desktop seller workstation`

## New target workflow

1. take product photos
2. paste or move them into one watched folder
3. app detects new files automatically
4. app ingests them into managed storage
5. app creates stock items automatically when possible
6. app generates listing work when the item is ready
7. seller reviews and copies into Vinted later

## What changes conceptually

### Before

- create session
- import folder
- manage drafts directly

### After

- watch one folder
- let intake run automatically
- work mainly from Inbox, Stock, and Review

## New product principles

### 1. Intake must feel automatic

The seller should not have to "import a batch" every time.

The default behavior should be:

- one watched folder
- automatic detection
- automatic processing

### 2. `Studio sessions` should not be user-facing

They may remain as an internal data boundary if useful for traceability.

They should not remain a primary navigation or workflow concept.

### 3. `Draft` should become secondary in the UI

The seller thinks in:

- item
- stock
- review
- ready to copy

The app can still keep a draft model internally, but it should not dominate the IA.

### 4. Simpler information architecture is required

The user-facing structure should move toward:

- `Inbox`
- `Stock`
- `Review`

Optional later:

- `Listed`
- `Archive`
- `Settings`

### 5. Vinted autofill remains later

This pivot is about:

- automatic ingest
- stock creation
- simpler review flow

It is not about direct Vinted automation yet.

## What stays true

- desktop-only remains correct
- copy/export remains a valid success path
- local-first development with Ollama still makes sense
- stock remains the right operational layer between raw photos and listing output

## What should be de-emphasized

- manual folder import as the primary flow
- visible session management
- large amounts of instructional copy
- repeated badges and repeated top navigation
- exposing too many parallel surfaces at once

## User-facing model going forward

### Inbox

Shows:

- newly detected photos or groups
- files still being processed
- loose files that need grouping help
- ingest errors

### Stock

Shows:

- items created from the watched folder
- item photos
- grouping corrections
- stock-level metadata

### Review

Shows:

- generated listing records that need seller confirmation
- save and next
- copy and next
- mark ready

## Internal model going forward

Internal concepts may still include:

- ingest batch or session
- photo asset
- stock item
- listing draft

Important rule:

Internal model complexity is allowed only if it reduces user-facing complexity.

## Recommendation summary

The right next direction is:

- watched folder first
- sessions hidden
- IA simplified to Inbox, Stock, and Review
- UX cleaned aggressively before adding more surface area

This pivot should happen before building more automation on top of the current flow.
