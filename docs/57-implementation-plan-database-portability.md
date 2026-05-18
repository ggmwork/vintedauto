# Implementation Plan: Database Portability

Last updated: 2026-05-18

## Purpose

Turn the local `.data` folder into a managed database that can be backed up,
exported, imported, and later opened from a shared folder.

Source plan:

- [56-database-portability-plan.md](./56-database-portability-plan.md)
- [58-database-portability-reference.md](./58-database-portability-reference.md)

## Implementation Principles

- preserve current data model
- move path ownership first
- export before import
- validate before replacing anything
- back up before every destructive operation
- do not export secrets by default
- avoid hosted sync until local portability is proven

## Phase 1: Data Root and Manifest

Goal:

Centralize the app data path and write a database manifest.

Files likely touched:

- `lib/data/database-root.ts`
- `lib/drafts/local-draft-repository.ts`
- `lib/intake/local-studio-session-repository.ts`
- `lib/intake/local-photo-asset-storage.ts`
- `lib/storage/local-draft-image-storage.ts`
- `lib/watcher/local-inbox-watcher-store.ts`
- `lib/settings/ai-settings.ts`

Tasks:

1. Add `getDatabaseRoot()` helper.
2. Default to `path.join(process.cwd(), ".data")`.
3. Allow override through `VINTEDAUTO_DATA_DIR`.
4. Add `database-manifest.json` under the active data root.
5. Manifest includes:
   - `schemaVersion`
   - `databaseId`
   - `createdAt`
   - `updatedAt`
   - `appName`
6. Refactor local stores to use helper instead of repeating
   `path.join(process.cwd(), ".data")`.

Verification:

- `rtk corepack pnpm lint`
- `rtk corepack pnpm typecheck`
- `rtk corepack pnpm test`
- app still reads current `.data`
- images still load in Inventory and draft pages

## Phase 2: Atomic Local JSON Writes

Goal:

Make current storage safer before backup/import work.

Tasks:

1. Add `lib/data/json-store.ts`.
2. Implement:
   - ensure directory
   - read JSON with fallback/normalization caller
   - write temp file
   - rename temp file to final path
   - per-file write queue
3. Move draft, session, watcher, and AI settings writes onto this helper.
4. Keep each repository's domain normalization where it is.

Verification:

- tests for temp-write behavior
- tests for malformed JSON handling if implemented
- existing test suite
- manual create item -> generate listing -> save draft still works

## Phase 3: Export Archive

Goal:

Export a complete portable backup.

Recommended output:

`vintedauto-export-YYYYMMDD-HHMMSS.vintedauto.zip`

Tasks:

1. Add `lib/data-portability/export-database.ts`.
2. Add archive dependency only if needed. Prefer small pure JS zip library.
3. Build export manifest.
4. Include:
   - `drafts.json`
   - `studio-sessions.json`
   - `inbox-watcher.json` sanitized
   - `ai-settings.json` sanitized
   - `database-manifest.json`
   - `session-photo-assets/**`
   - `draft-images/**`
5. Exclude:
   - dev server logs
   - local CLI temp runs
   - backups folder
   - API keys by default
6. Add route/action for downloading archive.
7. Add Settings -> Database panel with `Export backup`.

Verification:

- export archive exists
- archive contains JSON and image folders
- no API keys in archive by default
- every draft image `storagePath` exists in archive
- every session photo `storagePath` exists in archive

## Phase 4: Import Validation

Goal:

Read an archive and report whether it can be imported.

Tasks:

1. Add `lib/data-portability/validate-database-import.ts`.
2. Validate archive manifest.
3. Validate JSON parse.
4. Validate required top-level files.
5. Validate image paths referenced by:
   - draft images
   - photo assets
6. Report counts:
   - sessions
   - stock items
   - drafts
   - draft images
   - session photo assets
7. Report warnings:
   - missing watcher folder
   - redacted AI settings
   - newer schema version
   - missing optional files

Verification:

- good fixture passes
- missing image fixture fails before write
- bad JSON fixture fails before write

## Phase 5: Replace Current Import

Goal:

Safely replace the current database with an imported one.

Tasks:

1. Pause watcher before import.
2. Create pre-import backup archive.
3. Validate incoming archive.
4. Extract to temporary folder under data root parent.
5. Replace current data root using directory move.
6. Write/update local database manifest.
7. Reset watcher health to idle.
8. Revalidate app routes.

Important:

Do not preserve old `processedFingerprints` blindly if watched folder path
differs from the new computer.

Verification:

- import good backup into empty database
- Inventory rows appear
- draft images load
- session photos load
- API keys are absent unless explicitly imported later
- failed import leaves old database intact

## Phase 6: Create/Open Database Folder

Goal:

Let the user work from multiple databases.

Tasks:

1. Add Settings -> Database path form.
2. Support `Create database`:
   - create folder
   - create manifest
   - create empty JSON stores
3. Support `Open database`:
   - validate folder
   - save chosen path in local config outside the data root
4. Store selected data root in a machine-local config file, not inside the
   database itself.
5. Keep env var override for development.

Local config candidate:

`.config/vintedauto/local-config.json`

or OS-specific app config later.

Verification:

- app opens a new empty database
- app switches back to old database
- database path survives app restart

## Phase 7: Merge Import

Goal:

Merge backup data into current database.

This is not MVP.

Conflict rules needed first:

- same draft ID, newer `updatedAt` wins
- same stock item ID, newer `updatedAt` wins
- missing imported image blocks that item unless recovery mode exists
- manual edits beat generated fields when timestamps conflict
- watcher state is not merged by default
- AI settings are not merged by default

Add this only after replace import is proven.

## Settings UI

Add a `Database` section under Settings.

Fields:

- Current database
- Database ID
- Last backup
- Sessions
- Inventory items
- Drafts
- Image files

Actions:

- Export backup
- Import backup
- Create database
- Open database folder

Danger-zone actions:

- Replace current database
- Include secrets in export

Use explicit warning copy for destructive actions.

## Test Plan

Unit tests:

- manifest normalization
- data-root override
- export includes referenced files
- export redacts AI keys
- import validation rejects missing files
- import validation rejects bad schema

Integration/manual:

- create item on PC A
- export backup
- import on PC B
- Inventory row appears
- draft image loads
- Vinted extension stock endpoint still lists linked drafts

## Recommended First PR

Build Phase 1 and Phase 2 together:

`central data root + atomic JSON store`

Reason:

Export/import safety depends on knowing all data paths and reducing corruption
risk. This first PR changes no user workflow and gives the next PR a safe base.
