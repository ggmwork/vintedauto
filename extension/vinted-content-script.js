/* global chrome */

function getAdapter() {
  if (!globalThis.VintedAutoFormAdapter) {
    throw new Error("Vinted form adapter is not loaded.");
  }

  return globalThis.VintedAutoFormAdapter;
}

function createResult() {
  return {
    status: "failure",
    filledFields: [],
    skippedFields: [],
    failedFields: [],
    message: "",
    debug: {
      pageReason: null,
      debugLog: [],
      fieldDiagnostics: {},
    },
  };
}

let pendingPreparedImages = [];
const POST_CATEGORY_FIELD_DELAY_MS = 1000;

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function logDebug(result, message, level = "info") {
  result.debug.debugLog.push(message);

  if (level === "warn") {
    console.warn(`[Vinted Auto] ${message}`);
    return;
  }

  console.info(`[Vinted Auto] ${message}`);
}

function recordField(result, bucket, field) {
  const target = result[bucket];

  if (!target.includes(field)) {
    target.push(field);
  }
}

function setFieldDiagnostic(result, field, diagnostic, extraDetail) {
  const baseDetail =
    diagnostic && typeof diagnostic.detail === "string"
      ? diagnostic.detail
      : "No diagnostic detail saved.";
  const baseMatchedBy =
    diagnostic && typeof diagnostic.matchedBy === "string"
      ? diagnostic.matchedBy
      : null;

  result.debug.fieldDiagnostics[field] = {
    detail: extraDetail ? `${baseDetail} ${extraDetail}`.trim() : baseDetail,
    matchedBy: baseMatchedBy,
  };
}

function copyPageDiagnosticsIntoResult(result, pageState) {
  result.debug.pageReason = pageState.reason ?? null;

  Object.entries(pageState.fieldDiagnostics ?? {}).forEach(([field, diagnostic]) => {
    setFieldDiagnostic(result, field, diagnostic);
  });

  (pageState.debugLog ?? []).forEach((entry) => {
    logDebug(result, entry, pageState.supported ? "info" : "warn");
  });
}

function buildFailureSummary(result) {
  return result.failedFields
    .map((field) => {
      const diagnostic = result.debug.fieldDiagnostics[field];
      return diagnostic ? `${field}: ${diagnostic.detail}` : `${field}: no diagnostic detail.`;
    })
    .join(" | ");
}

function finalizeResult(result) {
  if (!result.message) {
    if (result.failedFields.length === 0) {
      result.status = "success";
      result.message = "Filled the supported Vinted listing page.";
    } else if (result.filledFields.length > 0) {
      result.status = "partial_success";
      result.message = `Filled some fields, but ${result.failedFields.join(", ")} still need manual work.`;
    } else {
      result.status = "failure";
      result.message = "No fields were filled.";
    }
  } else if (result.filledFields.length > 0) {
    result.status = "partial_success";
  }

  if (result.failedFields.length > 0) {
    const failureSummary = buildFailureSummary(result);

    if (failureSummary) {
      result.message = `${result.message} Diagnostics: ${failureSummary}`;
    }
  }

  logDebug(result, `Fill flow finished with status ${result.status}.`);

  return result;
}

function validatePayload(payload, options) {
  const requireImages = options?.requireImages !== false;
  const missing = [];

  if (!payload?.version) {
    missing.push("version");
  }

  if (!payload?.source?.draftId) {
    missing.push("draft id");
  }

  if (!payload?.listing?.title) {
    missing.push("title");
  }

  if (!payload?.listing?.description) {
    missing.push("description");
  }

  if (
    payload?.listing?.price?.amount === null ||
    payload?.listing?.price?.amount === undefined
  ) {
    missing.push("price");
  }

  if (requireImages && (!Array.isArray(payload?.images) || payload.images.length === 0)) {
    missing.push("images");
  }

  if (!payload?.handoff?.ready) {
    missing.push(
      ...(Array.isArray(payload?.handoff?.missingFields)
        ? payload.handoff.missingFields
        : ["handoff readiness"])
    );
  }

  if (Array.isArray(payload?.listing?.profile?.missingRequiredFieldKeys)) {
    missing.push(...payload.listing.profile.missingRequiredFieldKeys);
  }

  return Array.from(new Set(missing));
}

function isPayloadValueEmpty(value) {
  return value === null || value === undefined || value === "";
}

function decodeBase64(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function buildImageFiles(preparedImages, result) {
  return preparedImages.map((image) => {
    logDebug(result, `Received prepared image ${image.filename} from the extension worker.`);

    const bytes = decodeBase64(image.base64);

    return new File([bytes], image.filename || `image-${image.id}.jpg`, {
      type: image.contentType || "application/octet-stream",
    });
  });
}

async function uploadImages(preparedImages, imagePreparationError, result) {
  const adapter = getAdapter();
  const imageResolution = adapter.resolveImageInput();
  setFieldDiagnostic(result, "images", imageResolution);

  if (!(imageResolution.control instanceof HTMLInputElement)) {
    throw new Error(imageResolution.detail);
  }

  if (imagePreparationError) {
    throw new Error(imagePreparationError);
  }

  if (!Array.isArray(preparedImages) || preparedImages.length === 0) {
    throw new Error("Extension worker did not provide any prepared images.");
  }

  const files = buildImageFiles(preparedImages, result);
  const dataTransfer = new DataTransfer();

  files.forEach((file) => {
    dataTransfer.items.add(file);
  });

  imageResolution.control.files = dataTransfer.files;
  imageResolution.control.dispatchEvent(new Event("input", { bubbles: true }));
  imageResolution.control.dispatchEvent(new Event("change", { bubbles: true }));

  setFieldDiagnostic(
    result,
    "images",
    imageResolution,
    `Uploaded ${files.length} image file(s) in payload order.`
  );
  logDebug(result, `Uploaded ${files.length} image file(s).`);
}

async function fillTextField(result, field, resolution, value, options) {
  const adapter = getAdapter();
  setFieldDiagnostic(result, field, resolution);

  if (isPayloadValueEmpty(value)) {
    recordField(result, "skippedFields", field);
    setFieldDiagnostic(result, field, resolution, "Skipped because the payload value is empty.");
    logDebug(result, `Skipped ${field}: payload value is empty.`);
    return;
  }

  if (
    !(
      resolution.control instanceof HTMLInputElement ||
      resolution.control instanceof HTMLTextAreaElement
    )
  ) {
    const bucket = options?.skipMissingControl ? "skippedFields" : "failedFields";
    recordField(result, bucket, field);
    setFieldDiagnostic(
      result,
      field,
      resolution,
      options?.skipMissingControl
        ? "Skipped because no text input control was visible after category selection."
        : "Failed because no text input control was available."
    );
    logDebug(
      result,
      `${options?.skipMissingControl ? "Skipped" : "Failed"} ${field}: ${
        resolution.detail
      }`,
      options?.skipMissingControl ? "info" : "warn"
    );
    return false;
  }

  adapter.setControlValue(resolution.control, value);
  recordField(result, "filledFields", field);
  setFieldDiagnostic(result, field, resolution, `Filled with payload value "${value}".`);
  logDebug(result, `Filled ${field}.`);
  return true;
}

async function fillPriceField(result, resolution, amount) {
  const adapter = getAdapter();
  setFieldDiagnostic(result, "price", resolution);

  if (amount === null || amount === undefined || amount === "") {
    recordField(result, "skippedFields", "price");
    setFieldDiagnostic(
      result,
      "price",
      resolution,
      "Skipped because the payload price amount is empty."
    );
    logDebug(result, "Skipped price: payload amount is empty.");
    return;
  }

  if (
    !(
      resolution.control instanceof HTMLInputElement ||
      resolution.control instanceof HTMLTextAreaElement
    )
  ) {
    recordField(result, "failedFields", "price");
    setFieldDiagnostic(
      result,
      "price",
      resolution,
      "Failed because no text input control was available."
    );
    logDebug(result, `Failed price: ${resolution.detail}`, "warn");
    return;
  }

  const priceFill = await adapter.setPriceValue(resolution.control, amount);

  if (priceFill.ok) {
    recordField(result, "filledFields", "price");
    setFieldDiagnostic(result, "price", resolution, priceFill.detail);
    logDebug(result, `Filled price: ${priceFill.detail}`);
    return;
  }

  recordField(result, "failedFields", "price");
  setFieldDiagnostic(result, "price", resolution, priceFill.detail);
  logDebug(result, `Failed price: ${priceFill.detail}`, "warn");
}

async function fillChoiceField(result, field, resolution, value, options) {
  const adapter = getAdapter();
  setFieldDiagnostic(result, field, resolution);

  if (field !== "category" && isPayloadValueEmpty(value)) {
    recordField(result, "skippedFields", field);
    setFieldDiagnostic(result, field, resolution, "Skipped because the payload value is empty.");
    logDebug(result, `Skipped ${field}: payload value is empty.`);
    return false;
  }

  if (!resolution.control) {
    const bucket = options?.skipMissingControl ? "skippedFields" : "failedFields";
    recordField(result, bucket, field);
    setFieldDiagnostic(
      result,
      field,
      resolution,
      options?.skipMissingControl
        ? "Skipped because no visible choice control was available after category selection."
        : "Failed because no visible choice control was available."
    );
    logDebug(
      result,
      `${options?.skipMissingControl ? "Skipped" : "Failed"} ${field}: ${
        resolution.detail
      }`,
      options?.skipMissingControl ? "info" : "warn"
    );
    return false;
  }

  const selection = await adapter.selectChoiceValue(
    field,
    resolution.control,
    value,
    options ?? null
  );

  if (selection.ok) {
    recordField(result, "filledFields", field);
    setFieldDiagnostic(result, field, resolution, selection.detail);
    logDebug(result, `Filled ${field}: ${selection.detail}`);
    return true;
  }

  if (selection.skipped) {
    recordField(result, "skippedFields", field);
    setFieldDiagnostic(result, field, resolution, selection.detail);
    logDebug(result, `Skipped ${field}: ${selection.detail}`);
    return false;
  }

  recordField(result, "failedFields", field);
  setFieldDiagnostic(result, field, resolution, selection.detail);
  logDebug(result, `Failed ${field}: ${selection.detail}`, "warn");
  return false;
}

async function fillCategoryField(result, resolution, value, categoryPlan) {
  return fillChoiceField(result, "category", resolution, value, {
    categoryPlan,
  });
}

async function fillBooleanField(result, field, resolution, value) {
  const adapter = getAdapter();
  setFieldDiagnostic(result, field, resolution);

  if (value === null || value === undefined) {
    recordField(result, "skippedFields", field);
    setFieldDiagnostic(result, field, resolution, "Skipped because the payload value is empty.");
    logDebug(result, `Skipped ${field}: payload value is empty.`);
    return;
  }

  if (!resolution.control && value === false) {
    recordField(result, "skippedFields", field);
    setFieldDiagnostic(
      result,
      field,
      resolution,
      "Skipped because the page did not expose this optional checkbox."
    );
    logDebug(result, `Skipped ${field}: optional checkbox is not visible on this page.`);
    return;
  }

  if (!(resolution.control instanceof HTMLInputElement)) {
    recordField(result, "failedFields", field);
    setFieldDiagnostic(
      result,
      field,
      resolution,
      "Failed because no checkbox control was available."
    );
    logDebug(result, `Failed ${field}: ${resolution.detail}`, "warn");
    return;
  }

  const toggleResult = adapter.setCheckboxValue(resolution.control, value === true);

  if (toggleResult.ok) {
    recordField(result, "filledFields", field);
    setFieldDiagnostic(result, field, resolution, toggleResult.detail);
    logDebug(result, `Filled ${field}: ${toggleResult.detail}`);
    return;
  }

  recordField(result, "failedFields", field);
  setFieldDiagnostic(result, field, resolution, toggleResult.detail);
  logDebug(result, `Failed ${field}: ${toggleResult.detail}`, "warn");
}

async function fillDynamicProfileFields(result, profile) {
  const adapter = getAdapter();

  if (!profile || !Array.isArray(profile.fields) || profile.fields.length === 0) {
    return;
  }

  for (const fieldDefinition of profile.fields) {
    const resolution = adapter.resolveDynamicField(fieldDefinition.key);

    if (fieldDefinition.required && isPayloadValueEmpty(fieldDefinition.value)) {
      recordField(result, "failedFields", fieldDefinition.key);
      setFieldDiagnostic(
        result,
        fieldDefinition.key,
        resolution,
        "Failed because this required Vinted field is missing from the payload."
      );
      logDebug(
        result,
        `Failed ${fieldDefinition.key}: required payload value is empty.`,
        "warn"
      );
      continue;
    }

    if (fieldDefinition.valueType === "boolean") {
      await fillBooleanField(
        result,
        fieldDefinition.key,
        resolution,
        fieldDefinition.value
      );
      continue;
    }

    if (fieldDefinition.valueType === "single_select") {
      await fillChoiceField(
        result,
        fieldDefinition.key,
        resolution,
        fieldDefinition.value,
        {
          skipMissingControl: true,
        }
      );
      continue;
    }

    await fillTextField(
      result,
      fieldDefinition.key,
      resolution,
      fieldDefinition.value,
      {
        skipMissingControl: true,
      }
    );
  }
}

async function fillPageFieldsFromPayload(payload) {
  const result = createResult();
  const adapter = getAdapter();
  const payloadMissingFields = validatePayload(payload, {
    requireImages: false,
  });

  if (payloadMissingFields.length > 0) {
    result.failedFields.push(...payloadMissingFields);
    result.debug.pageReason = "Payload validation failed.";
    result.message = `Payload is not ready: ${payloadMissingFields.join(", ")}.`;
    logDebug(result, result.message, "warn");
    return finalizeResult(result);
  }

  logDebug(result, `Starting field fill flow for draft ${payload.source.draftId}.`);

  const pageState = await adapter.waitForSupportedPage();
  copyPageDiagnosticsIntoResult(result, pageState);

  if (!pageState.supported) {
    result.message = pageState.reason;
    return finalizeResult(result);
  }

  await fillTextField(
    result,
    "title",
    adapter.resolveField("title"),
    payload.listing.title
  );
  await fillTextField(
    result,
    "description",
    adapter.resolveField("description"),
    payload.listing.description
  );
  await fillPriceField(result, adapter.resolveField("price"), payload.listing.price.amount);
  await fillChoiceField(
    result,
    "brand",
    adapter.resolveField("brand"),
    payload.listing.metadata.brand
  );
  const categoryFilled = await fillCategoryField(
    result,
    adapter.resolveField("category"),
    payload.listing.metadata.category,
    payload.listing.profile?.categoryPlan ?? null
  );

  if (categoryFilled) {
    logDebug(
      result,
      `Waiting ${POST_CATEGORY_FIELD_DELAY_MS}ms for category-dependent fields.`
    );
    await wait(POST_CATEGORY_FIELD_DELAY_MS);
    (adapter.getPageState().debugLog ?? []).forEach((entry) => {
      logDebug(result, entry);
    });
  }

  await fillChoiceField(
    result,
    "size",
    adapter.resolveField("size"),
    payload.listing.metadata.size,
    {
      skipMissingControl: true,
    }
  );
  await fillChoiceField(
    result,
    "condition",
    adapter.resolveField("condition"),
    payload.listing.metadata.condition,
    {
      skipMissingControl: true,
    }
  );
  await fillChoiceField(
    result,
    "color",
    adapter.resolveField("color"),
    payload.listing.metadata.color,
    {
      skipMissingControl: true,
    }
  );
  await fillChoiceField(
    result,
    "material",
    adapter.resolveField("material"),
    payload.listing.metadata.material,
    {
      skipMissingControl: true,
    }
  );
  await fillDynamicProfileFields(result, payload.listing.profile);

  return finalizeResult(result);
}

async function uploadPreparedImagesFromSession(imagePreparationError) {
  const result = createResult();
  const adapter = getAdapter();
  const pageState = await adapter.waitForSupportedPage();
  copyPageDiagnosticsIntoResult(result, pageState);

  if (!pageState.supported) {
    result.message = pageState.reason;
    pendingPreparedImages = [];
    return finalizeResult(result);
  }

  try {
    await uploadImages(pendingPreparedImages, imagePreparationError, result);
    recordField(result, "filledFields", "images");
  } catch (error) {
    recordField(result, "failedFields", "images");
    const message = error instanceof Error ? error.message : "Image upload failed.";
    const existingDiagnostic = result.debug.fieldDiagnostics.images ?? {
      detail: "No image diagnostic detail.",
      matchedBy: null,
    };
    setFieldDiagnostic(result, "images", existingDiagnostic, message);
    result.message = message;
    logDebug(result, `Failed images: ${message}`, "warn");
  }

  pendingPreparedImages = [];
  return finalizeResult(result);
}

async function stageOrUploadPreparedImages(message) {
  if (message?.reset) {
    pendingPreparedImages = [];
  }

  if (Array.isArray(message?.preparedImages) && message.preparedImages.length > 0) {
    pendingPreparedImages.push(...message.preparedImages);
  }

  if (!message?.commit) {
    return {
      ok: true,
      stagedImageCount: pendingPreparedImages.length,
    };
  }

  return uploadPreparedImagesFromSession(message?.imagePreparationError ?? null);
}

function stripLaunchParamsFromUrl() {
  const url = new URL(window.location.href);
  const keys = [
    "vinted_auto_fill",
    "vinted_auto_draft_id",
    "vinted_auto_app_origin",
  ];

  let changed = false;

  keys.forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  });

  if (changed) {
    window.history.replaceState({}, "", url.toString());
  }
}

function isAllowedLaunchAppOrigin(value) {
  try {
    const url = new URL(value);

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

function readLaunchContextFromUrl() {
  const url = new URL(window.location.href);
  const shouldFill = url.searchParams.get("vinted_auto_fill");
  const draftId = url.searchParams.get("vinted_auto_draft_id");
  const appOrigin = url.searchParams.get("vinted_auto_app_origin");

  if (!shouldFill || !draftId || !appOrigin || !isAllowedLaunchAppOrigin(appOrigin)) {
    return null;
  }

  return {
    draftId,
    appOrigin: new URL(appOrigin).origin,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "vinted-auto:get-page-state":
        return getAdapter().getPageState();
      case "vinted-auto:fill-page-fields":
        return fillPageFieldsFromPayload(message.payload);
      case "vinted-auto:upload-images":
        return stageOrUploadPreparedImages(message);
      case "vinted-auto:read-selected-category":
        return getAdapter().readSelectedCategory(message.source ?? "user_manual");
      default:
        return {
          supported: false,
          reason: "Unknown content-script message.",
        };
    }
  })()
    .then(sendResponse)
    .catch((error) => {
      const result = createResult();
      result.message =
        error instanceof Error ? error.message : "Content script failed.";
      result.debug.pageReason = result.message;
      logDebug(result, result.message, "warn");
      sendResponse(result);
    });

  return true;
});

(async function initFromUrl() {
  const launchContext = readLaunchContextFromUrl();

  if (!launchContext) {
    return;
  }

  stripLaunchParamsFromUrl();

  try {
    await chrome.runtime.sendMessage({
      type: "vinted-auto:prime-from-page",
      draftId: launchContext.draftId,
      appOrigin: launchContext.appOrigin,
    });
  } catch {
    // Ignore startup messaging failures. The popup can still retry.
  }
})();
