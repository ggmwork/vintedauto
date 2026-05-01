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

function validatePayload(payload) {
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

  if (!Array.isArray(payload?.images) || payload.images.length === 0) {
    missing.push("images");
  }

  if (!payload?.handoff?.ready) {
    missing.push(
      ...(Array.isArray(payload?.handoff?.missingFields)
        ? payload.handoff.missingFields
        : ["handoff readiness"])
    );
  }

  return missing;
}

async function fetchImageFiles(payload, appOrigin, result) {
  const files = [];

  for (const image of payload.images) {
    const imageUrl = image.apiUrl || new URL(image.apiPath, appOrigin).toString();
    logDebug(result, `Fetching image ${image.filename} from ${imageUrl}.`);

    const response = await fetch(imageUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image ${image.filename} (${response.status}).`);
    }

    const blob = await response.blob();
    files.push(
      new File([blob], image.filename || `image-${image.id}.jpg`, {
        type: image.contentType || blob.type || "application/octet-stream",
      })
    );
  }

  return files;
}

async function uploadImages(payload, appOrigin, result) {
  const adapter = getAdapter();
  const imageResolution = adapter.resolveImageInput();
  setFieldDiagnostic(result, "images", imageResolution);

  if (!(imageResolution.control instanceof HTMLInputElement)) {
    throw new Error(imageResolution.detail);
  }

  const files = await fetchImageFiles(payload, appOrigin, result);
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

async function fillTextField(result, field, resolution, value) {
  const adapter = getAdapter();
  setFieldDiagnostic(result, field, resolution);

  if (!value) {
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
    recordField(result, "failedFields", field);
    setFieldDiagnostic(
      result,
      field,
      resolution,
      "Failed because no text input control was available."
    );
    logDebug(result, `Failed ${field}: ${resolution.detail}`, "warn");
    return;
  }

  adapter.setControlValue(resolution.control, value);
  recordField(result, "filledFields", field);
  setFieldDiagnostic(result, field, resolution, `Filled with payload value "${value}".`);
  logDebug(result, `Filled ${field}.`);
}

async function fillChoiceField(result, field, resolution, value) {
  const adapter = getAdapter();
  setFieldDiagnostic(result, field, resolution);

  if (!value) {
    recordField(result, "skippedFields", field);
    setFieldDiagnostic(result, field, resolution, "Skipped because the payload value is empty.");
    logDebug(result, `Skipped ${field}: payload value is empty.`);
    return;
  }

  if (!resolution.control) {
    recordField(result, "failedFields", field);
    setFieldDiagnostic(
      result,
      field,
      resolution,
      "Failed because no visible choice control was available."
    );
    logDebug(result, `Failed ${field}: ${resolution.detail}`, "warn");
    return;
  }

  const selection = await adapter.selectChoiceValue(resolution.control, value);

  if (selection.ok) {
    recordField(result, "filledFields", field);
    setFieldDiagnostic(result, field, resolution, selection.detail);
    logDebug(result, `Filled ${field}: ${selection.detail}`);
    return;
  }

  recordField(result, "failedFields", field);
  setFieldDiagnostic(result, field, resolution, selection.detail);
  logDebug(result, `Failed ${field}: ${selection.detail}`, "warn");
}

async function fillPageFromPayload(payload, context) {
  const result = createResult();
  const adapter = getAdapter();
  const payloadMissingFields = validatePayload(payload);

  if (payloadMissingFields.length > 0) {
    result.failedFields.push(...payloadMissingFields);
    result.debug.pageReason = "Payload validation failed.";
    result.message = `Payload is not ready: ${payloadMissingFields.join(", ")}.`;
    logDebug(result, result.message, "warn");
    return result;
  }

  logDebug(result, `Starting fill flow for draft ${payload.source.draftId}.`);

  const pageState = await adapter.waitForSupportedPage();
  copyPageDiagnosticsIntoResult(result, pageState);

  if (!pageState.supported) {
    result.message = pageState.reason;
    return result;
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
  await fillTextField(
    result,
    "price",
    adapter.resolveField("price"),
    adapter.formatPriceForUi(payload.listing.price.amount)
  );
  await fillChoiceField(
    result,
    "brand",
    adapter.resolveField("brand"),
    payload.listing.metadata.brand
  );
  await fillChoiceField(
    result,
    "category",
    adapter.resolveField("category"),
    payload.listing.metadata.category
  );
  await fillChoiceField(
    result,
    "size",
    adapter.resolveField("size"),
    payload.listing.metadata.size
  );
  await fillChoiceField(
    result,
    "condition",
    adapter.resolveField("condition"),
    payload.listing.metadata.condition
  );
  await fillChoiceField(
    result,
    "color",
    adapter.resolveField("color"),
    payload.listing.metadata.color
  );
  await fillChoiceField(
    result,
    "material",
    adapter.resolveField("material"),
    payload.listing.metadata.material
  );

  try {
    await uploadImages(payload, context.appOrigin, result);
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

function readLaunchContextFromUrl() {
  const url = new URL(window.location.href);
  const shouldFill = url.searchParams.get("vinted_auto_fill");
  const draftId = url.searchParams.get("vinted_auto_draft_id");
  const appOrigin = url.searchParams.get("vinted_auto_app_origin");

  if (!shouldFill || !draftId || !appOrigin) {
    return null;
  }

  return {
    draftId,
    appOrigin,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "vinted-auto:get-page-state":
        return getAdapter().getPageState();
      case "vinted-auto:fill-page":
        return fillPageFromPayload(message.payload, message.context);
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
