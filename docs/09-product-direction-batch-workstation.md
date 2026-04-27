# Product Direction: Batch Listing Workstation

Last updated: 2026-04-27

## Direction shift

The MVP proved that a desktop app can:

- receive item images
- generate listing text and price
- save draft state
- export content for Vinted

That means the next phase should not remain framed as:

`AI listing generator`

The stronger product framing is:

`batch-first Vinted listing workstation`

## Product statement

The app should help a seller move from a pile of fresh product photos to a queue of reviewable Vinted-ready drafts with minimal manual organization.

## Product job to be done

When a seller finishes a photo session, they should be able to:

- import the entire batch quickly
- let the app create draft candidates
- review grouped items fast
- generate listings in bulk
- move through a review queue
- copy or later autofill into Vinted web

## New top-level product surfaces

### 1. Studio sessions

A session represents one photo/import batch.

Suggested purpose:

- collect imported photos
- group them into items
- show session progress
- hold batch generation state

### 2. Draft queue

The queue becomes the operational surface for repeated work.

Suggested statuses:

- `needs_grouping`
- `ready_to_generate`
- `needs_review`
- `ready_to_copy`
- `listed`
- `sold`

### 3. Seller presets

Presets replace repeated prompt work.

Suggested preset controls:

- listing language
- title style
- description tone
- pricing style
- keyword style
- default category-specific instructions

### 4. Export / handoff surface

For now:

- copy Vinted-ready handoff

Later:

- browser autofill for Vinted web

## Core principles for this phase

### Intake before polish

If the user still has to sort and feed everything manually, better wording alone will not move the product enough.

### Queue before dashboard

The user needs a system that shows what needs action next.

### Presets before prompt boxes

The user's repeated prompt logic should become product configuration.

### Assisted organization before risky automation

Auto-grouping and batch generation are high-value and lower-risk than aggressive publishing automation.

## Recommended UX shape

Top workflow should become:

1. `New session`
2. `Import photos`
3. `Group items`
4. `Generate drafts`
5. `Review queue`
6. `Copy to Vinted`

The app should keep the user moving forward through these stages with as little branching as possible.

## Boundaries for this phase

Keep out:

- direct Vinted posting dependency
- inbox automation
- auto offers
- relisting bots
- multi-account workflows
- broad marketplace expansion

## What success looks like

A good next version should make the user say:

`I can finish the photo session, drop everything into the app, and get through listings much faster without manually reorganizing the whole batch.`
