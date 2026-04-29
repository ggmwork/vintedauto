# AI Provider Architecture

Last updated: 2026-04-29

## Purpose

This document defines the recommended architecture for multi-provider AI support.

## Design principles

### 1. Route by task, not only by provider

Do not keep one global `AI_PROVIDER` as the long-term design.

Instead, route by task:

- `listing_generation`
- `photo_descriptor_extraction`

Later tasks may include:

- `title_regeneration`
- `description_rewrite`
- `pricing_reasoning`

### 2. Keep one canonical schema in the app

Every provider must return data that normalizes into the same internal schema.

The app owns:

- request shape
- validation
- persistence
- fallback behavior

The model does not own business logic.

### 3. Keep providers server-side only

Provider clients and API keys must live on the server only.

The browser should never receive:

- OpenAI API keys
- Anthropic API keys
- provider-specific raw credentials

### 4. Start explicit, then automate

Start with:

- explicit provider per task
- explicit model per task

Add later:

- fallback chains
- automatic routing
- health-based failover

## Recommended config model

### Global mode

- `AI_ROUTER_MODE=manual`
- later: `AI_ROUTER_MODE=fallback`

### Listing task

- `AI_LISTING_PROVIDER=ollama|openai|anthropic`
- `AI_LISTING_MODEL=...`

### Grouping task

- `AI_GROUPING_PROVIDER=ollama|openai|anthropic`
- `AI_GROUPING_MODEL=...`

### Provider credentials

- `OLLAMA_BASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_GROUPING_MODEL`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `ANTHROPIC_GROUPING_MODEL`

## Recommended code shape

### Provider registry

Create a provider registry that can return task-specific services.

Suggested shape:

- `getListingGenerationService()`
- `getPhotoDescriptorService()`

But each should resolve through task config, not one global provider switch.

### Provider adapters

Implement one adapter per provider:

- `openai-listing-generation-service`
- `anthropic-listing-generation-service`
- `ollama-listing-generation-service`
- `openai-photo-descriptor-service`
- `anthropic-photo-descriptor-service`
- `ollama-photo-descriptor-service`

### Normalization layer

Each adapter should:

1. call provider API
2. parse provider response
3. normalize into app schema
4. validate
5. return canonical result

## Provider-specific recommendations

### OpenAI

Best implementation:

- use **Responses API**
- use **image inputs**
- use **structured outputs / JSON schema**

This is the cleanest path for structured listing generation.

### Anthropic

Best implementation:

- use **Messages API**
- use **vision input**
- use **tool use** with one forced schema tool:
  - `emit_listing`
  - `emit_photo_descriptor`

This is the best path for structured outputs on Claude.

### Ollama

Best implementation:

- keep current direct API path initially
- optionally migrate later to the OpenAI-compatible API surface for consistency

Ollama should stay the local-first option.

## UI and settings recommendation

Do not start with a large settings system.

Start with:

- env-based config
- one debug/status page later

Then add:

- provider selector for listing
- provider selector for grouping
- model selector per provider
- `Test connection`
- `Use as default`

## Logging and observability

Store per request:

- provider
- model
- task
- duration
- success / failure
- failure type

This is required if the app will switch models and providers.

## Success criteria

This architecture is successful when:

- listing generation can use OpenAI, Anthropic, or Ollama
- grouping can use a different provider than listing generation
- outputs still persist in one app schema
- switching models does not require UI rewrites
- provider failure can be diagnosed cleanly
