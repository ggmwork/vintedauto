# Inventory Management Reference

Last updated: 2026-05-17

## Purpose

Use this reference while implementing the Inventory page. It records the target
IA, labels, status mapping, route behavior, and UI rules for the first pass.

## Source Docs

Read these first:

- [54-inventory-management-ux-plan.md](./54-inventory-management-ux-plan.md)
- [43-simplified-ux-redesign-plan.md](./43-simplified-ux-redesign-plan.md)
- [44-simplified-ux-flow-reference.md](./44-simplified-ux-flow-reference.md)
- [45-simplified-ui-implementation-reference.md](./45-simplified-ui-implementation-reference.md)

## Current Surfaces

Current routes:

- `/`: Workbench, photo intake, item creation.
- `/stock`: item cards and generation actions.
- `/review`: review queue and single listing detail.
- `/drafts`: listing archive.
- `/drafts/[draftId]`: listing editor/detail.
- `/settings/ai`: settings.

Target first pass:

- `/`: Workbench.
- `/review`: Inventory.
- `/drafts/[draftId]`: listing editor/detail.
- `/stock`: compatibility route.
- `/drafts`: compatibility archive.
- `/settings/ai`: Settings.

## Navigation Labels

Use:

- `Workbench`
- `Inventory`
- `Settings`

Avoid primary nav labels:

- `Review`
- `Stock`
- `Drafts`
- `AI`

## Inventory Row Shape

Each row should represent one seller-managed item.

Fields:

- `id`
- `sourceType`: `stock-item` or `manual-draft`
- `stockItemId`
- `sessionId`
- `draftId`
- `title`
- `subtitle`
- `coverImageHref`
- `photoCount`
- `status`
- `nextAction`
- `priceLabel`
- `categoryLabel`
- `sizeLabel`
- `updatedAt`
- `searchText`

For stock rows:

- use stock item name when there is no draft title
- use linked draft title when present
- use stock cover photo as thumbnail
- use stock photo count

For manual draft rows:

- use draft title or `Untitled listing`
- use draft image count
- use first draft image when detail data is available
- show source as `Manual listing`

## Status Mapping

Inventory status type:

```ts
type InventoryStatus =
  | "needs-listing"
  | "needs-review"
  | "ready-to-fill"
  | "filled-on-vinted"
  | "needs-manual-fix"
  | "listed"
  | "sold";
```

Labels:

- `needs-listing`: `Needs listing`
- `needs-review`: `Needs review`
- `ready-to-fill`: `Ready to fill`
- `filled-on-vinted`: `Filled on Vinted`
- `needs-manual-fix`: `Needs manual fix`
- `listed`: `Listed`
- `sold`: `Sold`

Derivation:

```txt
if draft.status is sold -> Sold
else if draft.status is listed -> Listed
else if draft.vintedHandoff.status is needs_manual_fix or fill_failed -> Needs manual fix
else if draft.vintedHandoff.status is filled_on_vinted -> Filled on Vinted
else if stock item exists and has no draft -> Needs listing
else if draft readiness is not ready -> Needs review
else -> Ready to fill
```

Notes:

- Handoff state should override normal readiness when it needs user attention.
- `handed_off` should still show as `Ready to fill` or `Filled on Vinted`
  depending on later callback state. If useful, show `Launch sent` as helper
  text, not as a primary status.
- Do not show `All generated` as a status or filter.

## Filter Mapping

Filter type:

```ts
type InventoryFilter =
  | "action-needed"
  | "needs-listing"
  | "needs-review"
  | "ready-to-fill"
  | "filled-or-fix-needed"
  | "listed"
  | "all";
```

Labels:

- `action-needed`: `Action needed`
- `needs-listing`: `Needs listing`
- `needs-review`: `Needs review`
- `ready-to-fill`: `Ready to fill`
- `filled-or-fix-needed`: `Filled / fix needed`
- `listed`: `Listed`
- `all`: `All`

Filter rules:

- `Action needed`: `Needs listing`, `Needs review`, `Ready to fill`,
  `Needs manual fix`, `Filled on Vinted`
- `Needs listing`: `Needs listing`
- `Needs review`: `Needs review`
- `Ready to fill`: `Ready to fill`
- `Filled / fix needed`: `Filled on Vinted`, `Needs manual fix`
- `Listed`: `Listed`
- `All`: all statuses

Default:

- `Action needed`

## Next Action Mapping

Next action type:

```ts
type InventoryNextAction =
  | "generate-listing"
  | "review-listing"
  | "fill-on-vinted"
  | "fix-vinted-fill"
  | "mark-listed"
  | "open-listing";
```

Labels:

- `generate-listing`: `Generate listing`
- `review-listing`: `Review listing`
- `fill-on-vinted`: `Fill on Vinted`
- `fix-vinted-fill`: `Fix Vinted fill`
- `mark-listed`: `Mark listed`
- `open-listing`: `Open listing`

Rules:

- `Needs listing` -> `Generate listing`
- `Needs review` -> `Review listing`
- `Ready to fill` -> `Fill on Vinted`
- `Needs manual fix` -> `Fix Vinted fill`
- `Filled on Vinted` -> `Mark listed`
- `Listed` -> `Open listing`
- `Sold` -> `Open listing`

## Table Layout

Desktop columns:

| Column | Contents |
| --- | --- |
| Photo | 56-72 px thumbnail |
| Item | title, source helper, optional brand |
| Status | status badge and one-line issue |
| Price | price or `No price` |
| Category / Size | category path or category, size |
| Photos | count |
| Updated | compact date |
| Next action | one primary action |

Mobile card hierarchy:

1. thumbnail and title
2. status badge
3. price and category/size
4. photo count and updated date
5. primary action

## Copy Rules

Use:

- `Inventory`
- `Item`
- `Listing`
- `Generate listing`
- `Review listing`
- `Ready to fill`
- `Fill on Vinted`
- `Mark listed`

Avoid first-level copy:

- `Draft`
- `Review queue`
- `All generated`
- `Handoff`
- `Payload`
- `Selector`
- `Stock item`

Allowed in advanced/debug:

- `Draft ID`
- `Vinted handoff`
- `Selector diagnostics`
- `Autofill JSON`
- `Stock item ID`

## Empty States

No rows:

- Title: `No items yet`
- Body: `Add photos in Workbench, then create your first item.`
- Action: `Open Workbench`

Filtered empty:

- Title: `Nothing in this view`
- Body: `Try another filter or return to Workbench.`
- Action: `Show all`

No action-needed rows:

- Title: `No action needed`
- Body: `Everything visible is either listed, sold, or waiting on later work.`
- Action: `Show all`

## Summary Counts

Show compact counts above the table:

- `Action needed`
- `Needs listing`
- `Ready to fill`
- `Listed`

Do not show too many metrics in the header. Inventory should be operational, not
analytics-heavy.

## Search And Sort

First pass search fields:

- item title
- draft title
- brand
- category
- size
- condition
- color
- material
- keywords
- IDs for debugging only

First pass sort options:

- `Recently updated`
- `Oldest updated`
- `Newest created`
- `Title A-Z`

Default sort:

- action-needed statuses first
- then recently updated

## Compatibility Rules

Keep these stable in first pass:

- existing server actions
- existing draft editor route
- existing Vinted fill endpoint
- existing local JSON storage
- existing extension payload contract

Do not rename internal types during the UI pass.

## Suggested Files

Likely files:

- `components/app/app-top-nav.tsx`
- `app/review/page.tsx`
- `components/app/inventory-page.tsx`
- `lib/inventory/inventory-view-model.ts`
- `lib/inventory/inventory-status.ts`

Optional later files:

- `app/inventory/page.tsx`
- `components/app/inventory-status-badge.tsx`
- `components/app/inventory-row-action.tsx`

## Verification Checklist

Before committing an implementation:

- `corepack pnpm lint`
- `corepack pnpm typecheck`
- desktop browser smoke on `/review`
- mobile-width browser smoke on `/review`
- confirm Workbench-created item appears in Inventory
- confirm item without draft can generate listing
- confirm incomplete listing opens editor
- confirm ready listing can fill Vinted
- confirm filled listing can be marked listed

## Known Tradeoffs

Keeping `/review` as the first Inventory route is imperfect, but avoids route
churn. Add `/inventory` after the UI behavior is proven.

Keeping `/stock` and `/drafts` is also imperfect, but safer. Remove or redirect
duplicate surfaces only after Inventory replaces their daily value.
