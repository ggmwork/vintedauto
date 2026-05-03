# Vinted Extension Handoff Research

Last updated: 2026-05-03

## Purpose

Find the best way to launch the Vinted extension, hand off draft data, and keep
the extension repairable when Chrome or Vinted changes.

## Current repo baseline

Current repo flow before this research pass:

1. app opens `/api/drafts/:draftId/fill-on-vinted`
2. route redirects to Vinted with query params
3. content script reads query params
4. content script asks service worker to fetch `/api/drafts/:draftId/vinted-handoff`
5. content script fills the form
6. service worker posts `/api/drafts/:draftId/vinted-fill-result`

This works. But it is not the cleanest long-term shape.

Main weaknesses:

- query params leak launch state into the Vinted URL
- launch context starts in the content script instead of the service worker
- content script currently owns cross-origin image fetches, which is the riskiest
  network part of the stack
- app cannot directly know whether the extension is installed unless it tries the
  fallback route

## Research questions

1. How should a web app trigger an MV3 extension?
2. Where should handoff state live in MV3?
3. Which extension context should own cross-origin fetches?
4. Do we need a stable extension ID?

## Findings

### 1. Best trigger path: web app -> extension external messaging

Chrome supports web-page-to-extension messaging through
`runtime.sendMessage()` when the extension declares
`externally_connectable.matches`.

Implication:

- best launch path is direct app page -> extension service worker
- the app should send only bounded context like `draftId` and `appOrigin`
- the service worker should open the Vinted tab itself

Why this is better than query params:

- clean Vinted URL
- service worker becomes the launch owner
- app can detect bridge availability
- fallback remains possible if the extension ID is not configured

### 2. Best state owner: service worker

Chrome extension service workers are the central event handler, but they can go
dormant after idle time. Chrome recommends persisting state instead of relying on
globals.

Implication:

- service worker owns launch orchestration
- config stays in `chrome.storage.local`
- ephemeral launch state goes in `chrome.storage.session`
- content script stays DOM-only

### 3. Best network owner: extension origin, not content script

Chrome’s extension docs say content scripts are still subject to the page origin
for cross-origin requests. Extension service workers can do cross-origin fetches
with host permissions.

Implication:

- payload fetch belongs in the service worker
- image fetch ideally also belongs in the service worker or another extension
  origin context
- content script should receive bounded data and perform DOM work only

Current repo status:

- payload fetch already happens in the service worker
- image fetch still happens in the content script

So the current best next hardening item after this bridge work is:

`move image transport out of the content script`

### 4. Stable extension ID matters

Chrome’s manifest `key` keeps a consistent extension ID during development.
Chrome docs explicitly call out messaging from websites as a reason to keep the ID
stable.

Implication:

- production or team-dev direct bridge needs a stable extension ID
- app should read it from `NEXT_PUBLIC_VINTED_EXTENSION_ID`
- repo should not guess or hardcode a local unpacked random ID

## Options compared

### Option A. Keep query-param-only launch

Pros:

- already works
- no extension ID needed
- no app-side bridge code needed

Cons:

- dirtier launch URL
- content-script-owned bootstrap
- weaker install detection
- less clean long-term architecture

### Option B. Direct app page -> extension bridge, query-param fallback

Pros:

- clean primary architecture
- clean Vinted URL
- app can try extension first
- fallback route keeps local/dev resilience
- small migration cost

Cons:

- needs extension ID config for the best path
- still carries two launch paths for now

### Option C. Extension-only control surface, no fallback

Pros:

- cleanest steady-state

Cons:

- fragile during local development
- blocks usage when extension ID is not configured
- worse recovery story

## Recommendation

Best path now:

`Option B`

Meaning:

1. preferred launch = direct app page -> extension external message
2. service worker owns pending launch state in `storage.session`
3. service worker opens clean Vinted tab
4. content script fills when the target tab becomes ready
5. old redirect/query-param route stays as fallback

## Sources

- Chrome message passing:
  [https://developer.chrome.com/docs/extensions/develop/concepts/messaging?hl=en](https://developer.chrome.com/docs/extensions/develop/concepts/messaging?hl=en)
- Chrome externally_connectable:
  [https://developer.chrome.com/docs/extensions/reference/manifest/externally-connectable](https://developer.chrome.com/docs/extensions/reference/manifest/externally-connectable)
- Chrome extension service worker lifecycle:
  [https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle?hl=en](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle?hl=en)
- Chrome storage API and `storage.session`:
  [https://developer.chrome.com/docs/extensions/reference/api/storage?hl=en](https://developer.chrome.com/docs/extensions/reference/api/storage?hl=en)
- Chrome cross-origin network requests:
  [https://developer.chrome.com/docs/extensions/develop/concepts/network-requests?hl=en](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests?hl=en)
- Chrome manifest `key`:
  [https://developer.chrome.com/docs/extensions/reference/manifest/key](https://developer.chrome.com/docs/extensions/reference/manifest/key)
