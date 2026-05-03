/* global chrome, importScripts */

importScripts("handoff-protocol.js");

const PROTOCOL = globalThis.VintedAutoProtocol ?? {
  version: "2026-05-03",
  storageKeys: {
    config: "config",
    lastContext: "lastContext",
    lastFillResult: "lastFillResult",
    pendingLaunch: "pendingLaunch",
  },
  messageTypes: {
    getPopupState: "vinted-auto:get-popup-state",
    saveConfig: "vinted-auto:save-config",
    fillCurrentPage: "vinted-auto:fill-current-page",
    openVintedAndFill: "vinted-auto:open-vinted-and-fill",
    primeFromPage: "vinted-auto:prime-from-page",
    ping: "vinted-auto:ping",
    launchHandoff: "vinted-auto:launch-handoff",
  },
  launchSources: {
    popup: "popup",
    external: "external_message",
    fallbackUrl: "fallback_url",
  },
};

const STORAGE_KEYS = PROTOCOL.storageKeys;
const MESSAGE_TYPES = PROTOCOL.messageTypes;
const CONTENT_SCRIPT_MESSAGE_TYPES = {
  getPageState: "vinted-auto:get-page-state",
  fillPage: "vinted-auto:fill-page",
};

const DEFAULT_CONFIG = {
  appOrigin: "http://127.0.0.1:3000",
  createListingUrl: "https://www.vinted.pt/items/new",
};

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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

function normalizePendingLaunch(value) {
  return {
    draftId: String(value?.draftId),
    appOrigin: normalizeAppOrigin(value?.appOrigin),
    tabId: typeof value?.tabId === "number" ? value.tabId : null,
    source:
      value?.source === PROTOCOL.launchSources.popup ||
      value?.source === PROTOCOL.launchSources.external ||
      value?.source === PROTOCOL.launchSources.fallbackUrl
        ? value.source
        : PROTOCOL.launchSources.popup,
    requestedAt:
      typeof value?.requestedAt === "string"
        ? value.requestedAt
        : new Date().toISOString(),
    processing: value?.processing === true,
  };
}

function isAllowedExternalSender(senderUrl, appOrigin) {
  if (!senderUrl) {
    return false;
  }

  try {
    const sender = new URL(senderUrl);
    const requestedOrigin = new URL(normalizeAppOrigin(appOrigin));

    return (
      sender.origin === requestedOrigin.origin &&
      (sender.hostname === "localhost" || sender.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
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

function buildHandoffUrl(context) {
  return `${normalizeAppOrigin(context.appOrigin)}/api/drafts/${encodeURIComponent(
    context.draftId
  )}/vinted-handoff`;
}

function buildFillResultUrl(context) {
  return `${normalizeAppOrigin(context.appOrigin)}/api/drafts/${encodeURIComponent(
    context.draftId
  )}/vinted-fill-result`;
}

function buildExtensionFailureResult(message) {
  return {
    status: "failure",
    filledFields: [],
    skippedFields: [],
    failedFields: [],
    message,
    debug: {
      pageReason: message,
      debugLog: [message],
      fieldDiagnostics: {},
    },
  };
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

async function getPendingLaunch() {
  const stored = await chrome.storage.session.get(STORAGE_KEYS.pendingLaunch);
  return stored[STORAGE_KEYS.pendingLaunch] ?? null;
}

async function setPendingLaunch(pendingLaunch) {
  const normalizedPendingLaunch = normalizePendingLaunch(pendingLaunch);

  await chrome.storage.session.set({
    [STORAGE_KEYS.pendingLaunch]: normalizedPendingLaunch,
  });

  return normalizedPendingLaunch;
}

async function clearPendingLaunch() {
  await chrome.storage.session.remove(STORAGE_KEYS.pendingLaunch);
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

async function reportFillResult(context, result) {
  const response = await fetch(buildFillResultUrl(context), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(result),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      responseText ||
        `App returned ${response.status} for the fill result request.`
    );
  }
}

async function recordExtensionFailure(context, message) {
  const failureResult = buildExtensionFailureResult(message);
  await setLastFillResult(failureResult);

  try {
    await reportFillResult(context, failureResult);
  } catch {
    // Ignore app sync failures when recording extension-side launch failures.
  }

  return failureResult;
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
      type: CONTENT_SCRIPT_MESSAGE_TYPES.getPageState,
    });
  } catch {
    return {
      supported: false,
      reason: "Open a supported Vinted create-listing page first.",
    };
  }
}

async function waitForSupportedPage(tabId, timeoutMs = 8000) {
  const startedAt = Date.now();
  let lastState = {
    supported: false,
    reason: "Waiting for the supported Vinted create-listing page.",
  };

  while (Date.now() - startedAt < timeoutMs) {
    lastState = await requestPageState(tabId);

    if (lastState?.supported) {
      return lastState;
    }

    await wait(250);
  }

  throw new Error(
    lastState?.reason ||
      "Timed out while waiting for the supported Vinted create-listing page."
  );
}

async function fillTabFromContext(tabId, context) {
  const normalizedContext = await setLastContext(context);
  const payload = await fetchHandoffPayload(normalizedContext);
  const result = await chrome.tabs.sendMessage(tabId, {
    type: CONTENT_SCRIPT_MESSAGE_TYPES.fillPage,
    payload,
    context: normalizedContext,
  });

  await setLastFillResult(result);

  try {
    await reportFillResult(normalizedContext, result);
    return result;
  } catch (error) {
    const syncedResult = {
      ...result,
      message: `${result.message} App sync failed: ${toMessage(
        error,
        "Unknown app sync failure."
      )}`,
    };

    await setLastFillResult(syncedResult);

    return syncedResult;
  }
}

async function openListingTabForContext(context, source) {
  const [config, normalizedContext] = await Promise.all([
    loadConfig(),
    setLastContext(context),
  ]);

  const tab = await chrome.tabs.create({
    url: config.createListingUrl,
  });

  if (typeof tab.id !== "number") {
    throw new Error("Extension could not create the Vinted listing tab.");
  }

  await setPendingLaunch({
    draftId: normalizedContext.draftId,
    appOrigin: normalizedContext.appOrigin,
    tabId: tab.id,
    source,
    requestedAt: new Date().toISOString(),
    processing: false,
  });

  return {
    url: config.createListingUrl,
    tabId: tab.id,
    context: normalizedContext,
  };
}

async function processPendingLaunchForTab(tabId) {
  const pendingLaunch = await getPendingLaunch();

  if (!pendingLaunch || pendingLaunch.tabId !== tabId || pendingLaunch.processing) {
    return;
  }

  const lockedPendingLaunch = await setPendingLaunch({
    ...pendingLaunch,
    processing: true,
  });

  try {
    await waitForSupportedPage(tabId);
    await fillTabFromContext(tabId, lockedPendingLaunch);
  } catch (error) {
    await recordExtensionFailure(
      lockedPendingLaunch,
      toMessage(error, "Failed to fill the launched Vinted tab.")
    );
  } finally {
    await clearPendingLaunch();
  }
}

async function getPopupState() {
  const [config, lastContext, lastFillResult, pendingLaunch, activeTab] =
    await Promise.all([
      loadConfig(),
      getLastContext(),
      getLastFillResult(),
      getPendingLaunch(),
      getActiveTab(),
    ]);

  const pageState =
    activeTab?.id !== undefined ? await requestPageState(activeTab.id) : null;

  return {
    config,
    lastContext,
    lastFillResult,
    pendingLaunch,
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

  try {
    const launch = await openListingTabForContext(
      context,
      PROTOCOL.launchSources.popup
    );

    return {
      ok: true,
      url: launch.url,
      tabId: launch.tabId,
    };
  } catch (error) {
    return {
      ok: false,
      message: toMessage(error, "Failed to open the Vinted listing page."),
    };
  }
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
      message: toMessage(
        error,
        "Failed to load the handoff payload from the app."
      ),
    };
  }
}

async function handleExternalPing() {
  return {
    ok: true,
    protocolVersion: PROTOCOL.version,
    extensionId: chrome.runtime.id,
    capabilities: {
      externalLaunch: true,
      cleanLaunch: true,
      fallbackRoute: true,
    },
  };
}

async function handleExternalLaunch(message, sender) {
  if (!message?.draftId || !message?.appOrigin) {
    return {
      ok: false,
      message: "Missing draft handoff context for the extension launch.",
    };
  }

  if (!isAllowedExternalSender(sender.url, message.appOrigin)) {
    return {
      ok: false,
      message: "The web app origin is not allowed to control this extension.",
    };
  }

  try {
    const launch = await openListingTabForContext(
      {
        draftId: message.draftId,
        appOrigin: message.appOrigin,
      },
      PROTOCOL.launchSources.external
    );

    return {
      ok: true,
      protocolVersion: PROTOCOL.version,
      launch: {
        tabId: launch.tabId,
        url: launch.url,
        flow: "external_message",
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: toMessage(error, "Extension could not open the Vinted listing tab."),
    };
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url?.includes("vinted.")) {
    return;
  }

  processPendingLaunchForTab(tabId).catch(() => {});
});

chrome.tabs.onRemoved.addListener((tabId) => {
  getPendingLaunch()
    .then((pendingLaunch) => {
      if (pendingLaunch?.tabId === tabId) {
        return clearPendingLaunch();
      }

      return null;
    })
    .catch(() => {});
});

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaultConfig().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  ensureDefaultConfig().catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case MESSAGE_TYPES.getPopupState:
        return {
          ok: true,
          state: await getPopupState(),
        };
      case MESSAGE_TYPES.saveConfig: {
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
      case MESSAGE_TYPES.fillCurrentPage:
        return handleFillCurrentPage(message);
      case MESSAGE_TYPES.openVintedAndFill:
        return handleOpenVintedAndFill(message);
      case MESSAGE_TYPES.primeFromPage:
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

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case MESSAGE_TYPES.ping:
        return handleExternalPing();
      case MESSAGE_TYPES.launchHandoff:
        return handleExternalLaunch(message, sender);
      default:
        return {
          ok: false,
          message: "Unknown external extension message.",
        };
    }
  })()
    .then(sendResponse)
    .catch((error) => {
      sendResponse({
        ok: false,
        message: toMessage(error, "External extension message failed."),
      });
    });

  return true;
});
