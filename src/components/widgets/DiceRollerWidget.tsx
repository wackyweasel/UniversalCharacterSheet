import { useState } from 'react';
import { Widget } from '../../types';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

interface RollResult {
  groups: { faces: number; rolls: number[] }[];
  modifier: number;
  total: number;
}

export default function DiceRollerWidget({ widget }: Props) {
  const { label, diceGroups = [{ count: 1, faces: 20 }], modifier = 0 } = widget.data;
  const [result, setResult] = useState<RollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  // Fixed small sizing
  const labelClass = 'text-xs';
  const buttonClass = 'py-1 px-2 text-xs';
  const resultClass = 'text-xl';
  const smallTextClass = 'text-[10px]';
  const gapClass = 'gap-1';

  const rollDice = () => {
    setIsRolling(true);
    
    setTimeout(() => {
      const groups: { faces: number; rolls: number[] }[] = [];
      let sum = 0;
      
      for (const group of diceGroups) {
        const rolls: number[] = [];
        for (let i = 0; i < group.count; i++) {
          const roll = Math.floor(Math.random() * group.faces) + 1;
          rolls.push(roll);
          sum += roll;
        }
        groups.push({ faces: group.faces, rolls });
      }
      
      setResult({ groups, modifier, total: sum + modifier });
      setIsRolling(false);
    }, 300);
  };

  const buildDiceNotation = () => {
    const parts = diceGroups.map((g: { count: number; faces: number }) => `${g.count}d${g.faces}`);
    let notation = parts.join(' + ');
    if (modifier !== 0) {
      notation += modifier >= 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`;
    }
    return notation;
  };

  const diceNotation = buildDiceNotation();

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className={`font-bold text-center ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}

      {/* Roll Button */}
      <button
        onClick={rollDice}
        onMouseDown={(e) => e.stopPropagation()}
        className={`${buttonClass} border-[length:var(--border-width)] border-theme-border font-bold transition-all rounded-button flex-shrink-0 ${
          isRolling 
            ? 'bg-theme-muted animate-pulse text-theme-paper' 
            : 'bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
        }`}
        disabled={isRolling}
      >
        🎲 Roll {diceNotation}
      </button>

      {/* Result Display - Always visible to maintain consistent height */}
      <div className={`text-center border-t border-theme-border/50 pt-1 flex-1 flex flex-col justify-center`}>
        {result && !isRolling ? (
          <>
            <div className={`${resultClass} font-bold text-theme-ink font-heading`}>{result.total}</div>
            <div className={`${smallTextClass} text-theme-muted font-body`}>
              {result.groups.map((g, i) => (
                <span key={i}>
                  {i > 0 && ' + '}
                  <span title={`d${g.faces}`}>[{g.rolls.join(', ')}]</span>
                </span>
              ))}
              {result.modifier !== 0 && (
                <span> {result.modifier >= 0 ? '+' : ''}{result.modifier}</span>
              )}
            </div>
            {/* Critical roll detection for single d20 */}
            {result.groups.length === 1 && result.groups[0].rolls.length === 1 && result.groups[0].faces === 20 && (
              <>
                {result.groups[0].rolls[0] === 20 && (
                  <div className={`text-green-600 font-bold ${smallTextClass}`}>NAT 20!</div>
                )}
                {result.groups[0].rolls[0] === 1 && (
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






