# Vinted Dynamic Fields Rollout

Last updated: 2026-05-03

## Goal

Make category-dependent Vinted fields work end to end:

- stored in drafts
- visible in Draft review
- visible in Stock
- shipped in handoff payload
- consumed by the extension

## What Was Added

### Model layer

- [types/vinted-profile.ts](../types/vinted-profile.ts)
- [lib/vinted/listing-profile.ts](../lib/vinted/listing-profile.ts)

This is the catalog and normalization layer.

### Draft persistence

- [types/draft.ts](../types/draft.ts)
- [lib/drafts/draft-repository.ts](../lib/drafts/draft-repository.ts)
- [lib/drafts/local-draft-repository.ts](../lib/drafts/local-draft-repository.ts)

This makes `vintedProfile` persistent and backward-compatible with older `.data` drafts.

### App review + stock

- [components/app/draft-vinted-profile-section.tsx](../components/app/draft-vinted-profile-section.tsx)
- [components/app/draft-detail-page.tsx](../components/app/draft-detail-page.tsx)
- [app/actions.ts](../app/actions.ts)
- [app/stock/page.tsx](../app/stock/page.tsx)
- [components/app/stock-workspace-page.tsx](../components/app/stock-workspace-page.tsx)

This makes the later Vinted fields visible and editable in the app.

### Handoff payload

- [types/vinted.ts](../types/vinted.ts)
- [lib/vinted/handoff.ts](../lib/vinted/handoff.ts)

This adds `listing.profile` to the extension payload.

### Extension fill layer

- [extension/vinted-form-adapter.js](../extension/vinted-form-adapter.js)
- [extension/vinted-content-script.js](../extension/vinted-content-script.js)

This makes the extension consume:

- explicit PT category path plans
- package size
- AI-photo checkbox
- shirt measurements

## Why This Order

The correct dependency order is:

1. stable profile schema
2. stored draft values
3. app editing surface
4. stock visibility
5. payload contract
6. extension selector logic

If we skip to selectors first, we end up guessing fields the app cannot even store.

## Acceptance Criteria

Done in code:

- drafts persist `vintedProfile`
- Draft review exposes PT profile fields
- Stock shows linked-draft Vinted profile summary
- handoff payload includes `listing.profile`
- extension reads `listing.profile`

Still needs manual live validation:

- PT category dropdown resolves the intended breadcrumb path
- package size clicks the intended card/radio
- shirt measurements land in the right inputs
- AI-photo checkbox reflects the stored state

## Next Manual Test

Use one shirt draft and verify:

1. set package size in the app
2. set category query/path in the app
3. save draft
4. confirm Stock shows no missing later fields
5. run `Fill on Vinted`
6. confirm category, package size, and measurement fields fill on `vinted.pt`
