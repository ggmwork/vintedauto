# Seller Workflow Analysis

Last updated: 2026-04-27

## Why this document exists

The original MVP was scoped around a single-draft loop:

1. upload images
2. generate listing
3. review fields
4. copy into Vinted

That loop is now working.

The next planning layer must be based on the real seller workflow, not only on the first product idea.

## Current real workflow

Current seller process:

1. gather `N` items to sell
2. go to the photo studio
3. take all required photos for all items
4. send all photos to Google Drive
5. organize those photos into folders manually
6. paste images into AI with a custom prompt
7. generate listing text
8. copy the text into Vinted
9. publish listings one by one

## What is already solved by the app

The current app already improves these steps:

- generate listing text
- store draft state
- review and edit fields
- export listing content for Vinted

## What is still slow

The main time loss is still happening before and around generation:

- moving photos between devices and tools
- organizing photos into item groups
- repeating the same prompt process
- switching between intake work and listing work
- publishing multiple items one by one with no queue support

## Core bottlenecks

### 1. Intake bottleneck

Photos arrive as a batch, but the app currently starts from a single draft.

That means the user's real workflow shape and the product entry point do not match.

### 2. Organization bottleneck

The user manually decides which photos belong to which item.

This is operational work, not creative work, and it should be reduced hard.

### 3. Prompting bottleneck

The user already has a preferred prompt style.

That should become a saved seller preset, not a repeated manual step.

### 4. Review bottleneck

Single-draft review works, but repeated item review needs a queue and faster navigation.

### 5. Publish bottleneck

The current copy/export flow is correct for now, but repeated publish work needs a stronger handoff workflow later.

## Main product conclusion

The product should evolve from:

`single listing draft tool`

to:

`Vinted seller intake and listing workstation`

This is the correct direction because the user's real pain is not just text generation. It is batch intake, grouping, generation, review, and handoff.

## Best future workflow

Target workflow:

1. take item photos
2. import a whole photo batch into the app
3. app creates a studio session
4. app groups photos into draft candidates
5. user corrects grouping fast if needed
6. app generates listings in batch
7. user reviews drafts in a queue
8. user copies or autofills into Vinted web
9. user tracks which items are ready, listed, or sold

## Product principle from this analysis

The next version should optimize for:

- batch intake first
- organization speed second
- generation quality third
- Vinted handoff speed fourth

Not the other way around.

## What should not drive the next phase

Do not prioritize these before the intake pipeline is stronger:

- advanced dashboards
- analytics-heavy seller views
- buyer messaging
- risky automation features
- multi-marketplace expansion
- mobile app support

## Summary

The app has proven the core listing loop.

The next problem to solve is:

`How do we turn a studio photo batch into organized, reviewable, Vinted-ready drafts with much less manual sorting and prompting?`
