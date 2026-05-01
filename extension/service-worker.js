/* eslint-env serviceworker */
/* global chrome */

const STORAGE_KEYS = {
  config: "config",
  lastContext: "lastContext",
  lastFillResult: "lastFillResult",
};

const DEFAULT_CONFIG = {
  appOrigin: "http://127.0.0.1:3000",
  createListingUrl: "https://www.vinted.pt/items/new",
};

function toMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function normalizeAppOrigin(value) {
  try {
    const url = new URL(String(value || DEFAULT_CONFIG.appOrigin));
    return `${url.protocol}//${url.host}`;
  } catch {
    return DEFAULT_CONFIG.appOrigin;
  }
}

function normalizeCreateListingUrl(value) {
  try {
    return new URL(String(value || DEFAULT_CONFIG.createListingUrl)).toString();
  } catch {
    return DEFAULT_CONFIG.createListingUrl;
  }
}

async function ensureDefaultConfig() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.config);

  if (stored[STORAGE_KEYS.config]) {
    return;
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.config]: DEFAULT_CONFIG,
  });
}

async function loadConfig() {
  await ensureDefaultConfig();
  const stored = await chrome.storage.local.get(STORAGE_KEYS.config);
  const config = stored[STORAGE_KEYS.config] ?? {};

  return {
    appOrigin: normalizeAppOrigin(config.appOrigin),
    createListingUrl: normalizeCreateListingUrl(config.createListingUrl),
  };
}

async function saveConfig(nextConfig) {
  const current = await loadConfig();
  const normalizedConfig = {
    appOrigin: normalizeAppOrigin(nextConfig?.appOrigin ?? current.appOrigin),
    createListingUrl: normalizeCreateListingUrl(
      nextConfig?.createListingUrl ?? current.createListingUrl
    ),
  };

  await chrome.storage.local.set({
    [STORAGE_KEYS.config]: normalizedConfig,
  });

  return normalizedConfig;
}

async function getLastContext() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.lastContext);
  return stored[STORAGE_KEYS.lastContext] ?? null;
}

async function setLastContext(context) {
  const normalizedContext = {
    draftId: String(context.draftId),
    appOrigin: normalizeAppOrigin(context.appOrigin),
    savedAt: new Date().toISOString(),
  };

  await chrome.storage.local.set({
    [STORAGE_KEYS.lastContext]: normalizedContext,
  });

  return normalizedContext;
}

async function getLastFillResult() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.lastFillResult);
  return stored[STORAGE_KEYS.lastFillResult] ?? null;
}

async function setLastFillResult(result) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.lastFillResult]: {
      ...result,
      recordedAt: new Date().toISOString(),
    },
  });
}

function buildLaunchUrl(createListingUrl, context) {
  const nextUrl = new URL(createListingUrl);
  nextUrl.searchParams.set("vinted_auto_fill", "1");
  nextUrl.searchParams.set("vinted_auto_draft_id", context.draftId);
  nextUrl.searchParams.set(
    "vinted_auto_app_origin",
    normalizeAppOrigin(context.appOrigin)
  );

  return nextUrl.toString();
}

function buildHandoffUrl(context) {
  return `${normalizeAppOrigin(context.appOrigin)}/api/drafts/${encodeURIComponent(
    context.draftId
  )}/vinted-handoff`;
}

function isValidPayload(payload) {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      payload.source?.draftId &&
      payload.handoff &&
      payload.listing &&
      Array.isArray(payload.images)
  );
}

async function fetchHandoffPayload(context) {
  const response = await fetch(buildHandoffUrl(context), {
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      responseText || `App returned ${response.status} for the handoff request.`
    );
  }

  const payload = await response.json();

  if (!isValidPayload(payload)) {
    throw new Error("App returned an invalid handoff payload.");
  }

  return payload;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  return tabs[0] ?? null;
}

async function getTargetTab(tabId) {
  if (typeof tabId === "number") {
    return chrome.tabs.get(tabId);
  }

  return getActiveTab();
}

async function requestPageState(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, {
      type: "vinted-auto:get-page-state",
    });
  } catch {
    return {
      supported: false,
      reason: "Open a supported Vinted create-listing page first.",
    };
  }
}

async function fillTabFromContext(tabId, context) {
  const normalizedContext = await setLastContext(context);
  const payload = await fetchHandoffPayload(normalizedContext);
  const result = await chrome.tabs.sendMessage(tabId, {
    type: "vinted-auto:fill-page",
    payload,
    context: normalizedContext,
  });

  await setLastFillResult(result);

  return result;
}

async function getPopupState() {
  const [config, lastContext, lastFillResult, activeTab] = await Promise.all([
    loadConfig(),
    getLastContext(),
    getLastFillResult(),
    getActiveTab(),
  ]);

  const pageState =
    activeTab?.id !== undefined ? await requestPageState(activeTab.id) : null;

  return {
    config,
    lastContext,
    lastFillResult,
    activeTab: activeTab
      ? {
          id: activeTab.id,
          title: activeTab.title ?? null,
          url: activeTab.url ?? null,
        }
      : null,
    pageState,
  };
}

async function handleFillCurrentPage(message) {
  const [config, storedContext, targetTab] = await Promise.all([
    loadConfig(),
    getLastContext(),
    getTargetTab(message.tabId),
  ]);

  if (!targetTab?.id) {
    return {
      ok: false,
      message: "No active tab found.",
    };
  }

  const context = {
    draftId: message.context?.draftId ?? storedContext?.draftId,
    appOrigin:
      message.context?.appOrigin ??
      storedContext?.appOrigin ??
      config.appOrigin,
  };

  if (!context.draftId || !context.appOrigin) {
    return {
      ok: false,
      message: "No draft handoff is loaded yet. Open Vinted from the app first.",
    };
  }

  try {
    const result = await fillTabFromContext(targetTab.id, context);

    return {
      ok: true,
      result,
    };
  } catch (error) {
    return {
      ok: false,
      message: toMessage(error, "Failed to fill the current page."),
    };
  }
}

async function handleOpenVintedAndFill(message) {
  const [config, storedContext] = await Promise.all([
    loadConfig(),
    getLastContext(),
  ]);

  const context = {
    draftId: message.context?.draftId ?? storedContext?.draftId,
    appOrigin:
      message.context?.appOrigin ??
      storedContext?.appOrigin ??
      config.appOrigin,
  };

  if (!context.draftId || !context.appOrigin) {
    return {
      ok: false,
      message: "No draft handoff is loaded yet. Open the flow from the app first.",
    };
  }

  await setLastContext(context);
  const url = buildLaunchUrl(config.createListingUrl, context);
  await chrome.tabs.create({ url });

  return {
    ok: true,
    url,
  };
}

async function handlePrimeFromPage(message, sender) {
  const tabId = sender.tab?.id;

  if (tabId === undefined) {
    return {
      ok: false,
      message: "Extension could not resolve the Vinted tab.",
    };
  }

  if (!message.draftId || !message.appOrigin) {
    return {
      ok: false,
      message: "Missing draft context in the Vinted page URL.",
    };
  }

  try {
    const result = await fillTabFromContext(tabId, {
      draftId: message.draftId,
      appOrigin: message.appOrigin,
    });

    return {
      ok: true,
      result,
    };
  } catch (error) {
    return {
      ok: false,
      message: toMessage(error, "Failed to load the handoff payload from the app."),
    };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaultConfig().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  ensureDefaultConfig().catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "vinted-auto:get-popup-state":
        return {
          ok: true,
          state: await getPopupState(),
        };
      case "vinted-auto:save-config": {
        const config = await saveConfig(message.config);
        const state = await getPopupState();

        return {
          ok: true,
          config,
          lastContext: state.lastContext,
          lastFillResult: state.lastFillResult,
          pageState: state.pageState,
        };
      }
      case "vinted-auto:fill-current-page":
        return handleFillCurrentPage(message);
      case "vinted-auto:open-vinted-and-fill":
        return handleOpenVintedAndFill(message);
      case "vinted-auto:prime-from-page":
        return handlePrimeFromPage(message, sender);
      default:
        return {
          ok: false,
          message: "Unknown extension message.",
        };
    }
  })()
    .then(sendResponse)
    .catch((error) => {
      sendResponse({
        ok: false,
        message: toMessage(error, "Extension worker failed."),
      });
    });

  return true;
});
