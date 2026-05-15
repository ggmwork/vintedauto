# Implementation Plan: Vinted Category Phase 1

Last updated: 2026-05-15

## Purpose

Fix first automation layer for Vinted category, price, and dynamic fields using
only live DOM behavior and the existing handoff payload.

Phase 1 should not add persistent learning. It should make the current extension
safer and more reliable.

## Current Implementation Notes

Implemented in the extension:

- image upload now runs before field fill
- extension waits after image upload so Vinted can render suggestions
- category dropdown opens before search input discovery
- category resolver scores live visible options and saved category paths
- uncertain category results are skipped with diagnostics, not guessed
- category-dependent fields resolve after category selection
- missing dependent controls are skipped so the user can finish manually

Still requires live Vinted PT smoke validation after reloading the unpacked
extension.

## User Outcome

When the user clicks Fill on Vinted:

- images upload first
- Vinted gets time to generate suggestions
- title and description fill as today
- price fills with masked-input-safe typing
- category dropdown opens and uses current visible options
- category-dependent fields fill after category selection
- uncertain category is skipped with useful diagnostics
- user can still edit everything before manual submit

## Files To Change

Extension:

- [extension/service-worker.js](../extension/service-worker.js)
- [extension/vinted-content-script.js](../extension/vinted-content-script.js)
- [extension/vinted-form-adapter.js](../extension/vinted-form-adapter.js)
- [extension/README.md](../extension/README.md)

Tests and checks:

- syntax checks for extension JS files
- existing `pnpm lint`
- existing `pnpm typecheck`
- existing `pnpm test`

No app schema change in Phase 1.

## Implementation Steps

### 1. Change Fill Order

Current risk:

- field fill runs before image upload
- Vinted image suggestions arrive after category resolver already ran

Target order:

1. fetch handoff payload
2. prepare image files
3. upload images to the page
4. wait for Vinted suggestion UI to settle
5. fill title, description, price, brand
6. resolve and fill category
7. wait for dependent fields
8. fill size, condition, color, material, package size, measurements, AI flag
9. merge field and image results

Suggested constants:

```js
const POST_IMAGE_SUGGESTION_DELAY_MS = 2500;
const POST_CATEGORY_FIELD_DELAY_MS = 1000;
```

Keep these local to the extension. No config UI yet.

### 2. Fix Category Dropdown Opening

Current risk:

- extension may search for category input before dropdown is open

Target:

```txt
click category control
wait
find visible search input
read visible Vinted suggestions
type query when needed
read visible options
score options
click high-confidence option
```

The screenshot shows the search input and suggestions exist only after the
category menu is open.

### 3. Add Live Option Snapshot

When category menu is open, collect:

- option leaf text
- breadcrumb text
- whether it came from suggestions area, if detectable
- raw visible text
- element reference

No storage in Phase 1. Snapshot only lives during the fill attempt and appears
in diagnostics when needed.

### 4. Add Confidence Gate

Select automatically only when score is high.

Recommended first threshold:

- exact saved path match: auto-select
- exact Vinted suggestion plus matching app intent: auto-select
- one visible strong keyword match and no competing strong match: auto-select
- multiple close matches: skip
- no match: skip

Skip means:

- `skippedFields` includes `category`
- result remains success or partial success depending other fields
- diagnostics include top visible options and reason

### 5. Fill Dynamic Fields After Category

After category click:

- wait `POST_CATEGORY_FIELD_DELAY_MS`
- re-run field diagnostics
- resolve dynamic fields from the live page
- fill only visible fields with matching values
- skip missing optional values
- fail only fields with payload value where a visible compatible control was
  found but could not be set

### 6. Price Hardening

Keep human-like typing. Improve diagnostics:

- attempted candidates
- final visible value
- normalized numeric parse
- control locator used

Do not block category work on price if category can still fill.

## Acceptance Criteria

- Extension uploads images before category resolution.
- Extension waits before resolving category.
- Category search input is found after dropdown open.
- With Vinted suggestions visible, resolver records visible options.
- If confidence is low, category is skipped instead of guessed.
- Dynamic fields are resolved after category selection, not before.
- Result diagnostics explain skipped category and list visible options.

## Verification

Automated:

```powershell
rtk node --check extension/service-worker.js
rtk node --check extension/vinted-content-script.js
rtk node --check extension/vinted-form-adapter.js
rtk node --check extension/popup.js
rtk corepack pnpm lint
rtk corepack pnpm typecheck
rtk corepack pnpm test
```

Manual:

1. reload unpacked extension
2. open one Vinted PT create page
3. fill a draft with images
4. verify images upload before category opens
5. verify category uses live suggestions or skips with diagnostics
6. verify user can edit category before final submit
