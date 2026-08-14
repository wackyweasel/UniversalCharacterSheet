import { create } from 'zustand';
import {
  getStorageStatus,
  getSeverity,
  type StorageStatus,
  type StorageSeverity,
} from '../utils/storageMonitor';

interface StorageWarningState {
  status: StorageStatus;
  severity: StorageSeverity;
  /** Whether the user has manually dismissed the banner for this session */
  dismissed: boolean;
  /** Whether a save failed due to QuotaExceededError */
  saveFailed: boolean;

  /** Re-check storage usage (call after saves or on a timer) */
  refresh: () => void;
  dismiss: () => void;
  /** Called by stores when a QuotaExceededError is caught */
  reportSaveFailure: () => void;
  clearSaveFailure: () => void;
}

export const useStorageWarningStore = create<StorageWarningState>((set) => {
  const initial = getStorageStatus();

  return {
    status: initial,
    severity: getSeverity(initial.ratio),
    dismissed: false,
    saveFailed: false,

    refresh: () => {
      const status = getStorageStatus();
      const severity = getSeverity(status.ratio);
      set((prev) => {
        // If severity worsened, un-dismiss so the user sees it again
        const dismissed =
          prev.dismissed && severity === prev.severity ? true : false;
        return { status, severity, dismissed };
      });
    },

    dismiss: () => set({ dismissed: true }),

    reportSaveFailure: () => {
      const status = getStorageStatus();
      set({
        saveFailed: true,
        status,
        severity: getSeverity(status.ratio),
        dismissed: false,
      });
    },

    clearSaveFailure: () => set({ saveFailed: false }),
  };
});

// Auto-refresh every 30 seconds while the app is running
setInterval(() => {
  useStorageWarningStore.getState().refresh();
}, 30_000);
