import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { collectLabels, isFormulaBroken } from '../../utils/formulaEngine';
import { Tooltip } from '../Tooltip';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  interactive?: boolean;
}

interface ProgressValueModalProps {
  currentValue: number;
  maxValue: number;
  currentEditable: boolean;
  maxEditable: boolean;
  allowOutOfRange: boolean;
  onConfirm: (currentValue: number, maxValue: number) => void;
  onCancel: () => void;
}

const HOLD_DELAY_MS = 300;

function ProgressValueModal({
  currentValue,
  maxValue,
  currentEditable,
  maxEditable,
  allowOutOfRange,
  onConfirm,
  onCancel,
}: ProgressValueModalProps) {
  const [currentDraft, setCurrentDraft] = useState(String(currentValue));
  const [maxDraft, setMaxDraft] = useState(String(maxValue));

  const submit = () => {
    const parsedMax = Number(maxDraft);
    const nextMax = maxEditable && Number.isFinite(parsedMax) ? Math.max(1, parsedMax) : maxValue;
    const parsedCurrent = Number(currentDraft);
    const nextCurrent = currentEditable && Number.isFinite(parsedCurrent) ? parsedCurrent : currentValue;
    onConfirm(
      allowOutOfRange ? nextCurrent : Math.max(0, Math.min(nextMax, nextCurrent)),
      nextMax,
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[9999] bg-black/50 animate-fade-in"
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onCancel();
        }}
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Set progress values"
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
        <h3 className="font-heading font-bold">Progress values</h3>
        <label htmlFor="progress-current-value" className="mt-3 block text-sm font-medium">Current value</label>
        <input
          id="progress-current-value"
          autoFocus={currentEditable}
          type="number"
          min={allowOutOfRange ? undefined : 0}
          max={allowOutOfRange ? undefined : Number(maxDraft) || maxValue}
          value={currentDraft}
          onChange={(event) => setCurrentDraft(event.target.value)}
          disabled={!currentEditable}
          className="mt-1 h-10 w-full rounded-button border border-theme-border bg-theme-paper px-3 text-center text-lg font-bold text-theme-ink focus:border-theme-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <label htmlFor="progress-max-value" className="mt-3 block text-sm font-medium">Max value</label>
        <input
          id="progress-max-value"
          autoFocus={!currentEditable && maxEditable}
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

export default function ProgressBarWidget({ widget, mode, interactive = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const isPrintMode = mode === 'print';
  const { 
    label, 
    currentValue = 0, 
    maxValue = 100,
    showPercentage = false,
    showValues = true,
    verticalBar = false,
    inlineLabel = false,
    allowOutOfRange = false
  } = widget.data;
  const fieldFormulas = widget.data.fieldFormulas as Record<string, string> | undefined;

  const [showValueModal, setShowValueModal] = useState(false);
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const scrubbingRef = useRef(false);
  const scrubStartRef = useRef(currentValue);
  const pointerStartXRef = useRef(0);
  const pointerStartYRef = useRef(0);
  const pointerLatestXRef = useRef(0);
  const pointerLatestYRef = useRef(0);
  const holdTimerRef = useRef<number | null>(null);
  const hasCurrentFormula = !!fieldFormulas?.currentValue;
  const hasMaxFormula = !!fieldFormulas?.maxValue;
  const controlsVisible = interactive && !isPrintMode;
  const valuesEditable = controlsVisible && (!hasCurrentFormula || !hasMaxFormula);
  const safeMaxValue = Math.max(1, maxValue);
  const displayedValue = scrubValue ?? currentValue;

  const labels = useMemo(() => {
    const char = characters.find(c => c.id === activeCharacterId);
    return char ? collectLabels(char) : {};
  }, [characters, activeCharacterId]);

  const currentBroken = hasCurrentFormula && isFormulaBroken(fieldFormulas!.currentValue, labels);
  const maxBroken = hasMaxFormula && isFormulaBroken(fieldFormulas!.maxValue, labels);

  const progressPercent = Math.max(0, Math.min(100, (displayedValue / safeMaxValue) * 100));

  useEffect(() => () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
  }, []);

  const clearHoldTimer = () => {
    if (holdTimerRef.current === null) return;
    window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  };

  const valueFromDrag = (clientX: number, clientY: number, element: HTMLDivElement) => {
    const bounds = element.getBoundingClientRect();
    const delta = verticalBar
      ? (bounds.height > 0 ? ((pointerStartYRef.current - clientY) / bounds.height) * safeMaxValue : 0)
      : (bounds.width > 0 ? ((clientX - pointerStartXRef.current) / bounds.width) * safeMaxValue : 0);
    return Math.round(Math.max(0, Math.min(safeMaxValue, scrubStartRef.current + delta)));
  };

  const startScrub = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!valuesEditable) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    scrubStartRef.current = currentValue;
    pointerStartXRef.current = event.clientX;
    pointerStartYRef.current = event.clientY;
    pointerLatestXRef.current = event.clientX;
    pointerLatestYRef.current = event.clientY;

    if (!hasCurrentFormula) {
      const element = event.currentTarget;
      holdTimerRef.current = window.setTimeout(() => {
        holdTimerRef.current = null;
        scrubbingRef.current = true;
        setScrubValue(valueFromDrag(pointerLatestXRef.current, pointerLatestYRef.current, element));
      }, HOLD_DELAY_MS);
    }
  };

  const moveScrub = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerLatestXRef.current = event.clientX;
    pointerLatestYRef.current = event.clientY;
    if (!scrubbingRef.current) return;
    event.preventDefault();
    setScrubValue(valueFromDrag(event.clientX, event.clientY, event.currentTarget));
  };

  const finishScrub = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!valuesEditable) return;
    event.preventDefault();
    event.stopPropagation();
    clearHoldTimer();
    const wasScrubbing = scrubbingRef.current;
    const nextValue = wasScrubbing ? valueFromDrag(event.clientX, event.clientY, event.currentTarget) : currentValue;
    scrubbingRef.current = false;
    setScrubValue(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!wasScrubbing) {
      setShowValueModal(true);
    } else if (nextValue !== scrubStartRef.current) {
      updateWidgetData(widget.id, { currentValue: nextValue });
      addTimelineEvent(label || 'Progress Bar', 'PROGRESS_BAR', `${scrubStartRef.current} → ${nextValue} / ${safeMaxValue}`, '📊');
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
    if (boundedValue === currentValue) return;
    updateWidgetData(widget.id, { currentValue: boundedValue });
    addTimelineEvent(label || 'Progress Bar', 'PROGRESS_BAR', `${currentValue} → ${boundedValue} / ${safeMaxValue}`, '📊');
  };

  const setValues = (nextCurrent: number, nextMax: number) => {
    const updatedCurrent = hasCurrentFormula ? currentValue : nextCurrent;
    const updatedMax = hasMaxFormula ? maxValue : nextMax;
    updateWidgetData(widget.id, {
      ...(hasCurrentFormula ? {} : { currentValue: updatedCurrent }),
      ...(hasMaxFormula ? {} : { maxValue: updatedMax }),
    });
    setShowValueModal(false);
    if (updatedCurrent !== currentValue || updatedMax !== maxValue) {
      addTimelineEvent(label || 'Progress Bar', 'PROGRESS_BAR', `${currentValue}/${maxValue} → ${updatedCurrent}/${updatedMax}`, '📊');
    }
  };

  const getBarText = () => {
    if (showValues && showPercentage) {
      return `${displayedValue}/${safeMaxValue} (${Math.round(progressPercent)}%)`;
    } else if (showValues) {
      return `${displayedValue}/${safeMaxValue}`;
    } else if (showPercentage) {
      return `${Math.round(progressPercent)}%`;
    }
    return '';
  };

  return (
    <div className={`progress-bar-widget flex h-full w-full flex-col gap-1.5 ${verticalBar ? 'progress-bar-widget--vertical' : ''} ${inlineLabel ? 'progress-bar-widget--inline-label' : ''}`}>
      {label && !inlineLabel && (
        <div className="widget-header flex-shrink-0">
          <div className="widget-header-title min-w-0 flex-1 truncate">
            {label}
          </div>
        </div>
      )}

      <div className="progress-bar__main flex min-h-0 flex-1 items-center">
        {label && inlineLabel && (
          <div className="progress-bar__inline-label min-w-0 max-w-[40%] flex-shrink-0 truncate">
            {label}
          </div>
        )}
        <Tooltip content={hasCurrentFormula && hasMaxFormula ? 'Values set by formula' : hasCurrentFormula ? 'Click to edit maximum' : 'Click to edit; hold and drag to change progress'}>
          <div
            className={`progress-bar__track ${!valuesEditable ? 'progress-bar__track--disabled' : ''}`}
            data-touch-camera-ignore={valuesEditable ? 'true' : undefined}
            role={controlsVisible && !hasCurrentFormula ? 'slider' : 'progressbar'}
            tabIndex={valuesEditable ? 0 : undefined}
            aria-label={label || 'Progress'}
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
              if (!valuesEditable) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setShowValueModal(true);
              } else if (!hasCurrentFormula && (event.key === 'ArrowLeft' || event.key === 'ArrowDown')) {
                event.preventDefault();
                setFromKeyboard(currentValue - 1);
              } else if (!hasCurrentFormula && (event.key === 'ArrowRight' || event.key === 'ArrowUp')) {
                event.preventDefault();
                setFromKeyboard(currentValue + 1);
              } else if (!hasCurrentFormula && event.key === 'Home') {
                event.preventDefault();
                setFromKeyboard(0);
              } else if (!hasCurrentFormula && event.key === 'End') {
                event.preventDefault();
                setFromKeyboard(safeMaxValue);
              }
            }}
          >
            <div
              className={`progress-bar__fill ${scrubValue !== null ? 'progress-bar__fill--scrubbing' : ''}`}
              style={verticalBar ? { height: `${progressPercent}%` } : { width: `${progressPercent}%` }}
            />
            {(showValues || showPercentage) && (
              <div className="progress-bar__readout">
                {currentBroken && <span className="text-red-500 text-[9px] mr-0.5" title={`Broken formula: ${fieldFormulas!.currentValue}`}>⚠</span>}
                <strong>{getBarText()}</strong>
                {maxBroken && <span className="text-red-500 text-[9px] ml-0.5" title={`Broken formula: ${fieldFormulas!.maxValue}`}>⚠</span>}
              </div>
            )}
          </div>
        </Tooltip>
      </div>

      {showValueModal && createPortal(
        <ProgressValueModal
          currentValue={currentValue}
          maxValue={safeMaxValue}
          currentEditable={!hasCurrentFormula}
          maxEditable={!hasMaxFormula}
          allowOutOfRange={allowOutOfRange}
          onConfirm={setValues}
          onCancel={() => setShowValueModal(false)}
        />,
        document.body
      )}
    </div>
  );
}






