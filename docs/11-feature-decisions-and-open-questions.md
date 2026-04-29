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

### Keep manual final submit as a hard boundary

Reason:

- reduces platform risk
- still removes most listing friction
- fits the desired extension-assisted workflow

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

### Focus the next cycle on Vinted web autofill

Reason:

- this is now the main user priority
- it reduces the largest remaining publish friction
- it can be done without crossing into unattended automation

### Add internal multi-account management

Reason:

- seller wants to manage more than one Vinted account
- internal account context is useful even without risky cross-account automation
- stock, queues, and performance should be separable by account

### Add orders and profit tracking

Reason:

- seller workspace should track what sold and what was profitable
- finance visibility is core operational value, not extra reporting

### Use API providers, not consumer chat products

Reason:

- backend integration needs stable API auth
- provider switching should be built around server-side keys
- consumer ChatGPT / Claude access is not the right backend contract

## Recommended next feature candidates

### Candidate 1 - Chrome extension autofill

Value:

- very high

Why:

- removes the biggest remaining friction on Vinted web
- preserves manual final review
- creates the base for account-aware publishing

Risk:

- medium

### Candidate 2 - Shared handoff payload

Value:

- very high

Why:

- keeps app and extension aligned
- reduces future integration churn

### Candidate 3 - Multi-account management

Value:

- very high

Why:

- required for internal control over multiple Vinted accounts
- unlocks per-account queues and presets

Risk:

- medium

### Candidate 4 - Orders and stock admin

Value:

- very high

Why:

- connects listings to real sales operations
- supports later finance tracking

Risk:

- medium

### Candidate 5 - Profit tracking

Value:

- high

Why:

- makes the app operationally meaningful
- shows what accounts and items actually work

Risk:

- medium

### Candidate 6 - CSV export

Value:

- high

Why:

- makes the data usable outside the app

Risk:

- low

### Candidate 7 - Selected safe operations modules

Value:

- medium to high

Why:

- quick replies, label helpers, and order filters are useful follow-ons

Reason not first:

- extension and core admin layers are higher leverage

### Candidate 8 - Multi-provider AI foundation

Value:

- high

Why:

- current app is still Ollama-first
- model switching is now an explicit requirement
- different tasks should be able to use different providers

Reason not first:

- extension handoff remains the main product priority
- but this can be built as a cross-cutting technical foundation in parallel

## Recommended immediate build order

If choosing the next feature set now, build in this order:

1. shared handoff payload
2. Chrome extension autofill
3. multi-provider AI foundation
4. multi-account management
5. orders and stock admin
6. profit tracking
7. CSV export

## Important open questions

These should be decided before the next implementation cycle starts.

### 1. Extension boundary

Should the extension:

- only fill visible fields
- fill fields plus upload images
- or try to publish too

Recommendation:

- fill fields plus upload images
- manual final submit only

### 2. Account model

Should one stock item be:

- assigned to one primary account
- or linked to multiple account contexts

Recommendation:

- one primary target account first
- multi-account references later only if needed

### 3. Orders data capture

Should orders start as:

- manual entry
- semi-manual entry
- or scraped extension-assisted capture

Recommendation:

- manual or semi-manual first
- extension-assisted capture later

### 4. Profit model depth

Should finance start as:

- simple item P&L
- or full accounting logic

Recommendation:

- simple item and account P&L first

### 5. AI provider strategy

Should batch generation use:

- Ollama only
- OpenAI only
- provider switch

Recommendation:

- keep provider abstraction
- use Ollama-first locally
- keep OpenAI ready as next provider

### 6. Export depth

Should export start as:

- CSV only
- CSV plus Google Sheets

Recommendation:

- CSV first
- Sheets later if really needed

### 7. Provider routing mode

Should provider switching start as:

- one global provider selector
- or task-based provider routing

Recommendation:

- task-based routing
- separate `listing` and `grouping` provider/model settings

## Guidance for future decisions

When deciding what to build next, ask:

1. does it reduce Vinted web publishing friction safely?
2. does it improve internal account control?
3. does it improve stock, orders, or profit visibility?
4. does it keep the human in control for risky actions?
5. does it make repeated listing work faster?

If not, it is probably not the next best feature.
