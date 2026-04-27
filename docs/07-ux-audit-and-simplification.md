# UX Audit And Simplification

Last updated: 2026-04-27

## Design context used

This review used the existing product context already captured in the repo:

- desktop-only Vinted listing assistant
- target user is a seller working from product photos
- primary job is speed: photos in, draft out, move into Vinted web faster
- product should feel quiet, utilitarian, and task-focused
- the app should behave like a listing workspace, not like a seller analytics dashboard

## Anti-pattern verdict

Fail before simplification.

The previous UI was functionally complete, but structurally noisy:

- the home page read like a status dashboard instead of a workspace
- the draft page put identity, workflow cards, export, and history ahead of the actual task flow
- metadata and review were split into separate forms even though they belong to the same editing moment
- generation history was visible too early and competed with the main workflow
- export exposed too many copy options at once

This did not look flashy or over-designed, but it did look over-explained and over-sectioned.

## Core UX problems found

### 1. The primary workflow was buried

The product promise is:

1. upload images
2. generate listing
3. review fields
4. export to Vinted

The old draft page did not follow that order. It opened with identity, status, and state cards, while the actual upload area was near the bottom.

### 2. Too many surfaces competed for attention

The detail page had:

- four top summary cards
- separate metadata form
- separate review form
- history section
- export section
- image section

The user had to scan too much before seeing what to do next.

### 3. The home page over-reported status

The list page spent too much space on aggregate metrics:

- drafts tracked
- generated
- ready for handoff
- status mix

Those numbers are useful, but they are not the main job. The main job is opening the next draft and moving it forward.

### 4. Export was too wide for the moment

The export panel showed many copy actions at once:

- title
- description
- keywords
- price
- handoff
- JSON
- full package

That is too much for the main path. The primary export should be obvious, and the smaller field copies should be secondary.

### 5. History was treated like a primary workflow step

Generation history is useful, but it is advanced. It should not compete with upload, generate, review, or export.

## Required changes

### Immediate structural changes

- move image upload to the top of the draft page
- place generation directly after upload
- place generated fields immediately after generation
- collapse metadata into the same edit form as title, description, keywords, and price
- move export after review
- move generation history into an advanced disclosure area

### Home page simplification

- reduce marketing-style hero weight
- remove large metric cards
- keep only compact summary badges
- make draft cards answer one question quickly: what should I do next?

### Export simplification

- make `Copy Vinted handoff` the primary action
- keep `Copy full package` and `Copy JSON payload` visible but secondary
- move single-field copies behind an advanced disclosure

### Flow guidance changes

- after draft creation, land in the upload-first view
- after image upload, move the user to generation
- after generation, move the user to review fields
- after saving fields, move the user to export

## Changes implemented now

- simplified the home page hierarchy
- removed the large dashboard metrics block
- shortened the list page copy
- made draft cards more action-oriented with a clear `Next` state
- reordered the draft detail page into a linear workflow:
  1. upload images
  2. generate listing
  3. review listing fields
  4. export to Vinted
- merged metadata editing into the main review form
- moved generation history into a disclosure section
- simplified export actions and made advanced copies secondary
- added redirect-driven focus flow between upload, generate, review, and export

## Remaining UX improvements worth considering later

- image reordering by drag/drop
- inline preview of the generated listing as it will appear in Vinted
- tighter field templates for category-specific listings
- clearer autosave or unsaved-changes behavior
- optional compact list/table mode for heavy draft usage

## Skills used for this pass

- `frontend-design` for page composition and anti-pattern checks
- `audit` for structured issue finding and prioritization
- `critique` for workflow, hierarchy, and interaction review

## Recommended follow-up skills

- `clarify` for tighter microcopy and error text
- `polish` for final spacing and alignment pass
- `adapt` for another mobile/narrow-window check even though the app is desktop-first
