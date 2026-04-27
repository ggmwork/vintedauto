# Feature Decisions And Open Questions

Last updated: 2026-04-27

## Purpose

This document exists to keep the next feature decisions grounded.

Not every good idea should be built next.

## Decisions already made

### Keep desktop-first

Reason:

- matches current seller workflow
- lowers implementation complexity
- keeps Vinted target on desktop web

### Keep copy/export as valid success path

Reason:

- already useful
- lower-risk than direct automation
- lets product evolve without depending on fragile publish automation

### Evolve toward automatic ingest workflow

Reason:

- real user pain is intake and organization before generation
- current MVP already proved the review and copy loop

### Remove `studio sessions` from the main UI

Reason:

- they create mental overhead
- they are helpful internally at most
- the seller does not want to manage them directly

### Use `Inbox -> Stock -> Review` as the main IA

Reason:

- simpler and closer to the real workflow
- clearer than exposing sessions, drafts, and stock equally

### Add a local watcher companion

Reason:

- true watched-folder behavior needs local filesystem monitoring
- browser-only flow is not enough for the desired automation

## Recommended next feature candidates

### Candidate 1 - UX and IA reset

Value:

- very high

Why:

- stops the app from getting noisier while automation is added
- removes the wrong mental model before more code locks it in

Risk:

- low

### Candidate 2 - Watched-folder foundation

Value:

- very high

Why:

- removes the manual import step
- gets the app closer to the desired "drop photos and let it run" behavior

Risk:

- medium

### Candidate 3 - Automatic ingest pipeline

Value:

- very high

Why:

- turns watcher events into usable app data
- creates Inbox automatically

Risk:

- medium

### Candidate 4 - Automatic stock creation

Value:

- very high

Why:

- removes more manual organization work
- gives the app a real stock-first behavior

Risk:

- medium

### Candidate 5 - Grouping polish

Value:

- high

Why:

- needed for the weak cases where auto-grouping is not reliable

Risk:

- medium

### Candidate 6 - Seller presets

Value:

- high

Why:

- productizes the repeated custom prompt

Risk:

- low

### Candidate 7 - Vinted browser autofill

Value:

- medium to high

Why:

- reduces final handoff friction

Reason not first:

- ingest and simplification still offer higher leverage right now

## Recommended immediate build order

If choosing the next feature set now, build in this order:

1. UX and IA reset
2. watched-folder foundation
3. automatic ingest pipeline
4. automatic stock creation
5. Stock and Review alignment
6. grouping polish

## Important open questions

These should be decided before the next implementation cycle starts.

### 1. Watcher lifecycle

Should the watcher run:

- only while app is open
- or as a background service

Recommendation:

- while app is open first

### 2. Grouping strategy

Should grouping start as:

- strong auto-grouping for folder-per-item
- loose files into Inbox fallback
- or aggressive flat-file auto-grouping by default

Recommendation:

- folder-per-item automatic grouping first
- loose-file fallback second

### 3. Internal batch model

Should internal session or ingest-batch records:

- stay hidden but exist
- or be removed entirely

Recommendation:

- keep a hidden internal batch model if it helps trace imports
- do not expose it as a primary user concept

### 4. Source file handling

Should the app:

- reference files in the watched folder
- copy them into managed storage
- or move them out of the watched folder

Recommendation:

- copy into managed storage

### 5. Generation timing

Should generation start:

- immediately when files arrive
- after import stabilizes automatically
- or from an explicit Stock action

Recommendation:

- explicit Stock action first
- automatic generation after stable ingest later

### 6. AI provider strategy

Should batch generation use:

- Ollama only
- OpenAI only
- provider switch

Recommendation:

- keep provider abstraction
- use Ollama-first locally
- keep OpenAI ready as next provider

### 7. Publish target

Next handoff step should be:

- copy and next
- Vinted web autofill
- full browser extension

Recommendation:

- copy and next before extension work

## Guidance for future decisions

When deciding what to build next, ask:

1. does it remove a manual import step?
2. does it reduce photo organization overhead?
3. does it simplify the visible workflow?
4. does it help move items faster into Review?

If not, it is probably not the next best feature.
