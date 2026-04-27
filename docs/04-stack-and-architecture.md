# Stack and Architecture

Last updated: 2026-04-27

## Recommended stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

### Local companion

- Node.js watcher service
- shared TypeScript types where useful

### Storage and backend

- local `.data` store for current prototype
- Supabase later
  - Postgres
  - Storage
  - Auth if needed later

### AI

- provider abstraction
- Ollama for local-first development
- OpenAI API as higher-quality and hosted provider later

### Deployment

- Vercel for main app later

### Optional companion

- Chrome extension for Vinted web autofill later

## Why this stack

The product now needs two different things:

1. a strong desktop UI
2. true local folder watching

Next.js is still the right UI surface.

A small Node.js watcher companion is the simplest way to add automatic ingest without changing the whole app platform.

## Architecture principle

Keep the product split into three surfaces:

1. Main application
2. Local watcher companion
3. Optional browser autofill extension

The main application should own:

- watched-folder configuration
- Inbox
- photo assets
- stock items
- draft records
- structured item metadata
- AI generation
- price suggestion
- draft history
- user-facing review flow

The local watcher companion should own only:

- monitoring one configured local folder
- detecting new files after a short debounce
- ignoring partially written files until stable
- copying files into managed app storage
- emitting ingest status

The extension, if built, should own only:

- reading chosen draft from app context or API
- opening Vinted listing page
- filling supported fields in Vinted web
- optional image upload assistance

Do not let the extension become the main product surface.

## Recommended system model

```txt
Desktop User
  ->
Watched folder
  ->
Local watcher companion
  ->
Managed app storage + local metadata store
  ->
Next.js app
  ->
AI provider layer
  -> Ollama
  -> OpenAI

Optional later:

Desktop User on Vinted Web
  ->
Chrome Extension
  ->
Fetch selected draft from app
  ->
Fill Vinted web form
```

## User-facing model

The UI should move toward:

- `Inbox`
- `Stock`
- `Review`

Optional later:

- `Listed`
- `Archive`
- `Settings`

`Studio sessions` may still exist internally, but should not remain a primary navigation concept.

## Internal data spine

Recommended internal model:

`ingest batch/session -> photo asset -> stock item -> draft`

Important:

- user does not need to see the whole spine
- internal complexity is allowed only if it simplifies the visible workflow

## Data model direction

### ingest_batches or studio_sessions

Keep only if needed internally for traceability.

Suggested fields:

- id
- internal_name
- import_source
- status
- photo_count
- created_at
- updated_at

### photo_assets

Suggested fields:

- id
- ingest_batch_id
- stock_item_id
- storage_path
- original_filename
- relative_path
- imported_at
- sort_hint
- group_status
- width
- height
- created_at

### stock_items

Suggested fields:

- id
- ingest_batch_id
- status
- title_hint
- cover_photo_asset_id
- grouping_confidence
- condition
- brand
- category
- storage_location
- notes
- created_at
- updated_at

### drafts

Suggested fields:

- id
- stock_item_id
- status
- title
- description
- keywords
- suggested_price
- suggested_price_min
- suggested_price_max
- price_rationale
- brand
- category
- size
- condition
- color
- material
- notes
- created_at
- updated_at

### draft_images

Suggested fields:

- id
- draft_id
- storage_path
- sort_order
- original_filename
- created_at

### generation_runs

Suggested fields:

- id
- draft_id
- prompt_version
- model
- generated_title
- generated_description
- generated_price
- created_at

## Watched-folder strategy

Recommended v1 behavior:

- watch one configured root folder
- run watcher while app is open
- copy imported files into managed storage
- support folder-per-item as the strongest automatic grouping mode
- send loose files to Inbox when grouping is uncertain

## Price suggestion strategy

For MVP and the next cycle, treat pricing as guidance, not as exact valuation.

Recommended output shape:

- suggested price
- suggested range
- short rationale
- confidence level if useful

Do not block the product on deep pricing intelligence before launch.

## File organization recommendation

```txt
app/
components/
lib/
  ai/
  intake/
  pricing/
  stock/
  drafts/
  storage/
watcher/
types/
docs/
public/
```

## Security and policy boundary

Keep the product on the safer side of platform risk.

Recommended boundaries:

- no direct dependency on Vinted private APIs
- no required auto-publish flow
- no relisting automation in MVP
- no buyer messaging automation in MVP
- no multi-account transfer workflows in MVP

## Browser extension boundary

If extension is added, keep it narrow.

Allowed direction:

- load chosen draft
- fill title
- fill description
- fill price
- possibly upload images

Avoid extension scope creep into:

- inbox management
- auto offers
- auto relisting
- order bots
- cross-account cloning

## Recommendation summary

The right architecture now is:

- Next.js desktop web app for UI
- local watcher companion for true watched-folder ingest
- Supabase later for durable persistence and storage
- provider abstraction for listing generation
- Ollama-first locally, OpenAI-ready later
- user-facing model of `Inbox -> Stock -> Review`
- internal data spine of `ingest batch/session -> photo asset -> stock item -> draft`
- optional Chrome extension only after the core ingest and review workflow feels right
