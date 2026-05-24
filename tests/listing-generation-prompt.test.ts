import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildListingPrompt } from "@/lib/ai/listing-generation-shared";

describe("listing generation prompt", () => {
  it("asks for Portuguese buyer-ready Vinted copy without fake research", () => {
    const prompt = buildListingPrompt({
      draftId: "draft_1",
      images: [
        {
          originalFilename: "front.jpg",
          contentType: "image/jpeg",
          bytes: new Uint8Array(),
        },
      ],
      metadata: {
        brand: null,
        category: null,
        size: null,
        condition: null,
        color: null,
        material: null,
        notes: null,
      },
      preferredLanguage: "pt",
      currency: "EUR",
      marketplace: "vinted",
    });

    assert.match(prompt, /Return only JSON/);
    assert.match(prompt, /Portuguese from Portugal \(PT-PT\)/);
    assert.match(prompt, /Title: one line/);
    assert.match(prompt, /Description: Vinted-ready copy/);
    assert.match(prompt, /7-12 relevant hashtags/);
    assert.match(prompt, /Keywords: return the same search concepts/);
    assert.match(prompt, /Do not invent web research, URLs, citations/);
    assert.match(prompt, /Do not cite fake sources/);
  });
});
