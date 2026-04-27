export type InboxWatcherHealth = "idle" | "watching" | "error";

export interface InboxWatcherConfig {
  folderPath: string;
  enabled: boolean;
}

export interface InboxWatcherState {
  config: InboxWatcherConfig;
  health: InboxWatcherHealth;
  lastStartedAt: string | null;
  lastEventAt: string | null;
  lastImportAt: string | null;
  lastError: string | null;
  importedFileCount: number;
  processedFingerprints: string[];
}

export interface InboxWatcherSnapshot extends InboxWatcherState {
  running: boolean;
}
