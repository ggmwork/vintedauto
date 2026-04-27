# MVP Specification

Last updated: 2026-04-27

## Product name

Working name: Vinted AI Listing Assistant

## MVP objective

Build a desktop-first app that takes item photos and turns them into organized, editable Vinted-ready listing drafts with price suggestions.

## Core user flow

1. User creates a new draft
2. User uploads item photos from desktop
3. App stores photos under that draft
4. App analyzes photos and optional user inputs
5. App generates listing text and price suggestion
6. User reviews and edits draft
7. User copies or exports listing into Vinted web

## MVP user promise

"Upload photos, get a usable Vinted-ready draft, and move it into Vinted much faster than writing everything by hand."

## MVP features

### 1. Draft creation

The app must let the user create a draft for one item.

Each draft should have:

- draft ID
- created date
- updated date
- draft status

Recommended statuses:

- `draft`
- `ready`
- `listed`
- `sold`

### 2. Photo upload and organization

The app must accept desktop image uploads and keep them grouped per item draft.

Minimum requirements:

- multiple images per draft
- image preview
- image ordering
- image removal
- stable per-draft storage path

### 3. Structured item inputs

The app should allow the user to provide or correct structured fields.

Recommended fields:

- brand
- category
- size
- condition
- color
- material
- notes

These fields should support AI generation, not fight it.

### 4. AI listing generation

The app should generate:

- title
- description
- bullet points or highlights
- hashtags or keywords
- condition-aware notes

Generation should be editable after creation.

### 5. Price suggestion

The app should return:

- a suggested price
- or, preferably, a suggested range

MVP rule:

Do not pretend pricing is exact. If external data is weak, show a range plus a short rationale.

### 6. Draft review screen

The app should present all generated content in one place for editing and approval.

Minimum review actions:

- edit title
- edit description
- edit price
- edit structured fields
- mark draft as ready

### 7. Export to Vinted

The MVP must support at least one of these export paths:

- copy listing text
- copy full draft bundle
- open Vinted web with draft ready for manual paste

Preferred MVP+ path:

- browser autofill for Vinted web

## Explicit non-goals for MVP

Do not build these into the first version:

- direct Vinted posting automation as a required success path
- native mobile app support
- automated relisting
- buyer messaging automation
- offer negotiation bots
- multi-account cloning
- cross-platform inventory sync
- seller analytics beyond simple draft tracking

## Desktop-only scope

MVP is desktop only.

Supported environment:

- desktop browser for main app
- desktop browser for Vinted target flow

Not in scope:

- iPhone
- Android
- native desktop wrappers unless later justified

## UX requirements

The UX should optimize for speed and clarity.

Key principles:

- user should always know which draft they are editing
- images should be first-class, not hidden
- generation should feel fast and reviewable
- export action should be obvious
- drafts should be easy to revisit later

## MVP success criteria

MVP succeeds when a user can:

- upload photos for an item
- receive a coherent Vinted-ready draft
- review and edit the result
- save the draft
- move it into Vinted web faster than manual authoring

## Phase split

### MVP v0.1

- upload photos
- create draft
- generate title/description/keywords
- suggest price
- save draft
- copy/export

### MVP v0.2

- better structured field support
- better pricing logic
- improved draft management
- optional Chrome extension for Vinted web autofill
