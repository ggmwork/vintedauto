export type InboxWatcherHealth = "idle" | "watching" | "scanning" | "error";

export interface InboxWatcherConfig {
  folderPath: string;
  enabled: boolean;
}

export interface InboxWatcherState {
  config: InboxWatcherConfig;
  health: InboxWatcherHealth;
  lastStartedAt: string | null;
  lastScanAt: string | null;
  lastEventAt: string | null;
  lastImportAt: string | null;
  lastScanSummary: string | null;
  lastError: string | null;
  importedFileCount: number;
  processedFingerprints: string[];
}

export interface InboxWatcherSnapshot extends InboxWatcherState {
  running: boolean;
}
