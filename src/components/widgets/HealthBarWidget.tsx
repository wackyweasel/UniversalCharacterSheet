import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Widget } from '../../types';
import { Tooltip } from '../Tooltip';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { collectLabels, isFormulaBroken } from '../../utils/formulaEngine';
import { applyHealthDamage, applyHealthHealing, normalizeHealthBarValue } from '../../utils/healthBar';

// Check if we're in print mode to hide interactive elements

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  interactive?: boolean;
}

interface HealthValueModalProps {
  currentValue: number;
  temporaryValue: number;
  maxValue: number;
  currentEditable: boolean;
  temporaryEditable: boolean;
  maxEditable: boolean;
  showTemporaryValue: boolean;
  onConfirm: (currentValue: number, maxValue: number, temporaryValue: number) => void;
  onCancel: () => void;
}

const HOLD_DELAY_MS = 300;

// Modal component for damage/heal input
function HealthModal({ 
  title, 
  onConfirm, 
  onCancel,
  buttonLabel,
  isDamage,
  initialAmount = '',
  allowZero = false,
  helperText,
  showExcessToTemporary = false,
  disableExcessToTemporary = false,
}: { 
  title: string;
  onConfirm: (amount: number, putExcessInTemporary?: boolean) => void;
  onCancel: () => void;
  buttonLabel: string;
  isDamage: boolean;
  initialAmount?: number | '';
  allowZero?: boolean;
  helperText?: string;
  showExcessToTemporary?: boolean;
  disableExcessToTemporary?: boolean;
}) {
  const [amount, setAmount] = useState<number | ''>(initialAmount);
  const [putExcessInTemporary, setPutExcessInTemporary] = useState(false);

  const handleConfirm = () => {
    if (amount === '' || amount < 0 || (!allowZero && amount === 0)) {
      onCancel();
      return;
    }
    onConfirm(
      amount,
      showExcessToTemporary && !disableExcessToTemporary ? putExcessInTemporary : false,
    );
  };

  const increment = () => setAmount(prev => (prev === '' ? 1 : prev + 1));
  const decrement = () => setAmount(prev => {
    if (prev === '') return allowZero ? 0 : '';
    if (prev <= (allowZero ? 0 : 1)) return allowZero ? 0 : '';
    return prev - 1;
  });

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
        {helperText && <p className="mb-3 max-w-[240px] text-xs text-theme-muted">{helperText}</p>}
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
            min={allowZero ? 0 : 1}
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
        {showExcessToTemporary && (
          <div className="mt-3 flex items-center gap-2 text-sm text-theme-ink">
            <button
              type="button"
              role="switch"
              aria-checked={putExcessInTemporary}
              aria-label="Put healing overflow into temporary HP"
              disabled={disableExcessToTemporary}
              onClick={() => setPutExcessInTemporary((current) => !current)}
              onMouseDown={(event) => event.stopPropagation()}
              className={`relative h-6 w-11 flex-shrink-0 rounded-full border border-theme-border transition-colors ${
                putExcessInTemporary ? 'bg-theme-accent' : 'bg-theme-background'
              } ${disableExcessToTemporary ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <span
                className={`absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-black/25 bg-theme-paper shadow-sm transition-transform ${
                  putExcessInTemporary ? 'translate-x-[22px]' : 'translate-x-1'
                }`}
              />
            </button>
            <span>
              Put healing overflow into temporary HP
              {disableExcessToTemporary && <span className="block text-xs text-theme-muted">Temporary HP is set by formula</span>}
            </span>
          </div>
        )}
        <div className="mt-5 flex gap-2">
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

function HealthValueModal({
  currentValue,
  temporaryValue,
  maxValue,
  currentEditable,
  temporaryEditable,
  maxEditable,
  showTemporaryValue,
  onConfirm,
  onCancel,
}: HealthValueModalProps) {
  const [currentDraft, setCurrentDraft] = useState(String(currentValue));
  const [temporaryDraft, setTemporaryDraft] = useState(String(temporaryValue));
  const [maxDraft, setMaxDraft] = useState(String(maxValue));

  const submit = () => {
    const parsedMax = Number(maxDraft);
    const nextMax = maxEditable && Number.isFinite(parsedMax) ? Math.max(1, parsedMax) : maxValue;
    const parsedCurrent = Number(currentDraft);
    const nextCurrent = currentEditable && Number.isFinite(parsedCurrent) ? parsedCurrent : currentValue;
    const parsedTemporary = Number(temporaryDraft);
    const nextTemporary = temporaryEditable && Number.isFinite(parsedTemporary)
      ? Math.max(0, parsedTemporary)
      : temporaryValue;
    onConfirm(Math.max(0, Math.min(nextMax, nextCurrent)), nextMax, nextTemporary);
  };

  return (
    <>
      <div className="fixed inset-0 z-[9999] bg-black/50 animate-fade-in" onClick={onCancel} />
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Set health values"
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
        <h3 className="font-heading font-bold">Health values</h3>
        <label htmlFor="health-current-value" className="mt-3 block text-sm font-medium">Current value</label>
        <input
          id="health-current-value"
          autoFocus={currentEditable}
          type="number"
          min="0"
          max={Number(maxDraft) || maxValue}
          value={currentDraft}
          onChange={(event) => setCurrentDraft(event.target.value)}
          disabled={!currentEditable}
          className="mt-1 h-10 w-full rounded-button border border-theme-border bg-theme-paper px-3 text-center text-lg font-bold text-theme-ink focus:border-theme-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        {showTemporaryValue && (
          <>
            <label htmlFor="health-temporary-value" className="mt-3 block text-sm font-medium">Temporary HP</label>
            <input
              id="health-temporary-value"
              autoFocus={!currentEditable && temporaryEditable}
              type="number"
              min="0"
              value={temporaryDraft}
              onChange={(event) => setTemporaryDraft(event.target.value)}
              disabled={!temporaryEditable}
              className="mt-1 h-10 w-full rounded-button border border-theme-border bg-theme-paper px-3 text-center text-lg font-bold text-theme-ink focus:border-theme-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </>
        )}
        <label htmlFor="health-max-value" className="mt-3 block text-sm font-medium">Max value</label>
        <input
          id="health-max-value"
          autoFocus={!currentEditable && (!showTemporaryValue || !temporaryEditable) && maxEditable}
          type="number"
          min="1"
          value={maxDraft}
          onChange={(event) => setMaxDraft(event.target.value)}
          disabled={!maxEditable}
          className="mt-1 h-10 w-full rounded-button border border-theme-border bg-theme-paper px-3 text-center text-lg font-bold text-theme-ink focus:border-theme-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
          <button type="submit" className="widget-control widget-control--primary px-3 py-1.5 text-sm">Save</button>
        </div>
      </form>
    </>
  );
}

export default function HealthBarWidget({ widget, mode, interactive = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const isPrintMode = mode === 'print';
  const {
    label,
    currentValue = 10,
    temporaryValue = 0,
    enableTemporaryHp = true,
    maxValue = 10,
    increment = 1,
    showIncrementButtons = true,
    fillColor,
  } = widget.data;
  const fieldFormulas = widget.data.fieldFormulas as Record<string, string> | undefined;
  
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [showHealModal, setShowHealModal] = useState(false);
  const [showTemporaryModal, setShowTemporaryModal] = useState(false);
  const [showValueModal, setShowValueModal] = useState(false);
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const scrubbingRef = useRef(false);
  const scrubStartRef = useRef(normalizeHealthBarValue(currentValue, 10));
  const pointerStartXRef = useRef(0);
  const pointerLatestXRef = useRef(0);
  const holdTimerRef = useRef<number | null>(null);
  const hasCurrentFormula = !!fieldFormulas?.currentValue;
  const hasTemporaryFormula = !!fieldFormulas?.temporaryValue;
  const hasMaxFormula = !!fieldFormulas?.maxValue;
  const controlsVisible = interactive && !isPrintMode;
  const valuesEditable = controlsVisible && (!hasCurrentFormula || !hasMaxFormula);
  const safeMaxValue = Math.max(1, normalizeHealthBarValue(maxValue, 10));
  const normalizedCurrentValue = normalizeHealthBarValue(currentValue, 10);
  const safeTemporaryValue = normalizeHealthBarValue(temporaryValue);
  const effectiveTemporaryValue = enableTemporaryHp ? safeTemporaryValue : 0;
  const displayedValue = scrubValue ?? normalizedCurrentValue;

  const labels = useMemo(() => {
    const char = characters.find(c => c.id === activeCharacterId);
    return char ? collectLabels(char) : {};
  }, [characters, activeCharacterId]);

  const currentBroken = hasCurrentFormula && isFormulaBroken(fieldFormulas!.currentValue, labels);
  const temporaryBroken = enableTemporaryHp && hasTemporaryFormula && isFormulaBroken(fieldFormulas!.temporaryValue, labels);
  const maxBroken = hasMaxFormula && isFormulaBroken(fieldFormulas!.maxValue, labels);

  const healthPercent = Math.max(0, Math.min(100, (displayedValue / safeMaxValue) * 100));
  const temporaryEndPercent = Math.max(0, Math.min(100, ((displayedValue + effectiveTemporaryValue) / safeMaxValue) * 100));
  const temporaryFillPercent = Math.max(0, temporaryEndPercent - healthPercent);
  const hasDamageFormula = hasCurrentFormula || (enableTemporaryHp && hasTemporaryFormula);
  const canApplyDamage = !hasCurrentFormula && (!enableTemporaryHp || !hasTemporaryFormula);
  const canUseHealthControls = controlsVisible;
  const formatHealthState = (current: number, max: number, temporary: number) =>
    `${current}/${max}${enableTemporaryHp && temporary > 0 ? ` + ${temporary} temp` : ''}`;

  useEffect(() => () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
  }, []);

  const clearHoldTimer = () => {
    if (holdTimerRef.current === null) return;
    window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  };

  const applyDamage = (amount: number) => {
    if (!canApplyDamage) return;
    const nextValues = applyHealthDamage(normalizedCurrentValue, effectiveTemporaryValue, amount);
    updateWidgetData(widget.id, enableTemporaryHp ? nextValues : { currentValue: nextValues.currentValue });
    setShowDamageModal(false);
    const before = formatHealthState(normalizedCurrentValue, safeMaxValue, effectiveTemporaryValue);
    const after = formatHealthState(nextValues.currentValue, safeMaxValue, nextValues.temporaryValue);
    addTimelineEvent(label || 'Health', 'HEALTH_BAR', `Took ${amount} damage (${before} → ${after})`, '💥');
  };

  const applyHeal = (amount: number, putExcessInTemporary = false) => {
    if (hasCurrentFormula) return;
    const nextValues = applyHealthHealing(
      normalizedCurrentValue,
      effectiveTemporaryValue,
      safeMaxValue,
      amount,
      enableTemporaryHp && putExcessInTemporary && !hasTemporaryFormula,
    );
    const overflowAmount = nextValues.temporaryValue - effectiveTemporaryValue;
    updateWidgetData(widget.id, {
      currentValue: nextValues.currentValue,
      ...(enableTemporaryHp && overflowAmount > 0 ? { temporaryValue: nextValues.temporaryValue } : {}),
    });
    setShowHealModal(false);
    const overflowDescription = overflowAmount > 0
      ? `; ${overflowAmount} overflow to temporary HP (${safeTemporaryValue} → ${nextValues.temporaryValue})`
      : '';
    addTimelineEvent(label || 'Health', 'HEALTH_BAR', `Healed ${amount} (${normalizedCurrentValue} → ${nextValues.currentValue})${overflowDescription}`, '💚');
  };

  const fullHeal = () => {
    if (hasCurrentFormula) return;
    updateWidgetData(widget.id, { currentValue: safeMaxValue });
    addTimelineEvent(label || 'Health', 'HEALTH_BAR', `Full heal (${normalizedCurrentValue} → ${safeMaxValue})`, '💚');
  };

  const setTemporaryHealth = (amount: number) => {
    if (!enableTemporaryHp || hasTemporaryFormula) return;
    const newValue = normalizeHealthBarValue(amount);
    updateWidgetData(widget.id, { temporaryValue: newValue });
    setShowTemporaryModal(false);
    addTimelineEvent(label || 'Health', 'HEALTH_BAR', `Temporary HP (${safeTemporaryValue} → ${newValue})`, '🛡️');
  };

  const valueFromDrag = (clientX: number, element: HTMLDivElement) => {
    const bounds = element.getBoundingClientRect();
    const delta = bounds.width > 0 ? ((clientX - pointerStartXRef.current) / bounds.width) * safeMaxValue : 0;
    return Math.round(Math.max(0, Math.min(safeMaxValue, scrubStartRef.current + delta)));
  };

  const startScrub = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!valuesEditable) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    scrubStartRef.current = normalizedCurrentValue;
    pointerStartXRef.current = event.clientX;
    pointerLatestXRef.current = event.clientX;

    if (!hasCurrentFormula) {
      const element = event.currentTarget;
      holdTimerRef.current = window.setTimeout(() => {
        holdTimerRef.current = null;
        scrubbingRef.current = true;
        setScrubValue(valueFromDrag(pointerLatestXRef.current, element));
      }, HOLD_DELAY_MS);
    }
  };

  const moveScrub = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerLatestXRef.current = event.clientX;
    if (!scrubbingRef.current) return;
    event.preventDefault();
    const nextValue = valueFromDrag(event.clientX, event.currentTarget);
    setScrubValue(nextValue);
  };

  const finishScrub = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!valuesEditable) return;
    event.preventDefault();
    event.stopPropagation();
    clearHoldTimer();
    const wasScrubbing = scrubbingRef.current;
    const nextValue = wasScrubbing ? valueFromDrag(event.clientX, event.currentTarget) : currentValue;
    scrubbingRef.current = false;
    setScrubValue(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!wasScrubbing) {
      setShowValueModal(true);
    } else if (nextValue !== scrubStartRef.current) {
      updateWidgetData(widget.id, { currentValue: nextValue });
      addTimelineEvent(label || 'Health', 'HEALTH_BAR', `Set health (${scrubStartRef.current} → ${nextValue})`, '❤️');
    }
  };

  const cancelScrub = (event: React.PointerEvent<HTMLDivElement>) => {
    clearHoldTimer();
    scrubbingRef.current = false;
    setScrubValue(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const setFromKeyboard = (nextValue: number) => {
    const boundedValue = Math.max(0, Math.min(safeMaxValue, nextValue));
    if (boundedValue === normalizedCurrentValue) return;
    updateWidgetData(widget.id, { currentValue: boundedValue });
    addTimelineEvent(label || 'Health', 'HEALTH_BAR', `Set health (${normalizedCurrentValue} → ${boundedValue})`, '❤️');
  };

  const setValues = (nextCurrent: number, nextMax: number, nextTemporary: number) => {
    const updatedCurrent = hasCurrentFormula ? normalizedCurrentValue : nextCurrent;
    const updatedMax = hasMaxFormula ? safeMaxValue : nextMax;
    const updatedTemporary = enableTemporaryHp && !hasTemporaryFormula
      ? normalizeHealthBarValue(nextTemporary)
      : safeTemporaryValue;
    updateWidgetData(widget.id, {
      ...(hasCurrentFormula ? {} : { currentValue: updatedCurrent }),
      ...(hasMaxFormula ? {} : { maxValue: updatedMax }),
      ...(enableTemporaryHp && !hasTemporaryFormula ? { temporaryValue: updatedTemporary } : {}),
    });
    setShowValueModal(false);
    const temporaryChanged = enableTemporaryHp && updatedTemporary !== safeTemporaryValue;
    if (
      updatedCurrent !== normalizedCurrentValue ||
      updatedMax !== safeMaxValue ||
      temporaryChanged
    ) {
      const before = formatHealthState(normalizedCurrentValue, safeMaxValue, effectiveTemporaryValue);
      const after = formatHealthState(updatedCurrent, updatedMax, enableTemporaryHp ? updatedTemporary : 0);
      addTimelineEvent(label || 'Health', 'HEALTH_BAR', `${before} → ${after}`, '❤️');
    }
  };

  return (
    <div className="health-bar-widget flex h-full w-full flex-col gap-1.5">
      {label && (
        <div className="widget-header flex-shrink-0">
          <div className="widget-header-title min-w-0 flex-1 truncate">
            {label}
          </div>
        </div>
      )}

      <div className="health-bar__main flex min-h-0 flex-1 items-center gap-1.5">
        {showIncrementButtons && <Tooltip content={hasDamageFormula ? 'Health or temporary HP set by formula' : `Decrease by ${increment}`}>
          <button
            onClick={() => {
              if (canUseHealthControls && canApplyDamage) applyDamage(increment);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={!canUseHealthControls || !canApplyDamage}
            aria-label={`Decrease ${label || 'health'} by ${increment}`}
            className={`widget-control w-6 h-6 min-h-0 font-bold text-xs flex-shrink-0 ${isPrintMode ? 'opacity-0' : ''} ${!canUseHealthControls || hasDamageFormula ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            −
          </button>
        </Tooltip>}

        <Tooltip content={hasCurrentFormula && hasMaxFormula ? 'Values set by formula' : hasCurrentFormula ? 'Click to edit maximum' : 'Click to edit; hold and drag to change health'}>
          <div
            className={`health-bar__track ${!valuesEditable ? 'health-bar__track--disabled' : ''}`}
            data-touch-camera-ignore={valuesEditable ? 'true' : undefined}
            role={controlsVisible && !hasCurrentFormula ? 'slider' : 'progressbar'}
            tabIndex={valuesEditable ? 0 : undefined}
            aria-label={label || 'Health'}
            aria-valuemin={0}
            aria-valuemax={safeMaxValue}
            aria-valuenow={displayedValue}
            aria-valuetext={`${displayedValue} of ${safeMaxValue}${effectiveTemporaryValue > 0 ? `, ${effectiveTemporaryValue} temporary hit points` : ''}`}
            onPointerDown={startScrub}
            onPointerMove={moveScrub}
            onPointerUp={finishScrub}
            onPointerCancel={cancelScrub}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (!valuesEditable) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setShowValueModal(true);
              } else if (canUseHealthControls && canApplyDamage && (event.key === 'ArrowLeft' || event.key === 'ArrowDown')) {
                event.preventDefault();
                applyDamage(increment);
              } else if (canUseHealthControls && !hasCurrentFormula && (event.key === 'ArrowRight' || event.key === 'ArrowUp')) {
                event.preventDefault();
                applyHeal(increment);
              } else if (canUseHealthControls && !hasCurrentFormula && event.key === 'Home') {
                event.preventDefault();
                setFromKeyboard(0);
              } else if (canUseHealthControls && !hasCurrentFormula && event.key === 'End') {
                event.preventDefault();
                setFromKeyboard(safeMaxValue);
              }
            }}
          >
            <div className="health-bar__fill-clip">
              <div
                className={`health-bar__fill ${scrubValue !== null ? 'health-bar__fill--scrubbing' : ''}`}
                style={{
                  width: isPrintMode ? '0%' : `${healthPercent}%`,
                  ...(fillColor ? { backgroundColor: fillColor } : {}),
                }}
              />
              {temporaryFillPercent > 0 && (
                <div
                  className={`health-bar__temporary-fill ${scrubValue !== null ? 'health-bar__temporary-fill--scrubbing' : ''}`}
                  style={{
                    left: `${healthPercent}%`,
                    width: isPrintMode ? '0%' : `${temporaryFillPercent}%`,
                  }}
                />
              )}
            </div>
            <div className={`health-bar__readout ${isPrintMode ? 'bar-readout--print' : ''}`}>
              {isPrintMode ? (
                <><span className="invisible" data-print-hide="true">{safeMaxValue}</span>{` / ${safeMaxValue}`}</>
              ) : (
                <>
                {currentBroken && <span className="text-red-500 text-[9px] mr-0.5" title={`Broken formula: ${fieldFormulas!.currentValue}`}>⚠</span>}
                  <strong>{displayedValue}/{safeMaxValue}</strong>
                  {effectiveTemporaryValue > 0 && <span className="health-bar__temporary-readout">+{effectiveTemporaryValue}</span>}
                  {temporaryBroken && <span className="text-red-500 text-[9px] ml-0.5" title={`Broken formula: ${fieldFormulas!.temporaryValue}`}>⚠</span>}
                {maxBroken && <span className="text-red-500 text-[9px] ml-0.5" title={`Broken formula: ${fieldFormulas!.maxValue}`}>⚠</span>}
                </>
              )}
            </div>
          </div>
        </Tooltip>

        {showIncrementButtons && <Tooltip content={hasCurrentFormula ? 'Value set by formula' : `Increase by ${increment}`}>
          <button
            onClick={() => {
              if (canUseHealthControls && !hasCurrentFormula) applyHeal(increment);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={!canUseHealthControls || hasCurrentFormula}
            aria-label={`Increase ${label || 'health'} by ${increment}`}
            className={`widget-control w-6 h-6 min-h-0 font-bold text-xs flex-shrink-0 ${isPrintMode ? 'opacity-0' : ''} ${!canUseHealthControls || hasCurrentFormula ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            +
          </button>
        </Tooltip>}
      </div>

      <div className={`health-bar__actions flex flex-shrink-0 items-center gap-1 ${isPrintMode ? 'invisible' : ''}`}>
        <Tooltip content={hasDamageFormula ? 'Health or temporary HP set by formula' : 'Apply a custom damage amount'}>
          <button
            onClick={() => canUseHealthControls && !hasDamageFormula && setShowDamageModal(true)}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={!canUseHealthControls || hasDamageFormula}
            className={`health-bar__action widget-control health-bar__action--damage ${!canUseHealthControls || hasDamageFormula ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            Damage
          </button>
        </Tooltip>
        <Tooltip content={hasCurrentFormula ? 'Value set by formula' : 'Heal a custom amount'}>
          <button
            onClick={() => canUseHealthControls && !hasCurrentFormula && setShowHealModal(true)}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={!canUseHealthControls || hasCurrentFormula}
            className={`health-bar__action widget-control health-bar__action--heal ${!canUseHealthControls || hasCurrentFormula ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            Heal
          </button>
        </Tooltip>
        <Tooltip content={hasCurrentFormula ? 'Value set by formula' : 'Restore to full health'}>
          <button
            onClick={() => canUseHealthControls && !hasCurrentFormula && fullHeal()}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={!canUseHealthControls || hasCurrentFormula}
            className={`health-bar__action widget-control ${!canUseHealthControls || hasCurrentFormula ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            Full
          </button>
        </Tooltip>
        {enableTemporaryHp && (
          <Tooltip content={hasTemporaryFormula ? 'Temporary HP set by formula' : 'Set temporary hit points (replaces the current amount)'}>
            <button
              onClick={() => canUseHealthControls && !hasTemporaryFormula && setShowTemporaryModal(true)}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={!canUseHealthControls || hasTemporaryFormula}
              className={`health-bar__action health-bar__action--temporary widget-control ${!canUseHealthControls || hasTemporaryFormula ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              Temp HP
            </button>
          </Tooltip>
        )}
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
          showExcessToTemporary={enableTemporaryHp}
          disableExcessToTemporary={hasTemporaryFormula}
        />,
        document.body
      )}

      {showTemporaryModal && enableTemporaryHp && createPortal(
        <HealthModal
          title="Temporary HP"
          onConfirm={setTemporaryHealth}
          onCancel={() => setShowTemporaryModal(false)}
          buttonLabel="Set"
          isDamage={false}
          initialAmount={safeTemporaryValue > 0 ? safeTemporaryValue : ''}
          allowZero
          helperText="This replaces the current temporary HP. Damage uses temporary HP before regular HP."
        />,
        document.body
      )}

      {showValueModal && createPortal(
        <HealthValueModal
          currentValue={normalizedCurrentValue}
          temporaryValue={effectiveTemporaryValue}
          maxValue={safeMaxValue}
          currentEditable={!hasCurrentFormula}
          temporaryEditable={enableTemporaryHp && !hasTemporaryFormula}
          maxEditable={!hasMaxFormula}
          showTemporaryValue={enableTemporaryHp}
          onConfirm={setValues}
          onCancel={() => setShowValueModal(false)}
        />,
        document.body
      )}
    </div>
  );
}
