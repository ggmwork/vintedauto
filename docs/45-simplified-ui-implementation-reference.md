# Simplified UI Implementation Reference

Last updated: 2026-05-17

## Purpose

This file turns the simplified UX plan into concrete component guidance. Use it
while editing the UI so implementation stays focused.

## Current File Map

Primary UI files:

- `components/app/app-top-nav.tsx`: primary navigation.
- `components/app/inbox-page.tsx`: current default page and future Workbench base.
- `components/app/stock-workspace-page.tsx`: item card behavior and generation actions.
- `components/app/draft-detail-page.tsx`: listing review sequence.
- `components/app/draft-export-panel.tsx`: Vinted fill and fallback copy actions.
- `components/app/ai-settings-page.tsx`: provider configuration.
- future `components/app/inventory-page.tsx`: unified item/listing management surface.

Routes:

- `app/page.tsx`: default Workbench route, currently Inbox.
- `app/stock/page.tsx`: current Stock route.
- `app/review/page.tsx`: queue-driven review route.
- `app/settings/ai/page.tsx`: AI settings route.
- `app/drafts/page.tsx`: secondary draft list.
- `app/drafts/[draftId]/page.tsx`: direct draft detail.

## Navigation Reference

Target labels:

- `Workbench`
- `Inventory`
- `Settings`

Suggested route mapping for first pass:

- `Workbench` -> `/`
- `Inventory` -> `/review` for the first pass
- `Settings` -> `/settings/ai`

Keep `/stock` and `/drafts` reachable as compatibility routes until their useful
parts are merged, redirected, or renamed.

Do not rename data types yet. UI labels can change before code nouns do.

## Workbench Layout

Recommended first viewport:

1. Header row:
   - Title: `Workbench`
   - Subtitle: `Turn photos into Vinted listings.`
   - Primary action depends on state.
2. Folder strip:
   - Status: watching, paused, error, or needs setup.
   - Compact folder path.
   - Actions: `Scan photos`, `Change folder`.
   - Advanced disclosure for watcher details.
3. Main work area:
   - Left: photos needing grouping.
   - Right: item/listing queue or next action list.

Do not lead with:

- Last start.
- Last event.
- Last import.
- Imported files.
- Scan summary.
- Grouping notes.

Those can stay in `Advanced`.

## Workbench Components

Candidate components to extract only if useful:

- `FolderStatusStrip`
- `PhotoSelectionGrid`
- `ItemActionCard`
- `AdvancedWatcherDetails`

Avoid creating a component if the first implementation is clearer inline.

## Item Card Reference

Each item card should show:

- Cover image.
- Item name.
- Photo count.
- Readiness or missing reason.
- One primary action.

Primary action decision:

- No draft: `Generate listing`.
- Draft exists and incomplete: `Review listing`.
- Draft exists and ready: `Fill on Vinted`.
- Needs item correction: `Fix item`.

Secondary actions:

- Rename.
- Set cover.
- Move photos.
- Remove item.

Put secondary actions in `Edit item` or `Advanced`.

## Listing Review Reference

Use [54-inventory-management-ux-plan.md](./54-inventory-management-ux-plan.md)
and [55-inventory-management-reference.md](./55-inventory-management-reference.md)
for the Inventory page that replaces the queue-first `/review` surface.

Keep existing four-step model internally:

- Step 1: images.
- Step 2: generation.
- Step 3: listing fields.
- Step 4: Vinted fill.

Simplified display:

- Show current incomplete step expanded.
- Show completed steps as compact summaries.
- Keep sticky summary but make it action-led.
- Put generation history under advanced details.
- Put draft ID and raw metadata under advanced details.

Draft readiness should use plain labels:

- `Add photos`
- `Generate listing`
- `Complete title`
- `Complete description`
- `Add price`
- `Choose category`
- `Choose condition`
- `Complete Vinted fields`

## Export Reference

Primary action:

- `Fill on Vinted`

Secondary actions:

- `Copy fallback`
- `Copy full package`
- `Copy JSON`
- `Copy title`
- `Copy description`
- `Copy price`

Default display:

- Handoff state in one short line.
- Fill button.
- Missing fields if blocked.

Advanced display:

- Selector diagnostics.
- Autofill JSON.
- Full handoff preview.
- Individual field copy buttons.

## Settings Reference

Settings should absorb low-frequency controls:

- Folder setup.
- AI presets.
- Provider credentials.
- Extension diagnostics.
- Debug details.

First pass can keep `/settings/ai`, but nav label should be `Settings`.

AI settings priority:

1. Presets.
2. Current routing.
3. Connection tests.
4. Advanced provider details.

## Visual Direction

Keep it utilitarian and calm:

- Dense enough for repeated seller work.
- Fewer full cards.
- Stronger section hierarchy.
- Compact status strips.
- One primary button per work block.
- Use icons only where they reduce scanning cost.

Avoid:

- Marketing-style hero sections.
- Decorative visuals.
- Many equal-weight cards.
- Repeating explanatory paragraphs.
- Debug language in first-level copy.

## Migration Checklist

Use this order:

1. Rename visible nav labels.
2. Simplify `/` header and folder strip.
3. Collapse watcher details.
4. Make photo grouping the dominant Workbench task.
5. Add item action cards or simplify existing Stock cards.
6. Reduce draft export panel to one primary action.
7. Collapse draft advanced sections.
8. Move AI label under Settings.
9. Replace queue-first `/review` with Inventory table/card management.
10. Run lint and typecheck.
11. Browser-smoke desktop and mobile widths.

## Verification Checklist

Before committing UI implementation:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` if behavior changed
- Browser check at desktop width
- Browser check at mobile width
- Confirm one primary action per screen state
- Confirm manual Vinted submit boundary remains visible

## Risk Register

Risk: Hiding debug info may make maintenance harder.

Mitigation:

Keep advanced disclosures and diagnostics reachable from Settings or export
advanced sections.

Risk: Renaming UI nouns may conflict with existing route names.

Mitigation:

Change visible labels first. Keep route names until a later cleanup.

Risk: Moving Stock behavior into Workbench may create a large diff.

Mitigation:

Start by simplifying presentation. Merge routes only after first simplified
workbench passes smoke testing.
