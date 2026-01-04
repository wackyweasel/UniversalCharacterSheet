import { useState } from 'react';
import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

// Modal component for value input
function ValueModal({ 
  title, 
  onConfirm, 
  onCancel,
  buttonLabel,
  currentValue,
  maxValue
}: { 
  title: string; 
  onConfirm: (amount: number) => void; 
  onCancel: () => void;
  buttonLabel: string;
  currentValue: number;
  maxValue: number;
}) {
  const [amount, setAmount] = useState<number | string>(currentValue);

  const handleConfirm = () => {
    const val = typeof amount === 'string' ? parseInt(amount) || 0 : amount;
    onConfirm(Math.max(0, Math.min(maxValue, val)));
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
          min="0"
          max={maxValue}
          className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent mb-3 text-center font-bold text-lg"
          value={amount}
          onChange={(e) => setAmount(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
          onBlur={(e) => setAmount(Math.max(0, Math.min(maxValue, parseInt(e.target.value) || 0)))}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
            if (e.key === 'Escape') onCancel();
          }}
        />
        <p className="text-xs text-theme-muted mb-3 text-center">Max: {maxValue}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-1.5 text-sm font-body text-theme-ink hover:bg-theme-accent/20 rounded-button transition-colors border border-theme-border"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-3 py-1.5 text-sm font-body rounded-button transition-colors bg-theme-accent text-theme-paper hover:opacity-80"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </>
  );
}

export default function ProgressBarWidget({ widget }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { 
    label, 
    currentValue = 0, 
    maxValue = 100,
    showPercentage = true,
    showValues = true
  } = widget.data;
  
  const [showValueModal, setShowValueModal] = useState(false);

  // Calculate progress percentage
  const progressPercent = maxValue > 0 ? Math.max(0, Math.min(100, (currentValue / maxValue) * 100)) : 0;

  // Fixed small sizing
  const labelClass = 'text-xs';
  const barTextClass = 'text-xs';
  const gapClass = 'gap-1';
  const barHeight = 'h-4';

  const setValue = (newValue: number) => {
    updateWidgetData(widget.id, { currentValue: Math.max(0, Math.min(maxValue, newValue)) });
    setShowValueModal(false);
  };

  // Determine what text to show on the bar
  const getBarText = () => {
    if (showValues && showPercentage) {
      return `${currentValue} / ${maxValue} (${Math.round(progressPercent)}%)`;
    } else if (showValues) {
      return `${currentValue} / ${maxValue}`;
    } else if (showPercentage) {
      return `${Math.round(progressPercent)}%`;
    }
    return '';
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full justify-between`}>
      {/* Label */}
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}
      
      {/* Progress Bar */}
      <div className="flex-1 flex flex-col justify-start">
        <div 
          className={`relative ${barHeight} bg-theme-muted/30 rounded-button overflow-hidden border border-theme-border cursor-pointer`}
          onClick={() => setShowValueModal(true)}
          onMouseDown={(e) => e.stopPropagation()}
          title="Click to set value"
        >
          {/* Filled portion */}
          <div 
            className="absolute inset-y-0 left-0 bg-theme-accent transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Progress text overlay */}
          {(showValues || showPercentage) && (
            <div 
              className={`absolute inset-0 flex items-center justify-center font-bold ${barTextClass} text-theme-ink font-body`}
              style={{ textShadow: '0 0 3px var(--color-paper), 0 0 3px var(--color-paper), 0 0 3px var(--color-paper)' }}
            >
              {getBarText()}
            </div>
          )}
        </div>
      </div>

      {/* Value Modal */}
      {showValueModal && (
        <ValueModal
          title="Set Progress"
          onConfirm={setValue}
          onCancel={() => setShowValueModal(false)}
          buttonLabel="Set"
          currentValue={currentValue}
          maxValue={maxValue}
        />
      )}
    </div>
  );
}






