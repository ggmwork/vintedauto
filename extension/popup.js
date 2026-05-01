/* eslint-env browser */
/* global chrome */

const elements = {
  pageStatus: document.getElementById("page-status"),
  pageDetail: document.getElementById("page-detail"),
  draftStatus: document.getElementById("draft-status"),
  fillStatus: document.getElementById("fill-status"),
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

  if (elements.draftStatus) {
    elements.draftStatus.textContent = lastContext?.draftId
      ? `Draft ${lastContext.draftId}`
      : "Open a draft from the app first.";
  }

  if (elements.fillStatus) {
    elements.fillStatus.textContent = describeFillResult(lastFillResult);
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
