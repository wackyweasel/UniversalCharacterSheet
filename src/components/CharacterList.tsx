import { useState } from 'react';
import { useStore } from '../store/useStore';

export default function CharacterList() {
  const characters = useStore((state) => state.characters);
  const createCharacter = useStore((state) => state.createCharacter);
  const selectCharacter = useStore((state) => state.selectCharacter);
  const deleteCharacter = useStore((state) => state.deleteCharacter);
  
  const [newName, setNewName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      createCharacter(newName);
      setNewName('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 h-full overflow-auto">
      <h1 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-8 border-b-4 border-black pb-2 sm:pb-4 uppercase tracking-wider">
        Character Select
      </h1>

      <form onSubmit={handleCreate} className="mb-6 sm:mb-12 flex flex-col sm:flex-row gap-2 sm:gap-4">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New Character Name"
          className="flex-1 p-3 sm:p-4 text-base border-2 border-black shadow-hard focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all"
        />
        <button 
          type="submit"
          className="bg-black text-white px-6 sm:px-8 py-3 sm:py-4 font-bold hover:bg-gray-800 transition-colors shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          CREATE
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-4">
        {characters.map((char) => (
          <div 
            key={char.id}
            className="border-2 border-black p-4 sm:p-6 bg-white shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none sm:hover:-translate-y-1 transition-transform cursor-pointer relative group"
            onClick={() => selectCharacter(char.id)}
          >
            <h2 className="text-xl sm:text-2xl font-bold mb-2 pr-12">{char.name}</h2>
            <p className="text-gray-500 text-sm sm:text-base mb-2 sm:mb-4">{char.widgets.length} Widgets</p>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                if(confirm('Delete character?')) deleteCharacter(char.id);
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 w-10 h-10 sm:w-auto sm:h-auto sm:opacity-0 sm:group-hover:opacity-100 text-red-500 font-bold hover:text-red-700 flex items-center justify-center"
            >
              DEL
            </button>
          </div>
        ))}
        
        {characters.length === 0 && (
          <div className="col-span-full text-center py-8 sm:py-12 text-gray-400 border-2 border-dashed border-gray-300 text-sm sm:text-base">
            No characters found. Create one to begin.
          </div>
        )}
      </div>
    </div>
  );
}
