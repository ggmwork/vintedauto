# Auto-Grouping Architecture

Last updated: 2026-04-28

## Purpose

This document defines the technical shape for automatic grouping of imported photos into stock items.

## Problem statement

Ingest is already automatic.

Grouping is still only reliable when:

- one top-level folder equals one item

The next system must support:

- flat-folder imports
- mixed-photo batches
- confidence-based grouping

## Recommended pipeline

```txt
Watched folder
  ->
Watcher import
  ->
Managed photo assets
  ->
Grouping queue
  ->
Feature extraction + similarity scoring
  ->
Item clusters
  ->
Confidence check
  ->
High confidence -> create stock item
Low confidence -> Inbox review
```

## Core design principle

Do not create stock items directly from raw imported files anymore.

Insert one layer in between:

- `grouping candidate / cluster`

That gives the app a safe place to decide:

- commit automatically
- or ask for help

## Recommended internal entities

### 1. Photo asset

Already exists.

Add or derive:

- ingest source info
- grouping status
- extracted features reference

### 2. Grouping run

One pass of grouping for a set of imported photos.

Suggested fields:

- `id`
- `sessionId` or internal import boundary
- `startedAt`
- `finishedAt`
- `status`
- `modelProvider`
- `modelName`
- `notes`

### 3. Candidate cluster

Temporary grouping result before stock commit.

Suggested fields:

- `id`
- `groupingRunId`
- `photoAssetIds`
- `suggestedName`
- `confidence`
- `status`

Suggested statuses:

- `pending`
- `auto_committed`
- `needs_review`
- `rejected`
- `merged`
- `split`

### 4. Stock item

Already exists.

Now it can be created from:

- folder grouping
- cluster commit
- manual correction

## Recommended grouping strategy

Start with a layered strategy, not one giant AI call.

### Layer 1 - strong heuristics

Use cheap signals first:

- top-level folder name
- close ingest timestamps
- duplicate dimensions or filenames
- file count patterns

### Layer 2 - visual similarity

Use embeddings or extracted structured features to compare:

- dominant color
- garment type
- background similarity
- logo / print similarity
- silhouette / shape

### Layer 3 - cluster decision

Group photos into candidate item sets.

### Layer 4 - confidence decision

If confidence is high:

- create stock item automatically

If confidence is low:

- leave candidate in Inbox review

## AI role recommendation

Use AI for perception, not direct workflow control.

Recommended AI tasks:

- identify likely garment type
- detect whether two photos likely show the same product
- extract rough visual descriptors
- estimate grouping confidence

Do not let the model directly mutate stock state without app validation.

## Practical first implementation

### Step 1

Use one model pass per image to extract compact structured descriptors.

Example fields:

- garment type
- primary color
- secondary color
- pattern
- visible brand
- material guess
- background type
- folded / hanging / worn / flat lay

### Step 2

Compare descriptor similarity in code.

### Step 3

Build clusters from similarity scores.

### Step 4

Commit high-confidence clusters to stock items.

### Step 5

Leave uncertain clusters in Inbox.

This is better than starting with a huge end-to-end agentic grouping call.

## Confidence model recommendation

Confidence should combine:

- folder signal
- timing signal
- descriptor similarity
- image-count consistency
- brand / color / garment agreement

Output should be simple:

- `high`
- `medium`
- `low`

Behavior:

- `high` -> auto-create stock item
- `medium` -> maybe create candidate but require review
- `low` -> keep in Inbox for manual help

## UX implications

### Inbox must show

- `Grouping`
- `Needs review`
- `Ready`

### Stock must show

- auto-created items
- confidence origin if useful later
- correction tools

### Review remains downstream

Do not push an item to Review until grouping is committed and stable.

## Failure modes to design for

- duplicate images
- visually similar but different products
- same product in very different lighting
- mixed backgrounds
- outfit flat lays containing multiple sellable items
- import interrupted mid-batch

## Recommendation summary

The correct technical next step is:

- add a grouping queue
- derive descriptors from images
- cluster in code
- commit only high-confidence clusters to stock
- send uncertain cases to Inbox review
