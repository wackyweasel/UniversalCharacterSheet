import { XIcon } from './icons';
import {
  applyAvailableUpdate,
  dismissAvailableUpdate,
  useUpdateAvailability,
} from '../pwa/update';

export default function UpdatePrompt() {
  const updateAvailable = useUpdateAvailability();

  if (!updateAvailable) return null;

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[10001] bg-ink px-4 py-3 font-body text-sm text-paper shadow-lg"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Update available</p>
          <p className="mt-0.5 text-paper/90">
            Reload to use the latest version. Your saved characters stay in this browser.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void applyAvailableUpdate()}
          className="flex-shrink-0 border-2 border-paper bg-paper px-3 py-1 font-bold text-ink hover:opacity-90"
        >
          Update
        </button>
        <button
          type="button"
          onClick={dismissAvailableUpdate}
          className="flex-shrink-0 p-1 text-paper hover:bg-paper/20"
          aria-label="Dismiss update notification"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}