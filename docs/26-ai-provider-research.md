# AI Provider Research

Last updated: 2026-04-29

## Purpose

This document answers one question:

`what is the best way to let the app switch between ChatGPT/OpenAI, Claude/Anthropic, and local Ollama models?`

## Short answer

Best approach:

- use one server-side provider router
- route by task, not just one global provider
- support:
  - `openai`
  - `anthropic`
  - `ollama`
- keep one canonical output schema in the app
- make provider/model selection configurable per task

Do not build this around consumer chat logins.

For backend integration, use:

- OpenAI API keys
- Anthropic API keys
- local Ollama runtime

## Current repo state

Right now the app has:

- `AI_PROVIDER=ollama`
- one active listing provider: Ollama
- one photo descriptor path: Ollama + fallback descriptor logic
- an `openai` provider placeholder, but not implemented
- no Anthropic integration

So the app already has the start of an abstraction, but it is too shallow.

## Research findings

### 1. OpenAI

Official docs show:

- the **Responses API** is OpenAI’s main modern interface
- it supports **image inputs**
- it supports **structured outputs / JSON schema**

This makes OpenAI a strong fit for:

- listing generation
- image understanding
- schema-constrained outputs

Implication:

OpenAI is a good remote provider for high-quality structured listing generation.

### 2. Anthropic

Official docs show:

- the **Messages API** is Anthropic’s main API
- Claude supports **vision**
- Anthropic tool use supports **`input_schema`**
- `tool_choice` can force a specific tool call

Implication:

The best structured-output path for Claude is not “hope it prints JSON”.

The better path is:

- define one tool like `emit_listing`
- give it an `input_schema`
- force tool use
- read the structured arguments

That gives a much cleaner integration surface for schema-based outputs.

### 3. Ollama

Official docs show:

- Ollama supports **vision**
- Ollama supports **structured outputs**
- Ollama supports **OpenAI-compatible endpoints**
- Ollama now also supports `/v1/responses`

Implication:

Ollama can stay as the local provider and can be wrapped more cleanly later behind an OpenAI-compatible client if useful.

### 4. Consumer apps vs APIs

The official OpenAI and Anthropic docs are both API-key based.

Inference:

- `chatgpt.com` / ChatGPT consumer access is not the right backend integration surface
- `claude.ai` consumer access is not the right backend integration surface

For this app, “ChatGPT” should mean **OpenAI API**, and “Claude” should mean **Anthropic API**.

## Recommended provider roles

Best first split:

### Listing generation

Priority:

1. OpenAI API
2. Anthropic API
3. Ollama

Reason:

- this task needs good image understanding
- good structured output reliability matters
- wording quality matters

### Photo descriptor / grouping extraction

Priority:

1. Ollama
2. OpenAI API
3. Anthropic API

Reason:

- grouping is frequent and can become expensive
- local inference is useful here
- descriptor extraction is smaller and more repetitive than listing generation

### Fallback logic

Best fallback order at the start:

- manual configuration first
- automatic fallback later

Do not start with a “smart router”.

Start with explicit task-based provider selection.

## Recommendation

Best implementation direction:

1. add Anthropic provider
2. implement real OpenAI provider
3. split config by task:
   - `listing`
   - `grouping`
4. add simple provider/model switch settings
5. add health checks
6. add fallback chains later

## Sources

- [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses/compact?api-mode=responses)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs?lang=javascript)
- [OpenAI Images and Vision](https://platform.openai.com/docs/guides/images-vision?api-mode=responses&format=file)
- [OpenAI model comparison](https://platform.openai.com/docs/models/compare)
- [Anthropic API overview](https://docs.anthropic.com/en/api/overview)
- [Anthropic Messages API examples](https://docs.anthropic.com/en/api/messages-examples)
- [Anthropic Vision guide](https://docs.anthropic.com/en/docs/build-with-claude/vision)
- [Anthropic tool use implementation](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use)
- [Anthropic models overview](https://docs.anthropic.com/en/docs/models-overview)
- [Ollama API](https://docs.ollama.com/api)
- [Ollama Vision](https://docs.ollama.com/capabilities/vision)
- [Ollama Structured Outputs](https://docs.ollama.com/capabilities/structured-outputs)
- [Ollama OpenAI compatibility](https://docs.ollama.com/openai)
