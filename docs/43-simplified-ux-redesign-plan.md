# Simplified UX Redesign Plan

Last updated: 2026-05-11

## Purpose

This is the implementation plan for the next UX phase.

The current app is functionally strong, but it exposes too much system machinery
to the seller. The next phase should make the default experience feel like one
simple workbench:

`photos -> item -> listing -> Vinted fill -> manual submit`

Keep the existing data model and workflows. Simplify what the user sees first.

## Product Decision

Build the Vinted assistant around one primary seller path:

1. Add or detect photos.
2. Create an item from selected photos.
3. Generate a listing.
4. Review the listing.
5. Fill Vinted.
6. Submit manually on Vinted.

Do not widen scope into account admin, orders, profit tracking, CSV export, or
multi-market automation during this phase.

## UX Diagnosis

The app currently overcomplicates the default flow in these ways:

- The first screen gives watcher setup and debug state equal weight with actual
  photo grouping.
- Navigation exposes internal nouns: Inbox, Stock, Review, AI.
- Inbox mixes folder setup, watcher health, loose photos, existing stock
  assignment, and AI suggestions.
- Stock cards expose rename, readiness, Vinted profile, cover selection,
  generation, moving photos, and removal at once.
- Draft detail has a good step model, but all steps and diagnostics are visible
  together.
- Export exposes extension fill, copy fallback, JSON, full package, field copies,
  and selector diagnostics too early.
- AI settings sit in primary navigation even though provider tuning is not a
  daily seller task.

## Target Information Architecture

Primary navigation should become:

- `Workbench`: default page for photos, items, and next listing action.
- `Listings`: generated drafts and review queue.
- `Settings`: folder, AI, extension, and diagnostics.

Internal legacy terms can stay in code for now. The UI should stop making the
seller learn all of them.

## Implementation Strategy

Make the redesign in small, reversible slices.

### Phase 1: Workbench Shell

Goal:

Create a simpler default `/` page without changing storage or server actions.

Scope:

- Rename the visible page concept from Inbox to Workbench.
- Put the current next action at the top.
- Show folder status as a compact strip.
- Move watcher dates, scan summaries, and imported-file counts into an
  `Advanced` disclosure.
- Keep manual grouping as the main visible action.
- Keep AI suggestions available, but make them secondary.

Acceptance:

- A new user can land on `/` and understand where photos go within five seconds.
- The primary action is either `Open folder`, `Scan now`, `Create item`, or
  `Generate listing`.
- Watcher implementation details no longer dominate the first viewport.
- Existing actions still call the same server actions.

Suggested files:

- `components/app/app-top-nav.tsx`
- `components/app/inbox-page.tsx`
- `app/page.tsx`

### Phase 2: Item Cards

Goal:

Make stock/item cards action-led instead of admin-led.

Scope:

- Combine Stock page behavior into the Workbench where possible.
- Present item cards with cover, name, photo count, readiness, and one primary
  action.
- Move rename, set cover, remove, and move photos into an item details area or
  disclosure.
- Use button labels that match seller intent: `Generate listing`, `Open listing`,
  `Fix item`.

Acceptance:

- Each card has one clear primary action.
- Secondary maintenance actions do not compete with the primary action.
- Generated and ungenerated items can be scanned quickly.

Suggested files:

- `components/app/stock-workspace-page.tsx`
- `components/app/inbox-page.tsx`
- shared card component if duplication becomes meaningful

### Phase 3: Listing Review

Goal:

Make draft review feel like one active task, not four stacked panels.

Scope:

- Keep the existing upload/generate/review/export sequence.
- Show the current needed step first.
- Keep completed steps collapsed or summarized.
- Keep queue navigation compact.
- Keep generation history and draft IDs under advanced details.

Acceptance:

- Draft page tells the user exactly what to do next.
- Required fields are surfaced before optional diagnostics.
- `Fill on Vinted` is the dominant export action once ready.

Suggested files:

- `components/app/draft-detail-page.tsx`
- `components/app/draft-export-panel.tsx`
- `app/review/page.tsx`

### Phase 4: Settings Cleanup

Goal:

Move low-frequency controls out of the seller path.

Scope:

- Make Settings the home for folder config, AI config, extension diagnostics,
  and advanced developer/debug info.
- Keep AI settings preset-first.
- Hide provider base URLs, timeouts, and API keys behind advanced sections.
- Remove AI from primary nav label.

Acceptance:

- Main navigation no longer exposes AI tuning as a daily workflow.
- Settings can still support advanced local setup.
- No existing provider configuration behavior is removed.

Suggested files:

- `components/app/ai-settings-page.tsx`
- `app/settings/ai/page.tsx`
- future `app/settings/page.tsx` if needed

## Testing Strategy

Docs-only phase has no automated test requirement.

Implementation phase should use focused checks:

- Run `pnpm lint` after UI edits.
- Run `pnpm typecheck` after route/component changes.
- Run `pnpm test` if server actions, repositories, Vinted payloads, or readiness
  logic change.
- Add tests only when behavior changes, not for pure layout movement.

Manual smoke path:

1. Start at `/`.
2. Confirm watched folder status is visible but not dominant.
3. Add or scan photos.
4. Create item from selected photos.
5. Generate listing.
6. Review required fields.
7. Fill on Vinted.
8. Confirm manual submit boundary remains clear.

## Non-Goals

Do not do these in this phase:

- Replace local JSON storage.
- Rewrite server actions.
- Add account admin.
- Add orders or finance.
- Add CSV export.
- Add private Vinted API automation.
- Remove the manual Vinted submit boundary.
- Build a broad design system before the first simplified flow works.

## Definition Of Done

The phase is done when:

- `/` works as a seller workbench.
- Navigation uses seller terms, not internal pipeline terms.
- One primary action is obvious on each screen.
- Debug details are still available, but not first-level UI.
- Existing workflows keep working.
- Lint and typecheck pass.
- The browser flow is manually smoke-tested on desktop and mobile widths.
