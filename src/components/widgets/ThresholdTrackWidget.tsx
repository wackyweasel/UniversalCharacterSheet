import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { InlineFormulaText } from '../InlineFormulaText';
import { Tooltip } from '../Tooltip';
import type { TrackThreshold, Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { useFormulaLabels } from '../../hooks/useFormulaLabels';
import { useTouchCameraPinchCancellation } from '../../hooks/useTouchCamera';
import { isFormulaBroken } from '../../utils/formulaEngine';
import {
  clampTrackValue,
  formatTrackModifier,
  getTrackBounds,
  getTrackModifier,
  getTrackSegments,
  getTrackStyle,
  getTrackValue,
  getTrackZone,
  sortTrackThresholds,
  type TrackSegment,
  type TrackZone,
} from '../../utils/thresholdTrack';

interface Props {
  widget: Widget;
  mode: 'play' | 'print';
  width: number;
  height: number;
  interactive?: boolean;
}

const stopPropagation = (event: { stopPropagation: () => void }) => event.stopPropagation();

function getZoneName(zone: TrackZone): string {
  const name = zone.threshold?.name?.trim() || `Zone ${zone.level}`;
  const modifier = getTrackModifier(zone);
  return modifier !== 0 ? `${name} (${formatTrackModifier(modifier)})` : name;
}

export default function ThresholdTrackWidget({ widget, mode, interactive = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const {
    label,
    increment,
    showIncrementButtons = true,
    showValues = true,
    fillColor,
    trackThresholds,
    trackShowZoneNames = true,
  } = widget.data;
  const thresholdMode = widget.data.trackThresholdMode ?? 'rising';
  const fieldFormulas = widget.data.fieldFormulas as Record<string, string> | undefined;
  const { min, max } = getTrackBounds(widget.data);
  const range = max - min;
  const value = getTrackValue(widget.data);
  const style = getTrackStyle(widget.data);
  const step = typeof increment === 'number' && Number.isFinite(increment) ? Math.max(1, Math.round(increment)) : 1;

  const hasCurrentFormula = !!fieldFormulas?.currentValue;
  const formulas = [
    fieldFormulas?.currentValue,
    fieldFormulas?.minValue,
    fieldFormulas?.maxValue,
    ...(trackThresholds ?? []).map((threshold) => threshold.valueFormula),
  ].filter((formula): formula is string => !!formula);
  const labels = useFormulaLabels(formulas.length > 0);
  const brokenFormula = formulas.find((formula) => isFormulaBroken(formula, labels));

  const canEdit = interactive && mode === 'play' && !hasCurrentFormula;
  const showControls = showIncrementButtons && mode === 'play';
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? value;
  const zone = getTrackZone(trackThresholds, shown, thresholdMode);
  const modifier = getTrackModifier(zone);
  const zoneCount = useMemo(() => sortTrackThresholds(trackThresholds, thresholdMode).length, [trackThresholds, thresholdMode]);
  const segments = useMemo(
    () => getTrackSegments(trackThresholds, min, max, thresholdMode),
    [trackThresholds, min, max, thresholdMode],
  );
  const baseFill = fillColor || 'var(--color-accent)';

  const barRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<number | null>(null);

  const getFill = (threshold?: TrackThreshold) => threshold?.color || baseFill;
  const getTint = (segment: TrackSegment) => {
    const neutral = 'color-mix(in srgb, var(--color-ink) 12%, var(--color-paper))';
    if (segment.threshold?.color) return `color-mix(in srgb, ${segment.threshold.color} 28%, ${neutral})`;
    if (segment.level === 0) return neutral;
    return `color-mix(in srgb, var(--color-accent) ${10 + Math.round((26 * segment.level) / Math.max(1, zoneCount))}%, ${neutral})`;
  };
  const getSegmentStyle = (segment: TrackSegment) => ({
    '--track-tint': getTint(segment),
    '--track-fill': getFill(segment.threshold),
  }) as CSSProperties;

  const commit = (next: number) => {
    const target = clampTrackValue(next, min, max);
    if (!canEdit || target === value) return;
    const before = getTrackZone(trackThresholds, value, thresholdMode);
    const after = getTrackZone(trackThresholds, target, thresholdMode);
    updateWidgetData(widget.id, { currentValue: target });
    let description = `${value} → ${target} / ${max}`;
    let icon = '📍';
    if (after.level > before.level) {
      description += ` · entered ${getZoneName(after)}`;
      icon = '⚠️';
    } else if (after.level < before.level) {
      description += after.threshold ? ` · back to ${getZoneName(after)}` : ` · left ${getZoneName(before)}`;
      icon = '✅';
    }
    addTimelineEvent(label || 'Threshold track', 'THRESHOLD_TRACK', description, icon);
  };

  const valueAtPointer = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return value;
    return clampTrackValue(min + Math.round(((clientX - rect.left) / rect.width) * range), min, max);
  };

  const cancelGesture = () => {
    const pointerId = gestureRef.current;
    gestureRef.current = null;
    if (pointerId !== null && barRef.current?.hasPointerCapture(pointerId)) barRef.current.releasePointerCapture(pointerId);
    setPreview(null);
  };

  useTouchCameraPinchCancellation(cancelGesture);

  useEffect(() => {
    cancelGesture();
    window.addEventListener('blur', cancelGesture);
    return () => {
      gestureRef.current = null;
      window.removeEventListener('blur', cancelGesture);
    };
  }, [canEdit, value, min, max]);

  const startGesture = (event: PointerEvent<HTMLDivElement>) => {
    if (!canEdit || event.button !== 0 || !event.isPrimary || gestureRef.current !== null) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = event.pointerId;
    setPreview(valueAtPointer(event.clientX));
  };

  const moveGesture = (event: PointerEvent<HTMLDivElement>) => {
    if (gestureRef.current !== event.pointerId) return;
    event.preventDefault();
    setPreview(valueAtPointer(event.clientX));
  };

  const finishGesture = (event: PointerEvent<HTMLDivElement>) => {
    if (gestureRef.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const next = valueAtPointer(event.clientX);
    cancelGesture();
    commit(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      cancelGesture();
      return;
    }
    if (!canEdit || gestureRef.current !== null) return;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp': next = value + step; break;
      case 'ArrowLeft':
      case 'ArrowDown': next = value - step; break;
      case 'Home': next = min; break;
      case 'End': next = max; break;
      default: return;
    }
    event.preventDefault();
    event.stopPropagation();
    commit(next);
  };

  const cells = useMemo(() => {
    if (style !== 'steps') return [];
    return segments.flatMap((segment) => Array.from({ length: segment.end - segment.start }, (_, offset) => ({
      value: min + segment.start + offset + 1,
      segment,
      isZoneStart: offset === 0 && segment.start > 0,
    })));
  }, [segments, style, min]);

  const zoneStyle = { '--zone-color': getFill(zone.threshold) } as CSSProperties;
  const showZoneChip = zone.threshold !== undefined;
  const showLegend = trackShowZoneNames && zoneCount > 0;
  const accessibleLabel = label || 'Threshold track';

  return (
    <div className="threshold-track-widget flex h-full w-full flex-col gap-1.5 font-body">
      {(label || showZoneChip) && (
        <div className="widget-header flex-shrink-0">
          {label && (
            <div className="widget-header-title min-w-0 flex-1 truncate">
              <InlineFormulaText text={label} />
            </div>
          )}
          {showZoneChip && (
            <span className="threshold-track__zone-chip ml-auto" style={zoneStyle} title={`Current zone: ${getZoneName(zone)}`}>
              <span className="threshold-track__zone-name">{zone.threshold?.name?.trim() || `Zone ${zone.level}`}</span>
              {modifier !== 0 && <span className="threshold-track__zone-modifier">{formatTrackModifier(modifier)}</span>}
            </span>
          )}
        </div>
      )}

      <div className="threshold-track__main flex min-h-0 flex-1 items-center gap-2">
        <div className="threshold-track__body min-w-0 flex-1">
          {style === 'steps' ? (
            <div
              role="group"
              aria-label={`${accessibleLabel}: ${shown} of ${max}`}
              className="threshold-track__steps"
              style={{ gridTemplateColumns: `repeat(${range}, minmax(0, 1fr))` }}
              data-camera-pan-ignore={canEdit ? 'true' : undefined}
              data-touch-camera-ignore={canEdit ? 'true' : undefined}
            >
              {cells.map((cell) => {
                const filled = cell.value <= shown;
                const className = `threshold-track__cell ${filled ? 'threshold-track__cell--filled' : ''} ${cell.isZoneStart ? 'threshold-track__cell--zone-start' : ''}`;
                const cellStyle = getSegmentStyle(cell.segment);
                if (!canEdit) return <span key={cell.value} className={className} style={cellStyle} />;
                const stepsDown = cell.value === value;
                const target = stepsDown ? cell.value - 1 : cell.value;
                return (
                  <button
                    key={cell.value}
                    type="button"
                    className={className}
                    style={cellStyle}
                    aria-label={`Set ${accessibleLabel} to ${target}`}
                    aria-pressed={filled}
                    onMouseDown={stopPropagation}
                    onClick={(event) => {
                      event.stopPropagation();
                      commit(target);
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <Tooltip content={hasCurrentFormula ? 'Value set by formula' : 'Click or drag to set the value'}>
              <div
                ref={barRef}
                className={`threshold-track__bar ${canEdit ? 'threshold-track__bar--editable' : ''} ${preview !== null ? 'threshold-track__bar--scrubbing' : ''}`}
                role={canEdit ? 'slider' : 'progressbar'}
                tabIndex={canEdit ? 0 : undefined}
                aria-label={accessibleLabel}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={shown}
                aria-valuetext={`${shown} of ${max}${zone.threshold ? `, ${getZoneName(zone)}` : ''}`}
                data-camera-pan-ignore={canEdit ? 'true' : undefined}
                data-touch-camera-ignore={canEdit ? 'true' : undefined}
                onPointerDown={startGesture}
                onPointerMove={moveGesture}
                onPointerUp={finishGesture}
                onPointerCancel={cancelGesture}
                onLostPointerCapture={cancelGesture}
                onMouseDown={stopPropagation}
                onKeyDown={handleKeyDown}
              >
                {segments.map((segment) => {
                  const span = segment.end - segment.start;
                  const filled = Math.max(0, Math.min(span, shown - min - segment.start));
                  return (
                    <div
                      key={segment.start}
                      className="threshold-track__bar-zone"
                      style={{ ...getSegmentStyle(segment), left: `${(segment.start / range) * 100}%`, width: `${(span / range) * 100}%` }}
                    >
                      <div className="threshold-track__bar-zone-fill" style={{ width: `${(filled / span) * 100}%` }} />
                    </div>
                  );
                })}
              </div>
            </Tooltip>
          )}
          {showLegend && (
            <div className="threshold-track__legend" aria-hidden="true">
              {segments.map((segment) => (
                <span
                  key={segment.start}
                  className={`threshold-track__legend-item ${segment.level === zone.level ? 'threshold-track__legend-item--active' : ''}`}
                  style={{ flexGrow: segment.end - segment.start }}
                >
                  {segment.threshold?.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {showValues && (
          <span className="threshold-track__value" aria-hidden="true">
            {brokenFormula && <span className="mr-0.5 text-[9px] text-red-500" title={`Broken formula: ${brokenFormula}`}>⚠</span>}
            <strong>{shown}</strong>
            <span className="threshold-track__value-max">/{max}</span>
          </span>
        )}

        {showControls && (
          <div className="flex flex-shrink-0 gap-1">
            <Tooltip content={hasCurrentFormula ? 'Value set by formula' : `Decrease by ${step}`}>
              <button
                type="button"
                disabled={!canEdit || value <= min}
                aria-label={`Decrease ${accessibleLabel} by ${step}`}
                className="widget-control h-6 min-h-0 w-6 flex-shrink-0 text-xs font-bold"
                onMouseDown={stopPropagation}
                onClick={(event) => {
                  event.stopPropagation();
                  commit(value - step);
                }}
              >
                −
              </button>
            </Tooltip>
            <Tooltip content={hasCurrentFormula ? 'Value set by formula' : `Increase by ${step}`}>
              <button
                type="button"
                disabled={!canEdit || value >= max}
                aria-label={`Increase ${accessibleLabel} by ${step}`}
                className="widget-control h-6 min-h-0 w-6 flex-shrink-0 text-xs font-bold"
                onMouseDown={stopPropagation}
                onClick={(event) => {
                  event.stopPropagation();
                  commit(value + step);
                }}
              >
                +
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}
