import { useStorageWarningStore } from '../store/useStorageWarningStore';
import { formatBytes } from '../utils/storageMonitor';

/**
 * Fixed banner that warns users when localStorage is approaching its quota,
 * or when a save has actually failed due to a QuotaExceededError.
 */
export default function StorageWarning() {
  const { status, severity, dismissed, saveFailed, dismiss, clearSaveFailure } =
    useStorageWarningStore();

  // Nothing to show
  if (severity === 'ok' && !saveFailed) return null;
  if (dismissed && !saveFailed) return null;

  const isCritical = severity === 'critical' || saveFailed;

  // Find the biggest consumer to give actionable advice
  const biggest = status.breakdown[0];
  const hasImages = biggest?.key === 'ucs:store';

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[9999] px-4 py-3 shadow-lg flex items-start gap-3 font-body text-sm ${
        isCritical
          ? 'bg-red-600 text-white'
          : 'bg-yellow-500 text-yellow-950'
      }`}
    >
      {/* Warning icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 flex-shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>

      <div className="flex-1 min-w-0">
        <p className="font-semibold">
          {saveFailed
            ? 'Save failed — browser storage is full!'
            : severity === 'critical'
              ? 'Storage almost full!'
              : 'Storage is getting full'}
        </p>
        <p className={`mt-0.5 ${isCritical ? 'text-white/90' : 'text-yellow-900/80'}`}>
          Using {formatBytes(status.usedBytes)} of ~{status.quotaMB} MB ({status.percentUsed}%).
          {saveFailed && ' Your latest changes were NOT saved.'}
          {hasImages && (
            <> Embedded images are often the largest consumers — consider removing unused images or exporting a backup, then deleting old characters.</>
          )}
          {' '}You can also go to <strong>Manage → Export Backup</strong> to save your data externally, then remove characters you no longer need.
        </p>

        {/* Per-key breakdown */}
        {status.breakdown.length > 0 && (
          <details className={`mt-2 ${isCritical ? 'text-white/80' : 'text-yellow-900/70'}`}>
            <summary className="cursor-pointer underline text-xs">Storage breakdown</summary>
            <ul className="mt-1 text-xs space-y-0.5">
              {status.breakdown.map((item) => (
                <li key={item.key}>
                  <span className="font-mono">{item.key}</span>: {formatBytes(item.bytes)}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => {
          if (saveFailed) clearSaveFailure();
          dismiss();
        }}
        className={`flex-shrink-0 p-1 rounded transition-colors ${
          isCritical
            ? 'hover:bg-white/20 text-white'
            : 'hover:bg-yellow-600/20 text-yellow-900'
        }`}
        aria-label="Dismiss storage warning"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
