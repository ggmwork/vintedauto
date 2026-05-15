import { stripMarkdownCodeFence } from "@/lib/ai/listing-generation-shared";

function findJsonObjectBounds(value: string) {
  const start = value.indexOf("{");

  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const char = value[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return {
          start,
          end: index + 1,
        };
      }
    }
  }

  return null;
}

export function parseLocalCliJsonPayload(content: string) {
  const normalizedContent = stripMarkdownCodeFence(content);

  try {
    return JSON.parse(normalizedContent) as Record<string, unknown>;
  } catch {
    const bounds = findJsonObjectBounds(normalizedContent);

    if (!bounds) {
      throw new Error("Local CLI returned no JSON object.");
    }

    return JSON.parse(normalizedContent.slice(bounds.start, bounds.end)) as Record<
      string,
      unknown
    >;
  }
}
