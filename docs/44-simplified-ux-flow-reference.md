# Simplified UX Flow Reference

Last updated: 2026-05-11

## Purpose

This is the flow reference for the simplified UX implementation. Use it to keep
screen changes aligned around the seller journey instead of internal objects.

## Core Flow

```mermaid
flowchart TD
  A["Workbench"] --> B["Photos detected"]
  B --> C["Select item photos"]
  C --> D["Create item"]
  D --> E["Generate listing"]
  E --> F["Review listing"]
  F --> G["Fill on Vinted"]
  G --> H["User reviews on Vinted"]
  H --> I["Manual submit"]
```

## Current Flow

```mermaid
flowchart TD
  A["Inbox"] --> B["Watched folder setup"]
  A --> C["Watcher status and logs"]
  A --> D["Ungrouped photos"]
  D --> E["Group selected into item"]
  D --> F["Suggest selected"]
  D --> G["Suggest groups"]
  D --> H["Add selected to existing stock"]
  F --> I["Suggested groups review"]
  G --> I
  I --> J["Commit or dissolve suggestion"]
  E --> K["Stock"]
  H --> K
  J --> K
  K --> L["Generate draft"]
  L --> M["Review queue"]
  M --> N["Draft detail"]
  N --> O["Upload"]
  N --> P["Generate"]
  N --> Q["Review fields"]
  N --> R["Export"]
  R --> S["Fill on Vinted"]
  R --> T["Copy fallback data"]
  S --> U["Manual submit"]
```

## Complexity Sources

```mermaid
flowchart LR
  Seller["Seller intent"] --> Goal["List one item"]
  Goal --> Need1["Photos"]
  Goal --> Need2["Listing text"]
  Goal --> Need3["Vinted form fill"]

  CurrentUI["Current UI"] --> System1["Watcher"]
  CurrentUI --> System2["Inbox"]
  CurrentUI --> System3["Stock"]
  CurrentUI --> System4["Draft"]
  CurrentUI --> System5["Review queue"]
  CurrentUI --> System6["Vinted profile"]
  CurrentUI --> System7["Handoff diagnostics"]
  CurrentUI --> System8["AI routing"]

  System1 --> Load["Cognitive load"]
  System5 --> Load
  System6 --> Load
  System7 --> Load
  System8 --> Load
```

## Target IA

```mermaid
flowchart TD
  Nav["Primary nav"] --> Workbench["Workbench"]
  Nav --> Listings["Listings"]
  Nav --> Settings["Settings"]

  Workbench --> Photos["Photo intake"]
  Workbench --> Items["Items"]
  Workbench --> NextAction["Next action"]

  Listings --> Review["Review active listing"]
  Listings --> History["Listed and sold history"]

  Settings --> Folder["Folder"]
  Settings --> AI["AI"]
  Settings --> Extension["Extension"]
  Settings --> Diagnostics["Diagnostics"]
```

## Workbench States

```mermaid
stateDiagram-v2
  [*] --> Empty
  Empty --> Watching: folder configured
  Watching --> PhotosReady: photos imported
  PhotosReady --> Selecting: user selects photos
  Selecting --> ItemReady: create item
  ItemReady --> ListingGenerating: generate listing
  ListingGenerating --> ListingReady: draft created
  ListingReady --> Review: open listing
  Review --> VintedFill: fill on Vinted
  VintedFill --> ManualSubmit: user submits on Vinted
```

## Screen Responsibilities

### Workbench

Primary job:

Help the seller turn photos into the next listing.

Visible first:

- Folder status.
- Photos needing grouping.
- Items needing listing generation.
- One next action.

Hidden or secondary:

- Last start time.
- Last event time.
- Last scan time.
- Last import time.
- Imported file count.
- Grouping run notes.
- Watcher implementation language.

### Listings

Primary job:

Help the seller review, fill, and track listings.

Visible first:

- Listing requiring review.
- Required missing fields.
- Main next action.
- Queue position if in queue mode.

Hidden or secondary:

- Generation history.
- Draft ID.
- Selector diagnostics.
- JSON handoff.
- Individual copy buttons.

### Settings

Primary job:

Let the seller or maintainer configure low-frequency controls.

Visible first:

- Folder path.
- AI preset.
- Extension status.

Hidden or secondary:

- Base URLs.
- Timeouts.
- API key clearing.
- Provider test history.
- Advanced model guidance.

## UI Copy Reference

Use seller verbs:

- `Create item`
- `Generate listing`
- `Review listing`
- `Fill on Vinted`
- `Open listing`
- `Fix missing fields`
- `Scan photos`
- `Change folder`

Avoid first-level internal words:

- `watcher`
- `session`
- `stock`
- `draft`
- `handoff`
- `payload`
- `selector`
- `route`
- `profile schema`

Allowed in advanced/debug areas:

- `Watcher`
- `Draft ID`
- `Selector diagnostics`
- `Autofill JSON`
- `Vinted profile`
- `Provider`

## Primary Action Rules

Each main screen should answer:

- What is the current item?
- What is wrong or missing?
- What should the seller do next?

Per screen:

- Empty Workbench: primary action is `Open folder` or `Scan photos`.
- Photos present: primary action is `Create item`.
- Item without listing: primary action is `Generate listing`.
- Listing incomplete: primary action is `Fix missing fields`.
- Listing ready: primary action is `Fill on Vinted`.
- Vinted filled: primary action is `Mark listed` or leave final submit on Vinted.

## Edge Cases

No photos:

- Show folder path and a short empty state.
- Keep `Scan photos` visible.
- Keep folder debug collapsed.

Photos but no selection:

- Disable `Create item`.
- Explain with one short line: `Select photos for one item.`

AI unavailable:

- Keep item creation working.
- Show `AI needs setup` near `Generate listing`.
- Link to Settings.

Vinted fill unavailable:

- Keep copy fallback available under `Advanced`.
- Say `Use copy fallback` instead of exposing JSON first.

## Manual Submit Boundary

Always preserve this boundary:

```mermaid
flowchart LR
  App["App prepares listing"] --> Extension["Extension fills Vinted form"]
  Extension --> User["User reviews Vinted page"]
  User --> Submit["User clicks submit manually"]
```

The app may prepare and fill. The user decides final publish.
