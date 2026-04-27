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

### Candidate 3 - Grouping UI

Value:

- very high

Why:

- manual organization is one of the biggest time costs

Risk:

- medium

### Candidate 4 - Batch generation queue

Value:

- high

Why:

- removes repeated manual triggering

Risk:

- medium

### Candidate 5 - Seller presets

Value:

- high

Why:

- productizes the repeated custom prompt

Risk:

- low

### Candidate 6 - Review queue

Value:

- high

Why:

- makes repetitive listing cleanup much faster

Risk:

- low to medium

### Candidate 7 - Google Drive integration

Value:

- medium

Why:

- fits current user behavior

Reason not first:

- more auth complexity
- likely slower to ship than local folder import
- user may already have local Drive sync

### Candidate 8 - Vinted browser autofill

Value:

- medium to high

Why:

- reduces final handoff friction

Reason not first:

- intake and grouping still offer higher leverage right now

## Recommended immediate build order

If choosing the next feature set now, build in this order:

1. studio sessions
2. batch import from local folder or large multi-select
3. grouping workflow
4. batch generation queue
5. review queue

## Important open questions

These should be decided before the next implementation cycle starts.

### 1. Import source

First support should be:

- local folder import
- or large multi-file upload only
- or both

Recommendation:

- local folder import first

### 2. Grouping strategy

Should grouping start as:

- manual only
- assisted manual
- or auto-group by default

Recommendation:

- assisted manual first

### 3. AI provider strategy

Should batch generation use:

- Ollama only
- OpenAI only
- provider switch

Recommendation:

- keep provider abstraction
- use Ollama-first locally
- keep OpenAI ready as next provider

### 4. Publish target

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
