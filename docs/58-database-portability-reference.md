# Database Portability Reference

Last updated: 2026-05-18

## Purpose

Technical reference for import, export, and database-folder work.

Use with:

- [56-database-portability-plan.md](./56-database-portability-plan.md)
- [57-implementation-plan-database-portability.md](./57-implementation-plan-database-portability.md)

## Current Data Inventory

Current default data root:

`.data`

Current files:

| Path | Owner | Required | Notes |
| --- | --- | --- | --- |
| `drafts.json` | `lib/drafts/local-draft-repository.ts` | yes | Draft metadata, generated listing fields, Vinted handoff state, draft image records |
| `studio-sessions.json` | `lib/intake/local-studio-session-repository.ts` | yes | Sessions, photo assets, stock items, grouping runs |
| `inbox-watcher.json` | `lib/watcher/local-inbox-watcher-store.ts` | no | Watched folder config, fingerprints, watcher health |
| `ai-settings.json` | `lib/settings/ai-settings.ts` | no | AI routing, model settings, optional API keys |
| `session-photo-assets/` | `lib/intake/local-photo-asset-storage.ts` | yes when sessions exist | Original watched/imported product photos |
| `draft-images/` | `lib/storage/local-draft-image-storage.ts` | yes when drafts have images | Images attached to generated/manual listing drafts |
| `dev-server.*.log` | local dev | no | Exclude from exports |

## Storage Path Rules

Session photo assets store relative paths like:

`<sessionId>/<photoAssetId>.<ext>`

Draft images store relative paths like:

`<draftId>/<imageId>.<ext>`

Import validation must ensure every referenced `storagePath` resolves inside its
expected folder.

Never trust archive paths directly. Normalize and reject traversal:

- `../`
- absolute paths
- drive roots
- UNC paths

## Database Manifest

File:

`database-manifest.json`

Recommended shape:

```json
{
  "app": "vintedauto",
  "schemaVersion": 1,
  "databaseId": "uuid",
  "createdAt": "2026-05-18T00:00:00.000Z",
  "updatedAt": "2026-05-18T00:00:00.000Z",
  "label": "Main Vinted database"
}
```

This manifest describes the active database folder.

## Export Manifest

Archive file:

`export-manifest.json`

Recommended shape:

```json
{
  "format": "vintedauto.database.export",
  "formatVersion": 1,
  "createdAt": "2026-05-18T00:00:00.000Z",
  "createdBy": {
    "app": "vintedauto",
    "appVersion": "0.1.0"
  },
  "database": {
    "databaseId": "uuid",
    "schemaVersion": 1,
    "label": "Main Vinted database"
  },
  "contents": {
    "sessions": 1,
    "stockItems": 6,
    "drafts": 5,
    "sessionPhotoAssets": 12,
    "draftImages": 12
  },
  "secrets": {
    "aiSettingsIncluded": true,
    "apiKeysIncluded": false
  },
  "files": [
    {
      "path": "data/drafts.json",
      "sha256": "..."
    }
  ]
}
```

## Archive Layout

Recommended zip layout:

```text
export-manifest.json
data/database-manifest.json
data/drafts.json
data/studio-sessions.json
data/inbox-watcher.json
data/ai-settings.json
session-photo-assets/<sessionId>/<photoAssetId>.<ext>
draft-images/<draftId>/<imageId>.<ext>
```

Excluded:

```text
dev-server.err.log
dev-server.out.log
backups/**
local-cli-runs/**
*.tmp
```

## AI Settings Sanitization

Default exported `ai-settings.json` must redact:

```json
{
  "openAiApiKey": null,
  "anthropicApiKey": null
}
```

Keep non-secret values:

- provider routing
- model names
- local CLI enabled flag
- local CLI engine
- timeout values
- base URLs

Consider excluding `lastTests` later if it becomes noisy.

## Watcher Import Policy

Watcher config is machine-specific.

On import:

- preserve `folderPath` only if user chooses to keep it
- otherwise set watcher to disabled or default local folder
- reset `health` to `idle`
- clear `lastError`
- keep `processedFingerprints` only when importing onto the same watched folder

Reason:

Old PC paths may not exist on the new PC.

## Replace Import Algorithm

```text
input: archive

1. pause watcher
2. validate archive manifest
3. extract archive into temp import folder
4. validate JSON files
5. validate referenced image files
6. export current data root as automatic backup
7. move current data root to rollback folder
8. move temp import folder into active data root
9. reset watcher machine-specific state if needed
10. reload pages
11. report import summary
```

If any step before 7 fails, no local data changes.

If step 8 fails, restore rollback folder.

## Merge Import Rules

Not MVP.

When implemented:

| Conflict | Rule |
| --- | --- |
| Same draft ID | newer `updatedAt` wins |
| Same stock item ID | newer `updatedAt` wins |
| Same image ID, same hash | keep one file |
| Same image ID, different hash | keep both and rewrite imported ID |
| Draft linked to missing stock item | import as manual draft with warning |
| Stock item linked to missing draft | keep stock item, clear missing `draftId` with warning |
| AI settings conflict | do not merge by default |
| Watcher conflict | do not merge by default |

Merge must produce a visible conflict report.

## Cloud Folder Rules

Portable database folders can live in a synced folder, but only one computer
should actively edit at a time.

Recommended lock file:

`.vintedauto.lock`

Shape:

```json
{
  "machineId": "DESKTOP-123",
  "pid": 12345,
  "startedAt": "2026-05-18T00:00:00.000Z",
  "lastHeartbeatAt": "2026-05-18T00:00:10.000Z"
}
```

Behavior:

- fresh lock from another machine: show warning and block writes by default
- stale lock: allow user to take over
- same machine lock: allow normal work

## API and Route Sketch

Server actions:

- `exportDatabaseAction()`
- `validateDatabaseImportAction(formData)`
- `replaceDatabaseFromImportAction(formData)`
- `createDatabaseAction(formData)`
- `openDatabaseAction(formData)`

Routes:

- `GET /api/database/export`
- optional later: `POST /api/database/import/validate`

UI:

- `Settings -> Database`

Do not add these actions to extension routes.

## User-Facing Copy

Use:

- `Database`
- `Current database`
- `Export backup`
- `Import backup`
- `Create database`
- `Open database`
- `This will replace current local data. A backup will be created first.`

Avoid:

- `dump`
- `raw store`
- `wipe`
- `sync` until true sync exists

## Verification Checklist

Export:

- archive downloads
- archive contains required JSON
- archive contains referenced images
- archive excludes dev logs
- archive redacts API keys

Import validation:

- valid archive passes
- missing JSON fails
- missing image fails
- invalid path fails
- newer schema warns or fails safely

Replace import:

- pre-import backup created
- current data replaced only after validation
- Inventory loads
- draft detail loads
- image APIs return 200
- extension stock endpoint still works

## Future Migration Notes

If SQLite becomes necessary:

- keep image files outside SQLite first
- store metadata in `vintedauto.sqlite`
- keep archive layout similar
- include DB plus image folders
- write migration from JSON bundle to SQLite bundle

If hosted sync becomes necessary:

- metadata: Postgres or Supabase
- files: object storage
- auth: required before data leaves local machine
- local cache: optional
- extension still fetches through the local app or authenticated API
