# Vinted Extension Research

Last updated: 2026-04-29

## Purpose

This document captures the current research baseline for the Vinted extension MVP.

The goal is simple:

`prepare listing in app -> fill Vinted web form from extension -> user reviews -> user submits`

## Main conclusion

The right extension strategy is:

- Chrome Manifest V3
- browser-extension productivity tool
- no private Vinted API usage
- no unattended publish
- app remains source of truth
- extension only handles page detection, payload fetch, field fill, and image upload

## Why this is the right boundary

Vinted's current terms explicitly ban external software tools such as bots, scrapers, crawlers, and spiders unless allowed by Vinted.

That means the safest credible position is:

- automate form filling inside the browser
- keep manual final submit required
- avoid server-side or private-API posting

## What safer market examples are doing

The safer browser-productivity pattern already exists in the market.

Observed patterns:

- AutoLister positions itself as a browser productivity tool and explicitly contrasts itself with private-API automation
- SharkScribe positions its extension as opening the Vinted form and filling title, description, and images
- Dotb proves that extension + dashboard workflows are commercially viable, but Dotb also goes further into riskier automation buckets that we should not copy

## What we should copy

Build now:

- extension-triggered form fill
- image upload
- review before submit
- app-side draft queue
- app-side account context

Do not build in this phase:

- auto messaging
- smart negotiation
- auto reposting
- cross-account cloning
- unattended publish

## Chrome extension technical baseline

The extension should use:

- Manifest V3
- extension service worker
- content script on Vinted listing pages
- `chrome.storage` for lightweight local settings and handoff state
- message passing between service worker, popup, and content script
- host permissions for Vinted domains and the local app origin

## Recommended simple product shape

### App

The app should:

- prepare one stable Vinted handoff payload
- know which listing is current
- know target account context
- expose payload for extension retrieval

### Extension

The extension should:

- detect when the current tab is a supported Vinted listing page
- fetch the latest handoff payload from the app
- fill text fields
- set structured fields
- upload ordered images
- stop before publish

### User

The user should:

- click `Fill on Vinted`
- land on the Vinted create or edit listing page
- confirm images and fields
- click publish manually

## Important reality

"Works perfectly with Vinted" is not a one-time implementation outcome.

Vinted is a logged-in web app and its DOM can change.

So the real engineering target is:

- simple architecture
- minimal moving parts
- isolated site adapter
- fast recovery when selectors drift

That is how we get a reliable extension in practice.

## Product constraints that matter

### 1. Keep extension logic narrow

The extension should not become a second application.

It should stay focused on:

- tab detection
- payload retrieval
- DOM fill
- upload
- status feedback

### 2. Keep app as source of truth

The app owns:

- listing data
- image ordering
- stock linkage
- account context
- queue workflow

### 3. Avoid deep site coupling in the first pass

The first version should target:

- one Vinted market you actually use first
- one create-listing path
- one edit-listing path later if needed

Do not over-generalize to every market and every page variant immediately.

## Recommended MVP success criteria

The extension MVP is successful when:

- it can detect the supported Vinted listing page
- it can fetch the current handoff payload from the app
- it can fill title, description, price, and core structured fields
- it can upload ordered images
- it leaves final submit to the user
- the app can continue the queue after fill

## Research sources

- Vinted terms and safety boundary
- Chrome Manifest V3 content scripts, messaging, storage, service workers, tabs, and host-permission docs
- safer market examples:
  - AutoLister
  - SharkScribe
  - Dotb docs
