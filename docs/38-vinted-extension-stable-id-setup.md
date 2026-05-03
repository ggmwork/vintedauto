# Vinted Extension Stable ID Setup

Last updated: 2026-05-03

## Purpose

Make the app-to-extension bridge use one repeatable extension ID.

## Repo status

Step 1 is done in the repo:

- `extension/manifest.json` now carries a fixed `key`
- that key gives this unpacked extension one stable ID
- expected ID: `jjlanfbmjhiodmoamflpjclhfcjhcemb`
- app default bridge ID in `lib/vinted/extension-protocol.ts` matches that ID
- `.env.example` also carries that same ID

## Next manual step

Step 2 must be done in Chrome:

1. open `chrome://extensions`
2. turn on `Developer mode`
3. click `Load unpacked`
4. select the repo `extension/` folder
5. confirm the loaded extension ID is `jjlanfbmjhiodmoamflpjclhfcjhcemb`

If the ID matches, the direct app-page bridge can target the extension reliably.

## Why stop here

The next step is not code. It is manual Chrome loading and confirmation.

## Source

- Chrome manifest `key` reference:
  [https://developer.chrome.com/docs/extensions/reference/manifest/key?hl=en](https://developer.chrome.com/docs/extensions/reference/manifest/key?hl=en)
