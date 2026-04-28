# Hybrid Grouping Strategy

Last updated: 2026-04-28

## Purpose

This document defines the correct grouping product shape after testing.

The app should not chase perfect full autonomy first.

The correct goal is:

`strong automatic grouping + fast manual correction`

## Product rule

Support both paths:

1. automatic grouping path
2. manual grouping path

This is not a fallback-only idea.

It is the intended product shape.

## Why this is the right approach

### Automatic grouping is valuable

It removes the obvious repetitive work:

- photos already in one folder per item
- clear front/back/detail shots of one garment
- easy high-confidence batches

### Manual grouping is necessary

Some batches will always be ambiguous:

- flat files with generic names
- similar items with similar colors
- mixed shots with weak visual separation
- photo sets where background or framing changes a lot

If the app forces full autonomy here, it will create wrong stock items.

Wrong grouping is more expensive than asking for help.

## Target grouping model

### Lane 1 - Auto-commit

For high-confidence cases:

- create stock item automatically
- assign photos automatically
- choose default cover image

Seller does nothing.

### Lane 2 - Needs review

For medium-confidence cases:

- propose one or more candidate groups
- seller confirms or adjusts them

Seller spends a few seconds, not full manual organization time.

### Lane 3 - Loose photos

For low-confidence or failed cases:

- keep photos ungrouped
- let seller group them manually

This is the safe fallback.

## Manual grouping requirements

Manual grouping must be fast and explicit.

Required actions:

- select photos and create one stock item
- assign selected photos to an existing stock item
- move photo from one item to another
- merge two groups
- split one group
- change cover image

Optional later actions:

- keyboard shortcuts
- bulk resolve actions
- learn from repeated corrections

## Automatic grouping requirements

Automatic grouping should use multiple signals together:

- folder path
- filename tokens
- timestamp proximity
- garment type
- color
- visible brand
- presentation/background similarity
- image-level descriptor similarity

The model should help generate descriptors.

The grouping decision itself should stay inspectable in code.

## Confidence rules

The system needs confidence-based behavior.

### High confidence

- auto-create stock item

### Medium confidence

- create candidate cluster
- send to review

### Low confidence

- leave loose
- do not pretend the app solved it

## Recommendation

The next grouping cycle should not be framed as:

`replace manual grouping entirely`

It should be framed as:

`make obvious cases automatic and ambiguous cases fast to correct`

That is the product that fits the real seller workflow.
