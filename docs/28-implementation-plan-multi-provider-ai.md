# Implementation Plan: Multi-Provider AI

Last updated: 2026-04-29

## Purpose

This plan covers the work needed to support OpenAI, Anthropic, and Ollama cleanly.

## Goal

Target outcome:

`one app -> multiple providers -> per-task model switching -> one normalized result shape`

## Phase A - Config foundation

Goal:

Move from one global provider switch to task-based config.

Tasks:

- keep current `AI_PROVIDER` only as backward-compatibility fallback
- add:
  - `AI_ROUTER_MODE`
  - `AI_LISTING_PROVIDER`
  - `AI_GROUPING_PROVIDER`
  - `AI_LISTING_MODEL`
  - `AI_GROUPING_MODEL`
- add Anthropic env placeholders

Deliverable:

Config can choose different providers for listing and grouping.

## Phase B - Provider registry refactor

Goal:

Route service resolution by task config.

Tasks:

- refactor `lib/ai/index.ts`
- add task-based provider resolution
- add grouping provider resolution
- keep existing Ollama implementation working

Deliverable:

Provider lookup is no longer hard-coded around one global flag.

## Phase C - OpenAI provider

Goal:

Implement real OpenAI support.

Tasks:

- add OpenAI listing adapter
- use Responses API
- use image inputs
- use structured outputs
- normalize and validate output

Deliverable:

Listing generation works with OpenAI API.

## Phase D - Anthropic provider

Goal:

Implement real Claude support.

Tasks:

- add Anthropic listing adapter
- use Messages API
- use vision input
- use one forced tool schema for structured output
- normalize and validate output

Deliverable:

Listing generation works with Anthropic API.

## Phase E - Grouping providers

Goal:

Support provider switching for descriptor extraction too.

Tasks:

- add OpenAI descriptor adapter
- add Anthropic descriptor adapter
- keep Ollama descriptor adapter
- route grouping task separately from listing task

Deliverable:

Grouping can use a cheaper or local model while listings use a stronger remote model.

## Phase F - Health checks and error handling

Goal:

Make provider switching usable in practice.

Tasks:

- test connection per provider
- show missing credential errors clearly
- show timeout / quota / auth failures clearly
- store provider and model in results

Deliverable:

Failures are diagnosable instead of opaque.

## Phase G - Settings UI

Goal:

Make provider switching user-visible.

Tasks:

- AI settings page
- provider selector per task
- model string input per provider
- local health status

Deliverable:

User can switch providers without editing code.

## Phase H - Fallback chains later

Goal:

Add resilience only after the explicit mode is stable.

Tasks:

- fallback chain config
- provider retry policy
- optional manual `Retry with another provider`

Deliverable:

The app can recover from provider failures without complex guessing.

## Recommended order

1. config foundation
2. provider registry refactor
3. OpenAI provider
4. Anthropic provider
5. grouping providers
6. health checks
7. settings UI
8. fallback chains later

## Recommended first milestone

The first real milestone should be:

- listing generation works with:
  - Ollama
  - OpenAI
  - Anthropic
- grouping still works with Ollama
- provider selection is env-driven

Reason:

This is the smallest useful multi-provider slice.

## Verification

Each provider implementation should be verified with:

1. listing generation from the same photo set
2. schema validation success
3. provider/model persistence in saved output
4. useful failure message on bad credentials
5. useful failure message on timeout
