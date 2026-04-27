# Competition Scan

Last updated: 2026-04-27

## Scope

This document summarizes public competitor research gathered on 2026-04-27. Findings are based on publicly visible product pages, help docs, and pricing pages. Claims have not been independently validated through product trials.

## Main market categories

The current market appears to split into four groups:

1. AI listing generators
2. Browser autofill tools
3. Vinted seller automation suites
4. Crosslisting and inventory tools

## Direct AI listing generators

### Listed AI

Source: [listedai.app](https://listedai.app/en/)

Observed positioning:

- photo to listing in seconds
- generates title, description, hashtags, and price
- multi-language output
- cross-marketplace support
- saved listing history
- bulk listing generation

Takeaway:

AI listing generation is already a validated and crowded wedge. Basic copy generation alone is not enough differentiation.

### FlipIQ

Source: [flipiqapp.com](https://flipiqapp.com/en/)

Observed positioning:

- photo analysis
- product identification
- price estimation
- multi-platform listing copy
- reseller time-saving pitch

Takeaway:

Photo input plus price suggestion is becoming expected. Good UX and better workflow matter more than raw generation alone.

### Vinting

Source: [vinting.app](https://vinting.app/)

Observed positioning:

- Vinted, eBay, and Gumtree support
- sold-data pricing pitch
- flaw detection
- hero image enhancement
- stock image finder
- Chrome autofill extension
- batch upload and saved items flow

Takeaway:

This is close to the direction of the current product. It validates demand for a structured listing workflow, not only a text generator.

## Browser autofill tools

### AutoLister AI

Source: [autolister.app](https://autolister.app/)

Observed positioning:

- browser-based Vinted listing assist
- emphasizes no direct API access
- emphasizes user review before publish
- stresses Vinted terms compliance

Takeaway:

The market understands autofill on Vinted web as safer than full publishing automation. This supports a desktop web app plus browser helper path.

### SharkScribe

Source: [sharkscribeai.com](https://sharkscribeai.com/features/browser-extension)

Observed positioning:

- draft created in app
- Chrome extension fills Vinted listing form
- supports title, description, and images
- user still reviews and submits

Takeaway:

The "draft in app -> fill in Vinted web" model is already proven and likely the right low-risk flow for MVP.

## Vinted automation suites

### Dotb

Sources:

- [dotb.io](https://dotb.io/#faq)
- [AI Listing Generator docs](https://dotb.io/docs/ai-listing-generator)
- [Dashboard Listing Creator docs](https://dotb.io/docs/dashboard-listing-creator)
- [Orders Panel docs](https://dotb.io/docs/orders-panel)
- [Backup & Multi-Account docs](https://dotb.io/docs/backups-and-multi-accounts)

Observed positioning:

- repost automation
- auto messages to likers
- smart offers
- AI inbox agent
- dashboard-based draft creation
- extension-based import into Vinted
- multi-account and backup flows
- order export, labels, accounting, CSV

Important risk signal:

Dotb explicitly warns that Vinted strike policy became more aggressive and that cross-account importing can lead to restrictions or bans if done badly.

Takeaway:

Dotb is a strong signal that seller operations tooling is valuable, but it also shows the higher-risk zone that the current MVP should avoid.

### Bleam

Source: [bleam.app](https://bleam.app/en)

Observed positioning:

- templates
- reposting
- automatic negotiations
- label downloads
- post-sale automation

Takeaway:

Bleam targets active and professional-like Vinted sellers. This is more operations software than listing assistant.

### Dressio

Source: [dressio.app](https://www.dressio.app/)

Observed positioning:

- batch relist
- offer to likers
- auto price drop
- AI translation
- browser-run automation with claimed pacing controls

Takeaway:

Visibility and conversion automation is a live seller pain point, but it belongs after MVP, if at all.

## Crosslisting and inventory tools

### List Perfectly

Source: [listperfectly.com](https://listperfectly.com/selling/vinted-marketplace-supported-in-list-perfectly/)

Observed positioning:

- Vinted crosslisting support
- direct marketplace-to-marketplace workflow
- inventory hub workflow
- strong pitch around not changing seller workflow

Takeaway:

Inventory management and crosslisting are valuable, but the current MVP can stay Vinted-first and still leave room for later expansion.

### OktoSync

Source: [oktosync.com](https://oktosync.com/)

Observed positioning:

- Shopify to Vinted Pro
- inventory sync
- autopilot publishing
- bulk editing

Takeaway:

This sits in a more advanced business/integration tier and is not the right comparison target for the first version.

## Platform and policy notes

### Vinted terms

Source: [Vinted terms and conditions](https://www.vinted.com/terms-and-conditions)

Relevant public observations:

- Vinted may take corrective actions or block accounts
- Vinted explicitly uses automation on its side for monitoring and enforcement
- seller accounts are a sensitive surface

### Vinted Pro

Source: [Vinted Pro guide](https://www.vinted.com/pro-guide)

Relevant observation:

- Vinted Pro is real and structured for business sellers in several European markets
- professional sellers have extra compliance duties

## Strategic conclusion

The market is validated, but crowded.

The strongest near-term path is not to become a full Vinted automation bot.

The best first wedge is:

- desktop-first
- Vinted-first
- strong AI-assisted listing draft creation
- strong photo organization
- strong draft review and inventory flow
- copy/export and optional browser autofill into Vinted web

## Product implications

Recommended for MVP:

- photo upload
- draft creation
- per-item image organization
- AI title and description
- price suggestion or range
- structured metadata capture
- saved drafts
- copy to Vinted
- optional browser autofill later in MVP or as phase 2

Avoid in MVP:

- direct auto publishing
- relisting bots
- buyer messaging automation
- negotiation bots
- multi-account transfer tooling
- anything requiring image manipulation to avoid strikes
