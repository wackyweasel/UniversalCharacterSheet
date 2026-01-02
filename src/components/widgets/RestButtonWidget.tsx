import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Widget, DiceGroup } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

// Modal component for pass time prompt
interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-theme-paper border border-theme-border rounded-button shadow-xl p-4 min-w-[280px] max-w-[400px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-theme-ink font-heading">{title}</h3>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-ink text-xl leading-none"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

// Parse time input to seconds
function parseTimeToSeconds(value: number, unit: string): number {
  switch (unit) {
    case 'seconds': return value;
    case 'minutes': return value * 60;
    case 'hours': return value * 60 * 60;
    case 'days': return value * 24 * 60 * 60;
    case 'months': return value * 30 * 24 * 60 * 60;
    case 'years': return value * 365 * 24 * 60 * 60;
    default: return value;
  }
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
  const [showPassTimeModal, setShowPassTimeModal] = useState(false);
  const [passedTime, setPassedTime] = useState(1);
  const [passedUnit, setPassedUnit] = useState('hours');
  
  const { 
    buttonText = 'Rest',
    healToFull = false,
    healRandomDice = [],
    healFlatAmount = 0,
    clearConditions = false,
    resetSpellSlots = false,
    passTime = false,
    passTimeAmount = 0,
    passTimeUnit = 'hours'
  } = widget.data;

  // Check if any action is enabled
  const hasAnyAction = healToFull || healRandomDice.length > 0 || (healFlatAmount ?? 0) > 0 || clearConditions || resetSpellSlots || passTime;

  // Execute the rest with optional pass time seconds
  const executeRest = (passTimeSeconds?: number) => {
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
    if (passTimeSeconds !== undefined && passTimeSeconds > 0) {
      actions.push('Time passed');
    }
    
    setLastResult(actions.join(' • '));
    
    // Perform the rest action
    performRest({
      healAmount,
      clearConditions,
      resetSpellSlots,
      passTimeSeconds
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

  const handleRest = () => {
    if (!hasAnyAction) return;
    
    // If passTime is enabled and no flat amount, show modal to prompt for time
    if (passTime && (!passTimeAmount || passTimeAmount <= 0)) {
      setShowPassTimeModal(true);
      return;
    }
    
    // Calculate pass time seconds if enabled with flat amount
    const passTimeSeconds = passTime && passTimeAmount > 0 
      ? parseTimeToSeconds(passTimeAmount, passTimeUnit)
      : undefined;
    
    executeRest(passTimeSeconds);
  };

  const confirmPassTime = () => {
    const passTimeSeconds = parseTimeToSeconds(passedTime, passedUnit);
    setShowPassTimeModal(false);
    executeRest(passTimeSeconds);
  };

  const cancelPassTime = () => {
    setPassedTime(1);
    setPassedUnit('hours');
    setShowPassTimeModal(false);
  };

  return (
    <div className="flex flex-col gap-1 w-full h-full items-center justify-center p-1">
      <button
        onClick={handleRest}
        onMouseDown={(e) => e.stopPropagation()}
        disabled={!hasAnyAction}
        className={`w-full h-full min-w-0 px-2 py-1 font-bold text-xs border-[length:var(--border-width)] border-theme-border rounded-button shadow-theme transition-all font-body truncate ${
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

      {/* Pass Time Modal */}
      {showPassTimeModal && (
        <Modal title="Pass Time" onClose={cancelPassTime}>
          <div className="space-y-3">
            <p className="text-theme-muted text-sm">How much time passes?</p>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                className="w-20 border border-theme-border focus:border-theme-accent focus:outline-none py-2 px-3 bg-theme-paper text-theme-ink font-body rounded-button text-center"
                value={passedTime}
                onChange={(e) => setPassedTime(e.target.value === '' ? ('' as unknown as number) : parseInt(e.target.value) || 1)}
                onBlur={(e) => setPassedTime(Math.max(1, parseInt(e.target.value) || 1))}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmPassTime();
                  if (e.key === 'Escape') cancelPassTime();
                }}
              />
              <select
                className="flex-1 border border-theme-border focus:border-theme-accent focus:outline-none py-2 px-3 bg-theme-paper text-theme-ink font-body rounded-button"
                value={passedUnit}
                onChange={(e) => setPassedUnit(e.target.value)}
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={confirmPassTime}
                className="flex-1 py-2 px-4 bg-theme-accent text-theme-paper rounded-button hover:opacity-90 transition-colors font-bold"
              >
                Confirm
              </button>
              <button
                onClick={cancelPassTime}
                className="flex-1 py-2 px-4 border border-theme-border text-theme-muted rounded-button hover:bg-theme-border hover:text-theme-ink transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}






