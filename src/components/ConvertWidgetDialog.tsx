import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Widget, WidgetType } from '../types';
import { useStore } from '../store/useStore';
import { buildReferenceIndex, getLabelReferences } from '../utils/characterVariables';
import {
  convertWidgetData,
  getConversionChoice,
  getConversionTargets,
  getEventWarnings,
  getRestButtonWarnings,
} from '../utils/widgetConversion';
import { WIDGET_GRID_SIZE } from '../utils/widgetGeometry';
import { getWidgetTypeLabel } from '../utils/widgetMetadata';
import { ArrowRightIcon, XIcon } from './icons';
import { renderWidget } from './WidgetTooltipPreview';

const PREVIEW_MAX_HEIGHT = 280;
const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 120;
/** Overflow smaller than this is rounding noise, not content that needs more room. */
const MIN_OVERFLOW = 8;

const PREVIEW_BOX_CLASS = 'overflow-hidden rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink shadow-theme';

interface PreviewProps {
  title: string;
  widget: Widget;
}

function ScaledPreview({ title, widget }: PreviewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const width = widget.w || DEFAULT_WIDTH;
  const height = widget.h || DEFAULT_HEIGHT;
  const scale = frameWidth > 0 ? Math.min(1, frameWidth / width, PREVIEW_MAX_HEIGHT / height) : 1;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => setFrameWidth(frame.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="min-w-0 flex-1" aria-label={title}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-theme-muted">{title}</h3>
      <div
        ref={frameRef}
        className="flex min-h-[120px] items-start justify-center rounded-theme border border-theme-border bg-theme-background p-0"
      >
        <div style={{ width: `${width * scale}px`, height: `${height * scale}px` }}>
          <div
            className={`pointer-events-none ${PREVIEW_BOX_CLASS}`}
            style={{ width: `${width}px`, height: `${height}px`, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          >
            <div className="widget-content">{renderWidget(widget)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface ProbeProps {
  widget: Widget;
  onMeasure: (overflow: number) => void;
}

/** Renders the widget off screen at its own size and reports how much content spills past the bottom. */
function OverflowProbe({ widget, onMeasure }: ProbeProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        let overflow = box.scrollHeight - box.clientHeight;
        box.querySelectorAll<HTMLElement>('*').forEach((element) => {
          const spill = element.scrollHeight - element.clientHeight;
          if (Number.isFinite(spill)) overflow = Math.max(overflow, spill);
        });
        onMeasure(Math.max(0, Math.round(overflow)));
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [widget, onMeasure]);

  return (
    <div
      ref={boxRef}
      aria-hidden="true"
      className={`pointer-events-none fixed ${PREVIEW_BOX_CLASS}`}
      style={{ left: -10000, top: 0, visibility: 'hidden', width: `${widget.w || DEFAULT_WIDTH}px`, height: `${widget.h || DEFAULT_HEIGHT}px` }}
    >
      <div className="widget-content">{renderWidget(widget)}</div>
    </div>
  );
}

interface ResultBoxProps {
  title: string;
  items: string[];
  className: string;
  alert?: boolean;
}

function ResultBox({ title, items, className, alert }: ResultBoxProps) {
  return (
    <div className={`rounded-theme border px-3 py-2 text-sm text-theme-ink ${className}`} role={alert ? 'alert' : undefined}>
      <p className="mb-1 font-semibold">{title}</p>
      <ul className="list-disc space-y-0.5 pl-5 break-words">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

interface Props {
  widget: Widget;
  onClose: () => void;
}

export default function ConvertWidgetDialog({ widget, onClose }: Props) {
  const convertWidget = useStore((state) => state.convertWidget);
  const character = useStore((state) => state.characters.find((entry) => entry.id === state.activeCharacterId));
  const targets = useMemo(() => getConversionTargets(widget), [widget]);
  const [target, setTarget] = useState<WidgetType | undefined>(targets[0]);
  const [choice, setChoice] = useState(0);
  const [fitToContent, setFitToContent] = useState(false);
  const [overflow, setOverflow] = useState(0);

  const referenceIndex = useMemo(() => (character ? buildReferenceIndex(character) : null), [character]);
  const labelUsers = useCallback((label: string) => (
    referenceIndex
      ? getLabelReferences(referenceIndex, label, 'field').filter((reference) => reference.sourceId !== widget.id).map((reference) => reference.title)
      : []
  ), [referenceIndex, widget.id]);

  const choiceSpec = useMemo(() => (target ? getConversionChoice(widget, target) : null), [widget, target]);
  const conversion = useMemo(() => (
    target ? convertWidgetData(widget, target, { choice, labelUsers: referenceIndex ? labelUsers : undefined }) : null
  ), [widget, target, choice, labelUsers, referenceIndex]);
  const lost = useMemo(() => (
    conversion && target
      ? [
          ...conversion.warnings,
          ...getEventWarnings(widget, conversion, target, character),
          ...getRestButtonWarnings(widget, character),
        ]
      : []
  ), [conversion, target, widget, character]);

  const baseHeight = widget.h || DEFAULT_HEIGHT;
  const canFit = overflow > MIN_OVERFLOW;
  const fitHeight = Math.ceil((baseHeight + overflow) / WIDGET_GRID_SIZE) * WIDGET_GRID_SIZE;
  const appliedHeight = fitToContent && canFit ? fitHeight : undefined;

  const currentPreview = useMemo(() => ({ ...widget, id: 'convert-preview-current', locked: true }), [widget]);
  const convertedPreview = useMemo<Widget | null>(() => (
    target && conversion
      ? { ...widget, id: 'convert-preview-converted', type: target, data: conversion.data, locked: true, h: appliedHeight ?? widget.h }
      : null
  ), [widget, target, conversion, appliedHeight]);
  // The probe always measures at the widget's own height, so fitting never feeds back into the measurement.
  const probeWidget = useMemo<Widget | null>(() => (
    target && conversion ? { ...widget, id: 'convert-probe', type: target, data: conversion.data, locked: true } : null
  ), [widget, target, conversion]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleTargetChange = (type: WidgetType) => {
    setTarget(type);
    setChoice(0);
    setOverflow(0);
  };

  const handleConvert = () => {
    if (!target || !conversion) return;
    convertWidget(widget.id, target, { choice, height: appliedHeight });
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseUp={(event) => event.stopPropagation()}
      onMouseMove={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="convert-widget-title"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper font-body shadow-theme animate-modal-in"
      >
        <div className="flex items-center justify-between border-b border-theme-border px-4 py-3">
          <h2 id="convert-widget-title" className="font-heading text-lg font-bold text-theme-ink">
            Convert to other widget type
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-button text-theme-muted transition-colors hover:bg-theme-background hover:text-theme-ink"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <label className="block text-sm text-theme-ink">
            <span className="mb-1 block text-xs font-semibold text-theme-muted">Convert to</span>
            <select
              value={target ?? ''}
              onChange={(event) => handleTargetChange(event.target.value as WidgetType)}
              className="h-9 w-full rounded-button border border-theme-border bg-theme-paper px-2 text-sm text-theme-ink"
            >
              {targets.map((type) => (
                <option key={type} value={type}>{getWidgetTypeLabel(type)}</option>
              ))}
            </select>
          </label>

          {choiceSpec && (
            <label className="block text-sm text-theme-ink">
              <span className="mb-1 block text-xs font-semibold text-theme-muted">{choiceSpec.label}</span>
              <select
                value={choice}
                onChange={(event) => setChoice(Number(event.target.value))}
                className="h-9 w-full rounded-button border border-theme-border bg-theme-paper px-2 text-sm text-theme-ink"
              >
                {choiceSpec.options.map((option, index) => (
                  <option key={`${option}-${index}`} value={index}>{option}</option>
                ))}
              </select>
            </label>
          )}

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScaledPreview title={`Current: ${getWidgetTypeLabel(widget.type)}`} widget={currentPreview} />
            <ArrowRightIcon className="mx-auto h-5 w-5 flex-shrink-0 rotate-90 text-theme-muted sm:rotate-0" />
            {convertedPreview && target && (
              <ScaledPreview title={`After: ${getWidgetTypeLabel(target)}`} widget={convertedPreview} />
            )}
          </div>
          {probeWidget && <OverflowProbe widget={probeWidget} onMeasure={setOverflow} />}

          {canFit && (
            <label className="flex items-center gap-2 text-sm text-theme-ink">
              <input
                type="checkbox"
                checked={fitToContent}
                onChange={(event) => setFitToContent(event.target.checked)}
                className="h-4 w-4 accent-theme-accent"
              />
              Make the widget taller to fit its content ({baseHeight} → {fitHeight} px)
            </label>
          )}

          {conversion && (conversion.summary || conversion.carried.length > 0) && (
            <ResultBox
              title="Carried over"
              items={[...(conversion.summary ? [`${conversion.summary} converted`] : []), ...conversion.carried]}
              className="border-green-600/60 bg-green-600/10"
            />
          )}
          {lost.length > 0 && (
            <ResultBox
              title="Not carried over"
              items={lost}
              className="border-red-600/60 bg-red-600/10"
              alert
            />
          )}
          {conversion && conversion.notes.length > 0 && (
            <ResultBox
              title="Good to know"
              items={conversion.notes}
              className="border-amber-500/60 bg-amber-500/10"
            />
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-theme-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-button px-4 py-2 text-sm text-theme-muted transition-colors hover:bg-theme-border/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConvert}
            disabled={!conversion}
            className="rounded-button bg-theme-accent px-4 py-2 text-sm text-theme-paper transition-colors hover:bg-theme-accent/80 disabled:opacity-50"
          >
            Convert
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
