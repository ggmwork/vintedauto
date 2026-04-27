# Watched Folder And Ingest Architecture

Last updated: 2026-04-27

## Purpose

This document defines the recommended technical shape for automatic local ingest.

## Main constraint

A plain browser app cannot reliably watch arbitrary local folders by itself.

That means true watched-folder behavior needs a small local companion process.

## Recommended architecture

Use two local surfaces:

1. Next.js app for UI and app logic
2. local watcher service for filesystem monitoring

## Recommended system model

```txt
Desktop user
  ->
Watched folder on local disk
  ->
Local watcher service
  ->
Managed app storage + local metadata store
  ->
Next.js UI
  ->
AI generation + review flow
```

## Why this shape

It keeps responsibilities clean:

- watcher owns filesystem detection
- app owns UI, stock workflow, review, and listing logic

This is simpler than trying to force folder watching into the browser runtime.

## Recommended watcher implementation

Start with a narrow Node.js watcher service in the same repo.

Reasons:

- same TypeScript ecosystem as the app
- fast to build
- easy to share types
- lower complexity than introducing Electron or Tauri immediately

## Recommended responsibilities

### Watcher service

- watch one configured folder
- detect new files after a short debounce
- ignore partially written files until stable
- import files into managed storage
- create or update ingest records
- emit status for the UI

### Next.js app

- show watcher status
- configure watched folder path
- show Inbox, Stock, and Review
- run grouping rules
- trigger or monitor generation
- expose user-facing corrections

## Recommended watched-folder behavior for v1

### v1 rules

- one configured root watched folder
- watcher runs while the app is open
- new files are auto-imported
- imported files are copied into managed app storage
- UI shows them in Inbox without a manual import step

### Not required in v1

- background watching when the app is closed
- system tray app
- OS-level service installation

## Grouping strategy recommendation

Fully automatic grouping from one flat folder is unreliable.

So the system should support two modes.

### Mode A - folder-per-item

If the user drops photos into subfolders:

- each top-level subfolder becomes one stock item

This is the strongest v1 auto-stock rule.

### Mode B - loose-file fallback

If the user drops loose files into the watched root:

- app imports them automatically
- app places them into Inbox
- app marks them as `needs grouping`

This avoids pretending that flat-file grouping is solved when it is not.

## Recommended data handling

### Keep original files independent from app state

After ingest:

- copy files into managed app storage
- do not rely on the original watched-folder files as long-term source of truth

Reason:

- watched folder stays operational
- app storage stays stable even if user renames or moves source files later

### Track ingest status

Recommended internal states:

- `detected`
- `importing`
- `imported`
- `needs_grouping`
- `ready_for_generation`
- `failed`

These can stay internal if the UI does not need all of them.

## User-facing model

The user should not see low-level ingest records directly.

The UI should show:

- Inbox items
- Stock items
- Review items

Only expose technical ingest failures when action is required.

## Recommended folder settings

The app should allow:

- selecting one watched folder path
- starting watcher manually
- stopping watcher manually
- seeing current watcher status
- seeing last ingest activity

Later:

- auto-start watcher with app

## Recommended next automation boundary

Do not auto-generate the moment the first image appears.

Safer first behavior:

- wait until import for an item is stable
- then either:
  - mark it ready for generation
  - or run generation automatically after a short idle window

Recommendation:

- start with `ready for generation`
- add automatic generation after ingest stabilizes later

## Failure handling recommendations

Need minimum support for:

- unsupported file type
- duplicate file detection
- failed file copy
- interrupted write
- watcher unavailable
- folder missing or permission denied

UI should keep these short and operational.

## Recommendation summary

The right technical next step is:

- keep Next.js for UI
- add a small local watcher service
- watch one folder while app is open
- copy files into managed storage
- support folder-per-item automatic stock creation
- fall back to Inbox grouping for loose files
