# Implementation Plan: Vinted Category Phase 3

Last updated: 2026-05-15

## Purpose

Build local taxonomy memory from successful manual corrections and confirmed
auto-fills.

Phase 3 should make repeated product types faster without depending on a frozen
copy of Vinted's full category tree.

## User Outcome

User fixes a category once, then similar future items get better automatic
category choices.

User can still override, edit, disable, or delete learned mappings.

## Files To Change

New or expanded app domain:

- `types/vinted-category-memory.ts`
- `lib/vinted/category-memory.ts`
- `lib/vinted/local-category-memory-repository.ts`
- `app/api/vinted/category-memory/route.ts`

Existing app:

- [lib/vinted/handoff.ts](../lib/vinted/handoff.ts)
- [lib/vinted/listing-profile.ts](../lib/vinted/listing-profile.ts)
- [components/app/draft-vinted-profile-section.tsx](../components/app/draft-vinted-profile-section.tsx)
- settings page or future admin surface

Extension:

- [extension/vinted-content-script.js](../extension/vinted-content-script.js)
- [extension/vinted-form-adapter.js](../extension/vinted-form-adapter.js)
- [extension/service-worker.js](../extension/service-worker.js)

Tests:

- new category memory unit tests
- existing handoff/profile tests

## Memory Record Shape

Candidate:

```json
{
  "id": "memory_123",
  "market": "vinted.pt",
  "enabled": true,
  "source": "user_manual",
  "createdAt": "2026-05-15T00:00:00.000Z",
  "updatedAt": "2026-05-15T00:00:00.000Z",
  "match": {
    "category": "coats & jackets",
    "titleTokens": ["casaco", "militar"],
    "descriptionTokens": [],
    "brand": null
  },
  "categoryPlan": {
    "searchQuery": "Casacos militares e utilitarios",
    "path": ["Homem", "Roupa", "Vestuario de exterior", "Blusoes"]
  },
  "stats": {
    "uses": 3,
    "successes": 3,
    "failures": 0,
    "lastUsedAt": "2026-05-15T00:00:00.000Z"
  }
}
```

Keep memory local and transparent. No hidden global taxonomy.

## Matching Rules

Use conservative matching:

- exact saved draft path beats memory
- manual memory beats inferred profile default
- memory must match market
- memory must match category or enough title tokens
- disabled memory is ignored
- failed live validation reduces confidence

Do not select a memory path blindly. The extension must still validate against
current visible Vinted options.

## Implementation Steps

### 1. Add Repository

Store memory records in local app data, same persistence style as drafts and
sessions.

Required operations:

- list
- get
- create from manual category snapshot
- update stats
- enable or disable
- delete

### 2. Add Resolver Input To Handoff

Handoff payload can include candidate category plans:

```json
{
  "listing": {
    "profile": {
      "categoryPlan": {},
      "candidateCategoryPlans": [
        {
          "source": "draft_manual",
          "confidence": 100,
          "path": []
        },
        {
          "source": "local_memory",
          "confidence": 80,
          "path": []
        }
      ]
    }
  }
}
```

Phase 1 extension resolver can later use this list without knowing repository
details.

### 3. Add Management UI

Minimum UI:

- list learned category mappings
- show source, match text, path, success/failure counts
- disable mapping
- delete mapping

This belongs in settings or an advanced Vinted section, not main workflow.

### 4. Update Stats From Fill Results

When extension selects a memory candidate:

- report candidate id/source in fill result
- app marks success if field filled and no category failure
- app marks failure if visible Vinted options did not match

Manual user correction should create or update memory.

### 5. Keep Manual Override First

If draft has manually saved path, use it first. Memory helps only when draft has
no explicit user override.

## Acceptance Criteria

- Manual category correction can create memory.
- Handoff can include memory candidate plans.
- Extension validates memory candidate against live Vinted options.
- User can disable/delete bad mappings.
- Bad mappings do not keep forcing wrong categories.
- Existing handoff remains backward-compatible when no memory exists.

## Verification

Automated:

```powershell
rtk corepack pnpm lint
rtk corepack pnpm typecheck
rtk corepack pnpm test
```

Manual:

1. create correction from one product type
2. verify memory record appears
3. create similar draft
4. verify handoff includes memory candidate
5. verify extension selects only when live option validates
6. disable memory
7. verify next handoff ignores disabled mapping
