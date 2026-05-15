# Vinted Category Resolver Reference

Last updated: 2026-05-15

## Purpose

Shared technical reference for live category automation.

Use this when changing:

- extension category selection
- Vinted dynamic fields
- handoff payload category data
- manual correction capture
- future local category memory

## Principles

- User has final word.
- Never submit automatically.
- Do not guess when confidence is low.
- Prefer live Vinted options over stale hardcoded catalog data.
- Prefer saved user path over inferred defaults.
- Validate learned paths against the live dropdown before selecting.
- Keep diagnostics detailed enough to repair selectors from one failed fill.

## Resolver Inputs

From app payload:

- `listing.title`
- `listing.description`
- `listing.metadata.category`
- `listing.metadata.brand`
- `listing.profile.categoryPlan`
- future `listing.profile.candidateCategoryPlans`
- images already uploaded to Vinted before resolver runs

From live Vinted page:

- visible suggestion options
- visible category search results
- visible catalog sections
- selected category after click
- newly rendered dynamic fields

## Live Option Shape

Extension should normalize visible options into:

```js
{
  element,
  leaf: "Casacos militares e utilitarios",
  breadcrumb: "Homem > Roupa > Vestuario de exterior > Blusoes",
  path: ["Homem", "Roupa", "Vestuario de exterior", "Blusoes"],
  rawText: "Casacos militares e utilitarios\nHomem > Roupa > Vestuario de exterior > Blusoes",
  source: "suggestion"
}
```

`source` values:

- `suggestion`
- `search_result`
- `catalog_section`
- `unknown`

If source cannot be detected safely, use `unknown`. Scoring can still work from
text.

## Scoring Model

First pass score model:

| Signal | Points |
| --- | ---: |
| exact saved draft path match | 100 |
| exact manual memory path match | 90 |
| exact Vinted suggestion leaf plus app intent match | 80 |
| exact leaf match from app category | 70 |
| all required breadcrumb terms match | 50 |
| strong title token match | 20 |
| brand match where category text includes brand-specific line | 10 |
| weak partial text match | 5 |
| conflicting gender or department | -40 |
| multiple top options within 10 points | ambiguous |

Recommended auto-select threshold:

- score >= 80
- no ambiguity
- option element is visible and clickable

Everything else is skipped for manual review.

## Category Resolution Algorithm

```txt
upload images
wait for suggestions
open category dropdown
read visible suggestions
if saved draft path matches visible option with high confidence:
  select it
else if memory path matches visible option with high confidence:
  select it
else:
  search app category/title candidate
  read visible search results
  score all visible options
  select only if high confidence and no ambiguity
if selected:
  wait for dynamic fields
else:
  mark category skipped with diagnostics
```

## Dynamic Field Algorithm

```txt
after category selected:
  wait
  build fresh page diagnostics
  for each payload profile field:
    if payload value empty:
      skip
    else if visible compatible control exists:
      fill
    else:
      skip and record missing live field
```

Dynamic fields must be resolved after category. Resolving before category is
expected to miss product-specific controls.

## Manual Override Rules

Manual draft path:

- highest priority
- editable in app
- not required
- never overwritten by auto result unless user asks to save current Vinted path

Manual Vinted correction:

- user can change category on Vinted after auto-fill
- extension can read and save current selected category back to app in Phase 2
- saved correction becomes draft path and optional memory seed

Local memory:

- lower priority than draft manual path
- user can disable/delete
- must validate against live options before use

## Diagnostics Contract

When category is skipped or failed, result should include:

- attempted query candidates
- visible option snapshot, top 5 to 10
- score reason for top candidates
- selected path if selected
- ambiguity reason if skipped
- whether suggestions were visible
- delay used after image upload

Example diagnostic detail:

```txt
Skipped category: top options were ambiguous. Query "Casacos" produced
"Casacos militares e utilitarios" score 75 and "Casacos e blusoes" score 72.
Manual category required.
```

## Safety Boundaries

Do:

- fill high-confidence values
- skip uncertain category
- let user edit
- record diagnostics
- keep final submit manual

Do not:

- submit listing
- hide skipped category
- force first visible option when multiple options compete
- assume PT labels stay stable forever
- overwrite user path silently

## Verification Checklist

Automated:

```powershell
rtk node --check extension/service-worker.js
rtk node --check extension/vinted-content-script.js
rtk node --check extension/vinted-form-adapter.js
rtk corepack pnpm lint
rtk corepack pnpm typecheck
rtk corepack pnpm test
```

Manual:

- one clothing item with image suggestions
- one non-clothing item with different dynamic fields
- one ambiguous item where resolver must skip
- one manual correction saved back to app once Phase 2 exists
- one learned memory reuse once Phase 3 exists
