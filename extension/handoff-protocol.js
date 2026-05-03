(function initVintedAutoProtocol() {
  globalThis.VintedAutoProtocol = Object.freeze({
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
  });
})();
