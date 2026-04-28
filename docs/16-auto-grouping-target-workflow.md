# Auto-Grouping Target Workflow

Last updated: 2026-04-28

## Purpose

This document defines the next product target after watched-folder ingest is working.

The missing automation is not ingest anymore.

The missing automation is:

- grouping imported photos into items
- creating stock items automatically
- only asking the seller for help when grouping confidence is low

## Target workflow

The desired workflow is:

1. seller takes photos
2. seller pastes them into one watched folder
3. app imports them automatically
4. app tries to cluster the photos into item groups
5. app creates stock items automatically from those groups
6. only uncertain cases go to manual correction
7. seller reviews and copies to Vinted later

## What is wrong with the current version

Current version only automates two cases well:

- watched-folder ingest
- folder-per-item grouping

Current version does not yet solve:

- flat-folder photo grouping
- mixed batches where multiple products are dropped together
- automatic stock creation from image similarity

That is why the app still feels partially manual.

## New product requirement

The product must stop depending on folder structure as the main grouping signal.

Folder structure can remain a strong hint.

But the app now needs to use image understanding to answer:

- which photos belong to the same product
- which photos are just alternate angles of one item
- which photos are uncertain and need seller confirmation

## Product rule

The app should prefer:

- automatic grouping when confidence is high
- manual review only when confidence is low

It should avoid:

- forcing the seller to group obvious cases manually
- pretending uncertain cases are solved

## User-facing behavior

### Best case

Seller pastes 20 photos from 5 items.

App:

- imports them
- clusters them into 5 groups
- creates 5 stock items
- sends them to Stock

Seller does not touch grouping at all.

### Mixed-confidence case

Seller pastes 20 photos from 5 items, but 4 photos are ambiguous.

App:

- creates 4 high-confidence stock items automatically
- leaves 1 uncertain cluster in Inbox
- shows clear correction action

Seller only fixes the uncertain group.

### Wrong-case rule

If the app is not confident, it should not silently create a wrong stock item.

Wrong automatic grouping is more expensive than asking for help.

## Operational model

User-facing flow should stay:

- `Inbox`
- `Stock`
- `Review`

But Inbox now needs two internal lanes:

- `auto-grouping in progress`
- `needs grouping review`

Stock should represent:

- confirmed item groups
- whether draft generation exists yet

## Important product decisions

### Decision 1

Auto-grouping should run after ingest stabilizes.

Do not try to group while files are still being copied.

### Decision 2

Grouping confidence must be explicit in the internal model.

This is needed for safe automation and later quality tuning.

### Decision 3

Stock items created automatically should still be editable by the seller.

Automation reduces work.

It does not remove correction tools.

## Recommendation summary

The next real automation milestone is:

`watched folder -> ingest -> cluster photos into items -> create stock items -> only uncertain cases need help`

That is the missing step between current Inbox automation and the fully automatic workflow the seller expects.
