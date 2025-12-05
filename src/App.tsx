import { useStore } from './store/useStore';
import CharacterList from './components/CharacterList';
import Sheet from './components/Sheet';

function App() {
  const activeCharacterId = useStore((state) => state.activeCharacterId);

  return (
    <div className="h-full bg-gray-100 text-ink font-mono overflow-hidden">
      {activeCharacterId ? <Sheet /> : <CharacterList />}
    </div>
  );
}

export default App;
