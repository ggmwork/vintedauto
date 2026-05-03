# Vinted Dynamic Field Reference PT

Last updated: 2026-05-03

## Purpose

This file is the human reference for the PT market profile catalog.

Code source of truth:

- [lib/vinted/listing-profile.ts](../lib/vinted/listing-profile.ts)
- [types/vinted-profile.ts](../types/vinted-profile.ts)

## Shared Rules

- market: `vinted.pt`
- base metadata stays outside this file
- this file covers fields that appear after category resolution or belong only to Vinted

## Field Keys

### `logistics.packageSize`

- label: `Package size`
- type: `single_select`
- required: `yes`
- recommended: `yes`
- values:
  - `small`
  - `medium`
  - `large`
- PT UI labels:
  - `Pequeno`
  - `Médio`
  - `Grande`

### `compliance.aiGeneratedPhotos`

- label: `AI-generated photos`
- type: `boolean`
- required: `no`
- recommended: `no`
- PT UI label family:
  - `Marcar fotos como geradas por IA`

### `measurements.shoulderWidthCm`

- label: `Shoulder width`
- type: `number`
- unit: `cm`
- required: `no`
- recommended: `yes`
- PT UI label family:
  - `Largura do ombro`

### `measurements.lengthCm`

- label: `Length`
- type: `number`
- unit: `cm`
- required: `no`
- recommended: `yes`
- PT UI label family:
  - `Comprimento`

## Profiles

### `generic_apparel_pt`

- use when category is still broad or not matched to a narrower PT branch
- category search query: none forced
- category path: empty by default
- fields:
  - `logistics.packageSize`
  - `compliance.aiGeneratedPhotos`

### `mens_shirts_pt`

- use for:
  - `Men's Shirts`
  - `Mens Shirts`
  - shirt/camisa variants
- category search query:
  - `Camisas`
- category path:
  - `Homem > Roupa > Tops e t-shirts > Camisas`
- fields:
  - `logistics.packageSize`
  - `compliance.aiGeneratedPhotos`
  - `measurements.shoulderWidthCm`
  - `measurements.lengthCm`

### `coats_jackets_pt`

- use for:
  - `Coats & Jackets`
  - coat/jacket/blazer variants
- category search query:
  - `Casacos`
- category path:
  - `Homem > Roupa > Casacos > Casacos`
- fields:
  - `logistics.packageSize`
  - `compliance.aiGeneratedPhotos`

## Handoff Contract Shape

```json
{
  "listing": {
    "profile": {
      "market": "vinted.pt",
      "profileKey": "mens_shirts_pt",
      "label": "PT mens shirts",
      "categoryPlan": {
        "searchQuery": "Camisas",
        "path": ["Homem", "Roupa", "Tops e t-shirts", "Camisas"]
      },
      "missingRequiredFieldKeys": ["logistics.packageSize"],
      "fields": [
        {
          "key": "logistics.packageSize",
          "valueType": "single_select",
          "value": "medium"
        }
      ]
    }
  }
}
```

## Current Fill Support

Implemented now in the extension:

- category path plan consumption for PT category dropdown
- package size choice fill
- AI-photo checkbox fill
- shirt measurement text input fill

Still needs live selector validation:

- exact PT measurement labels across all apparel branches
- package-size radio/card behavior after Vinted UI changes
