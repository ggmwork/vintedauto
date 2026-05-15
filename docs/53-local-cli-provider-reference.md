# Local CLI Provider Reference

Last updated: 2026-05-15

## Provider Name

Use:

```txt
local-cli
```

This means:

`use a locally installed AI agent CLI, authenticated outside this app`

It does not mean:

`use OpenAI API or Anthropic API`

## Engine Names

Initial supported engines:

```txt
codex
```

Future engines:

```txt
claude
```

Do not expose arbitrary command names.

## Environment Variables

Recommended variables:

```env
LOCAL_CLI_ENABLED="false"
LOCAL_CLI_ENGINE="codex"
LOCAL_CLI_MODEL=""
LOCAL_CLI_TIMEOUT_MS="300000"
LOCAL_CLI_KEEP_RUNS="false"
```

Provider routing:

```env
AI_LISTING_PROVIDER="local-cli"
AI_GROUPING_PROVIDER="ollama"
```

Recommended default:

Keep grouping on `ollama`. Grouping is frequent and lower value per call. Listing generation is where stronger CLI models are worth the quota.

## Codex Command Contract

Command shape:

```txt
codex exec
  --cd <runDir>
  --sandbox read-only
  --ask-for-approval never
  --ephemeral
  --ignore-rules
  --output-schema <schemaPath>
  --output-last-message <resultPath>
  --image <imagePath>
  --image <imagePath>
  -
```

Optional:

```txt
--model <model>
--json
```

Input:

- prompt on stdin
- selected images as local files
- JSON schema as local file

Output:

- final message in `<resultPath>`
- stdout/stderr captured only for diagnostics

Parsing rule:

1. read result file
2. extract JSON object if wrapper text exists
3. parse JSON
4. validate against existing listing schema parser
5. normalize to `GenerationResult`

## Claude Command Contract

Only after verified locally:

```txt
claude -p "<prompt>"
  --output-format json
  --max-turns 1
  --cwd <runDir>
```

If the installed Claude CLI cannot attach product images cleanly, do not use it for listing generation.

## Prompt Contract

The prompt must say:

- return one JSON object only
- match the provided schema exactly
- do not include markdown
- do not invent brand, size, material, or condition when uncertain
- include uncertainty in notes/rationale fields
- generate for Vinted
- language stays controlled by app input

Prompt should include:

- existing `buildListingPrompt`
- schema reminder
- image count
- marketplace: Vinted
- currency: EUR

## Run Directory Contract

Directory contents:

```txt
run/
  image-01.jpg
  image-02.jpg
  listing-generation.schema.json
  prompt.txt
  result.json
```

Default behavior:

- create under OS temp or ignored `.data/local-cli-runs`
- delete after success/failure
- keep only when `LOCAL_CLI_KEEP_RUNS=true`

## Command Runner Rules

Use Node `spawn`.

Required:

- `shell: false`
- fixed executable path or allowlisted executable name
- fixed arg list
- stdin pipe for prompt
- timeout
- process kill on timeout
- stdout cap
- stderr cap
- no inherited secrets except what the CLI needs for its own auth store

Never:

- concatenate shell commands
- pass user text as command arguments when stdin works
- allow model output to choose files or commands
- run with write access to repo
- run with `danger-full-access`

## Error Messages

Missing CLI:

```txt
Local CLI provider is selected, but Codex CLI was not found on PATH.
```

Feature disabled:

```txt
Local CLI provider is disabled. Enable LOCAL_CLI_ENABLED before using local agent CLI generation.
```

Timeout:

```txt
Codex CLI generation timed out after 300000 ms.
```

Bad output:

```txt
Codex CLI returned output that did not match the listing schema.
```

Quota/login:

```txt
Codex CLI could not run. Open a terminal, run codex, and check login or plan limits.
```

## Where To Hook In Code

Likely files:

- `types/ai.ts`
- `types/generation.ts`
- `lib/ai/provider-config.ts`
- `lib/ai/index.ts`
- `lib/ai/provider-health.ts`
- `lib/ai/local-cli-command-runner.ts`
- `lib/ai/local-cli-listing-generation-service.ts`
- `lib/settings/ai-settings.ts`
- `lib/settings/ai-settings-view.ts`
- `components/app/ai-settings-page.tsx`
- `app/actions.ts`
- `.env.example`

Tests:

- `tests/local-cli-command-runner.test.ts`
- `tests/local-cli-listing-generation-service.test.ts`
- update `tsconfig.tests.json`

## Best First Manual Test

Use one existing draft with 2-4 product photos.

Set:

```env
LOCAL_CLI_ENABLED="true"
LOCAL_CLI_ENGINE="codex"
AI_LISTING_PROVIDER="local-cli"
AI_GROUPING_PROVIDER="ollama"
```

Then:

1. open draft detail
2. click Generate
3. confirm draft fills title, description, metadata, price
4. confirm review page shows `local-cli:codex`
5. compare factual accuracy against photos
6. reload page and confirm persisted result

Do not test first with bulk generation. One draft first.
