import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  coerceDraftVintedFieldValue,
  formatVintedCategoryPathInput,
  formatVintedFieldValue,
  getVintedFieldDefinition,
  getVintedProfileMissingFieldKeys,
  hydrateDraftVintedProfileState,
  parseVintedCategoryPathInput,
  resolveVintedListingProfile,
} from "@/lib/vinted/listing-profile";

describe("Vinted listing profile", () => {
  it("infers the PT mens shirts profile from English or Portuguese categories", () => {
    const englishProfile = resolveVintedListingProfile({
      category: "Men's shirts",
    });
    const portugueseProfile = resolveVintedListingProfile({
      category: "Camisas",
    });

    assert.equal(englishProfile.profileKey, "mens_shirts_pt");
    assert.equal(portugueseProfile.profileKey, "mens_shirts_pt");
    assert.deepEqual(englishProfile.categoryPlan, {
      searchQuery: "Camisas",
      path: ["Homem", "Roupa", "Tops e t-shirts", "Camisas"],
    });
    assert.deepEqual(
      englishProfile.dynamicFields.map((field) => field.key),
      [
        "logistics.packageSize",
        "compliance.aiGeneratedPhotos",
        "measurements.shoulderWidthCm",
        "measurements.lengthCm",
      ]
    );
  });

  it("lets the category inference override a stale preferred profile", () => {
    const profile = resolveVintedListingProfile({
      category: "Casacos",
      state: {
        market: "vinted.pt",
        profileKey: "mens_shirts_pt",
        categoryPlan: null,
        fieldValues: {},
      },
    });

    assert.equal(profile.profileKey, "coats_jackets_pt");
    assert.deepEqual(profile.categoryPlan.path, [
      "Homem",
      "Roupa",
      "Casacos",
      "Casacos",
    ]);
  });

  it("hydrates missing profile state with inferred defaults and preserves saved values", () => {
    const state = hydrateDraftVintedProfileState({
      category: "Camisas",
      state: {
        market: "vinted.pt",
        profileKey: null,
        categoryPlan: {
          searchQuery: "Camisa",
          path: ["Homem", "Roupa", "Tops e t-shirts", "Camisas"],
        },
        fieldValues: {
          "logistics.packageSize": "medium",
          "measurements.lengthCm": 74,
        },
      },
    });

    assert.equal(state.profileKey, "mens_shirts_pt");
    assert.deepEqual(state.categoryPlan, {
      searchQuery: "Camisa",
      path: ["Homem", "Roupa", "Tops e t-shirts", "Camisas"],
    });
    assert.equal(state.fieldValues["logistics.packageSize"], "medium");
    assert.equal(state.fieldValues["measurements.lengthCm"], 74);
  });

  it("reports only required missing Vinted fields", () => {
    const profile = resolveVintedListingProfile({
      category: "Camisas",
    });

    assert.deepEqual(
      getVintedProfileMissingFieldKeys(profile, {
        market: "vinted.pt",
        profileKey: "mens_shirts_pt",
        categoryPlan: profile.categoryPlan,
        fieldValues: {},
      }),
      ["logistics.packageSize"]
    );

    assert.deepEqual(
      getVintedProfileMissingFieldKeys(profile, {
        market: "vinted.pt",
        profileKey: "mens_shirts_pt",
        categoryPlan: profile.categoryPlan,
        fieldValues: {
          "logistics.packageSize": "small",
        },
      }),
      []
    );
  });

  it("coerces and formats field values for form and handoff display", () => {
    const packageSize = getVintedFieldDefinition("logistics.packageSize");
    const aiPhotos = getVintedFieldDefinition("compliance.aiGeneratedPhotos");
    const shoulderWidth = getVintedFieldDefinition(
      "measurements.shoulderWidthCm"
    );

    assert.equal(coerceDraftVintedFieldValue(packageSize, " medium "), "medium");
    assert.equal(coerceDraftVintedFieldValue(aiPhotos, "on"), true);
    assert.equal(coerceDraftVintedFieldValue(aiPhotos, null), false);
    assert.equal(coerceDraftVintedFieldValue(shoulderWidth, "46,5"), 46.5);
    assert.equal(formatVintedFieldValue(packageSize, "medium"), "Medium");
    assert.equal(formatVintedFieldValue(shoulderWidth, 46.5), "46.5 cm");
  });

  it("parses and formats category path input", () => {
    const path = parseVintedCategoryPathInput(
      " Homem > Roupa > Tops e t-shirts > Camisas "
    );

    assert.deepEqual(path, ["Homem", "Roupa", "Tops e t-shirts", "Camisas"]);
    assert.equal(
      formatVintedCategoryPathInput({
        searchQuery: "Camisas",
        path,
      }),
      "Homem > Roupa > Tops e t-shirts > Camisas"
    );
  });
});
