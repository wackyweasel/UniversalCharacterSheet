import { useState } from 'react';
import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function DiceRollerWidget({ widget, mode, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, diceCount = 1, diceType = 20, modifier = 0 } = widget.data;
  const [result, setResult] = useState<{ rolls: number[]; total: number } | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  // Responsive sizing
  const isCompact = width < 180 || height < 150;
  const isLarge = width >= 350 && height >= 250;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const selectClass = isCompact ? 'text-xs px-0.5 py-0' : isLarge ? 'text-base px-2 py-1' : 'text-sm px-1 py-0.5';
  const modifierInputClass = isCompact ? 'w-7 text-xs' : isLarge ? 'w-14 text-base' : 'w-10 text-sm';
  const buttonClass = isCompact ? 'py-1 px-2 text-xs' : isLarge ? 'py-3 px-6 text-lg' : 'py-2 px-4 text-sm';
  const resultClass = isCompact ? 'text-xl' : isLarge ? 'text-5xl' : 'text-3xl';
  const smallTextClass = isCompact ? 'text-[10px]' : isLarge ? 'text-sm' : 'text-xs';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWidgetData(widget.id, { label: e.target.value });
  };

  const handleDiceCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateWidgetData(widget.id, { diceCount: parseInt(e.target.value) });
  };

  const handleDiceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateWidgetData(widget.id, { diceType: parseInt(e.target.value) });
  };

  const handleModifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWidgetData(widget.id, { modifier: parseInt(e.target.value) || 0 });
  };

  const rollDice = () => {
    setIsRolling(true);
    
    // Animate for a moment
    setTimeout(() => {
      const rolls: number[] = [];
      for (let i = 0; i < diceCount; i++) {
        rolls.push(Math.floor(Math.random() * diceType) + 1);
      }
      const sum = rolls.reduce((a, b) => a + b, 0);
      setResult({ rolls, total: sum + modifier });
      setIsRolling(false);
    }, 300);
  };

  const diceNotation = `${diceCount}d${diceType}${modifier >= 0 ? '+' : ''}${modifier !== 0 ? modifier : ''}`;

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <input
        className={`font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-black focus:outline-none text-center flex-shrink-0 ${labelClass}`}
        value={label}
        onChange={handleLabelChange}
        placeholder="Roll Name"
        disabled={mode === 'play'}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Dice Configuration */}
      <div className={`flex items-center justify-center gap-1 ${isCompact ? 'text-xs' : 'text-sm'}`}>
        <select
          value={diceCount}
          onChange={handleDiceCountChange}
          className={`${selectClass} border border-gray-300 focus:border-black focus:outline-none bg-white`}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={mode === 'play'}
        >
          {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span>d</span>
        <select
          value={diceType}
          onChange={handleDiceTypeChange}
          className={`${selectClass} border border-gray-300 focus:border-black focus:outline-none bg-white`}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={mode === 'play'}
        >
          {[4, 6, 8, 10, 12, 20, 100].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span>+</span>
        <input
          type="number"
          value={modifier}
          onChange={handleModifierChange}
          className={`${modifierInputClass} border border-gray-300 px-1 py-0.5 focus:border-black focus:outline-none text-center`}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={mode === 'play'}
        />
      </div>

      {/* Roll Button */}
      <button
        onClick={rollDice}
        onMouseDown={(e) => e.stopPropagation()}
        className={`${buttonClass} border-2 border-black font-bold transition-all ${
          isRolling 
            ? 'bg-gray-300 animate-pulse' 
            : 'bg-white text-black hover:bg-black hover:text-white'
        }`}
        disabled={isRolling}
      >
        🎲 Roll {diceNotation}
      </button>

      {/* Result Display */}
      {result && !isRolling && (
        <div className={`text-center border-t border-gray-300 ${isCompact ? 'pt-1' : 'pt-2'}`}>
          <div className={`${resultClass} font-bold`}>{result.total}</div>
          {diceCount > 1 && (
            <div className={`${smallTextClass} text-gray-500`}>
              [{result.rolls.join(', ')}] {modifier !== 0 && `${modifier >= 0 ? '+' : ''}${modifier}`}
            </div>
          )}
          {result.rolls.includes(diceType) && diceCount === 1 && (
            <div className={`text-green-600 font-bold ${smallTextClass}`}>NAT {diceType}!</div>
          )}
          {result.rolls.includes(1) && diceCount === 1 && (
            <div className={`text-red-600 font-bold ${smallTextClass}`}>NAT 1!</div>
          )}
        </div>
      )}
    </div>
  );
}
