# UX Reset And Information Architecture

Last updated: 2026-04-27

## Purpose

This document defines the UI cleanup required after feedback on the current MVP.

## Main verdict

The current app works, but the UX is too noisy.

Main issues:

- too many concepts visible at once
- too much helper text
- too many repeated buttons and links
- too much emphasis on sessions and drafts
- not enough emphasis on automatic flow

## New IA

The app should move toward three primary surfaces:

### 1. Inbox

Job:

- show newly detected photos
- show files being processed
- show items needing grouping help

### 2. Stock

Job:

- show stock items
- show grouped photos
- allow grouping corrections
- allow generation or ready state transitions

### 3. Review

Job:

- process generated listing output quickly
- save and next
- copy and next
- mark ready

## De-emphasized surfaces

These should become secondary or internal:

- Sessions
- Draft list as a primary home page
- Large multi-step explanatory pages

## Copy rules

### Use less text

- one short paragraph per page is enough
- avoid repeated explanations of the same workflow
- avoid phase labels that explain internal implementation order

### Use fewer badges

Badges should exist only when they help with:

- status
- queue counts
- missing action

Do not use badges just to decorate structure.

### Remove repeated nav clutter

The same cluster of links should not appear on every page unless it is truly needed.

Prefer one stable top-level navigation model.

## Page-level recommendations

### Inbox

Should contain:

- watcher status
- watched folder path
- new files or items
- ingest issues needing attention

Should not contain:

- session management language
- large dashboard metrics
- long onboarding text

### Stock

Should contain:

- stock items
- photo grouping state
- quick corrections
- simple status

Should not contain:

- session-first terminology
- repeated navigation blocks on every card
- excessive explanatory text

### Review

Should contain:

- current item
- editable fields
- next and previous
- save and next
- copy and next

Should not contain:

- too many advanced panels in the default view
- large sidebars full of passive status

## Naming guidance

Prefer:

- Inbox
- Stock
- Review
- Ready
- Listed
- Sold

Avoid leading with:

- Session
- Draft detail
- Import batch

Those may still exist internally.

## Draft model guidance

The draft can remain a data model.

The draft should not remain the dominant user-facing concept.

User should mostly feel that they are reviewing an item listing, not editing a technical draft object.

## Recommended cleanup tasks

### Immediate

- hide sessions from top-level navigation
- rename home toward Inbox behavior
- reduce repeated explanatory text
- reduce repeated action links
- simplify page headers
- keep advanced tools collapsed by default

### Next

- merge remaining scattered surfaces into Inbox, Stock, Review
- make Review the main place where listing edits happen
- leave Draft list as secondary or admin/debug surface

## Success criteria

The UX reset is successful if:

- the user can explain the app in one sentence
- the user knows the next action without scanning the whole page
- the app feels quieter and more automatic
- sessions no longer feel like required mental overhead

## Recommendation summary

The app should feel like:

`a quiet operator tool that processes photos into sellable items`

Not:

`a multi-page prototype demonstrating several internal layers`
