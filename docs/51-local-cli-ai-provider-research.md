# Local CLI AI Provider Research

Last updated: 2026-05-15

## Purpose

This document answers one question:

`what is the best way to let Vinted Auto use local AI CLIs like Codex or Claude Code so the user can use subscription-based CLI access instead of API keys?`

## Short Answer

Best path:

- add a new experimental provider: `local-cli`
- keep it server-side only
- start with listing generation only
- start with Codex CLI because it is installed here and supports image input plus JSON schema output
- add Claude Code later after it is installed and its image-input path is verified
- keep OpenAI API, Anthropic API, and Ollama as the reliable provider paths

Do not automate `chatgpt.com` or `claude.ai` browser sessions.

Do not scrape interactive terminal UIs.

Use official non-interactive CLI modes:

- `codex exec`
- `claude -p`

## Current Local Machine Finding

Observed on 2026-05-15:

- `codex` is installed
- `codex --version` returns `codex-cli 0.130.0-alpha.5`
- `codex exec --help` exposes:
  - `--image`
  - `--model`
  - `--sandbox`
  - `--ask-for-approval`
  - `--cd`
  - `--ephemeral`
  - `--ignore-user-config`
  - `--ignore-rules`
  - `--output-schema`
  - `--json`
  - `--output-last-message`
- `claude` is not installed on this machine

Implication:

Codex is the only local CLI provider that can be implemented and smoke-tested here without installing another tool.

## Official Docs Findings

### Codex CLI

OpenAI docs say Codex CLI is a local terminal coding agent. It can read, change, and run code in the selected directory. ChatGPT Plus, Pro, Business, Edu, and Enterprise plans include Codex. First run prompts the user to authenticate with a ChatGPT account or API key.

OpenAI also documents Codex as available through local clients including the CLI and IDE extension.

Important local help finding:

`codex exec` is the correct non-interactive mode for app integration. It can accept image paths and a JSON schema for the final response.

### Claude Code

Anthropic docs say Claude Code can be connected to Pro or Max plan credentials. They also state that if `ANTHROPIC_API_KEY` is set, Claude Code uses that API key instead of the subscription allocation.

Anthropic's Claude Code SDK docs define non-interactive mode:

- `claude -p "query"`
- `--output-format json`
- `--output-format stream-json`
- `--input-format stream-json`
- `--max-turns`
- `--cwd`
- `--allowedTools`
- `--disallowedTools`

Important limitation:

The documented streaming JSON input is text-only. Image handling must be verified against an installed `claude` CLI before using it for product photo reading.

## What OpenDesign Is Doing

OpenDesign does not use the consumer chat website as an API.

It delegates to local coding-agent CLIs already installed on the machine.

The pattern is:

`web app/local daemon -> spawn local CLI -> CLI uses its own login/subscription -> output parsed back into app`

OpenDesign also supports BYOK API proxy mode, but the subscription-like path is CLI delegation.

## Recommended Architecture

Add one provider class, not one-off command calls:

`local-cli-listing-generation-service`

Keep the same app contract:

`ListingGenerationInput -> GenerationResult`

The local CLI provider should be another adapter behind the existing provider router:

`ollama | openai | anthropic | local-cli`

Do not let the CLI own business logic.

The app must still own:

- image selection
- prompt construction
- output schema
- parsing
- validation
- persistence
- fallback/error display

## First Adapter: Codex

Recommended command shape:

```txt
codex exec
  --cd <isolated-run-directory>
  --sandbox read-only
  --ask-for-approval never
  --ephemeral
  --ignore-rules
  --output-schema <listing-generation.schema.json>
  --output-last-message <result.json>
  --image <image-1.jpg>
  --image <image-2.jpg>
  -
```

Prompt should be piped on stdin.

Node implementation should use:

- `spawn(command, args, { shell: false })`
- no shell string building
- timeout with forced process kill
- capped stdout/stderr collection
- schema validation after reading `result.json`

Do not use:

- interactive `codex`
- browser automation
- `--dangerously-bypass-approvals-and-sandbox`
- workspace-write mode
- unrestricted inherited environment

## Claude Adapter Later

Do not build Claude first on this machine because `claude` is absent.

When installed, first verify:

```txt
claude -p "Return JSON only: {\"ok\": true}" --output-format json
```

Then verify image support with real product photos. If image input is not cleanly supported by the installed CLI, keep Claude Code out of listing generation and use it only for future text tasks.

## Security Boundary

This provider runs a local executable. Treat it as more dangerous than HTTP API calls.

Required controls:

- local-only feature flag, disabled in production by default
- allowlist engines: `codex`, later `claude`
- resolve binary path with controlled lookup
- no user-provided command strings
- no `shell: true`
- isolated temporary run directory
- copy only selected images and schema into the run directory
- do not expose `.env`, `.data`, repo files, or draft storage paths to the CLI
- default sandbox: read-only
- approval mode: never
- hard timeout
- output size limit
- structured parser rejects non-JSON
- final app schema validation still runs
- diagnostics must redact paths and never print auth/session material

## Product Boundary

`local-cli` is useful for this user's local desktop workflow.

It is not a hosted SaaS provider.

Hosted deployment should keep using API providers or Ollama on controlled infrastructure.

## Recommendation

Build this in phases:

1. Document and expose `local-cli` as experimental.
2. Add connection test that checks `codex exec --help`, not a real paid generation.
3. Add Codex listing generation behind explicit provider selection.
4. Verify with one known draft and compare against current Ollama/OpenAI output.
5. Add UI warnings and diagnostics.
6. Add Claude Code only after local installation and image support verification.

## Sources

- [Codex CLI docs](https://developers.openai.com/codex/cli)
- [Using Codex with your ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)
- [Claude Code with Pro or Max plan](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)
- [Claude Code SDK docs](https://docs.anthropic.com/en/docs/claude-code/sdk)
- [Claude Code models, usage, and limits](https://support.claude.com/en/articles/14552983-models-usage-and-limits-in-claude-code)
- [OpenDesign public site](https://opendesigner.io/)
- [OpenDesign GitHub README](https://github.com/manalkaff/opendesign)
