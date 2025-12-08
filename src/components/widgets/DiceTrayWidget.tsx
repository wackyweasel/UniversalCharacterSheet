import { useState } from 'react';
import { Widget } from '../../types';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

interface DiceInPool {
  faces: number;
  id: number; // unique id for each die in pool
}

interface RollResult {
  dice: { faces: number; roll: number }[];
  total: number;
}

export default function DiceTrayWidget({ widget }: Props) {
  const { label, availableDice = [4, 6, 8, 10, 12, 20] } = widget.data;
  const [dicePool, setDicePool] = useState<DiceInPool[]>([]);
  const [result, setResult] = useState<RollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [nextId, setNextId] = useState(1);

  // Fixed small sizing
  const labelClass = 'text-xs';
  const buttonClass = 'py-1 px-2 text-xs';
  const resultClass = 'text-xl';
  const smallTextClass = 'text-[10px]';
  const gapClass = 'gap-1';

  const addDieToPool = (faces: number) => {
    setDicePool(prev => [...prev, { faces, id: nextId }]);
    setNextId(prev => prev + 1);
    setResult(null); // Clear previous result when adding dice
  };

  const clearPool = () => {
    setDicePool([]);
    setResult(null);
  };

  const rollDice = () => {
    if (dicePool.length === 0) return;
    
    setIsRolling(true);
    
    setTimeout(() => {
      const rolls: { faces: number; roll: number }[] = [];
      let sum = 0;
      
      for (const die of dicePool) {
        const roll = Math.floor(Math.random() * die.faces) + 1;
        rolls.push({ faces: die.faces, roll });
        sum += roll;
      }
      
      setResult({ dice: rolls, total: sum });
      setIsRolling(false);
      setDicePool([]); // Clear pool after rolling
      setNextId(1);
    }, 300);
  };

  // Group dice in pool by faces for display
  const groupedPool = dicePool.reduce((acc, die) => {
    acc[die.faces] = (acc[die.faces] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const buildPoolNotation = () => {
    const parts = Object.entries(groupedPool)
      .sort(([a], [b]) => Number(b) - Number(a)) // Sort by faces descending
      .map(([faces, count]) => `${count}d${faces}`);
    return parts.length > 0 ? parts.join(' + ') : 'Empty';
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className={`font-bold text-center ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}

      {/* Available Dice Buttons */}
      <div className="flex flex-wrap gap-1 justify-center flex-shrink-0">
        {(availableDice as number[]).map((faces) => (
          <button
            key={faces}
            onClick={() => addDieToPool(faces)}
            onMouseDown={(e) => e.stopPropagation()}
            className={`${buttonClass} border-[length:var(--border-width)] border-theme-border font-bold transition-all rounded-theme bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper min-w-[40px]`}
            title={`Add d${faces}`}
          >
            d{faces}
          </button>
        ))}
      </div>

      {/* Roll and Clear Buttons */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex gap-1 justify-center flex-shrink-0">
          <button
            onClick={rollDice}
            onMouseDown={(e) => e.stopPropagation()}
            className={`${buttonClass} border-[length:var(--border-width)] border-theme-border font-bold transition-all rounded-theme flex-1 ${
              isRolling || dicePool.length === 0
                ? 'bg-theme-muted text-theme-paper cursor-not-allowed' 
                : 'bg-theme-accent text-theme-paper hover:opacity-90'
            }`}
            disabled={isRolling || dicePool.length === 0}
          >
            {dicePool.length > 0 ? `Roll ${buildPoolNotation()}` : 'Roll'}
          </button>
          {dicePool.length > 0 && (
            <button
              onClick={clearPool}
              onMouseDown={(e) => e.stopPropagation()}
              className={`${buttonClass} border-[length:var(--border-width)] border-theme-border font-bold transition-all rounded-theme bg-theme-paper text-theme-ink hover:bg-red-500 hover:text-white hover:border-red-500`}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Result Display */}
      <div className={`text-center border-t border-theme-border/50 pt-1 flex-shrink-0`}>
        {result && !isRolling ? (
          <>
            <div className={`${resultClass} font-bold text-theme-ink font-heading`}>{result.total}</div>
            <div className={`${smallTextClass} text-theme-muted font-body`}>
              {result.dice.map((d, i) => (
                <span key={i}>
                  {i > 0 && ' + '}
                  <span title={`d${d.faces}`}>{d.roll}</span>
                </span>
              ))}
            </div>
            {/* Critical roll detection for single d20 */}
            {result.dice.length === 1 && result.dice[0].faces === 20 && (
              <>
                {result.dice[0].roll === 20 && (
                  <div className={`text-green-600 font-bold ${smallTextClass}`}>NAT 20!</div>
                )}
                {result.dice[0].roll === 1 && (
                  <div className={`text-red-600 font-bold ${smallTextClass}`}>NAT 1!</div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <div className={`${resultClass} font-bold text-theme-muted font-heading`}>—</div>
            <div className={`${smallTextClass} text-theme-muted font-body`}>&nbsp;</div>
          </>
        )}
      </div>
    </div>
  );
}
