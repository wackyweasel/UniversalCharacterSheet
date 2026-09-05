import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import type { ProgressClockItem, Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { useTouchCameraPinchCancellation } from '../../hooks/useTouchCamera';
import { collectLabels, isFormulaBroken, resolveProgressClockFormulas } from '../../utils/formulaEngine';
import { MinusIcon, PlusIcon } from '../icons';
import { Tooltip } from '../Tooltip';
import { ProgressClockStructureDialog } from './ProgressClockStructureDialog';
import { advanceClock, getClockDragValue, getClockSegments, getClockValue, getClockSeparatorPath } from '../../utils/progressClock';
import './ProgressClockWidget.css';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  interactive?: boolean;
  showFieldControls?: boolean;
}

interface ClockProps {
  clock: ProgressClockItem;
  index: number;
  enabled: boolean;
  showValues: boolean;
  labelPosition: 'above' | 'below';
  counterClockwise: boolean;
  startAngle: number;
  onChange: (value: number) => void;
  formulaError?: string;
}

interface ClockGesture {
  pointerId: number;
  startX: number;
  startY: number;
  latestX: number;
  latestY: number;
  value: number;
  diameter: number;
  scrubbing: boolean;
  moved: boolean;
}

function ProgressClock({ clock, index, enabled, showValues, labelPosition, counterClockwise, startAngle, onChange, formulaError }: ClockProps) {
  const segments = getClockSegments(clock.segments);
  const value = getClockValue(clock.value, segments);
  const [previewValue, setPreviewValue] = useState<number | null>(null);
  const gestureRef = useRef<ClockGesture | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const displayedValue = previewValue ?? value;
  const name = clock.name || `Clock ${index + 1}`;

  const clearHold = () => {
    if (holdTimerRef.current !== null) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  };

  const cancelGesture = () => {
    clearHold();
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (gesture && buttonRef.current?.hasPointerCapture(gesture.pointerId)) {
      buttonRef.current.releasePointerCapture(gesture.pointerId);
    }
    setPreviewValue(null);
  };

  useTouchCameraPinchCancellation(cancelGesture);

  useEffect(() => {
    cancelGesture();
    window.addEventListener('blur', cancelGesture);
    return () => {
      clearHold();
      gestureRef.current = null;
      window.removeEventListener('blur', cancelGesture);
    };
  }, [enabled, value, segments]);

  const dragValue = (gesture: ClockGesture) => getClockDragValue(
    gesture.value, segments, gesture.latestX - gesture.startX, gesture.latestY - gesture.startY, gesture.diameter,
  );

  const startGesture = (event: PointerEvent<HTMLButtonElement>) => {
    if (!enabled || event.button !== 0 || !event.isPrimary || gestureRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      latestX: event.clientX,
      latestY: event.clientY,
      value,
      diameter: event.currentTarget.getBoundingClientRect().width,
      scrubbing: false,
      moved: false,
    };
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      const gesture = gestureRef.current;
      if (!gesture) return;
      gesture.scrubbing = true;
      setPreviewValue(dragValue(gesture));
    }, 300);
  };

  const moveGesture = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    gesture.latestX = event.clientX;
    gesture.latestY = event.clientY;
    if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >= 6) {
      gesture.moved = true;
      if (event.pointerType !== 'mouse') {
        clearHold();
        gesture.scrubbing = true;
      }
    }
    if (gesture.scrubbing) setPreviewValue(dragValue(gesture));
  };

  const finishGesture = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    gesture.latestX = event.clientX;
    gesture.latestY = event.clientY;
    const nextValue = gesture.scrubbing ? dragValue(gesture) : gesture.moved ? value : advanceClock(value, 1, segments);
    cancelGesture();
    if (nextValue !== value) onChange(nextValue);
  };

  const fill = clock.fillColor || 'var(--color-accent)';
  const empty = 'var(--color-paper)';
  const visualStartAngle = counterClockwise ? -startAngle : startAngle;
  const fillBackground = `conic-gradient(from ${visualStartAngle}deg, ${fill} 0deg ${displayedValue / segments * 360}deg, ${empty} 0deg 360deg)`;
  const separatorPath = getClockSeparatorPath(segments);
  const label = clock.name ? <span className="progress-clock__label">{clock.name}</span> : null;

  return (
    <div className="progress-clock">
      {labelPosition === 'above' && label}
      <button
        ref={buttonRef}
        type="button"
        role="slider"
        data-touch-camera-ignore="true"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={segments}
        aria-valuenow={displayedValue}
        aria-valuetext={`${displayedValue} of ${segments} segments`}
        aria-invalid={formulaError ? true : undefined}
        title={formulaError || (clock.valueFormula ? `Value set by formula: ${clock.valueFormula}` : undefined)}
        disabled={!enabled}
        className={`progress-clock__chart ${previewValue !== null ? 'progress-clock__chart--scrubbing' : ''}`}
        onPointerDown={startGesture}
        onPointerMove={moveGesture}
        onPointerUp={finishGesture}
        onPointerCancel={cancelGesture}
        onLostPointerCapture={cancelGesture}
        onContextMenu={(event) => event.preventDefault()}
        onClick={(event) => {
          event.stopPropagation();
          if (enabled && event.detail === 0) onChange(advanceClock(value, 1, segments));
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            cancelGesture();
            return;
          }
          if (!enabled || gestureRef.current) return;
          let nextValue: number;
          switch (event.key) {
            case 'ArrowUp':
            case 'ArrowRight':
            case 'Enter':
            case ' ': nextValue = advanceClock(value, 1, segments); break;
            case 'ArrowDown':
            case 'ArrowLeft': nextValue = advanceClock(value, -1, segments); break;
            case 'Home': nextValue = 0; break;
            case 'End': nextValue = segments; break;
            default: return;
          }
          event.preventDefault();
          event.stopPropagation();
          if (nextValue !== value) onChange(nextValue);
        }}
      >
        <span aria-hidden="true" className="progress-clock__face" style={{ background: fillBackground, transform: counterClockwise ? 'scaleX(-1)' : undefined }}>
          {segments > 1 && <svg className="progress-clock__separators" viewBox="0 0 100 100" focusable="false" style={{ transform: `rotate(${visualStartAngle}deg)` }}>
            {separatorPath === null
              ? <circle cx="50" cy="50" r="50" fill="var(--color-border)" />
              : <path d={separatorPath} fill="none" stroke="var(--color-border)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
          </svg>}
        </span>
      </button>
      {showValues && <span className="progress-clock__value" aria-hidden="true">{displayedValue} / {segments}</span>}
      {labelPosition === 'below' && label}
    </div>
  );
}

export default function ProgressClockWidget({ widget, mode, interactive = true, showFieldControls = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const character = characters.find((item) => item.id === activeCharacterId);
  const labels = character ? collectLabels(character) : {};
  const [structureAction, setStructureAction] = useState<'add' | 'remove' | null>(null);
  const {
    label, clockItems = [], clockLayout = 'horizontal', clockSize = 100,
    clockShowValues = false, clockLabelPosition = 'below', clockCounterClockwise = false, clockStartAngle = 0,
  } = widget.data;
  const enabled = interactive && mode === 'play' && !widget.locked;
  const controlsVisible = showFieldControls && widget.data.showFieldControls !== false && !widget.data.hideWidgetHeader && mode !== 'print' && !widget.locked;
  const resolvedClocks = clockItems.map((clock) => resolveProgressClockFormulas(clock, labels));

  return (
    <div className="progress-clock-widget" style={{ '--clock-size': `${Math.max(40, Math.min(240, clockSize))}px` } as CSSProperties}>
      {(label || controlsVisible) && <div className="widget-structure-header flex min-h-6 flex-shrink-0 items-center gap-2">
        {label && <div className="widget-structure-title min-w-0 flex-1 truncate">{label}</div>}
        {controlsVisible && <div className="widget-structure-controls ml-auto flex flex-shrink-0 items-center gap-1" data-touch-camera-ignore="true">
          <Tooltip content="Choose clocks to remove">
            <button type="button" aria-label="Choose clocks to remove" disabled={clockItems.length === 0} className="widget-control widget-control--subtle h-6 w-6" onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setStructureAction('remove'); }}><MinusIcon className="h-3 w-3" /></button>
          </Tooltip>
          <Tooltip content="Add clock">
            <button type="button" aria-label="Add clock" className="widget-control widget-control--subtle h-6 w-6" onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setStructureAction('add'); }}><PlusIcon className="h-3 w-3" /></button>
          </Tooltip>
        </div>}
      </div>}
      <div className={`progress-clock-widget__clocks progress-clock-widget__clocks--${clockLayout} progress-clock-widget__clocks--labels-${clockLabelPosition}`}>
        {resolvedClocks.map((clock, index) => (
          <ProgressClock
            key={clock.id}
            clock={clock}
            index={index}
            enabled={enabled && !clock.valueFormula?.trim()}
            formulaError={clock.segmentsFormula && isFormulaBroken(clock.segmentsFormula, labels) ? `Broken segments formula: ${clock.segmentsFormula}` : clock.valueFormula && isFormulaBroken(clock.valueFormula, labels) ? `Broken filled formula: ${clock.valueFormula}` : undefined}
            showValues={clockShowValues}
            labelPosition={clockLabelPosition}
            counterClockwise={clockCounterClockwise}
            startAngle={clockStartAngle}
            onChange={(value) => {
              updateWidgetData(widget.id, { clockItems: clockItems.map((item) => item.id === clock.id ? { ...item, value } : item) });
              addTimelineEvent(label || 'Progress clocks', 'PROGRESS_CLOCK', `${clock.name || `Clock ${index + 1}`}: ${clock.value} -> ${value} / ${clock.segments}`, '\u25d4');
            }}
          />
        ))}
      </div>
      {structureAction && controlsVisible && <ProgressClockStructureDialog
        key={structureAction}
        action={structureAction}
        clocks={resolvedClocks}
        onAdd={(clock) => updateWidgetData(widget.id, { clockItems: [...clockItems, clock] })}
        onRemove={(ids) => updateWidgetData(widget.id, { clockItems: clockItems.filter((clock) => !ids.has(clock.id)) })}
        onClose={() => setStructureAction(null)}
      />}
    </div>
  );
}