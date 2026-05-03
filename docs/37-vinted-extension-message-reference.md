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
- app stock list
- app stock error, if the local app is unavailable

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

### `vinted-auto:load-app-stock-item`

Popup -> service worker

Purpose:

- save one drafted stock item as the active extension context
- clear the last fill result when switching to a different item

### `vinted-auto:prime-from-page`

Content script -> service worker

Purpose:

- fallback bootstrap from query-param launch

### `vinted-auto:get-page-state`

Service worker or popup -> content script

Purpose:

- inspect whether the page is supported and which fields were found

### `vinted-auto:fill-page-fields`

Service worker -> content script

Purpose:

- deliver bounded listing payload and request a real non-image DOM fill

Request shape:

```json
{
  "type": "vinted-auto:fill-page-fields",
  "payload": {
    "source": {
      "draftId": "draft_123"
    }
  },
  "context": {
    "draftId": "draft_123",
    "appOrigin": "http://127.0.0.1:3000"
  }
}
```

### `vinted-auto:upload-images`

Service worker -> content script

Purpose:

- stage prepared images in smaller messages
- commit the real file-input write on the last image message

Request shape:

```json
{
  "type": "vinted-auto:upload-images",
  "preparedImages": [
    {
      "id": "img_1",
      "filename": "front.jpg",
      "contentType": "image/jpeg",
      "sortOrder": 0,
      "base64": "..."
    }
  ],
  "reset": true,
  "commit": false,
  "imagePreparationError": null
}
```

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
