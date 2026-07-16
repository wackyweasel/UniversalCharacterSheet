import { useStore } from './store/useStore';
import CharacterList from './components/CharacterList';
import DicePhysicsOverlay from './components/DicePhysicsOverlay';
import Sheet from './components/Sheet';
import StorageWarning from './components/StorageWarning';

function App() {
  const activeCharacterId = useStore((state) => state.activeCharacterId);

  return (
    <div className="h-full bg-gray-100 text-ink font-mono overflow-hidden">
      <StorageWarning />
      {activeCharacterId ? <Sheet /> : <CharacterList />}
      <DicePhysicsOverlay />
    </div>
  );
}

export default App;
