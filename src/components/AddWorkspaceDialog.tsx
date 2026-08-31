import { useEffect, useRef, useState } from 'react';
import { FolderOpen, FolderPlus, LoaderCircle } from 'lucide-react';
import { useStorageWorkspaceStore } from '../store/useStorageWorkspaceStore';
import { supportsDirectoryWorkspaces } from '../workspaces/capabilities';
import {
  authorizeGoogleDrive,
  getGoogleDriveAccessToken,
  isGoogleDriveConfigured,
} from '../workspaces/google/googleClient';
import type { WorkspaceDirectoryHandle } from '../workspaces/providers/directoryWorkspaceProvider';
import { GoogleDriveIcon, XIcon } from './icons';

interface AddWorkspaceDialogProps {
  darkMode: boolean;
  onClose: () => void;
}

type DriveIntent = 'new' | 'open';
type DialogStep = 'options' | 'connect-drive' | 'name-drive';

type DirectoryPickerWindow = Window & {
  showDirectoryPicker: () => Promise<WorkspaceDirectoryHandle>;
};

interface WorkspaceOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  disabledReason?: string;
  darkMode: boolean;
  onClick: () => void;
}

function WorkspaceOption({ icon, title, description, disabledReason, darkMode, onClick }: WorkspaceOptionProps) {
  const disabled = Boolean(disabledReason);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-[92px] w-full items-start gap-4 rounded-button border p-4 text-left transition-colors ${
        disabled
          ? darkMode ? 'cursor-not-allowed border-white/10 text-white/35' : 'cursor-not-allowed border-gray-200 text-gray-400'
          : darkMode ? 'border-white/30 text-white hover:bg-white/10' : 'border-theme-border text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
      }`}
    >
      <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center">{icon}</span>
      <span className="min-w-0">
        <span className="block font-heading text-base font-bold">{title}</span>
        <span className="mt-1 block font-body text-sm opacity-70">{disabledReason ?? description}</span>
      </span>
    </button>
  );
}

export default function AddWorkspaceDialog({ darkMode, onClose }: AddWorkspaceDialogProps) {
  const addDirectoryWorkspace = useStorageWorkspaceStore((state) => state.addDirectoryWorkspace);
  const openDirectoryWorkspace = useStorageWorkspaceStore((state) => state.openDirectoryWorkspace);
  const addGoogleDriveWorkspace = useStorageWorkspaceStore((state) => state.addGoogleDriveWorkspace);
  const openGoogleDriveWorkspace = useStorageWorkspaceStore((state) => state.openGoogleDriveWorkspace);
  const [step, setStep] = useState<DialogStep>('options');
  const [driveIntent, setDriveIntent] = useState<DriveIntent | null>(null);
  const [driveName, setDriveName] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const directorySupported = supportsDirectoryWorkspaces();
  const driveConfigured = isGoogleDriveConfigured();

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isBusy, onClose]);

  const run = async (operation: () => Promise<void>) => {
    setIsBusy(true);
    setError(null);
    try {
      await operation();
      onClose();
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === 'AbortError') return;
      setError(caughtError instanceof Error ? caughtError.message : 'The workspace operation failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const chooseDirectory = () => (window as unknown as DirectoryPickerWindow).showDirectoryPicker();

  const continueDriveIntent = (intent: DriveIntent) => {
    if (intent === 'new') {
      setStep('name-drive');
      return;
    }
    void run(openGoogleDriveWorkspace);
  };

  const beginDriveIntent = (intent: DriveIntent) => {
    setDriveIntent(intent);
    setError(null);
    if (!getGoogleDriveAccessToken()) {
      setStep('connect-drive');
      return;
    }
    continueDriveIntent(intent);
  };

  const connectDrive = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await authorizeGoogleDrive();
      if (driveIntent) continueDriveIntent(driveIntent);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Google Drive could not be connected.');
    } finally {
      setIsBusy(false);
    }
  };

  const title = step === 'options'
    ? 'Add workspace'
    : step === 'connect-drive'
      ? 'Connect Google Drive'
      : 'Name your workspace';

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/50 animate-fade-in" onClick={() => !isBusy && onClose()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-workspace-title"
        className={`fixed left-1/2 top-1/2 z-[71] max-h-[calc(100dvh-2rem)] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-theme border p-5 shadow-theme animate-fade-in ${
          darkMode ? 'border-white/30 bg-black text-white' : 'border-theme-border bg-theme-paper text-theme-ink'
        }`}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="add-workspace-title" className="font-heading text-xl font-bold">{title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            disabled={isBusy}
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-button opacity-70 transition-opacity hover:opacity-100 disabled:opacity-30"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {step === 'options' && (
          <div>
            <div className={`mb-5 border-b pb-5 font-body ${darkMode ? 'border-white/20' : 'border-theme-border/50'}`}>
              <p className="text-sm leading-relaxed">
                Workspaces keep separate collections of characters, presets, themes, and templates. Switching workspaces changes which collection you are using.
              </p>
              <dl className={`mt-3 grid gap-2 text-xs leading-relaxed ${darkMode ? 'text-white/65' : 'text-theme-muted'}`}>
                <div>
                  <dt className="inline font-bold text-inherit">Browser:</dt>{' '}
                  <dd className="inline">The default workspace. Data stays in this browser on this device and does not sync elsewhere.</dd>
                </div>
                <div>
                  <dt className="inline font-bold text-inherit">Local:</dt>{' '}
                  <dd className="inline">Stored as a workspace file in a folder you choose, giving you direct control over the file and your own backups.</dd>
                </div>
                <div>
                  <dt className="inline font-bold text-inherit">Google Drive:</dt>{' '}
                  <dd className="inline">Stored as a file in your Drive and synced so you can open it from other devices.</dd>
                </div>
              </dl>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
            <WorkspaceOption
              darkMode={darkMode}
              icon={<FolderPlus className="h-7 w-7" />}
              title="New local workspace"
              description="Choose a folder and create a new UCS workspace file in it."
              disabledReason={directorySupported ? undefined : 'Local workspaces require a Chromium browser in a secure context.'}
              onClick={() => void run(async () => addDirectoryWorkspace(await chooseDirectory()))}
            />
            <WorkspaceOption
              darkMode={darkMode}
              icon={<FolderOpen className="h-7 w-7" />}
              title="Open local workspace"
              description="Choose a folder containing an existing ucs-workspace.json file."
              disabledReason={directorySupported ? undefined : 'Opening local workspaces is not supported by this browser.'}
              onClick={() => void run(async () => openDirectoryWorkspace(await chooseDirectory()))}
            />
            <WorkspaceOption
              darkMode={darkMode}
              icon={<GoogleDriveIcon className="h-8 w-8" />}
              title="New Google Drive workspace"
              description="Create a named workspace file in your Google Drive."
              disabledReason={driveConfigured ? undefined : 'Google Drive is not configured for this deployment.'}
              onClick={() => beginDriveIntent('new')}
            />
            <WorkspaceOption
              darkMode={darkMode}
              icon={<GoogleDriveIcon className="h-8 w-8" />}
              title="Open Google Drive workspace"
              description="Choose an existing UCS workspace file from Google Drive."
              disabledReason={driveConfigured ? undefined : 'Google Drive is not configured for this deployment.'}
              onClick={() => beginDriveIntent('open')}
            />
            </div>
          </div>
        )}

        {step === 'connect-drive' && (
          <div>
            <div className="flex items-start gap-4">
              <GoogleDriveIcon className="h-10 w-10 flex-none" />
              <p className="font-body text-sm leading-relaxed opacity-75">
                Universal Character Sheet needs permission to create or open workspace files in your Google Drive. Access is limited to files you use with this app.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={isBusy} onClick={() => setStep('options')} className="rounded-button px-4 py-2 font-body text-sm font-bold opacity-70 hover:opacity-100">Back</button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void connectDrive()}
                className={`flex min-w-[170px] items-center justify-center gap-2 rounded-button px-4 py-2 font-body text-sm font-bold ${darkMode ? 'bg-white text-black' : 'bg-theme-accent text-theme-paper'}`}
              >
                {isBusy && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Connect Google Drive
              </button>
            </div>
          </div>
        )}

        {step === 'name-drive' && (
          <form onSubmit={(event) => {
            event.preventDefault();
            void run(() => addGoogleDriveWorkspace(driveName));
          }}>
            <label className="block font-body text-sm font-bold" htmlFor="drive-workspace-name">Workspace name</label>
            <input
              id="drive-workspace-name"
              autoFocus
              value={driveName}
              onChange={(event) => setDriveName(event.target.value)}
              placeholder="My campaign"
              className={`mt-2 w-full rounded-button border px-3 py-2 font-body ${darkMode ? 'border-white/30 bg-black text-white' : 'border-theme-border bg-theme-background text-theme-ink'}`}
            />
            <p className="mt-2 font-body text-xs opacity-60">A JSON workspace file with this name will be created in Google Drive.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={isBusy} onClick={() => setStep('options')} className="rounded-button px-4 py-2 font-body text-sm font-bold opacity-70 hover:opacity-100">Back</button>
              <button
                type="submit"
                disabled={isBusy || !driveName.trim()}
                className={`flex min-w-[150px] items-center justify-center gap-2 rounded-button px-4 py-2 font-body text-sm font-bold disabled:opacity-40 ${darkMode ? 'bg-white text-black' : 'bg-theme-accent text-theme-paper'}`}
              >
                {isBusy && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Create workspace
              </button>
            </div>
          </form>
        )}

        {error && <p role="alert" className={`mt-4 border-t pt-3 font-body text-sm ${darkMode ? 'border-white/20 text-amber-300' : 'border-gray-200 text-red-700'}`}>{error}</p>}
      </div>
    </>
  );
}