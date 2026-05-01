import {
  BotIcon,
  CheckCircle2Icon,
  CpuIcon,
  KeyRoundIcon,
  Settings2Icon,
  TriangleAlertIcon,
} from "lucide-react";

import {
  applyAiPresetAction,
  saveAiSettingsAction,
  testAiProviderConnectionAction,
} from "@/app/actions";
import {
  buildOllamaPullCommand,
  getRecommendedOllamaModelProfile,
  recommendedOllamaModelProfiles,
  recommendedOllamaPresets,
} from "@/lib/ai/ollama-presets";
import { PendingSubmitButton } from "@/components/app/pending-submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AiProvider, AiProviderTestResult } from "@/types/ai";

const inputClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function formatDate(value: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getTestBadgeVariant(result: AiProviderTestResult | undefined) {
  if (!result) {
    return "outline" as const;
  }

  return result.status === "success" ? ("default" as const) : ("secondary" as const);
}

function getKeyStatusLabel(hasKey: boolean, stored: boolean) {
  if (!hasKey) {
    return "missing";
  }

  return stored ? "stored" : "env only";
}

function PresetCard({
  preset,
}: {
  preset: (typeof recommendedOllamaPresets)[number];
}) {
  const action = applyAiPresetAction.bind(null, preset.id);

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{preset.label}</CardTitle>
            <CardDescription>{preset.description}</CardDescription>
          </div>
          <Badge variant="outline">Ollama</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-2">
          <p className="text-foreground">
            Listing: <span className="text-muted-foreground">{preset.listingModel}</span>
          </p>
          <p className="text-foreground">
            Grouping: <span className="text-muted-foreground">{preset.groupingModel}</span>
          </p>
          <p className="text-foreground">
            Listing images:{" "}
            <span className="text-muted-foreground">{preset.listingMaxImages}</span>
          </p>
        </div>
        <form action={action}>
          <PendingSubmitButton type="submit" pendingLabel={`Applying ${preset.label}`}>
            <Settings2Icon data-icon="inline-start" />
            Apply preset
          </PendingSubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

function ProviderTestCard({
  provider,
  title,
  description,
  result,
}: {
  provider: AiProvider;
  title: string;
  description: string;
  result?: AiProviderTestResult;
}) {
  const action = testAiProviderConnectionAction.bind(null, provider);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant={getTestBadgeVariant(result)}>
            {result ? result.status : "untested"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {result?.message ?? "Run a connection test after saving provider credentials or model changes."}
        </p>
        <p className="text-xs text-muted-foreground">
          Last tested: {formatDate(result?.testedAt ?? null)}
        </p>
        <form action={action}>
          <PendingSubmitButton type="submit" pendingLabel={`Testing ${provider}`}>
            {result?.status === "success" ? (
              <CheckCircle2Icon data-icon="inline-start" />
            ) : result?.status === "failed" ? (
              <TriangleAlertIcon data-icon="inline-start" />
            ) : (
              <CpuIcon data-icon="inline-start" />
            )}
            Test {title}
          </PendingSubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

export function AiSettingsPage({
  settings,
  feedback,
}: {
  settings: {
    routerMode: "manual" | "fallback";
    tasks: {
      listing: {
        provider: AiProvider;
        model: string | null;
      };
      grouping: {
        provider: AiProvider;
        model: string | null;
      };
    };
    providers: {
      ollama: {
        baseUrl: string;
        timeoutMs: number;
        listingMaxImages: number;
      };
      openai: {
        baseUrl: string;
        timeoutMs: number;
        hasApiKey: boolean;
      };
      anthropic: {
        baseUrl: string;
        timeoutMs: number;
        hasApiKey: boolean;
      };
    };
    lastTests: Partial<Record<AiProvider, AiProviderTestResult>>;
    updatedAt: string | null;
    storedFlags: {
      openAiApiKey: boolean;
      anthropicApiKey: boolean;
    };
  };
  feedback: {
    flash: string | null;
    error: string | null;
  };
}) {
  const listingProfile = getRecommendedOllamaModelProfile(settings.tasks.listing.model);
  const groupingProfile = getRecommendedOllamaModelProfile(settings.tasks.grouping.model);
  const localOllamaModelIds = recommendedOllamaModelProfiles.map(
    (profile) => profile.id
  );

  return (
    <main className="flex-1 bg-muted/20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 lg:px-8">
        <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <Badge variant="secondary">AI</Badge>
            <h1 className="font-heading text-3xl font-semibold text-balance">
              Switch providers without touching env files.
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Route listing and grouping to different models. For local use,
              both tasks need vision-capable models.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              Listing: {settings.tasks.listing.provider}
            </Badge>
            <Badge variant="outline">
              Grouping: {settings.tasks.grouping.provider}
            </Badge>
            <Badge variant="outline">
              Updated: {formatDate(settings.updatedAt)}
            </Badge>
          </div>
        </section>

        {feedback.error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {feedback.error}
          </div>
        ) : null}

        {feedback.flash ? (
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">
            {feedback.flash}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-3">
          {recommendedOllamaPresets.map((preset) => (
            <PresetCard key={preset.id} preset={preset} />
          ))}
        </section>

        <form action={saveAiSettingsAction} className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2Icon className="size-4" />
                  Task routing
                </CardTitle>
                <CardDescription>
                  Choose which provider and model each task uses.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Router mode</span>
                  <select
                    name="routerMode"
                    defaultValue={settings.routerMode}
                    className={inputClassName}
                  >
                    <option value="manual">Manual</option>
                    <option value="fallback">Fallback</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Listing max images</span>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    name="listingMaxImages"
                    defaultValue={settings.providers.ollama.listingMaxImages}
                    className={inputClassName}
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Listing provider</span>
                  <select
                    name="listingProvider"
                    defaultValue={settings.tasks.listing.provider}
                    className={inputClassName}
                  >
                    <option value="ollama">Ollama</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Listing model</span>
                  <input
                    type="text"
                    name="listingModel"
                    list="ollama-listing-model-options"
                    defaultValue={settings.tasks.listing.model ?? ""}
                    className={inputClassName}
                    placeholder="qwen3.5:9b / qwen3-vl:8b / gpt-5.2"
                  />
                  <datalist id="ollama-listing-model-options">
                    {localOllamaModelIds.map((modelId) => (
                      <option key={modelId} value={modelId} />
                    ))}
                  </datalist>
                  <span className="text-xs text-muted-foreground">
                    Installed local options: <code>{localOllamaModelIds.join(", ")}</code>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Recommended local default: <code>qwen3.5:9b</code>
                  </span>
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Grouping provider</span>
                  <select
                    name="groupingProvider"
                    defaultValue={settings.tasks.grouping.provider}
                    className={inputClassName}
                  >
                    <option value="ollama">Ollama</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Grouping model</span>
                  <input
                    type="text"
                    name="groupingModel"
                    list="ollama-grouping-model-options"
                    defaultValue={settings.tasks.grouping.model ?? ""}
                    className={inputClassName}
                    placeholder="qwen3-vl:8b / qwen3.5:9b / gpt-5 mini"
                  />
                  <datalist id="ollama-grouping-model-options">
                    {localOllamaModelIds.map((modelId) => (
                      <option key={modelId} value={modelId} />
                    ))}
                  </datalist>
                  <span className="text-xs text-muted-foreground">
                    Installed local options: <code>{localOllamaModelIds.join(", ")}</code>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Recommended local default: <code>qwen3-vl:8b</code>
                  </span>
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BotIcon className="size-4" />
                  Current routing
                </CardTitle>
                <CardDescription>
                  One provider can handle both tasks, or you can split them.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="rounded-lg border border-border bg-background px-4 py-3">
                  <p className="font-medium text-foreground">Listing generation</p>
                  <p className="text-muted-foreground">
                    {settings.tasks.listing.provider}:{settings.tasks.listing.model ?? "missing model"}
                  </p>
                  {listingProfile ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {listingProfile.label} - {listingProfile.sizeLabel} -{" "}
                      {listingProfile.vision ? "vision" : "text only"}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-lg border border-border bg-background px-4 py-3">
                  <p className="font-medium text-foreground">Photo grouping</p>
                  <p className="text-muted-foreground">
                    {settings.tasks.grouping.provider}:{settings.tasks.grouping.model ?? "missing model"}
                  </p>
                  {groupingProfile ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {groupingProfile.label} - {groupingProfile.sizeLabel} -{" "}
                      {groupingProfile.vision ? "vision" : "text only"}
                    </p>
                  ) : null}
                </div>
                <p className="text-muted-foreground">
                  Manual mode keeps task routing explicit. Fallback mode is saved now,
                  but automated fallback logic is still a later phase.
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CpuIcon className="size-4" />
                  Ollama
                </CardTitle>
                <CardDescription>Local models, runtime URL, and current model options.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Base URL</span>
                  <input
                    type="text"
                    name="ollamaBaseUrl"
                    defaultValue={settings.providers.ollama.baseUrl}
                    className={inputClassName}
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Timeout (ms)</span>
                  <input
                    type="number"
                    min={30000}
                    step={1000}
                    name="ollamaTimeoutMs"
                    defaultValue={settings.providers.ollama.timeoutMs}
                    className={inputClassName}
                  />
                </label>
                <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                  Local options for this setup:{" "}
                  <code>{localOllamaModelIds.join(", ")}</code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <KeyRoundIcon className="size-4" />
                      OpenAI
                    </CardTitle>
                    <CardDescription>ChatGPT via OpenAI API.</CardDescription>
                  </div>
                  <Badge variant={settings.providers.openai.hasApiKey ? "default" : "outline"}>
                    {getKeyStatusLabel(
                      settings.providers.openai.hasApiKey,
                      settings.storedFlags.openAiApiKey
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Base URL</span>
                  <input
                    type="text"
                    name="openAiBaseUrl"
                    defaultValue={settings.providers.openai.baseUrl}
                    className={inputClassName}
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">API key</span>
                  <input
                    type="password"
                    name="openAiApiKey"
                    placeholder={
                      settings.providers.openai.hasApiKey
                        ? "Leave blank to keep current key"
                        : "sk-..."
                    }
                    className={inputClassName}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" name="clearOpenAiApiKey" />
                  Clear stored OpenAI key
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Timeout (ms)</span>
                  <input
                    type="number"
                    min={30000}
                    step={1000}
                    name="openAiTimeoutMs"
                    defaultValue={settings.providers.openai.timeoutMs}
                    className={inputClassName}
                  />
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <KeyRoundIcon className="size-4" />
                      Anthropic
                    </CardTitle>
                    <CardDescription>Claude via Anthropic API.</CardDescription>
                  </div>
                  <Badge
                    variant={settings.providers.anthropic.hasApiKey ? "default" : "outline"}
                  >
                    {getKeyStatusLabel(
                      settings.providers.anthropic.hasApiKey,
                      settings.storedFlags.anthropicApiKey
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Base URL</span>
                  <input
                    type="text"
                    name="anthropicBaseUrl"
                    defaultValue={settings.providers.anthropic.baseUrl}
                    className={inputClassName}
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">API key</span>
                  <input
                    type="password"
                    name="anthropicApiKey"
                    placeholder={
                      settings.providers.anthropic.hasApiKey
                        ? "Leave blank to keep current key"
                        : "sk-ant-..."
                    }
                    className={inputClassName}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" name="clearAnthropicApiKey" />
                  Clear stored Anthropic key
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Timeout (ms)</span>
                  <input
                    type="number"
                    min={30000}
                    step={1000}
                    name="anthropicTimeoutMs"
                    defaultValue={settings.providers.anthropic.timeoutMs}
                    className={inputClassName}
                  />
                </label>
              </CardContent>
            </Card>
          </section>

          <div className="flex flex-wrap gap-3">
            <PendingSubmitButton type="submit" pendingLabel="Saving AI settings">
              <Settings2Icon data-icon="inline-start" />
              Save AI settings
            </PendingSubmitButton>
            <Button type="reset" variant="outline">
              Reset unsaved changes
            </Button>
          </div>
        </form>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CpuIcon className="size-4" />
                Local model guidance
              </CardTitle>
              <CardDescription>
                Listing and grouping are image tasks. Use the installed multimodal
                models there and keep the text-only local model for future non-image work.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendedOllamaModelProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="rounded-lg border border-border bg-background px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{profile.label}</p>
                    <Badge variant="outline">{profile.sizeLabel}</Badge>
                    <Badge variant={profile.vision ? "default" : "secondary"}>
                      {profile.vision ? "vision" : "text only"}
                    </Badge>
                    {profile.recommendedFor.length > 0 ? (
                      <Badge variant="outline">
                        good for {profile.recommendedFor.join(" + ")}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-muted-foreground">{profile.note}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BotIcon className="size-4" />
                Ollama model commands
              </CardTitle>
              <CardDescription>
                Use these exact model ids when you pull or switch local Ollama models.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {recommendedOllamaModelProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="rounded-lg border border-border bg-background px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{profile.label}</p>
                    <Badge variant={profile.vision ? "default" : "secondary"}>
                      {profile.vision ? "vision" : "text only"}
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="font-mono text-xs text-muted-foreground">
                      {buildOllamaPullCommand(profile.id)}
                    </p>
                    <p className="text-xs text-muted-foreground">{profile.note}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <ProviderTestCard
            provider="ollama"
            title="Ollama"
            description="Check local runtime, endpoint, and configured models."
            result={settings.lastTests.ollama}
          />
          <ProviderTestCard
            provider="openai"
            title="OpenAI"
            description="Check API auth and configured OpenAI models."
            result={settings.lastTests.openai}
          />
          <ProviderTestCard
            provider="anthropic"
            title="Anthropic"
            description="Check API auth and configured Claude models."
            result={settings.lastTests.anthropic}
          />
        </section>
      </div>
    </main>
  );
}
