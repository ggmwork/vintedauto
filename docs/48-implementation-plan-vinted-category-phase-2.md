# Implementation Plan: Vinted Category Phase 2

Last updated: 2026-05-15

## Purpose

Capture manual category correction so the user has final word and the app can
reuse the chosen category path later.

Phase 2 starts after Phase 1 live resolver is working.

## User Outcome

User can:

- let extension prefill what it can
- manually change category and subfields on Vinted
- save the final visible category path back to the app
- see and edit stored category path in the draft
- reuse that saved path in future fills

Manual correction becomes data, not wasted work.

## Files To Change

App:

- [types/draft.ts](../types/draft.ts)
- [types/vinted-profile.ts](../types/vinted-profile.ts)
- [types/vinted.ts](../types/vinted.ts)
- [lib/drafts/local-draft-repository.ts](../lib/drafts/local-draft-repository.ts)
- [lib/vinted/listing-profile.ts](../lib/vinted/listing-profile.ts)
- [lib/vinted/handoff.ts](../lib/vinted/handoff.ts)
- [app/actions.ts](../app/actions.ts)
- [components/app/draft-vinted-profile-section.tsx](../components/app/draft-vinted-profile-section.tsx)
- [components/app/draft-export-panel.tsx](../components/app/draft-export-panel.tsx)

Extension:

- [extension/vinted-form-adapter.js](../extension/vinted-form-adapter.js)
- [extension/vinted-content-script.js](../extension/vinted-content-script.js)
- [extension/service-worker.js](../extension/service-worker.js)
- [extension/popup.js](../extension/popup.js)

API:

- [app/api/drafts/[draftId]/vinted-fill-result/route.ts](../app/api/drafts/%5BdraftId%5D/vinted-fill-result/route.ts)

Tests:

- [tests/vinted-listing-profile.test.ts](../tests/vinted-listing-profile.test.ts)
- [tests/vinted-handoff.test.ts](../tests/vinted-handoff.test.ts)

## Data Shape

Add a manual correction snapshot to fill result or a dedicated endpoint.

Candidate shape:

```json
{
  "categorySnapshot": {
    "source": "user_manual",
    "market": "vinted.pt",
    "capturedAt": "2026-05-15T00:00:00.000Z",
    "path": ["Homem", "Roupa", "Vestuario de exterior", "Blusoes"],
    "leaf": "Casacos militares e utilitarios",
    "rawText": "Casacos militares e utilitarios\nHomem > Roupa > Vestuario de exterior > Blusoes"
  }
}
```

If the category was auto-filled and the user does not change it, source can be
`extension_auto`. If user changes it, source is `user_manual`.

## Implementation Steps

### 1. Read Current Category From Vinted

Extension adapter needs a read method:

```js
readSelectedCategory()
```

It should return:

- selected category leaf
- breadcrumb path when visible
- raw text
- confidence that read succeeded

This must work after user manually edits category.

### 2. Add Manual Capture Command

Popup action:

- `Save current Vinted category to app`

It should:

1. read active tab selected category
2. post snapshot to app for current draft
3. update last fill diagnostics
4. show saved state

Keep final submit manual.

### 3. Store Correction In Draft

Draft `vintedProfile.categoryPlan` should preserve saved manual path.

Manual path outranks inferred profile defaults. Existing hydration already has
this shape; Phase 2 should harden it and test it.

### 4. Show Editable Manual Path In App

Draft review already exposes Vinted category path field. Phase 2 should make
the saved manual source clear:

- current saved path
- last captured source
- last captured time
- edit/save controls remain manual

Do not make the field required.

### 5. Use Saved Manual Path Next Fill

Handoff payload should send saved manual `categoryPlan.path`.

Phase 1 resolver should treat exact saved path as highest confidence.

## Acceptance Criteria

- User can manually pick category on Vinted and save that path back to draft.
- Saved path appears in app and remains editable.
- Next handoff payload includes saved path.
- Extension uses saved path before fallback suggestions.
- If read fails, extension reports clear diagnostics and does not overwrite
  existing saved path.

## Verification

Automated:

```powershell
rtk corepack pnpm lint
rtk corepack pnpm typecheck
rtk corepack pnpm test
```

Manual:

1. run Fill on Vinted
2. manually change category on Vinted
3. click Save current Vinted category to app
4. reload draft in app
5. confirm saved path appears
6. run Fill on Vinted again
7. confirm saved path is preferred
