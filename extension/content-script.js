/* global chrome */

const TITLE_MATCHERS = ["title", "titulo", "titulo do anuncio", "titulo do anúncio"];
const DESCRIPTION_MATCHERS = ["description", "descricao", "descrição"];
const PRICE_MATCHERS = ["price", "preco", "preço"];
const BRAND_MATCHERS = ["brand", "marca"];
const CATEGORY_MATCHERS = ["category", "categoria"];
const SIZE_MATCHERS = ["size", "tamanho"];
const CONDITION_MATCHERS = ["condition", "estado"];
const COLOR_MATCHERS = ["color", "cor"];
const MATERIAL_MATCHERS = ["material", "tecido"];

const CONTROL_SELECTOR = [
  "input:not([type='hidden']):not([type='file'])",
  "textarea",
  "select",
  "[role='combobox']",
  "button[aria-haspopup='listbox']",
  "button[aria-expanded]",
].join(", ");

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isVisible(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function textMatches(value, matchers) {
  const normalizedValue = normalizeText(value);

  return matchers.some((matcher) => {
    const normalizedMatcher = normalizeText(matcher);
    return (
      normalizedValue === normalizedMatcher ||
      normalizedValue.includes(normalizedMatcher)
    );
  });
}

function queryVisible(selector) {
  return [...document.querySelectorAll(selector)].find((candidate) => {
    if (
      candidate instanceof HTMLInputElement ||
      candidate instanceof HTMLTextAreaElement ||
      candidate instanceof HTMLSelectElement ||
      candidate instanceof HTMLElement
    ) {
      return isVisible(candidate);
    }

    return false;
  });
}

function findControlInContainer(container) {
  if (!(container instanceof HTMLElement)) {
    return null;
  }

  const control = container.querySelector(CONTROL_SELECTOR);

  if (
    control instanceof HTMLInputElement ||
    control instanceof HTMLTextAreaElement ||
    control instanceof HTMLSelectElement ||
    control instanceof HTMLElement
  ) {
    return control;
  }

  return null;
}

function findControlByLabel(matchers, directSelectors = []) {
  for (const selector of directSelectors) {
    const directMatch = queryVisible(selector);

    if (directMatch) {
      return directMatch;
    }
  }

  const controls = [
    ...document.querySelectorAll("input, textarea, select, button, [role='combobox']"),
  ];

  for (const control of controls) {
    if (
      (control instanceof HTMLInputElement ||
        control instanceof HTMLTextAreaElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLElement) &&
      isVisible(control) &&
      textMatches(
        [
          control.getAttribute("aria-label"),
          control.getAttribute("placeholder"),
          control.getAttribute("name"),
          control.id,
        ]
          .filter(Boolean)
          .join(" "),
        matchers
      )
    ) {
      return control;
    }
  }

  const labels = [...document.querySelectorAll("label, legend")];

  for (const label of labels) {
    if (!(label instanceof HTMLElement) || !textMatches(label.innerText, matchers)) {
      continue;
    }

    if (label instanceof HTMLLabelElement && label.htmlFor) {
      const labeledControl = document.getElementById(label.htmlFor);

      if (
        labeledControl instanceof HTMLInputElement ||
        labeledControl instanceof HTMLTextAreaElement ||
        labeledControl instanceof HTMLSelectElement ||
        labeledControl instanceof HTMLElement
      ) {
        return labeledControl;
      }
    }

    const nestedControl = findControlInContainer(label);

    if (nestedControl) {
      return nestedControl;
    }

    const fieldContainer = label.closest("fieldset, form, section, div");
    const siblingControl = findControlInContainer(fieldContainer);

    if (siblingControl) {
      return siblingControl;
    }
  }

  return null;
}

function findTitleField() {
  return findControlByLabel(TITLE_MATCHERS, [
    "input[name*='title' i]",
    "input[id*='title' i]",
    "input[placeholder*='title' i]",
    "input[aria-label*='title' i]",
  ]);
}

function findDescriptionField() {
  return findControlByLabel(DESCRIPTION_MATCHERS, [
    "textarea[name*='description' i]",
    "textarea[id*='description' i]",
    "textarea[placeholder*='description' i]",
    "textarea[aria-label*='description' i]",
  ]);
}

function findPriceField() {
  return findControlByLabel(PRICE_MATCHERS, [
    "input[name*='price' i]",
    "input[id*='price' i]",
    "input[placeholder*='price' i]",
    "input[inputmode='decimal']",
  ]);
}

function findBrandField() {
  return findControlByLabel(BRAND_MATCHERS, [
    "input[name*='brand' i]",
    "input[id*='brand' i]",
    "select[name*='brand' i]",
    "[aria-label*='brand' i]",
  ]);
}

function findCategoryField() {
  return findControlByLabel(CATEGORY_MATCHERS, [
    "input[name*='category' i]",
    "input[id*='category' i]",
    "select[name*='category' i]",
    "[aria-label*='category' i]",
  ]);
}

function findSizeField() {
  return findControlByLabel(SIZE_MATCHERS, [
    "input[name*='size' i]",
    "input[id*='size' i]",
    "select[name*='size' i]",
    "[aria-label*='size' i]",
  ]);
}

function findConditionField() {
  return findControlByLabel(CONDITION_MATCHERS, [
    "input[name*='condition' i]",
    "input[id*='condition' i]",
    "select[name*='condition' i]",
    "[aria-label*='condition' i]",
  ]);
}

function findColorField() {
  return findControlByLabel(COLOR_MATCHERS, [
    "input[name*='color' i]",
    "input[id*='color' i]",
    "select[name*='color' i]",
    "[aria-label*='color' i]",
  ]);
}

function findMaterialField() {
  return findControlByLabel(MATERIAL_MATCHERS, [
    "input[name*='material' i]",
    "input[id*='material' i]",
    "select[name*='material' i]",
    "[aria-label*='material' i]",
  ]);
}

function findImageInput() {
  return queryVisible("input[type='file'][multiple], input[type='file']");
}

function getPageState() {
  const supportedPath = /\/items\/new\b/i.test(window.location.pathname);
  const titleField = findTitleField();
  const descriptionField = findDescriptionField();
  const imageInput = findImageInput();

  if (!window.location.hostname.includes("vinted.")) {
    return {
      supported: false,
      reason: "This is not a Vinted page.",
    };
  }

  if (!supportedPath) {
    return {
      supported: false,
      reason: "Only the create-listing page is supported in this MVP.",
    };
  }

  if (!titleField || !descriptionField || !imageInput) {
    return {
      supported: false,
      reason: "Listing form controls are not ready yet.",
    };
  }

  return {
    supported: true,
    reason: "Supported create-listing page detected.",
  };
}

async function waitForSupportedPage(timeoutMs = 8000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const state = getPageState();

    if (state.supported) {
      return state;
    }

    await wait(250);
  }

  return getPageState();
}

function setControlValue(control, value) {
  const nextValue = String(value);

  control.focus();

  if (control instanceof HTMLTextAreaElement) {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    );

    descriptor?.set?.call(control, nextValue);
  } else if (control instanceof HTMLInputElement) {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    );

    descriptor?.set?.call(control, nextValue);
  }

  control.dispatchEvent(new Event("input", { bubbles: true }));
  control.dispatchEvent(new Event("change", { bubbles: true }));
  control.blur();
}

function formatPriceForUi(amount) {
  const numericValue = Number(amount);

  if (Number.isNaN(numericValue)) {
    return "";
  }

  return numericValue.toFixed(2).replace(".", ",");
}

function findOptionCandidate(value) {
  const normalizedValue = normalizeText(value);
  const candidates = [
    ...document.querySelectorAll("[role='option'], li, button, div"),
  ].filter((candidate) => {
    if (!(candidate instanceof HTMLElement) || !isVisible(candidate)) {
      return false;
    }

    const text = normalizeText(candidate.innerText || candidate.textContent);
    return text.length > 0;
  });

  const exactMatch = candidates.find((candidate) =>
    normalizeText(candidate.innerText || candidate.textContent) === normalizedValue
  );

  if (exactMatch instanceof HTMLElement) {
    return exactMatch;
  }

  const partialMatch = candidates.find((candidate) =>
    normalizeText(candidate.innerText || candidate.textContent).includes(normalizedValue)
  );

  return partialMatch instanceof HTMLElement ? partialMatch : null;
}

async function selectChoiceValue(control, value) {
  if (control instanceof HTMLSelectElement) {
    const option = [...control.options].find((candidate) =>
      textMatches(candidate.textContent, [value])
    );

    if (!option) {
      return false;
    }

    control.value = option.value;
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));

    return true;
  }

  if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
    setControlValue(control, value);
    await wait(350);

    const option = findOptionCandidate(value);

    if (option) {
      option.click();
      await wait(150);
    }

    return true;
  }

  if (control instanceof HTMLElement) {
    control.click();
    await wait(250);

    const option = findOptionCandidate(value);

    if (!option) {
      return false;
    }

    option.click();
    await wait(150);

    return true;
  }

  return false;
}

async function fetchImageFiles(payload, appOrigin) {
  const files = [];

  for (const image of payload.images) {
    const imageUrl = image.apiUrl || new URL(image.apiPath, appOrigin).toString();
    const response = await fetch(imageUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image ${image.filename}.`);
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

async function uploadImages(payload, appOrigin) {
  const imageInput = findImageInput();

  if (!(imageInput instanceof HTMLInputElement)) {
    throw new Error("Image upload input not found.");
  }

  const files = await fetchImageFiles(payload, appOrigin);
  const dataTransfer = new DataTransfer();

  files.forEach((file) => {
    dataTransfer.items.add(file);
  });

  imageInput.files = dataTransfer.files;
  imageInput.dispatchEvent(new Event("input", { bubbles: true }));
  imageInput.dispatchEvent(new Event("change", { bubbles: true }));

  await wait(300);
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

function recordField(result, bucket, field) {
  const target = result[bucket];

  if (!target.includes(field)) {
    target.push(field);
  }
}

async function fillTextField(result, field, control, value) {
  if (!value) {
    recordField(result, "skippedFields", field);
    return;
  }

  if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) {
    recordField(result, "failedFields", field);
    return;
  }

  setControlValue(control, value);
  recordField(result, "filledFields", field);
}

async function fillChoiceField(result, field, control, value) {
  if (!value) {
    recordField(result, "skippedFields", field);
    return;
  }

  if (!control) {
    recordField(result, "failedFields", field);
    return;
  }

  const filled = await selectChoiceValue(control, value);

  if (filled) {
    recordField(result, "filledFields", field);
    return;
  }

  recordField(result, "failedFields", field);
}

async function fillPageFromPayload(payload, context) {
  const result = {
    status: "failure",
    filledFields: [],
    skippedFields: [],
    failedFields: [],
    message: "",
  };

  const payloadMissingFields = validatePayload(payload);

  if (payloadMissingFields.length > 0) {
    result.failedFields.push(...payloadMissingFields);
    result.message = `Payload is not ready: ${payloadMissingFields.join(", ")}.`;
    return result;
  }

  const pageState = await waitForSupportedPage();

  if (!pageState.supported) {
    result.message = pageState.reason;
    return result;
  }

  await fillTextField(result, "title", findTitleField(), payload.listing.title);
  await fillTextField(
    result,
    "description",
    findDescriptionField(),
    payload.listing.description
  );
  await fillTextField(
    result,
    "price",
    findPriceField(),
    formatPriceForUi(payload.listing.price.amount)
  );
  await fillChoiceField(
    result,
    "brand",
    findBrandField(),
    payload.listing.metadata.brand
  );
  await fillChoiceField(
    result,
    "category",
    findCategoryField(),
    payload.listing.metadata.category
  );
  await fillChoiceField(
    result,
    "size",
    findSizeField(),
    payload.listing.metadata.size
  );
  await fillChoiceField(
    result,
    "condition",
    findConditionField(),
    payload.listing.metadata.condition
  );
  await fillChoiceField(
    result,
    "color",
    findColorField(),
    payload.listing.metadata.color
  );
  await fillChoiceField(
    result,
    "material",
    findMaterialField(),
    payload.listing.metadata.material
  );

  try {
    await uploadImages(payload, context.appOrigin);
    recordField(result, "filledFields", "images");
  } catch (error) {
    recordField(result, "failedFields", "images");
    result.message = error instanceof Error ? error.message : "Image upload failed.";
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
        return getPageState();
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
      sendResponse({
        status: "failure",
        filledFields: [],
        skippedFields: [],
        failedFields: [],
        message: error instanceof Error ? error.message : "Content script failed.",
      });
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
