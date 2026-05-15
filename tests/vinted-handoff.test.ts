import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createVintedHandoffPayload,
  formatVintedHandoffJson,
  formatVintedHandoffText,
} from "@/lib/vinted/handoff";
import type { DraftDetail } from "@/types/draft";

function createDraft(
  overrides: Partial<DraftDetail> = {}
): DraftDetail {
  const draft: DraftDetail = {
    id: "draft-1",
    status: "ready",
    title: "Linen shirt",
    description: "Lightweight linen shirt in good condition.",
    keywords: ["linen", "shirt"],
    metadata: {
      brand: "Acme",
      category: "Camisas",
      size: "M",
      condition: "Good",
      color: "Blue",
      material: "Linen",
      notes: "No defects.",
    },
    priceSuggestion: {
      amount: 19.99,
      minAmount: null,
      maxAmount: null,
      currency: "EUR",
      rationale: "Comparable shirts sell around this price.",
      confidence: "medium",
    },
    generation: {
      provider: "ollama",
      model: "qwen3.5:9b",
      generatedAt: "2026-05-08T10:00:00.000Z",
      conditionNotes: null,
      snapshot: {
        title: "Linen shirt",
        description: "Lightweight linen shirt in good condition.",
        keywords: ["linen", "shirt"],
        suggestedMetadata: {},
        priceSuggestion: {
          amount: 19.99,
          minAmount: null,
          maxAmount: null,
          currency: "EUR",
          rationale: "Comparable shirts sell around this price.",
          confidence: "medium",
        },
      },
    },
    generationHistory: [],
    vintedProfile: {
      market: "vinted.pt",
      profileKey: "mens_shirts_pt",
      categoryPlan: null,
      fieldValues: {
        "logistics.packageSize": "small",
        "compliance.aiGeneratedPhotos": false,
        "measurements.shoulderWidthCm": 46,
        "measurements.lengthCm": 74,
      },
    },
    vintedHandoff: {
      status: "not_started",
      lastRequestedAt: null,
      lastUpdatedAt: null,
      lastResult: null,
    },
    imageCount: 2,
    images: [
      {
        id: "image-later",
        draftId: "draft-1",
        storagePath: "drafts/draft-1/image-later.jpg",
        originalFilename: "later.jpg",
        sortOrder: 2,
        contentType: "image/jpeg",
        sizeBytes: 2000,
        width: 1200,
        height: 1600,
      },
      {
        id: "image-first",
        draftId: "draft-1",
        storagePath: "drafts/draft-1/image-first.jpg",
        originalFilename: "first.jpg",
        sortOrder: 1,
        contentType: "image/jpeg",
        sizeBytes: 1000,
        width: 1200,
        height: 1600,
      },
    ],
    createdAt: "2026-05-08T09:00:00.000Z",
    updatedAt: "2026-05-08T10:00:00.000Z",
  };

  return {
    ...draft,
    ...overrides,
    metadata: {
      ...draft.metadata,
      ...overrides.metadata,
    },
    vintedProfile: {
      ...draft.vintedProfile,
      ...overrides.vintedProfile,
      fieldValues:
        overrides.vintedProfile?.fieldValues ?? draft.vintedProfile.fieldValues,
    },
  };
}

describe("Vinted handoff payload", () => {
  it("builds a ready versioned payload with sorted images and absolute image URLs", () => {
    const payload = createVintedHandoffPayload(createDraft(), {
      origin: "http://127.0.0.1:3000",
    });

    assert.equal(payload.version, "2026-05-03");
    assert.equal(payload.marketplace, "vinted");
    assert.equal(payload.handoff.ready, true);
    assert.equal(payload.handoff.manualSubmitRequired, true);
    assert.deepEqual(payload.handoff.missingFields, []);
    assert.equal(payload.source.draftId, "draft-1");
    assert.equal(payload.source.generation.provider, "ollama");
    assert.equal(payload.listing.title, "Linen shirt");
    assert.equal(payload.listing.price?.amount, 19.99);
    assert.equal(payload.listing.profile?.profileKey, "mens_shirts_pt");
    assert.deepEqual(payload.listing.profile?.categoryPlan.path, [
      "Homem",
      "Roupa",
      "Tops e t-shirts",
      "Camisas",
    ]);
    assert.deepEqual(payload.listing.profile?.missingRequiredFieldKeys, []);
    assert.equal(
      payload.listing.profile?.fields.find(
        (field) => field.key === "logistics.packageSize"
      )?.value,
      "small"
    );
    assert.deepEqual(
      payload.images.map((image) => image.id),
      ["image-first", "image-later"]
    );
    assert.equal(
      payload.images[0].apiPath,
      "/api/drafts/draft-1/images/image-first?variant=vinted"
    );
    assert.equal(
      payload.images[0].apiUrl,
      "http://127.0.0.1:3000/api/drafts/draft-1/images/image-first?variant=vinted"
    );
    assert.equal(payload.images[0].filename, "first-vinted.jpg");
    assert.equal(payload.images[0].contentType, "image/jpeg");
    assert.equal(payload.images[0].sizeBytes, null);
  });

  it("keeps handoff ready when optional Vinted profile fields are missing", () => {
    const payload = createVintedHandoffPayload(
      createDraft({
        vintedProfile: {
          market: "vinted.pt",
          profileKey: "mens_shirts_pt",
          categoryPlan: null,
          fieldValues: {
            "logistics.packageSize": null,
          },
        },
      })
    );

    assert.equal(payload.handoff.ready, true);
    assert.deepEqual(payload.handoff.missingFields, []);
    assert.deepEqual(payload.listing.profile?.missingRequiredFieldKeys, [
      "logistics.packageSize",
    ]);
    assert.equal(payload.images[0].apiUrl, null);
  });

  it("falls back to generic readiness failures when core listing fields are absent", () => {
    const payload = createVintedHandoffPayload(
      createDraft({
        title: null,
        keywords: [],
        images: [],
        priceSuggestion: null,
        metadata: {
          brand: null,
          category: null,
          size: null,
          condition: null,
          color: null,
          material: null,
          notes: null,
        },
        vintedProfile: {
          market: "vinted.pt",
          profileKey: null,
          categoryPlan: null,
          fieldValues: {},
        },
      })
    );

    assert.equal(payload.handoff.ready, false);
    assert.deepEqual(payload.handoff.missingFields, [
      "images",
      "title",
      "keywords",
      "price",
      "category",
      "condition",
    ]);
    assert.deepEqual(payload.images, []);
    assert.equal(payload.listing.profile?.profileKey, "generic_apparel_pt");
  });

  it("formats handoff text and JSON from the payload", () => {
    const payload = createVintedHandoffPayload(createDraft());
    const text = formatVintedHandoffText(payload);
    const json = formatVintedHandoffJson(payload);

    assert.match(text, /Title: Linen shirt/);
    assert.match(text, /Price: 19\.99 EUR/);
    assert.match(text, /Vinted profile: PT mens shirts/);
    assert.match(text, /Package size: Small/);
    assert.deepEqual(JSON.parse(json), payload);
  });
});
