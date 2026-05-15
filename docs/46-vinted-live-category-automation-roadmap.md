# Vinted Live Category Automation Roadmap

Last updated: 2026-05-15

## Goal

Make Vinted category and category-dependent fields reliable without pretending the
Vinted taxonomy is static.

The extension should:

- upload images first so Vinted can generate suggestions
- read the live category options Vinted shows now
- pick a category only when confidence is high
- fill subfields only after the chosen category makes them visible
- always let the user edit before final submit
- learn from manual correction for future similar items

## Non-Goal

Do not try to hardcode the whole Vinted catalog in the app.

Vinted category names, order, suggestions, and dynamic fields can change. A
static catalog will rot. The app should store seller intent and learned choices;
the extension should resolve those against the live page.

## Core Rule

User has final word.

Automation may prefill. Automation must not submit. If category confidence is
not high, extension skips the category and shows clear diagnostics with visible
options. Wrong category is worse than manual category.

## Target Flow

1. App sends listing payload with title, description, images, metadata, known
   category intent, and optional learned category path.
2. Extension opens Vinted create-listing page.
3. Extension uploads images first.
4. Extension waits for Vinted image-based suggestions to appear.
5. Extension fills title, description, and price.
6. Extension opens category dropdown and reads live suggestions/options.
7. Resolver scores live options against:
   - saved category path
   - app metadata category
   - title and description tokens
   - Vinted image suggestions
8. Resolver selects only high-confidence category.
9. Extension waits for category-dependent fields to render.
10. Extension fills visible subfields that match payload or learned mappings.
11. User reviews, edits anything needed, and submits manually.
12. Later phases save manual category choices as learning data.

## Phase Split

### Phase 1 - Live Resolver MVP

Make current extension fill order and category resolver robust:

- images first
- post-image settle delay
- open category before finding search input
- read visible suggestions/options
- confidence gate
- wait/re-scan after category before dynamic fields

Reference: [47-implementation-plan-vinted-category-phase-1.md](./47-implementation-plan-vinted-category-phase-1.md)

### Phase 2 - Manual Correction Capture

Add user-controlled correction flow:

- extension can inspect final chosen category before submit
- app can store corrected category path per draft
- user can edit category intent and dynamic fields in app
- fill result records what was auto-filled, skipped, and manually needed

Reference: [48-implementation-plan-vinted-category-phase-2.md](./48-implementation-plan-vinted-category-phase-2.md)

### Phase 3 - Local Taxonomy Memory

Turn repeated manual corrections into local reusable knowledge:

- store learned category patterns
- score future items using learned paths
- keep market-specific and user-editable memory
- decay or disable mappings that fail live validation

Reference: [49-implementation-plan-vinted-category-phase-3.md](./49-implementation-plan-vinted-category-phase-3.md)

## Success Criteria

- Price, category, and dependent fields no longer fail because images were
  uploaded too late.
- Category resolver chooses Vinted suggestions when they are clear.
- Generic or ambiguous items do not get forced into wrong categories.
- User can manually correct category and subfields before final submit.
- Diagnostics expose visible options and score reason when automation skips.
- Future implementation has one reference for scoring, payload shape, and file
  ownership.

Resolver reference: [50-vinted-category-resolver-reference.md](./50-vinted-category-resolver-reference.md)
