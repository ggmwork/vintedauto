# Vinted Extension DOM Smoke Test

Last updated: 2026-05-01

## Purpose

Use this checklist after any selector change, Vinted UI change, or extension fill regression.

The goal is fast confirmation that the supported create-listing flow still works and that failures are diagnosable.

## Supported scope

This smoke test covers only:

- supported Vinted web create-listing page
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
- result callback to the app
- manual final submit boundary

## Pre-check

Confirm:

- local app is running
- unpacked extension is loaded from `extension/`
- popup app origin is correct
- popup create-listing URL is correct
- one draft exists with all required handoff fields and images

## Happy-path checklist

1. Open the ready draft in the app.
2. Confirm the draft export panel shows `ready for Vinted`.
3. Click `Fill on Vinted` or `Fill and next`.
4. Confirm the browser opens the supported Vinted create-listing page.
5. Open the extension popup on that tab.
6. Confirm `Current page` shows `Supported create-listing page`.
7. Confirm title fills.
8. Confirm description fills.
9. Confirm price fills.
10. Confirm brand fills or types correctly.
11. Confirm category fills or types correctly.
12. Confirm size fills or types correctly.
13. Confirm condition fills or types correctly.
14. Confirm color fills or types correctly.
15. Confirm material fills or types correctly.
16. Confirm images upload in payload order.
17. Confirm popup `Last fill diagnostics` reports `success` or a precise partial failure.
18. Return to the app and confirm the draft handoff state updates.
19. Confirm final publish is still manual.

## Failure workflow

If any field fails:

1. Open the extension popup.
2. Expand `Page diagnostics`.
3. Expand `Last fill diagnostics`.
4. Note:
   - page reason
   - failed field name
   - `matchedBy` value if present
   - diagnostic detail for the failed field
   - debug trace lines
5. Return to the draft in the app.
6. Open `Selector diagnostics` in the export panel.
7. Compare the app-side stored diagnostics with the popup diagnostics.
8. Open DevTools on the Vinted page and check console lines prefixed with `[Vinted Auto]`.

## Repair checklist

When fixing a selector issue:

1. Change only `extension/vinted-form-adapter.js` unless the bug clearly requires more.
2. Keep field names stable so callback payloads and app state stay compatible.
3. Re-run the happy-path smoke test.
4. Re-check the failed field specifically.
5. Confirm a previous failure now reports `success` or a smaller, clearer partial failure.

## Expected diagnostics quality

After hardening, a broken field should tell you:

- whether the page itself is unsupported or only a field is broken
- which field failed
- whether the control was found
- how the control was matched
- why the fill failed

## Done criteria

The selector repair is done when:

- popup page diagnostics are explicit
- popup fill diagnostics name the exact failed field when something breaks
- app-side stored diagnostics match the latest fill result
- happy path passes again on the supported create-listing page
