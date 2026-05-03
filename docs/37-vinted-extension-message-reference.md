# Vinted Extension Message Reference

Last updated: 2026-05-03

## Protocol version

`2026-05-03`

Code mirrors:

- `extension/handoff-protocol.js`
- `lib/vinted/extension-protocol.ts`

## Storage keys

### local

- `config`
- `lastContext`
- `lastFillResult`

### session

- `pendingLaunch`

## External messages

### `vinted-auto:ping`

Sender:

- app page

Purpose:

- check that the extension is reachable
- inspect protocol version and capabilities

Request:

```json
{
  "type": "vinted-auto:ping"
}
```

Success response:

```json
{
  "ok": true,
  "protocolVersion": "2026-05-03",
  "extensionId": "abcdefghijklmnopabcdefghijklmnop",
  "capabilities": {
    "externalLaunch": true,
    "cleanLaunch": true,
    "fallbackRoute": true
  }
}
```

### `vinted-auto:launch-handoff`

Sender:

- app page

Purpose:

- ask the extension to launch the clean Vinted create page
- save pending launch state in the worker

Request:

```json
{
  "type": "vinted-auto:launch-handoff",
  "draftId": "draft_123",
  "appOrigin": "http://127.0.0.1:3000"
}
```

Success response:

```json
{
  "ok": true,
  "protocolVersion": "2026-05-03",
  "launch": {
    "tabId": 812,
    "url": "https://www.vinted.pt/items/new",
    "flow": "external_message"
  }
}
```

Error response:

```json
{
  "ok": false,
  "message": "The web app origin is not allowed to control this extension."
}
```

## Internal extension messages

### `vinted-auto:get-popup-state`

Popup -> service worker

Returns:

- config
- last context
- last fill result
- pending launch
- active tab
- page state

### `vinted-auto:save-config`

Popup -> service worker

Updates:

- app origin
- create listing URL

### `vinted-auto:fill-current-page`

Popup -> service worker

Purpose:

- manually fill the active supported Vinted page from last known context

### `vinted-auto:open-vinted-and-fill`

Popup -> service worker

Purpose:

- open a clean Vinted create page
- save pending launch
- let the worker auto-fill when the tab becomes ready

### `vinted-auto:prime-from-page`

Content script -> service worker

Purpose:

- fallback bootstrap from query-param launch

### `vinted-auto:get-page-state`

Service worker or popup -> content script

Purpose:

- inspect whether the page is supported and which fields were found

### `vinted-auto:fill-page`

Service worker -> content script

Purpose:

- deliver bounded payload and request a real DOM fill

## Pending launch shape

```json
{
  "draftId": "draft_123",
  "appOrigin": "http://127.0.0.1:3000",
  "tabId": 812,
  "source": "external_message",
  "requestedAt": "2026-05-03T18:40:00.000Z",
  "processing": false
}
```

## Result boundary

The extension reports:

- `success`
- `partial_success`
- `failure`

The app maps them to:

- `filled_on_vinted`
- `needs_manual_fix`
- `fill_failed`

Manual final submit remains outside the extension contract.
