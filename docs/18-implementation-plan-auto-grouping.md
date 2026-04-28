# Implementation Plan - Auto-Grouping And Stock Automation

Last updated: 2026-04-28

## Purpose

This is the implementation plan for the next automation phase after watched-folder ingest.

The goal is:

- automatic grouping of imported photos into items
- automatic stock creation from those groups
- manual correction only for uncertain cases

## End-state target

Successful flow:

1. seller pastes photos into watched folder
2. app imports them
3. app groups them into likely item clusters
4. app auto-creates stock items for high-confidence clusters
5. only uncertain cases remain in Inbox
6. seller continues in Stock and Review

## Scope

This plan is about:

- auto-grouping
- cluster confidence
- automatic stock creation
- Inbox review for uncertain clusters

This plan is not about:

- Vinted autofill
- deployment
- cloud sync
- multi-user
- background watcher while app is closed

## Build strategy

Do this in layers.

Do not jump straight to a giant end-to-end AI grouping agent.

Build:

1. grouping data model
2. feature extraction
3. similarity + clustering
4. confidence rules
5. auto-commit to stock
6. human correction UI

## Phase 1 - Grouping data model

Goal:

Create a safe layer between imported photos and committed stock items.

Tasks:

- add grouping-run record
- add candidate-cluster record
- add photo grouping statuses
- add confidence field
- add source method field:
  - `folder_rule`
  - `auto_cluster`
  - `manual`

Deliverable:

The app can store grouping results before committing them to stock.

Verification:

- imported photos can belong to a candidate cluster
- cluster can be reviewed before stock creation

## Phase 2 - Feature extraction

Goal:

Turn each image into structured signals the app can compare.

Tasks:

- create one extraction service per image
- store compact descriptors
- include:
  - garment type
  - primary color
  - secondary color
  - pattern
  - visible brand
  - background style
  - presentation type

Deliverable:

Each imported photo has usable grouping descriptors.

Verification:

- descriptors are persisted
- extraction failures do not break ingest

## Phase 3 - Similarity and clustering

Goal:

Group photos that likely belong to the same item.

Tasks:

- build similarity scoring in code
- combine:
  - folder path signal
  - timing proximity
  - descriptor similarity
  - repeated brand / garment agreement
- produce candidate clusters

Deliverable:

The app produces candidate item groups automatically.

Verification:

- folder-per-item still groups perfectly
- flat-folder batches now produce candidate groups

## Phase 4 - Confidence decision

Goal:

Separate safe automation from uncertain guesses.

Tasks:

- define high / medium / low confidence thresholds
- auto-commit only high-confidence clusters
- send medium and low confidence clusters to Inbox review
- log why a cluster was not auto-committed

Deliverable:

The app creates stock items automatically only when it should.

Verification:

- clear high-confidence cases become stock without clicks
- uncertain cases remain visible in Inbox

## Phase 5 - Automatic stock creation

Goal:

Commit confirmed clusters into the existing stock model.

Tasks:

- create stock items from high-confidence clusters
- select default cover image
- attach grouped photos
- mark cluster as committed

Deliverable:

Stock items now appear without manual grouping in common cases.

Verification:

- imported multi-item test batch creates stock items automatically
- stock counts update correctly

## Phase 6 - Inbox review for uncertain groups

Goal:

Make manual correction small and fast.

Tasks:

- show uncertain candidate clusters in Inbox
- allow:
  - merge
  - split
  - move photo
  - commit as stock item
  - discard cluster
- keep copy short and operational

Deliverable:

Seller only fixes uncertain cases, not obvious ones.

Verification:

- user can resolve one bad cluster quickly
- corrected cluster becomes stock item cleanly

## Phase 7 - Regression and batch testing

Goal:

Prove the system on real photo batches, not isolated examples.

Tasks:

- create test sets:
  - folder-per-item
  - flat-folder mixed batch
  - ambiguous similar items
  - outfit flat lay
- record expected cluster counts
- measure false merges and false splits

Deliverable:

The grouping pipeline has a quality bar.

Verification:

- quality issues are visible
- thresholds can be tuned with evidence

## Recommended execution order

1. grouping data model
2. feature extraction
3. similarity scoring
4. candidate clustering
5. confidence thresholds
6. stock auto-commit
7. Inbox correction UI
8. batch evaluation

## Important design rules

### Rule 1

Never auto-create stock items from low-confidence clusters.

### Rule 2

Do not block ingest if grouping fails.

Import first.

Group after.

### Rule 3

Grouping logic must be inspectable and tunable.

Do not bury all decisions inside opaque prompts.

### Rule 4

Manual correction should operate on candidate clusters, not raw storage internals.

## Acceptance criteria

This phase is successful if:

- flat-folder imports no longer require full manual grouping
- high-confidence groups become stock items automatically
- low-confidence groups stay in Inbox for review
- stock creation becomes mostly automatic in normal seller batches
- Review flow remains unchanged downstream

## Recommendation summary

The next implementation milestone should be:

`watch -> import -> extract descriptors -> cluster photos -> auto-create stock items -> review only uncertain cases`

That is the missing automation layer between the current watched Inbox and the final seller workflow.
