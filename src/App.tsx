import { Component, type ErrorInfo, type ReactNode, useEffect } from 'react';
import { useStore } from './store/useStore';
import CharacterList from './components/CharacterList';
import DicePhysicsOverlay from './components/DicePhysicsOverlay';
import Sheet from './components/Sheet';
import StorageWarning from './components/StorageWarning';
import UpdatePrompt from './components/UpdatePrompt';
import { useTelemetryStore } from './store/useTelemetryStore';
import { useStorageWorkspaceStore } from './store/useStorageWorkspaceStore';
import WorkspaceConflictDialog from './components/WorkspaceConflictDialog';
import GoogleDriveReconnectDialog from './components/GoogleDriveReconnectDialog';

interface SheetErrorBoundaryProps {
  children: ReactNode;
}

interface SheetErrorBoundaryState {
  hasError: boolean;
}

class SheetErrorBoundary extends Component<SheetErrorBoundaryProps, SheetErrorBoundaryState> {
  state: SheetErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SheetErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Failed to render character sheet', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="h-full flex items-center justify-center bg-gray-100 p-6">
        <section className="w-full max-w-lg border-2 border-ink bg-paper p-6 shadow-[6px_6px_0_var(--color-ink)]">
          <h1 className="text-xl font-bold">This character could not be displayed</h1>
          <p className="mt-3 text-sm">
            Its saved data is still intact. Return to the character list to create a backup or open another character.
          </p>
          <button
            type="button"
            className="mt-5 border-2 border-ink bg-accent px-4 py-2 font-bold text-paper hover:opacity-90"
            onClick={() => useStore.getState().selectCharacter(null)}
          >
            Return to characters
          </button>
        </section>
      </main>
    );
  }
}

function App() {
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const recordVisit = useTelemetryStore((state) => state.recordVisit);
  const isWorkspaceHydrated = useStorageWorkspaceStore((state) => state.isHydrated);
  const isSwitchingWorkspace = useStorageWorkspaceStore((state) => state.isSwitchingWorkspace);
  const workspaceSyncStatus = useStorageWorkspaceStore((state) => state.syncStatus);
  const workspaceError = useStorageWorkspaceStore((state) => state.error);
  const initializeWorkspaces = useStorageWorkspaceStore((state) => state.initialize);
  const resetBrowserWorkspace = useStorageWorkspaceStore((state) => state.resetBrowserWorkspace);
  const storedDarkMode = localStorage.getItem('ucs:darkMode');
  const darkMode = storedDarkMode !== null
    ? storedDarkMode === 'true'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;

  useEffect(() => {
    void initializeWorkspaces();
  }, [initializeWorkspaces]);

  useEffect(() => {
    recordVisit();
  }, [activeCharacterId, recordVisit]);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    const updateVisualViewport = () => {
      document.documentElement.style.setProperty(
        '--visual-viewport-height',
        `${visualViewport.height}px`,
      );
      document.documentElement.style.setProperty(
        '--visual-viewport-offset-top',
        `${visualViewport.offsetTop}px`,
      );
    };

    updateVisualViewport();
    visualViewport.addEventListener('resize', updateVisualViewport);
    visualViewport.addEventListener('scroll', updateVisualViewport);

    return () => {
      visualViewport.removeEventListener('resize', updateVisualViewport);
      visualViewport.removeEventListener('scroll', updateVisualViewport);
      document.documentElement.style.removeProperty('--visual-viewport-height');
      document.documentElement.style.removeProperty('--visual-viewport-offset-top');
    };
  }, []);

  return (
    <div className={`h-full font-mono overflow-hidden ${darkMode ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'}`}>
      <UpdatePrompt />
      <StorageWarning />
      {!isSwitchingWorkspace && <GoogleDriveReconnectDialog />}
      {!isSwitchingWorkspace && <WorkspaceConflictDialog />}
      {!isWorkspaceHydrated || isSwitchingWorkspace ? (
        <main className={`h-full flex items-center justify-center p-6 ${darkMode ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'}`}>
          {!isSwitchingWorkspace && workspaceSyncStatus === 'error' ? (
            <section className={`w-full max-w-lg border p-6 ${darkMode ? 'border-white/30 bg-black' : 'border-gray-300 bg-white'}`}>
              <h1 className="text-xl font-bold">Workspace could not be loaded</h1>
              <p role="alert" className={`mt-3 text-sm ${darkMode ? 'text-amber-300' : 'text-red-700'}`}>
                {workspaceError ?? 'The workspace data is invalid or unavailable.'}
              </p>
              <p className={`mt-3 text-sm ${darkMode ? 'text-white/60' : 'text-gray-600'}`}>
                Try again, or reset the Browser workspace if its saved data is damaged. Directory and Google Drive workspace files will not be deleted.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void initializeWorkspaces()}
                  className={`border px-4 py-2 font-bold ${darkMode ? 'border-white/40 hover:bg-white/10' : 'border-gray-400 hover:bg-gray-100'}`}
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm('Reset the Browser workspace? Its characters, timelines, themes, templates, and presets stored in this browser will be permanently deleted.')) return;
                    void resetBrowserWorkspace();
                  }}
                  className={`border px-4 py-2 font-bold ${darkMode ? 'border-red-400 text-red-300 hover:bg-red-500/10' : 'border-red-500 text-red-700 hover:bg-red-50'}`}
                >
                  Reset Browser workspace
                </button>
              </div>
            </section>
          ) : (
            <p className="font-bold">{isSwitchingWorkspace ? 'Switching workspace...' : 'Loading workspace...'}</p>
          )}
        </main>
      ) : activeCharacterId ? (
        <SheetErrorBoundary key={activeCharacterId}>
          <Sheet />
        </SheetErrorBoundary>
      ) : <CharacterList />}
      {!isSwitchingWorkspace && <DicePhysicsOverlay />}
    </div>
  );
}

export default App;
