# Stack and Architecture

Last updated: 2026-04-27

## Recommended stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

### Storage and backend

- Supabase
  - Postgres
  - Storage
  - Auth if needed later

### AI

- provider abstraction
- Ollama for local-first development
- OpenAI API as higher-quality and hosted provider later

### Deployment

- Vercel for main app

### Optional companion

- Chrome extension for Vinted web autofill

## Why this stack

The original Vinted specification already points in this direction, and it matches the current product shape well.

Reasons:

- Next.js is a good fit for desktop-first product UI
- TypeScript keeps draft, image, and generation flows typed
- Tailwind and shadcn/ui are fast for shipping polished workflow UI
- Supabase gives storage and relational draft metadata without extra backend ceremony
- Vercel is straightforward for this class of app

## Architecture principle

Keep the app split into two surfaces:

1. Main application
2. Optional browser autofill extension

The main application should own:

- studio sessions
- draft records
- uploaded images
- grouping workflow
- batch generation queue
- structured item metadata
- AI generation
- price suggestion
- draft history
- user-facing review flow

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
Next.js App
  ->
Supabase Postgres + Storage
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

## Data model direction

### studio_sessions

Suggested fields:

- id
- name
- import_source
- status
- photo_count
- created_at
- updated_at

### drafts

Suggested fields:

- id
- status
- title
- description
- bullet_points
- hashtags
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

This is optional early, but useful if prompt iteration becomes important.

## Price suggestion strategy

For MVP, treat pricing as guidance, not as exact valuation.

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
  pricing/
  drafts/
  storage/
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

The right first architecture is:

- Next.js desktop web app first
- Supabase for persistence and storage
- provider abstraction for listing generation
- Ollama-first locally, OpenAI-ready later
- optional Chrome extension after core app is useful on its own
