# Code Quality Baseline

Last updated: 2026-05-08

## What This Project Is

Vinted Auto is a desktop-first Vinted listing assistant for seller operations.

Current workflow:

`watched folder -> Inbox grouping -> Stock items -> AI listing draft -> Review -> Vinted web handoff -> manual submit`

The app is not trying to be an unattended marketplace bot. The safety boundary is explicit:

- organize local product photos
- group photos into stock items
- generate and review listing drafts
- prepare Vinted fields and images
- hand data to Vinted web through a Chrome extension
- keep final publish/manual submit with the user

Avoid:

- private Vinted APIs
- unattended publishing
- automatic reposting
- buyer messaging automation
- cross-account cloning automation

## Current Architecture

Main surfaces:

- Next.js App Router application for Inbox, Stock, Review, Drafts, and AI settings
- local JSON and file storage under `.data`
- local folder watcher for automatic photo intake
- AI provider layer for Ollama, OpenAI, and Anthropic
- grouping layer for photo descriptors and candidate stock clusters
- Chrome Manifest V3 extension for Vinted create-listing autofill

Core data spine:

`studio session -> photo asset -> stock item -> draft -> Vinted handoff`

Important app boundaries:

- `app/actions.ts` owns most server-side user workflows
- `lib/intake` owns session, photo, stock, and local photo asset persistence
- `lib/drafts` owns draft persistence and review queue state
- `lib/grouping` owns descriptor extraction and auto-grouping logic
- `lib/ai` owns provider routing and listing generation
- `lib/vinted` owns Vinted profile schema, payloads, and extension bridge contracts
- `extension` owns Vinted page detection, DOM filling, image relay, popup, and service worker state

## Verification

Passed on 2026-05-08:

- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm build`

Environment gaps seen during analysis:

- `rtk` is referenced by repo instructions but is not available on PATH in this shell.
- `pnpm` is not available directly on PATH; `corepack pnpm ...` works.

## Quality Strengths

- Strict TypeScript is enabled.
- Lint, typecheck, and production build pass.
- Product boundaries are well documented in `docs/`.
- Vinted handoff payload is versioned.
- Manual final submit boundary is preserved.
- AI provider code has a clean routing layer.
- Vinted extension reports field-level diagnostics instead of one generic failure.
- Local prototype data is ignored by git.

## Main Quality Risks

### No automated tests

There are no unit, integration, or extension tests in the repo. Current safety depends on TypeScript, lint, build, docs, and manual smoke tests.

Recommended first tests:

- pure unit tests for `lib/vinted/listing-profile.ts`
- pure unit tests for `lib/vinted/handoff.ts`
- repository normalization tests for `.data` migrations
- extension adapter tests with static Vinted DOM fixtures

### Server actions are too concentrated

`app/actions.ts` is over 1,400 lines and owns many unrelated workflows: watcher settings, inbox grouping, stock operations, draft generation, review saves, status changes, image upload, and AI settings.

Recommended split:

- `app/actions/inbox-actions.ts`
- `app/actions/stock-actions.ts`
- `app/actions/draft-actions.ts`
- `app/actions/ai-settings-actions.ts`
- shared parsing and redirect helpers in a small internal module

Do this only when touching those areas. Avoid a large refactor with no behavior change unless tests are added first.

### Local JSON writes are not atomic

Drafts, studio sessions, watcher state, and AI settings write whole JSON files directly. That is acceptable for a single-user local prototype, but concurrent server actions or process interruption can corrupt or lose data.

Recommended next hardening:

- centralize local JSON persistence in one helper
- write to a temp file, then rename
- serialize writes per file
- include backup/read-repair behavior for malformed JSON

### Extension logic is large and hard to test

The Vinted adapter and service worker contain the most operational fragility because they depend on Vinted DOM behavior and Chrome message limits.

Recommended next hardening:

- keep selectors inside the adapter
- add DOM fixture tests for page detection and field matching
- keep popup diagnostics visible
- document every market-specific override before adding it

### Secrets are local prototype grade

OpenAI and Anthropic keys can be stored in `.data/ai-settings.json`. This is okay for a local-only prototype with ignored data, but not for hosted or multi-user deployment.

Recommended before hosted use:

- move secrets to provider-managed secret storage
- avoid returning secret presence through broad app state
- document local secret storage clearly in setup docs

## Current Best Next Step

Do not widen scope yet.

Best quality-focused next step:

1. Add tests around Vinted profile resolution and handoff payload generation.
2. Add extension DOM fixture tests for the supported PT create-listing page.
3. Centralize atomic JSON persistence after the first tests exist.

That sequence protects the most fragile contract before refactoring the app around it.
