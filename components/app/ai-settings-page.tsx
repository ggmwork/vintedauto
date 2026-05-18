import {
  BotIcon,
  CheckCircle2Icon,
  CpuIcon,
  DatabaseIcon,
  DownloadIcon,
  KeyRoundIcon,
  Settings2Icon,
  TerminalIcon,
  TriangleAlertIcon,
  UploadIcon,
} from "lucide-react";

import {
  applyAiPresetAction,
  replaceDatabaseFromImportAction,
  saveAiSettingsAction,
  testAiProviderConnectionAction,
} from "@/app/actions";
import {
  buildOllamaPullCommand,
  getRecommendedOllamaModelProfile,
  recommendedAiPresets,
  recommendedOllamaModelProfiles,
} from "@/lib/ai/ollama-presets";
import { PendingSubmitButton } from "@/components/app/pending-submit-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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

type ChoiceOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

const sharedOpenAiModelOptions: ChoiceOption[] = [
  {
    value: "gpt-5.5",
    label: "GPT-5.5",
    description: "Best OpenAI quality for image reading and reasoning.",
  },
  {
    value: "gpt-5.4",
    label: "GPT-5.4",
    description: "Strong OpenAI vision model with lower cost than GPT-5.5.",
  },
  {
    value: "gpt-5.4-mini",
    label: "GPT-5.4 mini",
    description: "Faster OpenAI option for lower-latency runs.",
  },
  {
    value: "gpt-5.4-nano",
    label: "GPT-5.4 nano",
    description: "Cheapest OpenAI option for simple extraction.",
  },
];

const codexCliModelOptions: ChoiceOption[] = [
  {
    value: "default",
    label: "Codex CLI default",
    description: "Let your installed Codex CLI choose the default model.",
  },
  {
    value: "gpt-5.3-codex",
    label: "GPT-5.3-Codex",
    description: "Current Codex-optimized model for agentic CLI work.",
  },
];

function ChoiceGroup({
  name,
  value,
  options,
  dense = false,
}: {
  name: string;
  value: string;
  options: ChoiceOption[];
  dense?: boolean;
}) {
  return (
    <div className="grid gap-2">
      {options.map((option) => {
        const checked = option.value === value;

        return (
          <label
            key={option.value}
            className={`flex ${dense ? "min-h-12" : "min-h-14"} items-start gap-3 rounded-lg border px-3 py-2 text-sm transition ${
              checked
                ? "border-foreground bg-muted/40"
                : "border-border bg-background"
            } ${
              option.disabled
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer hover:border-foreground/40"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={checked}
              disabled={option.disabled}
              className="mt-1 size-4 accent-foreground"
            />
            <span className="grid gap-1">
              <span className="font-medium text-foreground">{option.label}</span>
              {option.description ? (
                <span className="text-xs leading-5 text-muted-foreground">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function buildModelOptions(currentModel: string | null, options: ChoiceOption[]) {
  const trimmed = currentModel?.trim();

  if (!trimmed) {
    return options;
  }

  if (
    options.some((option) => option.value.toLowerCase() === trimmed.toLowerCase())
  ) {
    return options;
  }

  return [
    {
      value: trimmed,
      label: `Current custom: ${trimmed}`,
      description: "Saved model not in the built-in list. Pick another option to replace it.",
    },
    ...options,
  ];
}

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
  preset: (typeof recommendedAiPresets)[number];
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
          <Badge variant={preset.badge === "Local CLI" ? "default" : "outline"}>
            {preset.badge}
          </Badge>
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
  database,
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
      localCli: {
        enabled: boolean;
        engine: "codex" | "claude";
        timeoutMs: number;
      };
    };
    lastTests: Partial<Record<AiProvider, AiProviderTestResult>>;
    updatedAt: string | null;
    storedFlags: {
      openAiApiKey: boolean;
      anthropicApiKey: boolean;
    };
  };
  database: {
    databaseRoot: string;
    manifest: {
      databaseId: string;
      schemaVersion: number;
      label: string | null;
      createdAt: string;
      updatedAt: string;
    };
    counts: {
      sessions: number;
      stockItems: number;
      drafts: number;
      sessionPhotoFiles: number;
      draftImageFiles: number;
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
  const localOllamaModelOptions: ChoiceOption[] = recommendedOllamaModelProfiles.map(
    (profile) => ({
      value: profile.id,
      label: `${profile.label} (${profile.id})`,
      description: `${profile.vision ? "Vision" : "Text only"} local Ollama model. ${profile.note}`,
    })
  );
  const listingModelOptions = buildModelOptions(settings.tasks.listing.model, [
    ...codexCliModelOptions,
    ...sharedOpenAiModelOptions,
    ...localOllamaModelOptions,
  ]);
  const groupingModelOptions = buildModelOptions(settings.tasks.grouping.model, [
    ...sharedOpenAiModelOptions,
    ...localOllamaModelOptions,
  ]);

  return (
    <main className="flex-1 bg-muted/20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 lg:px-8">
        <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <Badge variant="secondary">Settings</Badge>
            <h1 className="font-heading text-3xl font-semibold text-balance">
              Settings
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Configure AI helpers, database backups, and local workflow settings.
            </p>
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
          {recommendedAiPresets.map((preset) => (
            <PresetCard key={preset.id} preset={preset} />
          ))}
        </section>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <DatabaseIcon className="size-4" />
                  Database
                </CardTitle>
                <CardDescription>
                  Move listings between computers with one Vinted Auto backup file.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1">
                <p className="text-muted-foreground">Database ID</p>
                <p className="break-all font-medium text-foreground">
                  {database.manifest.databaseId}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Schema</p>
                <p className="font-medium text-foreground">
                  {database.manifest.schemaVersion}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Updated</p>
                <p className="font-medium text-foreground">
                  {formatDate(database.manifest.updatedAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{database.counts.sessions} sessions</Badge>
              <Badge variant="outline">{database.counts.stockItems} items</Badge>
              <Badge variant="outline">{database.counts.drafts} drafts</Badge>
              <Badge variant="outline">
                {database.counts.sessionPhotoFiles} product photos
              </Badge>
              <Badge variant="outline">
                {database.counts.draftImageFiles} draft images
              </Badge>
              <Badge variant="secondary">API keys excluded from exports</Badge>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="grid gap-3 rounded-lg border border-border bg-background px-4 py-4">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Export database</p>
                  <p className="text-sm text-muted-foreground">
                    Downloads one Vinted Auto backup file with listings, drafts, stock items, and images.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="/api/database/export"
                    className={buttonVariants({ variant: "default" })}
                  >
                    <DownloadIcon data-icon="inline-start" />
                    Export database
                  </a>
                </div>
              </div>

              <form
                action={replaceDatabaseFromImportAction}
                encType="multipart/form-data"
                className="grid gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4"
              >
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Import database</p>
                  <p className="text-sm text-muted-foreground">
                    Choose a Vinted Auto backup file from another computer. Current local data is backed up first.
                  </p>
                </div>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">
                    Vinted Auto backup file <span className="text-destructive">*</span>
                  </span>
                  <input
                    type="file"
                    name="databaseArchive"
                    accept=".vintedauto,.vintedauto.zip,.zip,application/vnd.vintedauto.backup,application/zip,application/octet-stream"
                    required
                    className={inputClassName}
                  />
                </label>
                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    name="confirmReplaceDatabase"
                    required
                    className="mt-1"
                  />
                  Required: replace current local data after creating an automatic backup.
                </label>
                <div>
                  <PendingSubmitButton
                    type="submit"
                    variant="destructive"
                    pendingLabel="Importing database"
                  >
                    <UploadIcon data-icon="inline-start" />
                    Import database
                  </PendingSubmitButton>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>

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
                <div className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Router mode</span>
                  <ChoiceGroup
                    name="routerMode"
                    value={settings.routerMode}
                    options={[
                      {
                        value: "manual",
                        label: "Manual",
                        description: "Use the selected provider exactly.",
                      },
                      {
                        value: "fallback",
                        label: "Fallback",
                        description: "Saved for later automatic fallback logic.",
                      },
                    ]}
                  />
                </div>

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

                <div className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Listing provider</span>
                  <ChoiceGroup
                    name="listingProvider"
                    value={settings.tasks.listing.provider}
                    options={[
                      { value: "ollama", label: "Ollama" },
                      { value: "openai", label: "OpenAI" },
                      { value: "anthropic", label: "Anthropic" },
                      {
                        value: "local-cli",
                        label: "Local CLI",
                        description: "Use Codex CLI for listing generation.",
                      },
                    ]}
                  />
                </div>

                <div className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Listing model</span>
                  <ChoiceGroup
                    name="listingModel"
                    value={settings.tasks.listing.model ?? ""}
                    options={listingModelOptions}
                    dense
                  />
                  <span className="text-xs text-muted-foreground">
                    Codex CLI options:{" "}
                    <code>{codexCliModelOptions.map((option) => option.value).join(", ")}</code>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    OpenAI/Codex shared options:{" "}
                    <code>{sharedOpenAiModelOptions.map((option) => option.value).join(", ")}</code>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Ollama options: <code>{localOllamaModelIds.join(", ")}</code>
                  </span>
                </div>

                <div className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Grouping provider</span>
                  <ChoiceGroup
                    name="groupingProvider"
                    value={settings.tasks.grouping.provider}
                    options={[
                      { value: "ollama", label: "Ollama" },
                      { value: "openai", label: "OpenAI" },
                      { value: "anthropic", label: "Anthropic" },
                      {
                        value: "local-cli",
                        label: "Local CLI",
                        description: "Listing only. Keep grouping on another provider.",
                        disabled: true,
                      },
                    ]}
                  />
                </div>

                <div className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Grouping model</span>
                  <ChoiceGroup
                    name="groupingModel"
                    value={settings.tasks.grouping.model ?? ""}
                    options={groupingModelOptions}
                    dense
                  />
                  <span className="text-xs text-muted-foreground">
                    OpenAI options:{" "}
                    <code>{sharedOpenAiModelOptions.map((option) => option.value).join(", ")}</code>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Ollama options: <code>{localOllamaModelIds.join(", ")}</code>
                  </span>
                </div>
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

          <details className="rounded-xl border border-border bg-card">
            <summary className="cursor-pointer px-4 py-4 text-sm font-medium text-foreground">
              Provider details
            </summary>
            <section className="grid gap-6 border-t border-border px-4 py-4 xl:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CpuIcon className="size-4" />
                    Ollama
                  </CardTitle>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="flex items-center gap-2">
                      <KeyRoundIcon className="size-4" />
                      OpenAI
                    </CardTitle>
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
                    Clear stored key
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
                    <CardTitle className="flex items-center gap-2">
                      <KeyRoundIcon className="size-4" />
                      Anthropic
                    </CardTitle>
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
                    Clear stored key
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

              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="flex items-center gap-2">
                      <TerminalIcon className="size-4" />
                      Local CLI
                    </CardTitle>
                    <Badge variant={settings.providers.localCli.enabled ? "default" : "outline"}>
                      {settings.providers.localCli.enabled ? "enabled" : "disabled"}
                    </Badge>
                  </div>
                  <CardDescription>
                    Uses a local agent CLI login. Codex is supported first.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      name="localCliEnabled"
                      defaultChecked={settings.providers.localCli.enabled}
                    />
                    Enable local CLI provider
                  </label>
                  <div className="grid gap-2 text-sm">
                    <span className="font-medium text-foreground">Engine</span>
                    <ChoiceGroup
                      name="localCliEngine"
                      value={settings.providers.localCli.engine}
                      options={[
                        {
                          value: "codex",
                          label: "Codex CLI",
                          description: "Supported now.",
                        },
                        {
                          value: "claude",
                          label: "Claude Code",
                          description: "Planned after install and image-input verification.",
                          disabled: true,
                        },
                      ]}
                    />
                  </div>
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-foreground">Timeout (ms)</span>
                    <input
                      type="number"
                      min={30000}
                      step={1000}
                      name="localCliTimeoutMs"
                      defaultValue={settings.providers.localCli.timeoutMs}
                      className={inputClassName}
                    />
                  </label>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Listing model above controls <code>codex exec --model</code>.
                    Leave it as <code>default</code> to use the CLI default.
                  </p>
                </CardContent>
              </Card>
            </section>
          </details>

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

        <details className="rounded-xl border border-border bg-card">
          <summary className="cursor-pointer px-4 py-4 text-sm font-medium text-foreground">
            Model guidance
          </summary>
        <section className="grid gap-6 border-t border-border px-4 py-4 xl:grid-cols-[1.1fr_0.9fr]">
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
        </details>

        <details className="rounded-xl border border-border bg-card">
          <summary className="cursor-pointer px-4 py-4 text-sm font-medium text-foreground">
            Connection tests
          </summary>
          <section className="grid gap-6 border-t border-border px-4 py-4 xl:grid-cols-4">
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
            <ProviderTestCard
              provider="local-cli"
              title="Local CLI"
              description="Check local Codex CLI availability and local provider setup."
              result={settings.lastTests["local-cli"]}
            />
          </section>
        </details>
      </div>
    </main>
  );
}
