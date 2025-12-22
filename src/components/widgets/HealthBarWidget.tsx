import { useState } from 'react';
import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
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
  const [amount, setAmount] = useState<number | string>(1);

  const handleConfirm = () => {
    const val = typeof amount === 'string' ? parseInt(amount) || 1 : amount;
    onConfirm(Math.max(1, val));
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-50" 
        onClick={onCancel}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-button p-4 z-50 min-w-[200px]">
        <h3 className="font-heading text-theme-ink font-bold mb-3">{title}</h3>
        <input
          type="number"
          min="1"
          className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent mb-3 text-center font-bold text-lg"
          value={amount}
          onChange={(e) => setAmount(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
          onBlur={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
            if (e.key === 'Escape') onCancel();
          }}
        />
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

export default function HealthBarWidget({ widget }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, currentValue = 10, maxValue = 10 } = widget.data;
  
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [showHealModal, setShowHealModal] = useState(false);

  // Calculate health percentage
  const healthPercent = Math.max(0, Math.min(100, (currentValue / maxValue) * 100));

  // Fixed small sizing
  const labelClass = 'text-xs';
  const barTextClass = 'text-xs';
  const buttonClass = 'px-1.5 py-0.5 text-[10px]';
  const gapClass = 'gap-1';
  const barHeight = 'h-4';

  const applyDamage = (amount: number) => {
    const newVal = Math.max(0, currentValue - amount);
    updateWidgetData(widget.id, { currentValue: newVal });
    setShowDamageModal(false);
  };

  const applyHeal = (amount: number) => {
    const newVal = Math.min(maxValue, currentValue + amount);
    updateWidgetData(widget.id, { currentValue: newVal });
    setShowHealModal(false);
  };

  const fullHeal = () => {
    updateWidgetData(widget.id, { currentValue: maxValue });
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full justify-between`}>
      {/* Label */}
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}
      
      {/* Health Bar */}
      <div className="flex-1 flex flex-col justify-center">
        <div className={`relative ${barHeight} bg-theme-muted/30 rounded-button overflow-hidden border border-theme-border`}>
          {/* Filled portion - uses theme accent color */}
          <div 
            className="absolute inset-y-0 left-0 bg-theme-accent transition-all duration-300 ease-out"
            style={{ 
              width: `${healthPercent}%`,
            }}
          />
          {/* Health text overlay */}
          <div 
            className={`absolute inset-0 flex items-center justify-center font-bold ${barTextClass} text-theme-ink`}
            style={{ textShadow: '0 0 3px var(--color-paper), 0 0 3px var(--color-paper), 0 0 3px var(--color-paper)' }}
          >
            {currentValue} / {maxValue}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-1 flex-shrink-0">
        <button
          onClick={() => setShowDamageModal(true)}
          onMouseDown={(e) => e.stopPropagation()}
          className={`${buttonClass} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-button font-bold`}
        >
          Damage
        </button>
        <button
          onClick={() => setShowHealModal(true)}
          onMouseDown={(e) => e.stopPropagation()}
          className={`${buttonClass} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-button font-bold`}
        >
          Heal
        </button>
        <button
          onClick={fullHeal}
          onMouseDown={(e) => e.stopPropagation()}
          className={`${buttonClass} bg-theme-accent text-theme-paper hover:opacity-80 transition-colors rounded-button font-bold`}
        >
          Full
        </button>
      </div>

      {/* Damage Modal */}
      {showDamageModal && (
        <HealthModal
          title="Take Damage"
          onConfirm={applyDamage}
          onCancel={() => setShowDamageModal(false)}
          buttonLabel="Damage"
          isDamage={true}
        />
      )}

      {/* Heal Modal */}
      {showHealModal && (
        <HealthModal
          title="Heal"
          onConfirm={applyHeal}
          onCancel={() => setShowHealModal(false)}
          buttonLabel="Heal"
          isDamage={false}
        />
      )}
    </div>
  );
}






