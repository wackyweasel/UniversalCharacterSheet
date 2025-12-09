import { useState } from 'react';
import { Widget, DiceGroup } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

// Roll dice helper function
function rollDice(diceGroups: DiceGroup[]): number {
  let total = 0;
  for (const group of diceGroups) {
    for (let i = 0; i < group.count; i++) {
      total += Math.floor(Math.random() * group.faces) + 1;
    }
  }
  return total;
}

// Format dice groups for display
function formatDiceGroups(diceGroups: DiceGroup[]): string {
  return diceGroups.map(g => `${g.count}d${g.faces}`).join(' + ');
}

export default function RestButtonWidget({ widget }: Props) {
  const performRest = useStore((state) => state.performRest);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const { 
    buttonText = 'Rest',
    healToFull = false,
    healRandomDice = [],
    healFlatAmount = 0,
    clearConditions = false,
    resetSpellSlots = false
  } = widget.data;

  // Check if any action is enabled
  const hasAnyAction = healToFull || healRandomDice.length > 0 || (healFlatAmount ?? 0) > 0 || clearConditions || resetSpellSlots;

  const handleRest = () => {
    if (!hasAnyAction) return;
    
    setIsAnimating(true);
    
    // Calculate random heal amount if needed
    let healAmount: number | 'full' | undefined = undefined;
    let resultMessage = '';
    
    if (healToFull) {
      healAmount = 'full';
      resultMessage = 'Healed to full!';
    } else if (healRandomDice.length > 0) {
      const rolled = rollDice(healRandomDice);
      healAmount = rolled + (healFlatAmount ?? 0);
      resultMessage = `Healed ${healAmount} HP (${formatDiceGroups(healRandomDice)}${healFlatAmount ? ` + ${healFlatAmount}` : ''})`;
    } else if (healFlatAmount && healFlatAmount > 0) {
      healAmount = healFlatAmount;
      resultMessage = `Healed ${healAmount} HP`;
    }
    
    // Build result message parts
    const actions: string[] = [];
    if (healAmount !== undefined) {
      actions.push(resultMessage);
    }
    if (clearConditions) {
      actions.push('Conditions cleared');
    }
    if (resetSpellSlots) {
      actions.push('Spell slots reset');
    }
    
    setLastResult(actions.join(' • '));
    
    // Perform the rest action
    performRest({
      healAmount,
      clearConditions,
      resetSpellSlots
    });
    
    // Clear animation after a short delay
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
    
    // Clear result message after a longer delay
    setTimeout(() => {
      setLastResult(null);
    }, 3000);
  };

  return (
    <div className="flex flex-col gap-1 w-full h-full items-center justify-center p-1">
      <button
        onClick={handleRest}
        onMouseDown={(e) => e.stopPropagation()}
        disabled={!hasAnyAction}
        className={`w-full h-full min-w-0 px-2 py-1 font-bold text-xs border-[length:var(--border-width)] border-theme-border rounded-theme shadow-theme transition-all font-body truncate ${
          hasAnyAction
            ? 'bg-theme-accent text-theme-paper hover:opacity-90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer'
            : 'bg-theme-muted text-theme-paper opacity-50 cursor-not-allowed'
        } ${isAnimating ? 'scale-95' : ''}`}
      >
        {buttonText}
      </button>
      
      {/* Result message */}
      {lastResult && (
        <div className="absolute -bottom-5 left-0 right-0 text-[10px] text-theme-accent font-bold text-center font-body animate-pulse whitespace-nowrap">
          {lastResult}
        </div>
      )}
    </div>
  );
}
