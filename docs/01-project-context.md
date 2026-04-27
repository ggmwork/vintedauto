# Project Context

Last updated: 2026-04-27

## Current build target

The current product to build is the Vinted AI Listing Assistant described in `vinted_ai_listing_assistant.md`.

It should be treated as the active implementation target for this repository.

## Future context

`GGM_Admin_Codex_Blueprint.md` is still important context, but only as future product fit.

Current interpretation:

- Vinted assistant is a standalone product first
- later it may become a module, integration, or workflow inside GGM Admin
- GGM Admin is not the current MVP target for this repository

## Product goal

Build a desktop-first tool that reduces the time and friction required to create Vinted listings from product photos.

The product should help the user:

- upload product photos
- organize those photos into per-item drafts
- generate title, description, tags, and condition-aware copy
- suggest a price or price range
- keep listing drafts organized
- move the final draft into Vinted with minimal manual work

## Important constraint

The tool should not depend on direct Vinted publishing automation for MVP success.

The safer and more stable workflow is:

1. Photos in
2. Draft created
3. Text and price suggested
4. User reviews and edits
5. Copy to Vinted or autofill Vinted web in browser

## Desktop-only decision

The product should work on desktop only for the first version.

That means:

- main app is a desktop web app
- Vinted target is the Vinted website in desktop browser
- no native mobile app support in MVP
- no mobile automation requirements in MVP

## Product positioning

The product should be positioned as a Vinted-first listing workspace, not a broad seller automation bot.

That means prioritizing:

- listing quality
- speed of draft creation
- clean inventory/draft management
- safe browser-based workflow

And avoiding in MVP:

- auto reposting
- automated buyer messaging
- smart offer bots
- bulk account growth hacks
- risky account-to-account cloning workflows

## Why this matters

The market already has many Vinted automation tools. Competing head-on on risky automation is harder, less stable, and more likely to create platform enforcement problems.

The current opportunity is a cleaner, lower-risk product:

- strong AI listing generation
- strong draft organization
- strong review/export flow
- optional browser autofill for Vinted web

## Success definition for early product

The first useful version succeeds when a desktop user can:

- upload images for an item
- receive a usable draft with title, description, and price suggestion
- keep that draft organized for later edits
- transfer the draft into Vinted web materially faster than manual typing
