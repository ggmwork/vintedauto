# Roadmap

Last updated: 2026-04-27

## Phase 0 - Foundation

Goal:

Create a clean desktop-first app shell and set up core infrastructure.

Tasks:

- scaffold Next.js app
- add TypeScript
- add Tailwind CSS
- add shadcn/ui
- configure Supabase project
- define initial database schema
- configure storage bucket for draft images
- set environment variable structure

Deliverable:

A running desktop web app with working local development setup.

## Phase 1 - Draft workflow

Goal:

Make the app useful without any browser automation.

Tasks:

- create draft list page
- create draft detail page
- support image upload
- support image preview and ordering
- add structured metadata fields
- save draft records and images

Deliverable:

User can create, edit, and save listing drafts with images.

## Phase 2 - AI generation

Goal:

Generate useful Vinted-ready draft content from images and user inputs.

Tasks:

- integrate AI generation endpoint
- generate title
- generate description
- generate keywords or hashtags
- generate condition-aware notes
- add editable review screen

Deliverable:

User can turn uploaded photos into an editable draft.

## Phase 3 - Pricing

Goal:

Add pragmatic price guidance.

Tasks:

- define MVP pricing logic
- add suggested price or range
- add short rationale
- let user override freely

Deliverable:

Draft includes useful pricing guidance without blocking on perfect market data.

## Phase 4 - Export flow

Goal:

Help user move draft into Vinted quickly.

Tasks:

- copy title
- copy description
- copy full draft summary
- add open-in-Vinted-web flow

Deliverable:

User can complete the full draft-to-Vinted workflow manually but quickly.

## Phase 5 - Optional browser autofill

Goal:

Reduce manual copy-paste in desktop browser.

Tasks:

- build Chrome extension
- select saved draft
- open Vinted web listing page
- fill supported fields
- verify stability on supported Vinted domains

Deliverable:

Desktop browser autofill into Vinted web.

## Phase 6 - Quality and polish

Goal:

Make the product production-ready.

Tasks:

- improve empty states
- improve loading states
- improve error handling
- tighten responsive desktop/laptop behavior
- improve draft search/filtering
- improve image and text editing flow

Deliverable:

Usable, stable MVP.

## Deferred ideas

Keep out of initial scope unless product direction changes:

- auto publishing
- relisting automation
- buyer messaging automation
- multi-account automation
- cross-marketplace sync
- GGM Admin integration work before Vinted app proves useful
