import { useStore } from './store/useStore';
import CharacterList from './components/CharacterList';
import Sheet from './components/Sheet';

function App() {
  const activeCharacterId = useStore((state) => state.activeCharacterId);

  return (
    <div className="min-h-screen bg-gray-100 text-ink font-mono">
      {activeCharacterId ? <Sheet /> : <CharacterList />}
    </div>
  );
}

export default App;
