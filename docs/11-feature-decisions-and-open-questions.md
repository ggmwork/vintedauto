# Feature Decisions And Open Questions

Last updated: 2026-04-28

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

### Make grouping automatic, not only assisted

Reason:

- current app still leaves too much manual work after ingest
- the real target flow requires photo clustering into stock items
- watched ingest alone is not enough

### Keep both automatic grouping and manual grouping

Reason:

- automatic grouping removes obvious work
- manual grouping is still required for ambiguous batches
- the product should optimize for trust, not fake full autonomy

### Fix ingest reliability before adding more grouping sophistication

Reason:

- current watched-folder trigger is the weak point
- grouping quality work is hard to evaluate if ingest itself is unreliable
- product trust depends on reliable intake first

## Recommended next feature candidates

### Candidate 1 - Ingest reliability

Value:

- very high

Why:

- fixes the actual foundation that is currently failing
- makes watched-folder automation trustworthy

Risk:

- low

### Candidate 2 - Ingest observability

Value:

- very high

Why:

- shows whether import and grouping really ran
- removes silent failure

Risk:

- medium

### Candidate 3 - Manual grouping tools

Value:

- very high

Why:

- makes uncertain cases cheap to fix
- supports the correct hybrid product shape

Risk:

- medium

### Candidate 4 - Stronger automatic grouping

Value:

- very high

Why:

- improves clustering quality after the ingest path is dependable
- makes flat-folder batches more usable

Risk:

- medium

### Candidate 5 - Dedicated local watcher companion later

Value:

- medium to high

Why:

- likely the right long-term architecture
- not required before a reliable polling-based fix

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

1. ingest reliability
2. ingest observability
3. manual grouping tools
4. stronger automatic grouping
5. batch evaluation
6. dedicated local watcher later

## Important open questions

These should be decided before the next implementation cycle starts.

### 1. Ingest trigger model

Should the next reliable solution use:

- automatic polling/scan in app
- or a dedicated local watcher service first

Recommendation:

- automatic polling/scan first
- dedicated local watcher later if still needed

### 2. Grouping strategy

Should grouping start as:

- fully automatic only
- or hybrid automatic plus manual correction

Recommendation:

- hybrid automatic plus manual correction
- keep folder-per-item as strongest signal
- use confidence-based clustering for flat-folder batches

### 2.5. Clustering method

Should grouping use:

- one large AI call over the whole batch
- or one descriptor pass per image plus clustering in code

Recommendation:

- descriptor pass per image
- clustering and thresholds in code

Reason:

- easier to debug
- easier to tune
- safer than opaque batch grouping

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

1. does it make watched-folder ingest more reliable?
2. does it reduce photo organization overhead?
3. does it keep ambiguous cases fast to correct?
4. does it simplify the visible workflow?
5. does it help move items faster into Review?

If not, it is probably not the next best feature.
