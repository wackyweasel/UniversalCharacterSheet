import { useEffect } from 'react';
import { useStore } from './store/useStore';
import CharacterList from './components/CharacterList';
import DicePhysicsOverlay from './components/DicePhysicsOverlay';
import Sheet from './components/Sheet';
import StorageWarning from './components/StorageWarning';

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
      <StorageWarning />
      {activeCharacterId ? <Sheet /> : <CharacterList />}
      <DicePhysicsOverlay />
    </div>
  );
}

export default App;
