import "server-only";

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import sharp from "sharp";

import {
  buildCanonicalGenerationResult,
  buildListingPrompt,
  listingGenerationSchema,
  resolveGeneratedAt,
  selectRepresentativeImages,
} from "@/lib/ai/listing-generation-shared";
import { buildCodexListingArgs } from "@/lib/ai/local-cli-codex";
import {
  buildClaudeListingArgs,
  extractClaudeResultText,
} from "@/lib/ai/local-cli-claude";
import type {
  ListingGenerationImage,
  ListingGenerationInput,
  ListingGenerationService,
} from "@/lib/ai/listing-generation-service";
import {
  getListingMaxImages,
  getLocalCliEngine,
  getLocalCliEnabled,
  getLocalCliKeepRuns,
  getProviderTimeoutMs,
  requireProviderModel,
} from "@/lib/ai/provider-config";
import { runLocalCliCommand } from "@/lib/ai/local-cli-command-runner";
import { parseLocalCliJsonPayload } from "@/lib/ai/local-cli-output";

function guessImageExtension(image: ListingGenerationImage) {
  const contentType = image.contentType?.toLowerCase() ?? "";
  const filename = image.originalFilename.toLowerCase();

  if (contentType.includes("png") || filename.endsWith(".png")) {
    return ".png";
  }

  if (contentType.includes("webp") || filename.endsWith(".webp")) {
    return ".webp";
  }

  if (
    contentType.includes("heic") ||
    contentType.includes("heif") ||
    filename.endsWith(".heic") ||
    filename.endsWith(".heif")
  ) {
    return ".heic";
  }

  return ".jpg";
}

function safeImageFilename(index: number, extension: string) {
  return `image-${String(index + 1).padStart(2, "0")}${extension}`;
}

async function prepareLocalCliImage(image: ListingGenerationImage) {
  try {
    const output = await sharp(Buffer.from(image.bytes), {
      failOn: "none",
    })
      .rotate()
      .resize({
        width: 2200,
        height: 2200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({
        quality: 88,
        mozjpeg: true,
      })
      .toBuffer();

    return {
      bytes: new Uint8Array(output),
      extension: ".jpg",
    };
  } catch {
    return {
      bytes: image.bytes,
      extension: guessImageExtension(image),
    };
  }
}

async function writeRunImages(runDir: string, images: ListingGenerationImage[]) {
  return Promise.all(
    images.map(async (image, index) => {
      const prepared = await prepareLocalCliImage(image);
      const imagePath = path.join(runDir, safeImageFilename(index, prepared.extension));

      await writeFile(imagePath, prepared.bytes);

      return imagePath;
    })
  );
}

function buildLocalCliPrompt(input: ListingGenerationInput, totalImageCount: number) {
  return [
    "You are generating a Vinted listing from attached product photos.",
    "Return one JSON object only. No markdown, no commentary.",
    "The final response must match the supplied JSON schema exactly.",
    buildListingPrompt(input, totalImageCount),
  ].join("\n\n");
}

function buildClaudeCliPrompt(
  input: ListingGenerationInput,
  totalImageCount: number,
  imageFilenames: string[]
) {
  return [
    "You are generating a Vinted listing from product photos saved in the current directory.",
    `Use the Read tool to view each image file before answering: ${imageFilenames.join(", ")}.`,
    "After viewing the photos, return one JSON object only. No markdown, no commentary, no tool calls after the JSON.",
    "The JSON must match this schema exactly:",
    JSON.stringify(listingGenerationSchema, null, 2),
    buildListingPrompt(input, totalImageCount),
  ].join("\n\n");
}

function formatLocalCliFailure(
  engineLabel: string,
  runCommand: string,
  result: Awaited<ReturnType<typeof runLocalCliCommand>>
) {
  const details = [result.stderr, result.stdout]
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 2000);

  return `${engineLabel} could not run. Open a terminal, run ${runCommand}, and check login or plan limits.${details ? ` Details: ${details}` : ""}`;
}

class LocalCliListingGenerationService implements ListingGenerationService {
  async generate(input: ListingGenerationInput) {
    if (!getLocalCliEnabled()) {
      throw new Error(
        "Local CLI provider is disabled. Enable LOCAL_CLI_ENABLED before using local agent CLI generation."
      );
    }

    if (input.images.length === 0) {
      throw new Error("At least one image is required for generation.");
    }

    const engine = getLocalCliEngine();
    const model =
      input.modelOverride ?? requireProviderModel("listing", "local-cli");
    const selectedImages = selectRepresentativeImages(
      input.images,
      getListingMaxImages()
    );

    return engine === "claude"
      ? this.generateWithClaude(input, model, selectedImages)
      : this.generateWithCodex(input, model, selectedImages);
  }

  private async generateWithCodex(
    input: ListingGenerationInput,
    model: string,
    selectedImages: ListingGenerationImage[]
  ) {
    const runDir = await mkdtemp(path.join(os.tmpdir(), "vintedauto-local-cli-"));

    try {
      const schemaPath = path.join(runDir, "listing-generation.schema.json");
      const resultPath = path.join(runDir, "result.json");
      const promptPath = path.join(runDir, "prompt.txt");
      const prompt = buildLocalCliPrompt(
        {
          ...input,
          images: selectedImages,
        },
        input.images.length
      );
      const imagePaths = await writeRunImages(runDir, selectedImages);

      await writeFile(schemaPath, JSON.stringify(listingGenerationSchema, null, 2));
      await writeFile(promptPath, prompt);

      const commandResult = await runLocalCliCommand({
        executable: "codex",
        args: buildCodexListingArgs({
          runDir,
          schemaPath,
          resultPath,
          imagePaths,
          model,
        }),
        cwd: runDir,
        stdin: prompt,
        timeoutMs: getProviderTimeoutMs("local-cli", "listing"),
      });

      if (commandResult.exitCode !== 0) {
        throw new Error(formatLocalCliFailure("Codex CLI", "codex", commandResult));
      }

      const output = await readFile(resultPath, "utf8");

      return buildCanonicalGenerationResult(
        "local-cli",
        `codex:${model}`,
        resolveGeneratedAt(null),
        parseLocalCliJsonPayload(output),
        input.metadata
      );
    } finally {
      if (!getLocalCliKeepRuns()) {
        await rm(runDir, {
          recursive: true,
          force: true,
        });
      }
    }
  }

  private async generateWithClaude(
    input: ListingGenerationInput,
    model: string,
    selectedImages: ListingGenerationImage[]
  ) {
    const runDir = await mkdtemp(path.join(os.tmpdir(), "vintedauto-local-cli-"));

    try {
      const imagePaths = await writeRunImages(runDir, selectedImages);
      const imageFilenames = imagePaths.map((imagePath) => path.basename(imagePath));
      const prompt = buildClaudeCliPrompt(
        {
          ...input,
          images: selectedImages,
        },
        input.images.length,
        imageFilenames
      );

      const commandResult = await runLocalCliCommand({
        executable: "claude",
        args: buildClaudeListingArgs({ runDir, model }),
        cwd: runDir,
        stdin: prompt,
        timeoutMs: getProviderTimeoutMs("local-cli", "listing"),
        outputLimitBytes: 256 * 1024,
      });

      if (commandResult.exitCode !== 0) {
        throw new Error(
          formatLocalCliFailure("Claude Code CLI", "claude", commandResult)
        );
      }

      return buildCanonicalGenerationResult(
        "local-cli",
        `claude:${model}`,
        resolveGeneratedAt(null),
        parseLocalCliJsonPayload(extractClaudeResultText(commandResult.stdout)),
        input.metadata
      );
    } finally {
      if (!getLocalCliKeepRuns()) {
        await rm(runDir, {
          recursive: true,
          force: true,
        });
      }
    }
  }
}

export const localCliListingGenerationService =
  new LocalCliListingGenerationService();
