# Next-Phase Roadmap

Last updated: 2026-04-27

## Purpose

This roadmap covers the phase after the current local MVP.

The goal is not to re-prove the single-draft workflow.

The goal is to evolve the app into a batch-oriented seller workstation.

## Phase A - Batch intake foundation

Goal:

Create a product entry point that matches the real seller workflow.

Tasks:

- add `studio session` model
- add batch import entry flow
- support import from local folder or multi-file selection
- attach all imported photos to a session
- show session-level counts and progress

Deliverable:

User can start with one photo batch instead of one draft.

## Phase B - Group photos into items

Goal:

Reduce manual organization work.

Tasks:

- create draft candidates from imported photos
- support manual grouping corrections
- support moving photos between draft groups
- support selecting cover image per group
- keep group status visible

Stretch goal:

- assisted auto-grouping based on image similarity, sequence, or model inference

Deliverable:

User can turn a mixed photo batch into item drafts much faster than manual folder work.

## Phase C - Batch generation

Goal:

Remove repeated per-item prompting work.

Tasks:

- generate listings for many grouped drafts in one run
- show per-draft generation state
- keep queue progress visible
- preserve manual edits on re-generation
- support retry for failed drafts

Deliverable:

A whole session can move from grouped photos to generated drafts in one pipeline.

## Phase D - Review queue

Goal:

Make repeated review fast.

Tasks:

- add queue view for `needs_review`
- add next/previous draft navigation
- add quick actions:
  - save and next
  - copy and next
  - mark ready
- support filter by queue state

Deliverable:

User can process many drafts quickly without bouncing around the app.

## Phase E - Seller presets

Goal:

Turn repeated prompt behavior into reusable settings.

Tasks:

- add listing style presets
- add output language setting
- add description tone presets
- add pricing style preferences
- add category-specific instructions

Deliverable:

Generation quality becomes more consistent and less dependent on ad hoc prompting.

## Phase F - Stronger Vinted handoff

Goal:

Reduce repeated copy/paste friction.

Tasks:

- improve handoff formatting
- add `copy and next`
- add optional browser handoff companion
- later evaluate narrow Chrome extension for Vinted web autofill

Deliverable:

Publishing becomes materially faster while staying within the current safety boundary.

## Phase G - Real persistence and deployment

Goal:

Move from local prototype to durable product.

Tasks:

- replace local `.data` persistence with Supabase
- move images into Supabase Storage
- add session and queue data models
- deploy app
- configure provider envs cleanly

Deliverable:

App becomes reusable beyond one local machine and easier to evolve.

## Priority order

Recommended order:

1. batch intake foundation
2. grouping workflow
3. batch generation
4. review queue
5. seller presets
6. persistence/deploy
7. stronger Vinted handoff

## Why this order

This order attacks the actual time sinks first:

- import friction
- photo organization
- repeated prompting
- repeated review

## Anti-roadmap

Do not prioritize these ahead of the roadmap above:

- native mobile
- advanced analytics
- multi-marketplace support
- aggressive Vinted automation
- buyer messaging features
- complex business dashboards
