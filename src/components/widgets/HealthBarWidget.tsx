import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { collectLabels, isFormulaBroken } from '../../utils/formulaEngine';

// Check if we're in print mode to hide interactive elements

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

// Modal component for damage/heal input
function HealthModal({ 
  title, 
  onConfirm, 
  onCancel,
  buttonLabel,
  isDamage 
}: { 
  title: string; 
  onConfirm: (amount: number) => void; 
  onCancel: () => void;
  buttonLabel: string;
  isDamage: boolean;
}) {
  const [amount, setAmount] = useState<number | ''>('');

  const handleConfirm = () => {
    if (amount === '' || amount <= 0) {
      onCancel();
      return;
    }
    onConfirm(amount);
  };

  const increment = () => setAmount(prev => (prev === '' ? 1 : prev + 1));
  const decrement = () => setAmount(prev => (prev === '' || prev <= 1 ? '' : prev - 1));

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-[9999]" 
        onClick={onCancel}
      />
      <div 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-button p-4 z-[9999] min-w-[200px]"
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleConfirm();
          if (e.key === 'Escape') onCancel();
        }}
      >
        <h3 className="font-heading text-theme-ink font-bold mb-3">{title}</h3>
        <div className="flex items-center justify-center gap-2 mb-3">
          <button
            onClick={decrement}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-10 h-10 flex items-center justify-center border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-button font-bold text-xl font-body"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            className="w-16 h-10 text-center font-bold text-2xl text-theme-ink bg-theme-paper border border-theme-border rounded-button focus:outline-none focus:border-theme-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            value={amount}
            onChange={(e) => setAmount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
            onClick={(e) => (e.target as HTMLInputElement).focus()}
            onMouseDown={(e) => e.stopPropagation()}
            autoFocus
          />
          <button
            onClick={increment}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-10 h-10 flex items-center justify-center border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-button font-bold text-xl font-body"
          >
            +
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-1.5 text-sm font-body text-theme-ink hover:bg-theme-accent/20 rounded-button transition-colors border border-theme-border"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-3 py-1.5 text-sm font-body rounded-button transition-colors ${
              isDamage 
                ? 'bg-theme-accent text-theme-paper hover:opacity-80' 
                : 'bg-theme-accent text-theme-paper hover:opacity-80'
            }`}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </>
  );
}

export default function HealthBarWidget({ widget, mode }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const isPrintMode = mode === 'print';
  const { label, currentValue = 10, maxValue = 10, increment = 1 } = widget.data;
  const fieldFormulas = widget.data.fieldFormulas as Record<string, string> | undefined;
  
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [showHealModal, setShowHealModal] = useState(false);
  const hasCurrentFormula = !!fieldFormulas?.currentValue;
  const hasMaxFormula = !!fieldFormulas?.maxValue;

  const labels = useMemo(() => {
    const char = characters.find(c => c.id === activeCharacterId);
    return char ? collectLabels(char) : {};
  }, [characters, activeCharacterId]);

  const currentBroken = hasCurrentFormula && isFormulaBroken(fieldFormulas!.currentValue, labels);
  const maxBroken = hasMaxFormula && isFormulaBroken(fieldFormulas!.maxValue, labels);

  // Calculate health percentage
  const healthPercent = Math.max(0, Math.min(100, (currentValue / maxValue) * 100));

  // Fixed small sizing
  const labelClass = 'text-xs';
  const barTextClass = 'text-xs';
  const buttonClass = 'px-1.5 py-0.5 text-[10px]';
  const gapClass = 'gap-1';
  const barHeight = 'h-4';

  const applyDamage = (amount: number) => {
    const newVal = currentValue - amount;
    updateWidgetData(widget.id, { currentValue: newVal });
    setShowDamageModal(false);
    addTimelineEvent(label || 'Health', 'HEALTH_BAR', `Took ${amount} damage (${currentValue} → ${newVal})`, '💥');
  };

  const applyHeal = (amount: number) => {
    const newVal = Math.min(maxValue, currentValue + amount);
    updateWidgetData(widget.id, { currentValue: newVal });
    setShowHealModal(false);
    addTimelineEvent(label || 'Health', 'HEALTH_BAR', `Healed ${amount} (${currentValue} → ${newVal})`, '💚');
  };

  const fullHeal = () => {
    updateWidgetData(widget.id, { currentValue: maxValue });
    addTimelineEvent(label || 'Health', 'HEALTH_BAR', `Full heal (${currentValue} → ${maxValue})`, '💚');
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full justify-between`}>
      {/* Label */}
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}
      
      {/* Health Bar with +/- buttons */}
      <div className="flex-1 flex items-center gap-1">
        {/* Decrement button */}
        <button
          onClick={() => {
            if (hasCurrentFormula) return;
            const newVal = currentValue - increment;
            updateWidgetData(widget.id, { currentValue: newVal });
            addTimelineEvent(label || 'Health', 'HEALTH_BAR', `−${increment} (${currentValue} → ${newVal})`, '💥');
          }}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={hasCurrentFormula}
          className={`w-5 h-5 flex items-center justify-center border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-button font-bold text-xs flex-shrink-0 font-body ${isPrintMode ? 'opacity-0' : ''} ${hasCurrentFormula ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          −
        </button>
        
        {/* Health Bar */}
        <div className={`relative ${barHeight} flex-1 bg-theme-muted/30 rounded-button overflow-hidden border border-theme-border`}>
          {/* Filled portion - uses theme accent color, empty in print mode */}
          <div 
            className="absolute inset-y-0 left-0 bg-theme-accent transition-all duration-300 ease-out"
            style={{ 
              width: isPrintMode ? '0%' : `${healthPercent}%`,
            }}
          />
          {/* Health text overlay - hide current value and shadow in print mode */}
          <div 
            className={`absolute inset-0 flex items-center justify-center font-bold ${barTextClass} text-theme-ink font-body`}
            style={isPrintMode ? {} : { textShadow: '0 0 3px var(--color-paper), 0 0 3px var(--color-paper), 0 0 3px var(--color-paper)' }}
          >
            {isPrintMode ? (
              <>
                <span style={{ visibility: 'hidden' }} data-print-hide="true">{maxValue}</span>
                {` / ${maxValue}`}
              </>
            ) : (
              <>
                {currentBroken && <span className="text-red-500 text-[9px] mr-0.5" title={`Broken formula: ${fieldFormulas!.currentValue}`}>⚠</span>}
                {`${currentValue} / ${maxValue}`}
                {maxBroken && <span className="text-red-500 text-[9px] ml-0.5" title={`Broken formula: ${fieldFormulas!.maxValue}`}>⚠</span>}
              </>
            )}
          </div>
        </div>
        
        {/* Increment button */}
        <button
          onClick={() => {
            if (hasCurrentFormula) return;
            const newVal = Math.min(maxValue, currentValue + increment);
            updateWidgetData(widget.id, { currentValue: newVal });
            addTimelineEvent(label || 'Health', 'HEALTH_BAR', `+${increment} (${currentValue} → ${newVal})`, '💚');
          }}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={hasCurrentFormula}
          className={`w-5 h-5 flex items-center justify-center border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-button font-bold text-xs flex-shrink-0 font-body ${isPrintMode ? 'opacity-0' : ''} ${hasCurrentFormula ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          +
        </button>
      </div>

      {/* Controls */}
      <div className={`flex items-center justify-between gap-1 flex-shrink-0 ${isPrintMode ? 'opacity-0' : ''}`}>
        <button
          onClick={() => !hasCurrentFormula && setShowDamageModal(true)}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={hasCurrentFormula}
          className={`${buttonClass} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-button font-bold font-body ${hasCurrentFormula ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          Damage
        </button>
        <button
          onClick={() => !hasCurrentFormula && setShowHealModal(true)}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={hasCurrentFormula}
          className={`${buttonClass} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-button font-bold font-body ${hasCurrentFormula ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          Heal
        </button>
        <button
          onClick={() => !hasCurrentFormula && fullHeal()}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={hasCurrentFormula}
          className={`${buttonClass} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-button font-bold font-body ${hasCurrentFormula ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          Full
        </button>
      </div>

      {/* Damage Modal */}
      {showDamageModal && createPortal(
        <HealthModal
          title="Take Damage"
          onConfirm={applyDamage}
          onCancel={() => setShowDamageModal(false)}
          buttonLabel="Damage"
          isDamage={true}
        />,
        document.body
      )}

      {/* Heal Modal */}
      {showHealModal && createPortal(
        <HealthModal
          title="Heal"
          onConfirm={applyHeal}
          onCancel={() => setShowHealModal(false)}
          buttonLabel="Heal"
          isDamage={false}
        />,
        document.body
      )}
    </div>
  );
}






