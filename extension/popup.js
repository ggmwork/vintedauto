/* global chrome */

const elements = {
  pageStatus: document.getElementById("page-status"),
  pageDetail: document.getElementById("page-detail"),
  pageDebug: document.getElementById("page-debug"),
  draftStatus: document.getElementById("draft-status"),
  fillStatus: document.getElementById("fill-status"),
  fillDebug: document.getElementById("fill-debug"),
  actionStatus: document.getElementById("action-status"),
  configForm: document.getElementById("config-form"),
  appOrigin: document.getElementById("app-origin"),
  createListingUrl: document.getElementById("create-listing-url"),
  fillCurrentPageButton: document.getElementById("fill-current-page"),
  openVintedAndFillButton: document.getElementById("open-vinted-and-fill"),
};

function setActionStatus(message, isError = false) {
  if (!elements.actionStatus) {
    return;
  }

  elements.actionStatus.textContent = message;
  elements.actionStatus.style.color = isError ? "#a12828" : "#62574b";
}

function describeFillResult(result) {
  if (!result) {
    return "No fill attempt yet.";
  }

  const fieldSummary = [
    result.filledFields?.length ? `${result.filledFields.length} filled` : null,
    result.failedFields?.length ? `${result.failedFields.length} failed` : null,
    result.skippedFields?.length ? `${result.skippedFields.length} skipped` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return `${result.status}: ${result.message}${fieldSummary ? ` (${fieldSummary})` : ""}`;
}

function formatFieldDiagnostics(fieldDiagnostics) {
  const entries = Object.entries(fieldDiagnostics ?? {});

  if (entries.length === 0) {
    return "No field diagnostics yet.";
  }

  return entries
    .map(([field, diagnostic]) => {
      const matchedBy = diagnostic?.matchedBy ? ` [${diagnostic.matchedBy}]` : "";
      return `${field}${matchedBy}: ${diagnostic?.detail ?? "No detail."}`;
    })
    .join("\n");
}

function describePageDiagnostics(pageState) {
  if (!pageState) {
    return "Open a Vinted page to inspect diagnostics.";
  }

  const sections = [
    `Reason: ${pageState.reason ?? "No reason reported."}`,
    "",
    "Field diagnostics:",
    formatFieldDiagnostics(pageState.fieldDiagnostics),
  ];

  if (Array.isArray(pageState.debugLog) && pageState.debugLog.length > 0) {
    sections.push("", "Trace:", pageState.debugLog.join("\n"));
  }

  return sections.join("\n");
}

function describeFillDiagnostics(result) {
  if (!result?.debug) {
    return "No fill diagnostics yet.";
  }

  const sections = [
    `Page reason: ${result.debug.pageReason ?? "No page reason recorded."}`,
    "",
    "Field diagnostics:",
    formatFieldDiagnostics(result.debug.fieldDiagnostics),
  ];

  if (Array.isArray(result.debug.debugLog) && result.debug.debugLog.length > 0) {
    sections.push("", "Trace:", result.debug.debugLog.join("\n"));
  }

  return sections.join("\n");
}

function renderPopupState(state) {
  const config = state.config ?? {};
  const pageState = state.pageState ?? null;
  const lastContext = state.lastContext ?? null;
  const lastFillResult = state.lastFillResult ?? null;

  if (elements.appOrigin) {
    elements.appOrigin.value = config.appOrigin ?? "";
  }

  if (elements.createListingUrl) {
    elements.createListingUrl.value = config.createListingUrl ?? "";
  }

  if (elements.pageStatus) {
    elements.pageStatus.textContent = pageState?.supported
      ? "Supported create-listing page"
      : "Unsupported or not ready";
  }

  if (elements.pageDetail) {
    elements.pageDetail.textContent = pageState?.reason ?? "Open the target Vinted page.";
  }

  if (elements.pageDebug) {
    elements.pageDebug.textContent = describePageDiagnostics(pageState);
  }

  if (elements.draftStatus) {
    elements.draftStatus.textContent = lastContext?.draftId
      ? `Draft ${lastContext.draftId}`
      : "Open a draft from the app first.";
  }

  if (elements.fillStatus) {
    elements.fillStatus.textContent = describeFillResult(lastFillResult);
  }

  if (elements.fillDebug) {
    elements.fillDebug.textContent = describeFillDiagnostics(lastFillResult);
  }

  const canUseStoredContext = Boolean(lastContext?.draftId && lastContext?.appOrigin);
  const pageSupported = Boolean(pageState?.supported);

  if (elements.fillCurrentPageButton) {
    elements.fillCurrentPageButton.disabled = !canUseStoredContext || !pageSupported;
  }

  if (elements.openVintedAndFillButton) {
    elements.openVintedAndFillButton.disabled = !canUseStoredContext;
  }
}

async function refreshPopupState() {
  setActionStatus("Refreshing status...");

  const response = await chrome.runtime.sendMessage({
    type: "vinted-auto:get-popup-state",
  });

  if (!response?.ok) {
    setActionStatus(response?.message ?? "Failed to read extension state.", true);
    return;
  }

  renderPopupState(response.state);
  setActionStatus("Ready.");
}

async function handleSaveConfig(event) {
  event.preventDefault();

  setActionStatus("Saving settings...");

  const response = await chrome.runtime.sendMessage({
    type: "vinted-auto:save-config",
    config: {
      appOrigin: elements.appOrigin?.value ?? "",
      createListingUrl: elements.createListingUrl?.value ?? "",
    },
  });

  if (!response?.ok) {
    setActionStatus(response?.message ?? "Failed to save settings.", true);
    return;
  }

  renderPopupState({
    config: response.config,
    lastContext: response.lastContext,
    lastFillResult: response.lastFillResult,
    pageState: response.pageState,
  });
  setActionStatus("Settings saved.");
}

async function handleFillCurrentPage() {
  setActionStatus("Filling current page...");

  const response = await chrome.runtime.sendMessage({
    type: "vinted-auto:fill-current-page",
  });

  if (!response?.ok) {
    setActionStatus(response?.message ?? "Fill request failed.", true);
    return;
  }

  setActionStatus(response.result?.message ?? "Fill request sent.");
  await refreshPopupState();
}

async function handleOpenVintedAndFill() {
  setActionStatus("Opening Vinted...");

  const response = await chrome.runtime.sendMessage({
    type: "vinted-auto:open-vinted-and-fill",
  });

  if (!response?.ok) {
    setActionStatus(response?.message ?? "Failed to open Vinted.", true);
    return;
  }

  setActionStatus("Opened the supported Vinted page.");
}

elements.configForm?.addEventListener("submit", handleSaveConfig);
elements.fillCurrentPageButton?.addEventListener("click", handleFillCurrentPage);
elements.openVintedAndFillButton?.addEventListener("click", handleOpenVintedAndFill);

refreshPopupState().catch((error) => {
  setActionStatus(error instanceof Error ? error.message : "Popup init failed.", true);
});
