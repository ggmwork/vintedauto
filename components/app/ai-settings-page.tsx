import {
  BotIcon,
  CheckCircle2Icon,
  CpuIcon,
  DatabaseIcon,
  DownloadIcon,
  ImageIcon,
  KeyRoundIcon,
  RefreshCwIcon,
  Settings2Icon,
  SparklesIcon,
  TerminalIcon,
  TriangleAlertIcon,
  UploadIcon,
} from "lucide-react";

import {
  replaceDatabaseFromImportAction,
  refreshLocalAiModelsAction,
  saveAiSettingsAction,
  testAiProviderConnectionAction,
  testAiVisionListingAction,
} from "@/app/actions";
import { getRecommendedOllamaModelProfile } from "@/lib/ai/ollama-presets";
import { AiVisionImageInput } from "@/components/app/ai-vision-image-input";
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
import type {
  AiProvider,
  AiProviderTestResult,
  AiVisionTestResult,
} from "@/types/ai";
import type {
  DiscoveredLocalModel,
  LocalModelDiscoveryCache,
  LocalModelDiscoveryTool,
} from "@/lib/ai/local-model-discovery";

const inputClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type ChoiceOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

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

function formatPriceSuggestion(result: AiVisionTestResult) {
  const price = result.priceSuggestion;

  if (!price) {
    return "No price returned";
  }

  if (price.amount !== null) {
    return `${price.amount.toFixed(2)} ${price.currency}`;
  }

  return `${price.minAmount?.toFixed(2) ?? "?"} - ${price.maxAmount?.toFixed(2) ?? "?"} ${price.currency}`;
}

function getVisionMetadataEntries(result: AiVisionTestResult) {
  const metadata = result.suggestedMetadata;

  return [
    ["Brand", metadata.brand],
    ["Category", metadata.category],
    ["Size", metadata.size],
    ["Condition", metadata.condition],
    ["Color", metadata.color],
    ["Material", metadata.material],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
}

function AiVisionTestSection({
  result,
  modelOptions,
  selectedModel,
}: {
  result: AiVisionTestResult | null;
  modelOptions: ChoiceOption[];
  selectedModel: string;
}) {
  const metadataEntries = result ? getVisionMetadataEntries(result) : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="size-4" />
              AI image test
            </CardTitle>
            <CardDescription>
              Upload product photos and run a one-off listing test.
            </CardDescription>
          </div>
          {result ? (
            <Badge variant={result.status === "success" ? "default" : "secondary"}>
              {result.status}
            </Badge>
          ) : (
            <Badge variant="outline">not tested</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <form action={testAiVisionListingAction} className="grid gap-4">
          {modelOptions.length > 0 ? (
            <div className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Test model</span>
              <ChoiceGroup
                name="visionTestRoute"
                value={selectedModel}
                options={modelOptions}
                dense
              />
              <span className="text-xs text-muted-foreground">
                This only applies to this image test. Saved routing stays unchanged.
              </span>
            </div>
          ) : (
            <p className="rounded-lg border border-border bg-background px-3 py-3 text-sm text-muted-foreground">
              Refresh models to choose a test model. The current listing route will
              run if no model is selected.
            </p>
          )}

          <AiVisionImageInput inputClassName={inputClassName} />

          <div className="flex flex-wrap items-center gap-3">
            <PendingSubmitButton type="submit" pendingLabel="Testing AI vision">
              <SparklesIcon data-icon="inline-start" />
              Run image test
            </PendingSubmitButton>
            <span className="text-xs text-muted-foreground">
              Up to 8 images, 12 MB each.
            </span>
          </div>
        </form>

        {result ? (
          <div className="grid gap-4 rounded-lg border border-border bg-background px-4 py-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">
                {result.provider && result.model
                  ? `${result.provider}:${result.model}`
                  : "provider unknown"}
              </Badge>
              <Badge variant="outline">{result.imageCount} image(s)</Badge>
              <span>Last run: {formatDate(result.testedAt)}</span>
            </div>

            <p className="text-sm text-muted-foreground">{result.message}</p>

            {result.status === "success" ? (
              <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Title
                    </p>
                    <p className="font-medium text-foreground">
                      {result.title ?? "No title returned"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Price
                    </p>
                    <p className="text-sm text-foreground">
                      {formatPriceSuggestion(result)}
                    </p>
                  </div>

                  {metadataEntries.length > 0 ? (
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      {metadataEntries.map(([label, value]) => (
                        <div key={label} className="space-y-1">
                          <dt className="text-xs text-muted-foreground">
                            {label}
                          </dt>
                          <dd className="font-medium text-foreground">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Description
                    </p>
                    <p className="whitespace-pre-line text-sm leading-6 text-foreground">
                      {result.description ?? "No description returned"}
                    </p>
                  </div>

                  {result.keywords.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {result.keywords.map((keyword, index) => (
                        <Badge key={`${keyword}-${index}`} variant="outline">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  {result.conditionNotes ? (
                    <p className="text-sm text-muted-foreground">
                      {result.conditionNotes}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {result.fileNames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.fileNames.map((fileName, index) => (
                  <Badge key={`${fileName}-${index}`} variant="secondary">
                    {fileName}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function buildRouteValue(provider: AiProvider, model: string) {
  return `${provider}|${model}`;
}

function detectedModels(tool: LocalModelDiscoveryTool) {
  return tool.available
    ? tool.models.filter((model) => model.source === "detected")
    : [];
}

function routeOption(
  provider: Extract<AiProvider, "ollama" | "local-cli">,
  providerLabel: string,
  model: DiscoveredLocalModel
): ChoiceOption {
  return {
    value: buildRouteValue(provider, model.id),
    label: `${providerLabel}: ${model.label}`,
    description:
      model.note ??
      `Detected ${providerLabel} model from this machine.`,
  };
}

function selectedRouteValue(
  provider: AiProvider,
  model: string | null,
  options: ChoiceOption[]
) {
  const currentValue = model ? buildRouteValue(provider, model) : null;

  if (currentValue && options.some((option) => option.value === currentValue)) {
    return currentValue;
  }

  return options[0]?.value ?? "";
}

function hasCurrentRoute(
  provider: AiProvider,
  model: string | null,
  options: ChoiceOption[]
) {
  return Boolean(
    model &&
      options.some((option) => option.value === buildRouteValue(provider, model))
  );
}

function ToolStatusCard({ tool }: { tool: LocalModelDiscoveryTool }) {
  const visibleModels = detectedModels(tool);

  return (
    <div className="rounded-lg border border-border bg-background px-4 py-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium text-foreground">{tool.label}</p>
          <p className="text-xs text-muted-foreground">
            {tool.version ?? "No version detected"}
          </p>
        </div>
        <Badge variant={tool.available ? "default" : "outline"}>
          {tool.available ? "detected" : "missing"}
        </Badge>
      </div>
      <p className="mt-3 text-muted-foreground">{tool.message}</p>
      {visibleModels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {visibleModels.map((model) => (
            <Badge
              key={`${tool.id}-${model.id}`}
              variant="default"
            >
              {model.id}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LocalModelDiscoveryCard({
  localModels,
}: {
  localModels: LocalModelDiscoveryCache;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <TerminalIcon className="size-4" />
              Detected local models
            </CardTitle>
            <CardDescription>
              Scan this PC for Ollama, Codex CLI, and Claude Code model options.
            </CardDescription>
          </div>
          <form action={refreshLocalAiModelsAction}>
            <PendingSubmitButton type="submit" pendingLabel="Scanning models">
              <RefreshCwIcon data-icon="inline-start" />
              Refresh models
            </PendingSubmitButton>
          </form>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Last scan: {formatDate(localModels.scannedAt)}
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          <ToolStatusCard tool={localModels.tools.ollama} />
          <ToolStatusCard tool={localModels.tools.codex} />
          <ToolStatusCard tool={localModels.tools.claude} />
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Task routing uses only detected model IDs from this scan. Use Advanced
          manual routing only when a CLI or API model cannot be detected.
        </p>
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
    lastVisionTest: AiVisionTestResult | null;
    localModels: LocalModelDiscoveryCache;
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
  const detectedOllamaModels = detectedModels(settings.localModels.tools.ollama);
  const detectedCodexModels = detectedModels(settings.localModels.tools.codex);
  const listingRouteOptions: ChoiceOption[] = [
    ...detectedOllamaModels.map((model) =>
      routeOption("ollama", "Ollama", model)
    ),
    ...detectedCodexModels.map((model) =>
      routeOption("local-cli", "Codex CLI", model)
    ),
  ];
  const groupingRouteOptions: ChoiceOption[] = detectedOllamaModels.map((model) =>
    routeOption("ollama", "Ollama", model)
  );
  const selectedListingRoute = selectedRouteValue(
    settings.tasks.listing.provider,
    settings.tasks.listing.model,
    listingRouteOptions
  );
  const selectedGroupingRoute = selectedRouteValue(
    settings.tasks.grouping.provider,
    settings.tasks.grouping.model,
    groupingRouteOptions
  );
  const listingRouteAvailable = hasCurrentRoute(
    settings.tasks.listing.provider,
    settings.tasks.listing.model,
    listingRouteOptions
  );
  const groupingRouteAvailable = hasCurrentRoute(
    settings.tasks.grouping.provider,
    settings.tasks.grouping.model,
    groupingRouteOptions
  );

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

        <LocalModelDiscoveryCard localModels={settings.localModels} />

        <AiVisionTestSection
          result={settings.lastVisionTest}
          modelOptions={listingRouteOptions}
          selectedModel={selectedListingRoute}
        />

        <form action={saveAiSettingsAction} className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2Icon className="size-4" />
                  Task routing
                </CardTitle>
                <CardDescription>
                  Normal routing uses detected local models and known CLI defaults.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {!settings.localModels.scannedAt ? (
                  <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                    Refresh models first so routing can use this machine&apos;s real
                    local options.
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
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
                </div>

                <div className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Listing route</span>
                  {listingRouteOptions.length > 0 ? (
                    <>
                      <ChoiceGroup
                        name="listingRoute"
                        value={selectedListingRoute}
                        options={listingRouteOptions}
                        dense
                      />
                      {!listingRouteAvailable && settings.tasks.listing.model ? (
                        <span className="text-xs leading-5 text-muted-foreground">
                          Saved listing route is not detected now. Saving will use
                          selected detected route.
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <p className="rounded-lg border border-border bg-background px-3 py-3 text-sm text-muted-foreground">
                      No detected listing models. Refresh models or use Advanced
                      manual routing.
                    </p>
                  )}
                </div>

                <div className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">Grouping route</span>
                  {groupingRouteOptions.length > 0 ? (
                    <>
                      <ChoiceGroup
                        name="groupingRoute"
                        value={selectedGroupingRoute}
                        options={groupingRouteOptions}
                        dense
                      />
                      {!groupingRouteAvailable && settings.tasks.grouping.model ? (
                        <span className="text-xs leading-5 text-muted-foreground">
                          Saved grouping route is not detected now. Saving will use
                          selected detected route.
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <p className="rounded-lg border border-border bg-background px-3 py-3 text-sm text-muted-foreground">
                      No detected grouping models. Refresh models or use Advanced
                      manual routing.
                    </p>
                  )}
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
              Advanced manual routing
            </summary>
            <section className="grid gap-5 border-t border-border px-4 py-4">
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <input type="checkbox" name="useAdvancedRouting" className="mt-1" />
                Save provider and model values below instead of detected route
                choices.
              </label>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="grid gap-3 text-sm">
                  <span className="font-medium text-foreground">
                    Listing provider
                  </span>
                  <ChoiceGroup
                    name="advancedListingProvider"
                    value={settings.tasks.listing.provider}
                    options={[
                      { value: "ollama", label: "Ollama" },
                      { value: "openai", label: "OpenAI" },
                      { value: "anthropic", label: "Anthropic" },
                      {
                        value: "local-cli",
                        label: "Local CLI",
                        description: "Codex CLI listing generation.",
                      },
                    ]}
                  />
                  <label className="grid gap-2">
                    <span className="font-medium text-foreground">Listing model</span>
                    <input
                      type="text"
                      name="advancedListingModel"
                      defaultValue={settings.tasks.listing.model ?? ""}
                      placeholder="qwen3-vl:8b, default, gpt-5.3-codex..."
                      className={inputClassName}
                    />
                  </label>
                </div>

                <div className="grid gap-3 text-sm">
                  <span className="font-medium text-foreground">
                    Grouping provider
                  </span>
                  <ChoiceGroup
                    name="advancedGroupingProvider"
                    value={settings.tasks.grouping.provider}
                    options={[
                      { value: "ollama", label: "Ollama" },
                      { value: "openai", label: "OpenAI" },
                      { value: "anthropic", label: "Anthropic" },
                      {
                        value: "local-cli",
                        label: "Local CLI",
                        description: "Grouping is not implemented for local CLI.",
                        disabled: true,
                      },
                    ]}
                  />
                  <label className="grid gap-2">
                    <span className="font-medium text-foreground">Grouping model</span>
                    <input
                      type="text"
                      name="advancedGroupingModel"
                      defaultValue={settings.tasks.grouping.model ?? ""}
                      placeholder="qwen3-vl:8b"
                      className={inputClassName}
                    />
                  </label>
                </div>
              </div>
            </section>
          </details>

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
                    Uses a local agent CLI login. Codex and Claude Code are
                    supported.
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
                          description: "Reads photos via the signed-in Claude Code CLI.",
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
                    Normal routing shows the Codex Default option after scan. Use
                    Advanced manual routing only for custom model aliases.
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
