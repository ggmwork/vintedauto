# Implementation Plan

Last updated: 2026-04-27

## Purpose

This document is the execution plan for the first implementation cycle.

It converts the roadmap into a concrete sequence of build steps for the first working vertical slice.

## Delivery target

By the end of the current week, the app should be able to:

1. create a draft
2. upload multiple item images
3. store those images under that draft
4. analyze the images with AI
5. generate:
   - title
   - description
   - keywords or hashtags
   - price suggestion or range
6. show the generated result in a review UI
7. let the user edit and save the draft

This is the definition of "kinda working" for the first week.

## Scope for this implementation cycle

### In scope

- app scaffold
- draft data model
- image upload and storage
- AI generation pipeline
- price suggestion output
- review and edit UI
- save and load draft flow

### Out of scope

- Chrome extension
- autofill into Vinted web
- auth
- multi-user
- advanced pricing engine
- analytics
- mobile support
- relisting or seller automation

## Required inputs

Implementation can start immediately, but the following inputs are needed during the week:

### Required for full integration

- OpenAI API key
- Supabase project URL
- Supabase anon key
- Supabase service role key if server-side operations need it

### Required for good quality testing

- 5 to 10 real product photo sets
- 3 to 5 examples of good Vinted listings in the desired style
- preferred output language:
  - Portuguese
  - English
  - bilingual

### Optional but useful

- preferred title style
- preferred description tone
- whether pricing should default to:
  - single value
  - range
  - both

## Delivery strategy

Do not start by building broad foundations for every future feature.

Build a strong foundation for the first workflow:

- draft model
- image storage
- generation API
- review UI
- save and load flow

This keeps the architecture reusable without drifting into speculative abstraction.

## Build order

The implementation should follow this order.

## Step 1 - Scaffold the application

Goal:

Create the base application and development environment.

Tasks:

- create Next.js app with TypeScript
- use `pnpm`
- enable Tailwind CSS
- initialize shadcn/ui
- create base folder structure
- add environment variable template
- verify local dev server runs

Deliverable:

A clean app shell that boots locally.

Verification:

- app installs cleanly
- `pnpm dev` starts
- root page renders

## Step 2 - Define domain model and file structure

Goal:

Create stable types and module boundaries before wiring services.

Tasks:

- create `types/` for core entities
- define `Draft`
- define `DraftImage`
- define `GenerationResult`
- define `PriceSuggestion`
- define `DraftStatus`
- create `lib/` folders for:
  - `ai`
  - `drafts`
  - `pricing`
  - `storage`

Deliverable:

Core types and module layout are in place.

Verification:

- types compile
- no `any` needed for core draft flow

## Step 3 - Create persistence and storage boundaries

Goal:

Keep data and file handling behind clear interfaces.

Tasks:

- define draft repository interface
- define image storage interface
- define generation service interface
- decide initial adapter strategy

Recommended implementation path:

- use real Supabase adapter if credentials are ready
- otherwise add local/mock adapter with same interface and swap later

Deliverable:

App code depends on interfaces, not storage details.

Verification:

- repository and storage methods usable from app layer
- swap path is clear and low-risk

## Step 4 - Implement draft creation and listing state

Goal:

Make drafts real entities early.

Tasks:

- create draft creation action
- create draft list page
- create draft detail page
- support minimal draft statuses:
  - `draft`
  - `ready`
  - `listed`
  - `sold`

Deliverable:

User can create and reopen drafts.

Verification:

- new draft appears in list
- draft detail page loads
- draft status persists

## Step 5 - Implement image upload flow

Goal:

Make images first-class data in the product.

Tasks:

- build multi-image upload UI
- attach images to draft
- store image metadata
- render previews
- support remove image
- support reorder if time allows this week

Deliverable:

Each draft can store and show multiple images.

Verification:

- images upload successfully
- images render in review UI
- image records map correctly to draft

## Step 6 - Build AI generation pipeline

Goal:

Turn uploaded product photos into structured listing output.

Tasks:

- create server-side generation route or action
- send draft images and structured fields to model
- define structured output schema
- generate:
  - title
  - description
  - keywords or hashtags
  - item attributes if useful
  - price suggestion or range
- validate model output before saving

Important rule:

Do not let raw model text directly drive UI state without schema validation.

Deliverable:

One generation action returns normalized listing output.

Verification:

- generation succeeds on sample drafts
- invalid model output is handled cleanly
- generated shape matches types

## Step 7 - Implement price suggestion logic

Goal:

Return usable pricing guidance without fake certainty.

Tasks:

- decide output shape:
  - single value
  - range
  - rationale
- add pricing fields to generation result
- present confidence conservatively

Recommended MVP behavior:

- use a range when certainty is low
- include short explanation when possible

Deliverable:

Drafts show a usable suggested price or range.

Verification:

- price fields render consistently
- user can overwrite price freely

## Step 8 - Build review and edit UI

Goal:

Make generated output reviewable and editable in one screen.

Tasks:

- create review panel for generated content
- show title, description, keywords, and price
- add edit controls
- show images beside generated content
- add save action

Deliverable:

User can inspect, edit, and save generated drafts.

Verification:

- all generated fields visible
- edits persist
- screen remains usable with multiple images

## Step 9 - Save and reload generated drafts

Goal:

Make results persistent and reusable.

Tasks:

- persist generation output to draft
- reload saved draft data
- preserve image references
- preserve user edits separately from raw generated output if practical

Deliverable:

Drafts survive refresh and can be resumed later.

Verification:

- reload shows last saved state
- generated content and edited content remain consistent

## Step 10 - Basic UX polish and error handling

Goal:

Avoid a brittle demo.

Tasks:

- loading states for upload and generation
- empty states for no drafts and no images
- clear error messages
- simple success confirmations
- prevent duplicate generation clicks

Deliverable:

Workflow is understandable and stable enough for internal testing.

Verification:

- no dead-end screens
- failure modes visible and recoverable

## Step 11 - Smoke testing with real examples

Goal:

Validate product loop against real item data.

Tasks:

- test with 5 to 10 photo sets
- compare output quality across item types
- identify repeated prompt failures
- refine prompt and field structure

Deliverable:

Basic confidence that workflow works on real seller data.

Verification:

- at least several drafts produce usable output
- failure cases are understood and documented

## Suggested day-by-day plan

### Monday

- scaffold app
- define types
- define interfaces
- create docs baseline for implementation

### Tuesday

- implement drafts
- implement image upload
- wire storage

### Wednesday

- implement AI generation route
- implement structured output validation
- show generated result in UI

### Thursday

- improve review screen
- save and reload generated drafts
- refine price suggestion output

### Friday

- smoke test with real sample products
- fix workflow bugs
- tighten loading and error states
- prepare first demoable build

## Acceptance criteria for end of week

The week is successful if all of these are true:

- app starts locally
- user can create a draft
- user can upload multiple images
- images persist with draft
- AI generation returns title, description, and price suggestion
- generated result appears in UI
- user can edit and save the draft
- saved draft can be reopened later

## Explicit technical decisions

These should be followed unless a better reason appears during implementation:

- use desktop web app only
- keep Vinted browser automation out of first build
- keep AI server-side
- keep storage and repository layers isolated
- keep pricing conservative
- prefer typed structured responses over free text blobs

## Risks

### Risk 1 - AI output quality is uneven

Mitigation:

- use structured prompt
- validate schema
- keep review/edit UI strong

### Risk 2 - Storage integration slows the week

Mitigation:

- keep storage behind interface
- use temporary local/mock adapter if Supabase credentials are late

### Risk 3 - Price suggestion quality is weak

Mitigation:

- show range instead of exact number
- treat pricing as guidance, not precision

### Risk 4 - Too much UI polish too early

Mitigation:

- finish workflow first
- polish only after the loop works end to end

## Implementation notes

During implementation, each step should end with verification before moving to the next step.

Recommended pattern:

1. build one slice
2. run it
3. verify it
4. fix obvious issues
5. then continue

## Ready-to-start conclusion

Yes, the project is ready to start implementation.

The missing pieces are mostly credentials, sample data, and execution time, not planning.

The next action after this plan is to begin Step 1 and scaffold the app.
