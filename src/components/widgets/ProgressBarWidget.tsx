import { useMemo, useRef, useState } from 'react';
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
  showMaxControl?: boolean;
  interactive?: boolean;
}

function MaxProgressModal({ value, onConfirm, onCancel }: { value: number; onConfirm: (value: number) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(String(value));

  const submit = () => {
    const nextValue = Math.max(1, parseInt(draft, 10) || 1);
    onConfirm(nextValue);
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
        aria-label="Set maximum progress"
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
        <h3 className="font-heading font-bold">Maximum progress</h3>
        <label htmlFor="progress-max-value" className="mt-3 block text-sm font-medium">Max value</label>
        <input
          id="progress-max-value"
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

export default function ProgressBarWidget({ widget, mode, showMaxControl = true, interactive = true }: Props) {
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
    allowOutOfRange = false
  } = widget.data;
  const fieldFormulas = widget.data.fieldFormulas as Record<string, string> | undefined;

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

  const progressPercent = Math.max(0, Math.min(100, (displayedValue / safeMaxValue) * 100));

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
    setScrubValue(valueFromPointer(event.clientX, event.currentTarget));
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
      addTimelineEvent(label || 'Progress Bar', 'PROGRESS_BAR', `${previousValue} → ${nextValue} / ${safeMaxValue}`, '📊');
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
    addTimelineEvent(label || 'Progress Bar', 'PROGRESS_BAR', `${currentValue} → ${boundedValue} / ${safeMaxValue}`, '📊');
  };

  const setMaximum = (nextMax: number) => {
    const shouldClampCurrent = !allowOutOfRange && !hasCurrentFormula;
    const updatedCurrent = Math.min(Math.max(0, currentValue), nextMax);
    updateWidgetData(widget.id, {
      maxValue: nextMax,
      ...(shouldClampCurrent ? { currentValue: updatedCurrent } : {}),
    });
    setShowMaxModal(false);
    addTimelineEvent(label || 'Progress Bar', 'PROGRESS_BAR', `Maximum ${maxValue} → ${nextMax}`, '📊');
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
    <div className="progress-bar-widget flex h-full w-full flex-col gap-1.5">
      {(label || maxControlVisible) && (
        <div className="flex min-h-6 flex-shrink-0 items-center gap-2 pr-4">
          {label && (
            <div className="min-w-0 flex-1 truncate font-heading text-xs font-bold text-theme-ink">
              {label}
            </div>
          )}
          {maxControlVisible && (
            <Tooltip content={hasMaxFormula ? 'Maximum set by formula' : 'Change maximum progress'}>
              <button
                type="button"
                onClick={() => !hasMaxFormula && setShowMaxModal(true)}
                onMouseDown={(event) => event.stopPropagation()}
                disabled={hasMaxFormula}
                aria-label={`Set maximum ${label || 'progress'}, currently ${maxValue}`}
                className={`progress-bar__max-control ml-auto ${hasMaxFormula ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <span>Max</span>
                <strong>{maxValue}</strong>
              </button>
            </Tooltip>
          )}
        </div>
      )}

      <div className="progress-bar__main flex min-h-0 flex-1 items-center">
        <Tooltip content={hasCurrentFormula ? 'Value set by formula' : 'Click or drag to set progress'}>
          <div
            className={`progress-bar__track ${hasCurrentFormula ? 'progress-bar__track--disabled' : ''}`}
            data-touch-camera-ignore={controlsVisible && !hasCurrentFormula ? 'true' : undefined}
            role={controlsVisible && !hasCurrentFormula ? 'slider' : 'progressbar'}
            tabIndex={controlsVisible && !hasCurrentFormula ? 0 : undefined}
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
              if (!controlsVisible || hasCurrentFormula) return;
              if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                event.preventDefault();
                setFromKeyboard(currentValue - 1);
              } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                event.preventDefault();
                setFromKeyboard(currentValue + 1);
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
              className={`progress-bar__fill ${scrubValue !== null ? 'progress-bar__fill--scrubbing' : ''}`}
              style={{ width: `${progressPercent}%` }}
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

      {showMaxModal && createPortal(
        <MaxProgressModal
          value={safeMaxValue}
          onConfirm={setMaximum}
          onCancel={() => setShowMaxModal(false)}
        />,
        document.body
      )}
    </div>
  );
}






