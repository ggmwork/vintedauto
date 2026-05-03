# Vinted Dynamic Fields Research

Last updated: 2026-05-03

## Problem

The current Vinted form does not stop at:

- title
- description
- price
- base metadata

After category selection, Vinted can reveal more controls that depend on:

- market
- category branch
- apparel type
- compliance requirements
- shipping/package requirements

Examples seen on `vinted.pt`:

- searchable category dropdown with real breadcrumb paths
- package size
- AI-generated photo disclosure
- recommended measurements for shirts

If we keep modeling these as ad-hoc top-level draft fields, the app will drift into:

- market-specific sprawl
- duplicate selector logic
- no clean stock summary
- no stable handoff contract

## Decision

Use a schema-driven `vintedProfile` layer instead of adding more top-level draft metadata.

Split the model into two layers:

1. Base draft metadata

- brand
- category
- size
- condition
- color
- material
- notes

2. Market profile fields

- market key
- profile key
- category search query
- category path
- dynamic field values keyed by stable ids

## Why Schema-Driven

This matches the shape of the problem:

- object properties for known fields
- modular profiles for reusable groups
- conditional fields after category selection
- controlled extra fields instead of random JSON blobs

Official references that support this approach:

- JSON Schema object properties and controlled additional fields:
  [json-schema.org object reference](https://json-schema.org/understanding-json-schema/reference/object)
- JSON Schema combinations for reusable profile composition:
  [json-schema.org combining schemas](https://json-schema.org/understanding-json-schema/reference/combining)
- JSON Schema structuring/modular references:
  [json-schema.org structuring](https://json-schema.org/understanding-json-schema/structuring)

Important takeaway:

- dynamic listing fields are not “more metadata”
- they are a category-dependent sub-schema

## Best Execution Model

One source of truth:

`draft -> vintedProfile -> handoff payload -> extension fill`

Not:

`app text fields -> extension guesses again from page text`

## Recommended Data Shape

```ts
interface DraftVintedProfileState {
  market: "vinted.pt";
  profileKey: string | null;
  categoryPlan: {
    searchQuery: string | null;
    path: string[];
  } | null;
  fieldValues: Record<string, string | number | boolean | null>;
}
```

## Why Stock Must See It Too

Stock is the operational queue between Inbox grouping and listing handoff.

If Stock cannot show Vinted-only missing fields, operators cannot tell:

- which drafted items are really handoff-ready
- which items still need package size
- which items still need category-path cleanup
- which apparel drafts should capture measurements

So the profile must appear in:

- Draft review
- Stock summary
- Handoff payload

## Extension Implication

The extension should no longer infer everything from:

- `listing.metadata.category`

It should consume:

- `listing.profile.categoryPlan`
- `listing.profile.fields[]`

That lets category-specific selectors stay narrow and explicit.

## Initial PT Scope

First PT profile wave:

- generic apparel
- mens shirts
- coats and jackets

Initial later fields:

- `logistics.packageSize`
- `compliance.aiGeneratedPhotos`
- `measurements.shoulderWidthCm`
- `measurements.lengthCm`

## Recommended Next Validation

Now that the schema exists, the next real test is not more modeling.

It is:

`live Vinted PT smoke test for category path, package size, measurements, and AI-photo checkbox`
