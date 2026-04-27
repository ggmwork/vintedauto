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

### Evolve toward batch workflow

Reason:

- real user pain is photo intake and organization
- current MVP already proved single-draft generation

## Recommended next feature candidates

### Candidate 1 - Studio sessions

Value:

- very high

Why:

- matches real workflow
- creates proper batch boundary

Risk:

- low

### Candidate 2 - Batch folder import

Value:

- very high

Why:

- cuts import friction immediately
- simpler than Google Drive OAuth

Risk:

- low to medium

### Candidate 3 - Stock workspace

Value:

- very high

Why:

- gives the app a real operational layer
- makes later automation and organization much cleaner

Risk:

- medium

### Candidate 4 - Grouping UI

Value:

- very high

Why:

- manual organization is one of the biggest time costs

Risk:

- medium

### Candidate 5 - Batch generation queue

Value:

- high

Why:

- removes repeated manual triggering

Risk:

- medium

### Candidate 6 - Seller presets

Value:

- high

Why:

- productizes the repeated custom prompt

Risk:

- low

### Candidate 7 - Review queue

Value:

- high

Why:

- makes repetitive listing cleanup much faster

Risk:

- low to medium

### Candidate 8 - Watched folder while app is open

Value:

- high

Why:

- gets closer to automatic intake without full desktop-helper complexity

Reason not first:

- import-folder with explicit start is simpler
- still need stock and grouping workflow first

### Candidate 9 - Google Drive integration

Value:

- medium

Why:

- fits current user behavior

Reason not first:

- more auth complexity
- likely slower to ship than local folder import
- user may already have local Drive sync

### Candidate 10 - Vinted browser autofill

Value:

- medium to high

Why:

- reduces final handoff friction

Reason not first:

- intake and grouping still offer higher leverage right now

## Recommended immediate build order

If choosing the next feature set now, build in this order:

1. studio sessions
2. batch import from local folder
3. stock workspace
4. grouping workflow
5. batch generation queue
6. review queue

## Important open questions

These should be decided before the next implementation cycle starts.

### 1. Import source

First support should be:

- local folder import
- or large multi-file upload only
- or both

Recommendation:

- local folder import first

### 2. Import start mode

Should import start as:

- explicit `Start import` button
- watched folder while app is open
- or full background watcher

Recommendation:

- explicit start first
- watched folder second

### 3. Grouping strategy

Should grouping start as:

- manual only
- assisted manual
- or auto-group by default

Recommendation:

- assisted manual first

### 4. Stock model boundary

Should stock items exist as:

- a lightweight grouping layer only
- or a full inventory/stock record from day one

Recommendation:

- real stock item model from day one
- keep it simple, but make it the durable organizing layer

### 5. AI provider strategy

Should batch generation use:

- Ollama only
- OpenAI only
- provider switch

Recommendation:

- keep provider abstraction
- use Ollama-first locally
- keep OpenAI ready as next provider

### 6. Publish target

Next handoff step should be:

- copy and next
- Vinted web autofill
- full browser extension

Recommendation:

- copy and next before extension work

## Guidance for future decisions

When deciding what to build next, ask:

1. does it remove manual photo or grouping work?
2. does it reduce repeated prompting work?
3. does it make batch review faster?
4. does it help move many listings through the workflow?

If not, it is probably not the next best feature.
