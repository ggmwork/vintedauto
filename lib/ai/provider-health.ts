import "server-only";

import {
  buildOllamaPullCommand,
  getOllamaCompatibilityIssue,
} from "@/lib/ai/ollama-presets";
import {
  getAnthropicBaseUrl,
  getGroupingProviderConfig,
  getListingProviderConfig,
  getOllamaBaseUrl,
  getOpenAiBaseUrl,
  requireProviderApiKey,
  requireProviderModel,
} from "@/lib/ai/provider-config";
import type { AiProvider, AiProviderTestResult, AiTask } from "@/types/ai";

function getTasksUsingProvider(provider: AiProvider): AiTask[] {
  const tasks: AiTask[] = [];

  if (getListingProviderConfig().provider === provider) {
    tasks.push("listing");
  }

  if (getGroupingProviderConfig().provider === provider) {
    tasks.push("grouping");
  }

  return tasks;
}

function getModelsUsingProvider(provider: AiProvider) {
  const taskModels: Array<{ task: AiTask; model: string }> = [];

  for (const task of getTasksUsingProvider(provider)) {
    taskModels.push({
      task,
      model: requireProviderModel(task, provider),
    });
  }

  return taskModels;
}

function createResult(
  provider: AiProvider,
  status: AiProviderTestResult["status"],
  message: string
): AiProviderTestResult {
  return {
    provider,
    status,
    message,
    testedAt: new Date().toISOString(),
  };
}

async function testOllamaProvider() {
  const response = await fetch(`${getOllamaBaseUrl()}/api/tags`, {
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${errorText || "unknown error"}`);
  }

  const payload = (await response.json()) as {
    models?: Array<{ name?: string }>;
  };
  const availableModels = new Set(
    (payload.models ?? [])
      .map((model) => model.name?.trim())
      .filter((value): value is string => Boolean(value))
  );
  const taskModels = getModelsUsingProvider("ollama");
  const compatibilityIssues = taskModels
    .map((entry) => {
      const issue = getOllamaCompatibilityIssue(entry.task, entry.model);

      if (!issue) {
        return null;
      }

      return `${entry.task}:${issue}`;
    })
    .filter((value): value is string => Boolean(value));

  if (compatibilityIssues.length > 0) {
    throw new Error(compatibilityIssues.join(" "));
  }

  const missingModels = taskModels
    .map((entry) => entry.model)
    .filter((model) => !availableModels.has(model));

  if (missingModels.length > 0) {
    const pullCommands = missingModels.map((model) => buildOllamaPullCommand(model));
    throw new Error(
      `Connected to Ollama, but these configured models are missing: ${missingModels.join(
        ", "
      )}. Run ${pullCommands.join(" and ")}.`
    );
  }

  return createResult(
    "ollama",
    "success",
    taskModels.length > 0
      ? `Connected. Ready for ${taskModels.map((entry) => `${entry.task}:${entry.model}`).join(", ")}.`
      : "Connected. No active task is currently using Ollama."
  );
}

async function testOpenAiProvider() {
  const apiKey = requireProviderApiKey("openai");
  const taskModels = getModelsUsingProvider("openai");

  if (taskModels.length === 0) {
    const response = await fetch(`${getOpenAiBaseUrl()}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${errorText || "unknown error"}`);
    }

    return createResult(
      "openai",
      "success",
      "Connected. No active task is currently using OpenAI."
    );
  }

  for (const taskModel of taskModels) {
    const response = await fetch(
      `${getOpenAiBaseUrl()}/models/${encodeURIComponent(taskModel.model)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI model check failed for ${taskModel.model} (${response.status}): ${errorText || "unknown error"}`
      );
    }
  }

  return createResult(
    "openai",
    "success",
    `Connected. Ready for ${taskModels.map((entry) => `${entry.task}:${entry.model}`).join(", ")}.`
  );
}

async function testAnthropicProvider() {
  const apiKey = requireProviderApiKey("anthropic");
  const taskModels = getModelsUsingProvider("anthropic");

  if (taskModels.length === 0) {
    const response = await fetch(`${getAnthropicBaseUrl()}/models`, {
      headers: {
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic request failed (${response.status}): ${errorText || "unknown error"}`);
    }

    return createResult(
      "anthropic",
      "success",
      "Connected. No active task is currently using Anthropic."
    );
  }

  for (const taskModel of taskModels) {
    const response = await fetch(
      `${getAnthropicBaseUrl()}/models/${encodeURIComponent(taskModel.model)}`,
      {
        headers: {
          "anthropic-version": "2023-06-01",
          "x-api-key": apiKey,
        },
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Anthropic model check failed for ${taskModel.model} (${response.status}): ${errorText || "unknown error"}`
      );
    }
  }

  return createResult(
    "anthropic",
    "success",
    `Connected. Ready for ${taskModels.map((entry) => `${entry.task}:${entry.model}`).join(", ")}.`
  );
}

export async function testAiProviderConnection(provider: AiProvider) {
  try {
    switch (provider) {
      case "ollama":
        return await testOllamaProvider();
      case "openai":
        return await testOpenAiProvider();
      case "anthropic":
        return await testAnthropicProvider();
    }
  } catch (error) {
    return createResult(
      provider,
      "failed",
      error instanceof Error ? error.message : "Connection test failed."
    );
  }
}
