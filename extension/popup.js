/* global chrome */

const elements = {
  pageStatus: document.getElementById("page-status"),
  pageDetail: document.getElementById("page-detail"),
  pageDebug: document.getElementById("page-debug"),
  draftStatus: document.getElementById("draft-status"),
  fillStatus: document.getElementById("fill-status"),
  fillDebug: document.getElementById("fill-debug"),
  appStockStatus: document.getElementById("app-stock-status"),
  appStockList: document.getElementById("app-stock-list"),
  refreshAppStockButton: document.getElementById("refresh-app-stock"),
  actionStatus: document.getElementById("action-status"),
  configForm: document.getElementById("config-form"),
  appOrigin: document.getElementById("app-origin"),
  createListingUrl: document.getElementById("create-listing-url"),
  fillCurrentPageButton: document.getElementById("fill-current-page"),
  openVintedAndFillButton: document.getElementById("open-vinted-and-fill"),
};

let currentPopupState = null;

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

function formatDateTime(value) {
  if (!value) {
    return "unknown time";
  }

  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getStockRowTitle(item) {
  return item.draftTitle?.trim() || item.stockItemName || `Draft ${item.draftId}`;
}

function describeStockRowState(item, isLoaded) {
  if (item.ready) {
    return isLoaded
      ? `Ready for Vinted. Loaded in extension. Last updated ${formatDateTime(item.updatedAt)}.`
      : `Ready for Vinted. Last updated ${formatDateTime(item.updatedAt)}.`;
  }

  return `Not ready yet. Missing: ${item.missingFields.join(", ")}.`;
}

async function handleLoadAppStockItem(item) {
  setActionStatus("Loading app item into the extension...");

  const response = await chrome.runtime.sendMessage({
    type: "vinted-auto:load-app-stock-item",
    context: {
      draftId: item.draftId,
      appOrigin:
        currentPopupState?.config?.appOrigin ??
        elements.appOrigin?.value ??
        "http://127.0.0.1:3000",
    },
  });

  if (!response?.ok) {
    setActionStatus(response?.message ?? "Failed to load the app item.", true);
    return;
  }

  setActionStatus("App item loaded into the extension.");
  await refreshPopupState();
}

async function handleOpenSpecificAppStockItem(item) {
  setActionStatus("Opening Vinted for the selected app item...");

  const response = await chrome.runtime.sendMessage({
    type: "vinted-auto:open-vinted-and-fill",
    context: {
      draftId: item.draftId,
      appOrigin:
        currentPopupState?.config?.appOrigin ??
        elements.appOrigin?.value ??
        "http://127.0.0.1:3000",
    },
  });

  if (!response?.ok) {
    setActionStatus(response?.message ?? "Failed to open Vinted.", true);
    return;
  }

  setActionStatus("Opened Vinted for the selected app item.");
  await refreshPopupState();
}

function renderAppStockItems(state) {
  if (!elements.appStockStatus || !elements.appStockList) {
    return;
  }

  const items = Array.isArray(state.appStockItems) ? state.appStockItems : [];
  const lastContext = state.lastContext ?? null;

  if (state.appStockError) {
    elements.appStockStatus.textContent = state.appStockError;
    elements.appStockList.replaceChildren();
    return;
  }

  if (items.length === 0) {
    elements.appStockStatus.textContent =
      "No drafted stock items found in the app yet.";
    elements.appStockList.replaceChildren();
    return;
  }

  elements.appStockStatus.textContent = `${items.length} app item${items.length === 1 ? "" : "s"} available.`;

  const rows = items.map((item) => {
    const row = document.createElement("article");
    row.className = "stock-row";

    const title = document.createElement("p");
    title.className = "stock-title";
    title.textContent = getStockRowTitle(item);

    const meta = document.createElement("p");
    meta.className = "stock-meta";
    meta.textContent = `${item.stockItemName} · ${item.imageCount} image${item.imageCount === 1 ? "" : "s"} · ${item.sourceLabel}`;

    const stateCopy = document.createElement("p");
    stateCopy.className = "stock-state";
    stateCopy.textContent = describeStockRowState(
      item,
      lastContext?.draftId === item.draftId
    );

    const actions = document.createElement("div");
    actions.className = "stock-actions";

    const loadButton = document.createElement("button");
    loadButton.type = "button";
    loadButton.className =
      lastContext?.draftId === item.draftId ? "secondary" : "ghost-button";
    loadButton.textContent =
      lastContext?.draftId === item.draftId ? "Loaded" : "Load";
    loadButton.disabled = !item.ready;
    loadButton.addEventListener("click", () => {
      handleLoadAppStockItem(item).catch((error) => {
        setActionStatus(
          error instanceof Error ? error.message : "Failed to load the app item.",
          true
        );
      });
    });

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.textContent = "Open on Vinted";
    openButton.disabled = !item.ready;
    openButton.addEventListener("click", () => {
      handleOpenSpecificAppStockItem(item).catch((error) => {
        setActionStatus(
          error instanceof Error ? error.message : "Failed to open Vinted.",
          true
        );
      });
    });

    actions.append(loadButton, openButton);
    row.append(title, meta, stateCopy, actions);

    return row;
  });

  elements.appStockList.replaceChildren(...rows);
}

function renderPopupState(state) {
  currentPopupState = state;

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
      : "Open a ready draft in the app and click Fill on Vinted first.";
  }

  if (elements.fillStatus) {
    elements.fillStatus.textContent = describeFillResult(lastFillResult);
  }

  if (elements.fillDebug) {
    elements.fillDebug.textContent = describeFillDiagnostics(lastFillResult);
  }

  renderAppStockItems(state);

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
elements.refreshAppStockButton?.addEventListener("click", () => {
  refreshPopupState().catch((error) => {
    setActionStatus(error instanceof Error ? error.message : "Refresh failed.", true);
  });
});

refreshPopupState().catch((error) => {
  setActionStatus(error instanceof Error ? error.message : "Popup init failed.", true);
});
