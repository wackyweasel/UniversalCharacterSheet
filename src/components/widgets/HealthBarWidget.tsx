import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Widget } from '../../types';
import { Tooltip } from '../Tooltip';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { collectLabels, isFormulaBroken } from '../../utils/formulaEngine';

// Check if we're in print mode to hide interactive elements

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  showMaxControl?: boolean;
  interactive?: boolean;
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
        className="fixed inset-0 bg-black/50 z-[9999] animate-fade-in" 
        onClick={onCancel}
      />
      <div 
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme p-4 z-[9999] min-w-[200px] animate-fade-in"
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
            aria-label="Decrease amount"
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
            aria-label="Increase amount"
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

function MaxHealthModal({ value, onConfirm, onCancel }: { value: number; onConfirm: (value: number) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(String(value));

  const submit = () => {
    const nextValue = Math.max(1, parseInt(draft, 10) || 1);
    onConfirm(nextValue);
  };

  return (
    <>
      <div className="fixed inset-0 z-[9999] bg-black/50 animate-fade-in" onClick={onCancel} />
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Set maximum health"
        className="fixed left-1/2 top-1/2 z-[9999] min-w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme animate-fade-in"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      >
        <h3 className="font-heading font-bold">Maximum health</h3>
        <label htmlFor="health-max-value" className="mt-3 block text-sm font-medium">Max value</label>
        <input
          id="health-max-value"
          autoFocus
          type="number"
          min="1"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="mt-1 h-10 w-full rounded-button border border-theme-border bg-theme-paper px-3 text-center text-lg font-bold text-theme-ink focus:border-theme-accent focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
          <button type="submit" className="widget-control widget-control--primary px-3 py-1.5 text-sm">Set maximum</button>
        </div>
      </form>
    </>
  );
}

export default function HealthBarWidget({ widget, mode, showMaxControl = true, interactive = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const isPrintMode = mode === 'print';
  const { label, currentValue = 10, maxValue = 10, increment = 1 } = widget.data;
  const fieldFormulas = widget.data.fieldFormulas as Record<string, string> | undefined;
  
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [showHealModal, setShowHealModal] = useState(false);
  const [showMaxModal, setShowMaxModal] = useState(false);
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const scrubbingRef = useRef(false);
  const scrubStartRef = useRef(currentValue);
  const hasCurrentFormula = !!fieldFormulas?.currentValue;
  const hasMaxFormula = !!fieldFormulas?.maxValue;
  const controlsVisible = interactive && !isPrintMode;
  const maxControlVisible = showMaxControl && widget.data.showMaxControl !== false && controlsVisible;
  const safeMaxValue = Math.max(1, maxValue);
  const displayedValue = scrubValue ?? currentValue;

  const labels = useMemo(() => {
    const char = characters.find(c => c.id === activeCharacterId);
    return char ? collectLabels(char) : {};
  }, [characters, activeCharacterId]);

  const currentBroken = hasCurrentFormula && isFormulaBroken(fieldFormulas!.currentValue, labels);
  const maxBroken = hasMaxFormula && isFormulaBroken(fieldFormulas!.maxValue, labels);

  const healthPercent = Math.max(0, Math.min(100, (displayedValue / safeMaxValue) * 100));

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

  const valueFromPointer = (clientX: number, element: HTMLDivElement) => {
    const bounds = element.getBoundingClientRect();
    const ratio = bounds.width > 0 ? (clientX - bounds.left) / bounds.width : 0;
    return Math.round(Math.max(0, Math.min(1, ratio)) * safeMaxValue);
  };

  const startScrub = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!controlsVisible || hasCurrentFormula) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const nextValue = valueFromPointer(event.clientX, event.currentTarget);
    scrubbingRef.current = true;
    scrubStartRef.current = currentValue;
    setScrubValue(nextValue);
  };

  const moveScrub = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    event.preventDefault();
    const nextValue = valueFromPointer(event.clientX, event.currentTarget);
    setScrubValue(nextValue);
  };

  const finishScrub = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const nextValue = valueFromPointer(event.clientX, event.currentTarget);
    const previousValue = scrubStartRef.current;
    scrubbingRef.current = false;
    setScrubValue(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (nextValue !== previousValue) {
      updateWidgetData(widget.id, { currentValue: nextValue });
      addTimelineEvent(label || 'Health', 'HEALTH_BAR', `Set health (${previousValue} → ${nextValue})`, '❤️');
    }
  };

  const cancelScrub = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    setScrubValue(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const setFromKeyboard = (nextValue: number) => {
    const boundedValue = Math.max(0, Math.min(safeMaxValue, nextValue));
    if (boundedValue === currentValue) return;
    updateWidgetData(widget.id, { currentValue: boundedValue });
    addTimelineEvent(label || 'Health', 'HEALTH_BAR', `Set health (${currentValue} → ${boundedValue})`, '❤️');
  };

  const setMaximum = (nextMax: number) => {
    const updatedCurrent = hasCurrentFormula ? currentValue : Math.min(currentValue, nextMax);
    updateWidgetData(widget.id, {
      maxValue: nextMax,
      ...(hasCurrentFormula ? {} : { currentValue: updatedCurrent }),
    });
    setShowMaxModal(false);
    addTimelineEvent(label || 'Health', 'HEALTH_BAR', `Maximum health (${maxValue} → ${nextMax})`, '❤️');
  };

  return (
    <div className="health-bar-widget flex h-full w-full flex-col gap-1.5">
      {(label || maxControlVisible) && (
        <div className="flex min-h-6 flex-shrink-0 items-center gap-2 pr-4">
          {label && (
            <div className="min-w-0 flex-1 truncate font-heading text-xs font-bold text-theme-ink">
              {label}
            </div>
          )}
          {maxControlVisible && (
            <Tooltip content={hasMaxFormula ? 'Maximum set by formula' : 'Change maximum health'}>
              <button
                type="button"
                onClick={() => !hasMaxFormula && setShowMaxModal(true)}
                onMouseDown={(event) => event.stopPropagation()}
                disabled={hasMaxFormula}
                aria-label={`Set maximum ${label || 'health'}, currently ${maxValue}`}
                className={`health-bar__max-control ml-auto ${hasMaxFormula ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <span>Max</span>
                <strong>{maxValue}</strong>
              </button>
            </Tooltip>
          )}
        </div>
      )}

      <div className="health-bar__main flex min-h-0 flex-1 items-center gap-1.5">
        <Tooltip content={hasCurrentFormula ? 'Value set by formula' : `Decrease by ${increment}`}>
          <button
            onClick={() => {
              if (hasCurrentFormula) return;
              const newVal = currentValue - increment;
              updateWidgetData(widget.id, { currentValue: newVal });
              addTimelineEvent(label || 'Health', 'HEALTH_BAR', `−${increment} (${currentValue} → ${newVal})`, '💥');
            }}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={hasCurrentFormula}
            aria-label={`Decrease ${label || 'health'} by ${increment}`}
            className={`widget-control w-6 h-6 min-h-0 font-bold text-xs flex-shrink-0 ${isPrintMode ? 'opacity-0' : ''} ${hasCurrentFormula ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            −
          </button>
        </Tooltip>

        <Tooltip content={hasCurrentFormula ? 'Value set by formula' : 'Click or drag to set health'}>
          <div
            className={`health-bar__track ${hasCurrentFormula ? 'health-bar__track--disabled' : ''}`}
            data-touch-camera-ignore={controlsVisible && !hasCurrentFormula ? 'true' : undefined}
            role={controlsVisible && !hasCurrentFormula ? 'slider' : 'progressbar'}
            tabIndex={controlsVisible && !hasCurrentFormula ? 0 : undefined}
            aria-label={label || 'Health'}
            aria-valuemin={0}
            aria-valuemax={safeMaxValue}
            aria-valuenow={displayedValue}
            aria-valuetext={`${displayedValue} of ${safeMaxValue}`}
            onPointerDown={startScrub}
            onPointerMove={moveScrub}
            onPointerUp={finishScrub}
            onPointerCancel={cancelScrub}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (!controlsVisible || hasCurrentFormula) return;
              if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                event.preventDefault();
                setFromKeyboard(currentValue - increment);
              } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                event.preventDefault();
                setFromKeyboard(currentValue + increment);
              } else if (event.key === 'Home') {
                event.preventDefault();
                setFromKeyboard(0);
              } else if (event.key === 'End') {
                event.preventDefault();
                setFromKeyboard(safeMaxValue);
              }
            }}
          >
            <div
              className={`health-bar__fill ${scrubValue !== null ? 'health-bar__fill--scrubbing' : ''}`}
              style={{ width: isPrintMode ? '0%' : `${healthPercent}%` }}
            />
            <div className="health-bar__readout">
              {isPrintMode ? (
                <><span className="invisible" data-print-hide="true">{safeMaxValue}</span>{` / ${safeMaxValue}`}</>
              ) : (
                <>
                {currentBroken && <span className="text-red-500 text-[9px] mr-0.5" title={`Broken formula: ${fieldFormulas!.currentValue}`}>⚠</span>}
                  <strong>{displayedValue}/{safeMaxValue}</strong>
                {maxBroken && <span className="text-red-500 text-[9px] ml-0.5" title={`Broken formula: ${fieldFormulas!.maxValue}`}>⚠</span>}
                </>
              )}
            </div>
          </div>
        </Tooltip>

        <Tooltip content={hasCurrentFormula ? 'Value set by formula' : `Increase by ${increment}`}>
          <button
            onClick={() => {
              if (hasCurrentFormula) return;
              const newVal = Math.min(maxValue, currentValue + increment);
              updateWidgetData(widget.id, { currentValue: newVal });
              addTimelineEvent(label || 'Health', 'HEALTH_BAR', `+${increment} (${currentValue} → ${newVal})`, '💚');
            }}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={hasCurrentFormula}
            aria-label={`Increase ${label || 'health'} by ${increment}`}
            className={`widget-control w-6 h-6 min-h-0 font-bold text-xs flex-shrink-0 ${isPrintMode ? 'opacity-0' : ''} ${hasCurrentFormula ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            +
          </button>
        </Tooltip>
      </div>

      <div className={`health-bar__actions flex flex-shrink-0 items-center gap-1 ${isPrintMode ? 'invisible' : ''}`}>
        <Tooltip content={hasCurrentFormula ? 'Value set by formula' : 'Apply a custom damage amount'}>
          <button
            onClick={() => !hasCurrentFormula && setShowDamageModal(true)}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={hasCurrentFormula}
            className={`health-bar__action health-bar__action--damage ${hasCurrentFormula ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            Damage
          </button>
        </Tooltip>
        <Tooltip content={hasCurrentFormula ? 'Value set by formula' : 'Heal a custom amount'}>
          <button
            onClick={() => !hasCurrentFormula && setShowHealModal(true)}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={hasCurrentFormula}
            className={`health-bar__action health-bar__action--heal ${hasCurrentFormula ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            Heal
          </button>
        </Tooltip>
        <Tooltip content={hasCurrentFormula ? 'Value set by formula' : 'Restore to full health'}>
          <button
            onClick={() => !hasCurrentFormula && fullHeal()}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={hasCurrentFormula}
            className={`health-bar__action ${hasCurrentFormula ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            Full
          </button>
        </Tooltip>
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

      {showMaxModal && createPortal(
        <MaxHealthModal value={safeMaxValue} onConfirm={setMaximum} onCancel={() => setShowMaxModal(false)} />,
        document.body
      )}
    </div>
  );
}






