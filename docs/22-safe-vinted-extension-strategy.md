# Safe Vinted Extension Strategy

Last updated: 2026-04-28

## Purpose

This document resets the next product direction.

The main future focus is no longer automatic watched-folder loading.

The main future focus is:

`reviewed desktop workflow -> Chrome extension autofill -> user submits on Vinted web`

## Product position

The app should become:

- seller workspace
- listing preparation system
- stock and account management layer
- Vinted web autofill assistant

Not:

- unattended bot
- private API publisher
- auto-message engine
- repost bot

## Core workflow

Target flow:

1. create or prepare stock item inside the app
2. generate and review listing content
3. choose target Vinted account
4. send listing payload to Chrome extension
5. extension opens or attaches to Vinted web form
6. extension fills form fields and uploads images
7. seller reviews everything
8. seller manually submits

## Safety boundary

The safety boundary is strict:

- no private Vinted API calls
- no background publishing
- no unattended listing submission
- no automated buyer messaging
- no auto-negotiation
- no auto-reposting
- no cross-account cloning workflow

The extension should behave like a browser productivity tool:

- fill fields
- upload images
- keep the human in control for final submit

## Why this direction

Reasons:

- matches current user preference
- reduces publish friction without jumping into high-risk automation
- keeps product useful even if deeper automation remains risky
- aligns better with the safer browser-extension products already in market

## User-facing IA

Primary sections should evolve toward:

- `Stock`
- `Review`
- `Accounts`
- `Orders`
- `Profit`

The app should stop centering watched-folder concepts in the primary UI.

## Technical boundary

Keep one shared listing payload as the contract between app and extension.

That payload should include:

- title
- description
- keywords
- price
- category
- brand
- size
- condition
- color
- material
- notes
- ordered images
- target account id

## Success criteria

This direction is successful when:

- seller can prepare a listing inside the app
- seller can choose a target account
- extension can fill the Vinted web form reliably
- seller still clicks publish manually
- no risky hidden automation is required
