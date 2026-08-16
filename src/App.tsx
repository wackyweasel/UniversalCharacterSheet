import { Component, type ErrorInfo, type ReactNode, useEffect } from 'react';
import { useStore } from './store/useStore';
import CharacterList from './components/CharacterList';
import DicePhysicsOverlay from './components/DicePhysicsOverlay';
import CardDeckLayer from './components/card-table/CardDeckLayer';
import Sheet from './components/Sheet';
import StorageWarning from './components/StorageWarning';
import UpdatePrompt from './components/UpdatePrompt';

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
    <div className="h-full bg-gray-100 text-ink font-mono overflow-hidden">
      <UpdatePrompt />
      <StorageWarning />
      {activeCharacterId ? (
        <SheetErrorBoundary key={activeCharacterId}>
          <Sheet />
        </SheetErrorBoundary>
      ) : <CharacterList />}
      {activeCharacterId && <CardDeckLayer />}
      <DicePhysicsOverlay />
    </div>
  );
}

export default App;
