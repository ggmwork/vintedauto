# Implementation Plan: Local CLI AI Provider

Last updated: 2026-05-15

## Purpose

This plan adds a local CLI provider so Vinted Auto can use local agent CLIs such as Codex CLI and later Claude Code.

## Goal

Target outcome:

`draft photos -> local CLI provider -> canonical GenerationResult -> existing review/edit/Vinted handoff flow`

## Non-Goals

- no browser automation of ChatGPT or Claude
- no private provider session scraping
- no hosted production dependency on a user's desktop CLI
- no automatic CLI install
- no local command execution chosen by model output
- no final Vinted submit automation

## Phase 1 - Provider Contract

Status: implemented 2026-05-15.

Goal:

Add `local-cli` to the provider model without changing generation behavior.

Tasks:

- extend `AiProvider`
- extend `GenerationResult.provider`
- add config placeholders:
  - `LOCAL_CLI_ENGINE=codex`
  - `LOCAL_CLI_MODEL=`
  - `LOCAL_CLI_TIMEOUT_MS=300000`
  - `LOCAL_CLI_ENABLED=false`
- keep `AI_PROVIDER` backward compatibility
- update settings view model for provider status

Deliverable:

`local-cli` can appear as an experimental provider but does not run generation yet.

Verification:

- typecheck passes
- existing tests pass
- settings page renders

## Phase 2 - Codex Health Check

Status: implemented 2026-05-15.

Goal:

Detect whether local CLI generation is possible without spending subscription quota.

Tasks:

- add `testLocalCliProvider`
- resolve configured engine
- for Codex, run `codex exec --help`
- capture version with `codex --version`
- fail clearly if CLI is absent
- fail clearly if feature flag is off
- do not run model generation in health check

Deliverable:

Settings can show:

- CLI installed
- selected engine
- detected version
- provider still requires real generation smoke test

Verification:

- mocked command-runner tests
- manual local check: installed Codex is detected

## Phase 3 - Codex Listing Adapter

Status: implemented 2026-05-15.

Goal:

Generate one listing from photos through `codex exec`.

Tasks:

- add `lib/ai/local-cli-command-runner.ts`
- add `lib/ai/local-cli-listing-generation-service.ts`
- create an isolated run directory per request
- write selected images into the run directory
- write `listing-generation.schema.json`
- pipe prompt through stdin
- call `codex exec` with:
  - `--cd <runDir>`
  - `--sandbox read-only`
  - `--ask-for-approval never`
  - `--ephemeral`
  - `--ignore-rules`
  - `--output-schema <schemaFile>`
  - `--output-last-message <resultFile>`
  - repeated `--image <imageFile>`
- parse `resultFile`
- normalize with existing `buildCanonicalGenerationResult`
- store provider as `local-cli`
- store model as `codex:<model or default>`

Deliverable:

Manual draft generation works with Codex CLI.

Verification:

- command-runner unit tests
- parse-success test with fixture output
- parse-failure test with malformed output
- timeout test
- one manual generation against a local draft

## Phase 4 - Settings UI

Status: implemented 2026-05-15.

Goal:

Make local CLI provider usable without editing `.env.local`.

Tasks:

- add `Local CLI` option to listing provider selector
- keep grouping provider off or disabled until separately implemented
- add local CLI details panel:
  - enabled flag
  - engine selector
  - model input
  - timeout input
  - installed status
- add warning copy:
  - local only
  - uses user's CLI login/subscription
  - may hit CLI plan limits
  - not suitable for hosted deployment

Deliverable:

User can switch listing generation to Codex CLI from settings.

Verification:

- settings form saves and reloads
- health test result persists
- disabled flag prevents accidental use

## Phase 5 - Benchmark Against Current Providers

Status: not implemented.

Goal:

Know whether local CLI output is good enough before making it default.

Tasks:

- use the planned AI vision benchmark fixtures
- compare:
  - Ollama
  - Codex CLI
  - OpenAI API if key exists
  - Anthropic API if key exists
- score:
  - product type
  - color/material
  - condition/defects
  - category hint
  - title quality
  - description factuality
  - price rationale usefulness

Deliverable:

Decision on whether `local-cli` becomes preferred local listing provider.

Verification:

- benchmark output saved under docs or ignored local report
- no provider switch based on vibes only

## Phase 6 - Claude Code Adapter

Status: not implemented. Blocked until `claude` is installed locally and image
input is verified.

Goal:

Add Claude Code only if local CLI support is viable.

Prerequisites:

- `claude` installed
- logged in with Pro or Max plan
- image input path verified
- JSON output path verified

Tasks:

- add `LOCAL_CLI_ENGINE=claude`
- use `claude -p`
- request `--output-format json`
- cap `--max-turns`
- restrict tools with allow/deny flags
- parse JSON envelope and extract result

Deliverable:

Claude Code can be selected as another `local-cli` engine when available.

Verification:

- same command-runner tests as Codex
- one manual product-photo generation

## Recommended First Build Slice

Smallest useful implementation:

1. Phase 1 provider contract
2. Phase 2 Codex health check
3. Phase 3 Codex listing adapter

Leave UI polish and Claude Code until after Codex proves listing quality.

## Risk Controls

- feature flag defaults off
- generation errors are non-destructive and return to draft page
- manual edits and manual final Vinted submit remain unchanged
- no automatic process runs during page load
- one generation equals one explicit user action
- no CLI provider for background bulk generation until benchmarked

## Acceptance Criteria

The local CLI provider is ready for real use when:

- Codex is detected from settings
- one draft listing can be generated from images
- output validates against the canonical schema
- draft review page shows `local-cli:codex`
- malformed CLI output shows a clear error
- timeout shows a clear error
- no repo files are edited by the spawned CLI
- existing Ollama/OpenAI/Anthropic providers still work
