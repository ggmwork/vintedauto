# Vinted Extension Field Contract

Last updated: 2026-05-03

## Purpose

This file defines the first field contract between the app and the Vinted extension.

The goal is to keep the extension MVP narrow and predictable.

## MVP fill scope

The extension MVP should fill only these fields:

- title
- description
- price
- brand
- category
- size
- condition
- color
- material
- ordered images

Optional in MVP:

- notes mapping if the Vinted form has an appropriate free-text field
- category-path plan for searchable PT dropdowns
- later Vinted-only fields through `listing.profile`

Not required in MVP:

- shipping settings
- wardrobe visibility options
- discounts
- bundle rules
- promotions
- advanced account settings

Initial dynamic PT field scope:

- `logistics.packageSize`
- `compliance.aiGeneratedPhotos`
- `measurements.shoulderWidthCm`
- `measurements.lengthCm`

## Required payload fields

Required:

- `version`
- `draftId`
- `status`
- `listing.title`
- `listing.description`
- `listing.price.amount`
- `images[]`

If one of these is missing, the extension should refuse to fill.

## Recommended structured payload shape

```json
{
  "version": "1",
  "draftId": "draft_123",
  "targetAccountId": null,
  "status": {
    "ready": true,
    "missingFields": [],
    "manualSubmitRequired": true
  },
  "listing": {
    "title": "Nike beige trench coat size L",
    "description": "Clean beige trench coat...",
    "price": {
      "amount": 49.0,
      "currency": "EUR"
    },
    "brand": "Nike",
    "category": "Coats & Jackets",
    "size": "L",
    "condition": "Very good",
    "color": "Beige",
    "material": "Polyester",
    "notes": "Belt included.",
    "profile": {
      "market": "vinted.pt",
      "profileKey": "mens_shirts_pt",
      "categoryPlan": {
        "searchQuery": "Camisas",
        "path": ["Homem", "Roupa", "Tops e t-shirts", "Camisas"]
      },
      "missingRequiredFieldKeys": [],
      "fields": [
        {
          "key": "logistics.packageSize",
          "valueType": "single_select",
          "value": "medium"
        }
      ]
    }
  },
  "images": [
    {
      "id": "img_1",
      "order": 0,
      "url": "http://127.0.0.1:3000/api/drafts/draft_123/images/img_1"
    }
  ]
}
```

## Fill rules

### Title

- trim whitespace
- do not overwrite if payload empty
- hard fail if required but missing

### Description

- preserve line breaks
- replace field content, do not append

### Price

- use numeric canonical value from payload
- extension may normalize decimal separators for the market UI
- if the market UI uses a masked currency input, simulate typing and verify the
  visible numeric value after fill

### Structured attributes

- fill only if payload value exists
- if exact option match is unavailable, report field mismatch and continue
- searchable dropdowns like category should prefer real visible option
  selection over raw text typing
- PT category selection may require:
  - search query candidates
  - breadcrumb path matching
  - market-specific category mapping when generic app labels are too broad

### Dynamic profile fields

- extension should consume `listing.profile`
- category dropdown should prefer `categoryPlan.searchQuery` and `categoryPlan.path`
- package size should use explicit option labels, not raw text-field typing
- optional measurement fields should fill only when a profile value exists
- optional compliance checkbox should not fail the whole run when the page does
  not expose that control

### Images

- preserve app order
- stop and report if upload input unavailable
- if partial upload occurs, return partial-success state

## Status contract

The content script should return:

- `success`
- `partial_success`
- `failure`

With details:

- `filledFields[]`
- `skippedFields[]`
- `failedFields[]`
- `message`

## Queue contract

The app should later treat extension results as queue events:

- `filled_on_vinted`
- `fill_failed`
- `needs_manual_fix`

This will support future `fill and next` behavior cleanly.

## Why keep MVP field scope narrow

Reason:

- title, description, price, metadata, and images deliver most of the value
- fewer fields means fewer fragile selectors
- faster shipping
- easier debugging when Vinted changes

The first extension should prove reliable fill, not exhaust every form control.
