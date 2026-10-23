import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AutoStackPosition, WidgetAutoStackOptions } from '../types';
import type { AutoStackMeasurement } from '../hooks/autoStackMeasure';
import {
  createAutoStackPlan,
  initialBlockOptions,
  finalizePlacements,
  type AutoStackPlacement,
  type BlockOptions,
  type MeasuredBlock,
} from '../utils/autoStackPlan';
import {
  AUTO_STACK_ASPECTS,
  AUTO_STACK_DEFAULT_SHRINK,
  AUTO_STACK_MAX_GAP,
  AUTO_STACK_MAX_SHRINK,
  AUTO_STACK_MIN_SHRINK,
  AUTO_STACK_POSITIONS,
  AUTO_STACK_PRIORITIES,
  DEFAULT_AUTO_STACK_SETTINGS,
  getPositionAnchor,
  loadAutoStackSettings,
  normalizeAutoStackSettings,
  normalizeWidgetAutoStack,
  saveAutoStackSettings,
  type AutoStackPriorityId,
  type AutoStackSettings,
} from '../utils/autoStackSettings';
import { getWidgetTypeLabel } from '../utils/widgetMetadata';
import { WIDGET_GRID_SIZE } from '../utils/widgetGeometry';
import AutoStackPreview from './AutoStackPreview';
import { RowsIcon, XIcon } from './icons';

interface Props {
  measure: () => Promise<AutoStackMeasurement | null>;
  onApply: (measurement: AutoStackMeasurement, settings: AutoStackSettings, options: BlockOptions) => void;
  onClose: () => void;
}

interface Preview {
  placements: AutoStackPlacement[];
  width: number;
  height: number;
  targetAspect: number;
}

const sectionTitle = 'font-heading text-sm font-bold text-theme-ink';
const hint = 'text-xs leading-5 text-theme-muted';
const chip = (active: boolean) => `widget-control min-h-8 px-2.5 text-xs font-semibold ${active ? '!bg-theme-accent !border-theme-accent !text-theme-paper' : ''}`;

function blockLabel(block: MeasuredBlock) {
  const names = block.members.map(({ widget }) => widget.data.label?.trim() || getWidgetTypeLabel(widget.type));
  if (!block.group) return names[0];
  const shown = names.slice(0, 2).join(', ');
  return `Group: ${shown}${names.length > 2 ? ` +${names.length - 2}` : ''}`;
}

function summarize(options: WidgetAutoStackOptions) {
  const parts: string[] = [];
  if (options.fixedSize) parts.push('Fixed size');
  const anchor = getPositionAnchor(options.position);
  if (anchor) parts.push(anchor.label);
  if (options.allowScroll) parts.push(`Smaller ${Math.round((options.maxShrink ?? AUTO_STACK_DEFAULT_SHRINK) * 100)}%`);
  if (options.allowWhitespace) parts.push('White space');
  return parts;
}

function PositionPicker({ value, onChange }: { value: AutoStackPosition | undefined; onChange: (position: AutoStackPosition | undefined) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div role="group" aria-label="Preferred position in the stack" className="grid grid-cols-3 gap-1">
        {AUTO_STACK_POSITIONS.map((position) => {
          const active = value === position.id;
          return (
            <button
              key={position.id}
              type="button"
              aria-label={position.label}
              aria-pressed={active}
              title={active ? `${position.label} (click to clear)` : position.label}
              onClick={() => onChange(active ? undefined : position.id)}
              className={`h-6 w-6 rounded-sm border transition-colors ${active ? 'border-theme-accent bg-theme-accent' : 'border-theme-border/60 bg-theme-paper hover:bg-theme-accent/30'}`}
            />
          );
        })}
      </div>
      <span className={hint}>
        {getPositionAnchor(value)?.label ?? 'Anywhere'}
        <br />
        {value ? 'Click it again to let the layout decide.' : 'Pick a spot to pin it.'}
      </span>
    </div>
  );
}

interface RowProps {
  block: MeasuredBlock;
  options: WidgetAutoStackOptions;
  expanded: boolean;
  onToggle: () => void;
  onChange: (options: WidgetAutoStackOptions) => void;
}

function WidgetRow({ block, options, expanded, onToggle, onChange }: RowProps) {
  const forcedFixed = !block.resizable;
  const fixed = forcedFixed || options.fixedSize === true;
  const update = (patch: WidgetAutoStackOptions) => onChange({ ...options, ...patch });
  const badges = summarize(options);
  const shrinkPercent = Math.round((options.maxShrink ?? AUTO_STACK_DEFAULT_SHRINK) * 100);
  const check = 'flex cursor-pointer items-start gap-2 text-xs text-theme-ink';
  return (
    <li className={`rounded-theme border ${expanded ? 'border-theme-accent' : 'border-theme-border/50'} bg-theme-paper`} data-auto-stack-block={block.id}>
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full items-center gap-2 px-2.5 py-2 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-theme-ink">{blockLabel(block)}</span>
          <span className="block truncate text-[11px] text-theme-muted">
            {block.group ? `${block.members.length} attached widgets` : getWidgetTypeLabel(block.members[0].widget.type)}
            {block.members[0].widget.locked && !block.group ? ' · locked' : ''}
          </span>
        </span>
        {badges.length > 0 && (
          <span className="flex max-w-[55%] flex-wrap justify-end gap-1">
            {badges.map((badge) => (
              <span key={badge} className="rounded-full bg-theme-accent/20 px-2 py-0.5 text-[10px] font-semibold text-theme-ink">{badge}</span>
            ))}
          </span>
        )}
      </button>
      {expanded && (
        <div className="space-y-3 border-t border-theme-border/40 px-3 py-3">
          <label className={check}>
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-theme-accent"
              checked={fixed}
              disabled={forcedFixed}
              onChange={(event) => update({ fixedSize: event.target.checked })}
            />
            <span>
              <span className="font-semibold">Keep its current size</span>
              <span className={`block ${hint}`}>
                {forcedFixed
                  ? block.group ? 'Attached widgets move together and keep their sizes.' : 'Locked widgets keep their size.'
                  : 'Auto Stack only moves it.'}
              </span>
            </span>
          </label>
          <label className={`${check} ${fixed ? 'opacity-50' : ''}`}>
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-theme-accent"
              checked={!fixed && options.allowScroll === true}
              disabled={fixed}
              onChange={(event) => update({ allowScroll: event.target.checked })}
            />
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{block.keepAspect ? 'Allow it to be smaller' : 'Allow it to be smaller, with a scrollbar'}</span>
              <span className={`block ${hint}`}>
                {block.keepAspect ? 'The picture is scaled down to fit tighter spots.' : 'Its content may no longer fit, so it scrolls.'}
              </span>
              {!fixed && options.allowScroll && (
                <span className="mt-1 flex items-center gap-2">
                  <input
                    type="range"
                    aria-label="Maximum shrink"
                    min={Math.round(AUTO_STACK_MIN_SHRINK * 100)}
                    max={Math.round(AUTO_STACK_MAX_SHRINK * 100)}
                    step={5}
                    value={shrinkPercent}
                    onChange={(event) => update({ maxShrink: Number(event.target.value) / 100 })}
                    className="h-1 min-w-0 flex-1 accent-theme-accent"
                  />
                  <span className="w-20 shrink-0 text-right text-[11px] tabular-nums text-theme-muted">up to {shrinkPercent}% smaller</span>
                </span>
              )}
            </span>
          </label>
          <label className={`${check} ${fixed || block.keepAspect ? 'opacity-50' : ''}`}>
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-theme-accent"
              checked={!fixed && (block.keepAspect || options.allowWhitespace === true)}
              disabled={fixed || block.keepAspect}
              onChange={(event) => update({ allowWhitespace: event.target.checked })}
            />
            <span>
              <span className="font-semibold">Allow white space around it</span>
              <span className={`block ${hint}`}>
                {block.keepAspect ? 'Pictures keep their proportions and are never stretched.' : 'It keeps its natural size instead of stretching to fill spare room.'}
              </span>
            </span>
          </label>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-theme-ink">Preferred position in the stack</p>
            <PositionPicker value={options.position} onChange={(position) => update({ position })} />
          </div>
        </div>
      )}
    </li>
  );
}

export default function AutoStackDialog({ measure, onApply, onClose }: Props) {
  const [measurement, setMeasurement] = useState<AutoStackMeasurement | null>(null);
  const [settings, setSettings] = useState<AutoStackSettings>(loadAutoStackSettings);
  const [options, setOptions] = useState<BlockOptions>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const pressStartedOnBackdrop = useRef(false);
  const aliveRef = useRef(true);
  const startedRef = useRef(false);
  const measureRef = useRef(measure);
  const onCloseRef = useRef(onClose);
  measureRef.current = measure;
  onCloseRef.current = onClose;

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void measureRef.current().then((result) => {
      if (!aliveRef.current) return;
      if (!result) {
        onCloseRef.current();
        return;
      }
      setOptions(Object.fromEntries(result.blocks.map((block) => [block.id, initialBlockOptions(block)])));
      setMeasurement(result);
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!measurement) return;
    const handle = window.setTimeout(() => {
      try {
        const plan = createAutoStackPlan(measurement.blocks, settings, measurement.screenAspect, options);
        const packed = finalizePlacements(plan.blocks, plan.result, settings.gap);
        setPreview({
          placements: packed.placements,
          width: packed.width,
          height: packed.height,
          targetAspect: plan.targetAspect,
        });
        setPreviewFailed(false);
      } catch {
        setPreviewFailed(true);
      }
    }, 120);
    return () => window.clearTimeout(handle);
  }, [measurement, settings, options]);

  const labels = useMemo(() => {
    const map = new Map<string, string>();
    for (const block of measurement?.blocks ?? []) {
      for (const { widget } of block.members) map.set(widget.id, widget.data.label?.trim() || getWidgetTypeLabel(widget.type));
    }
    return map;
  }, [measurement]);

  const fixedBlockIds = useMemo(() => new Set(
    (measurement?.blocks ?? []).filter((block) => !block.resizable || options[block.id]?.fixedSize).map((block) => block.id),
  ), [measurement, options]);

  const updateSettings = useCallback((patch: Partial<AutoStackSettings>) => {
    setSettings((current) => normalizeAutoStackSettings({ ...current, ...patch }));
  }, []);
  const updatePriority = useCallback((id: AutoStackPriorityId, value: number) => {
    setSettings((current) => normalizeAutoStackSettings({ ...current, priorities: { ...current.priorities, [id]: value } }));
  }, []);

  const customAspectInput = (key: 'customWidth' | 'customHeight', label: string) => (
    <input
      type="number"
      min={0.1}
      step={0.1}
      aria-label={label}
      value={settings[key]}
      onChange={(event) => {
        const value = Number(event.target.value);
        if (Number.isFinite(value) && value > 0) updateSettings({ [key]: value });
      }}
      className="h-8 w-16 rounded-button border border-theme-border bg-theme-paper px-2 text-center text-sm text-theme-ink"
    />
  );

  const customizedCount = Object.values(options).filter((value) => normalizeWidgetAutoStack(value)).length;
  const resetAll = () => {
    setSettings({ ...DEFAULT_AUTO_STACK_SETTINGS });
    setOptions(Object.fromEntries((measurement?.blocks ?? []).map((block) => [block.id, {}])));
  };
  const apply = () => {
    if (!measurement) return;
    saveAutoStackSettings(settings);
    onApply(measurement, settings, options);
  };
  const widgetCount = measurement?.blocks.reduce((sum, block) => sum + block.members.length, 0) ?? 0;

  return createPortal(
    <div
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-3 animate-fade-in"
      onMouseDown={(event) => { pressStartedOnBackdrop.current = event.target === event.currentTarget; }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pressStartedOnBackdrop.current) onClose();
      }}
      onWheel={(event) => event.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auto-stack-title"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper shadow-theme animate-modal-in"
      >
        <div className="flex items-center justify-between border-b border-theme-border px-4 py-2.5">
          <h2 id="auto-stack-title" className="flex items-center gap-2 font-heading text-base font-bold text-theme-ink">
            <RowsIcon className="h-4 w-4" />
            Auto Stack
          </h2>
          <button type="button" onClick={onClose} aria-label="Close Auto Stack" className="widget-control h-7 w-7">
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        {!measurement ? (
          <div className="flex min-h-[220px] items-center justify-center p-8 font-body text-sm text-theme-muted" role="status" aria-live="polite">
            Measuring widgets…
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:overflow-hidden">
            <div className="flex min-h-0 flex-col gap-3">
              <div className="space-y-4 md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-1">
              <section className="space-y-2">
                <h3 className={sectionTitle}>Preferred shape</h3>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Preferred aspect ratio">
                  {AUTO_STACK_ASPECTS.map((aspect) => (
                    <button
                      key={aspect.id}
                      type="button"
                      aria-pressed={settings.aspect === aspect.id}
                      onClick={() => updateSettings({ aspect: aspect.id })}
                      className={chip(settings.aspect === aspect.id)}
                    >
                      {aspect.label}
                    </button>
                  ))}
                </div>
                {settings.aspect === 'custom' && (
                  <div className="flex items-center gap-2 text-sm text-theme-ink">
                    {customAspectInput('customWidth', 'Aspect ratio width')}
                    <span aria-hidden>:</span>
                    {customAspectInput('customHeight', 'Aspect ratio height')}
                    <span className={hint}>width : height</span>
                  </div>
                )}
                {settings.aspect === 'screen' && <p className={hint}>Matches the visible canvas, so the whole stack fits your screen.</p>}
              </section>

              <section className="space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <h3 className={sectionTitle}>Priorities</h3>
                  <button
                    type="button"
                    className="text-xs font-semibold text-theme-accent hover:underline disabled:opacity-40 disabled:no-underline"
                    disabled={AUTO_STACK_PRIORITIES.every(({ id }) => settings.priorities[id] === DEFAULT_AUTO_STACK_SETTINGS.priorities[id])}
                    onClick={() => updateSettings({ priorities: { ...DEFAULT_AUTO_STACK_SETTINGS.priorities } })}
                  >
                    Reset
                  </button>
                </div>
                {AUTO_STACK_PRIORITIES.map((priority) => {
                  const value = settings.priorities[priority.id];
                  return (
                    <div key={priority.id} className="space-y-0.5">
                      <div className="flex items-baseline justify-between">
                        <label htmlFor={`auto-stack-priority-${priority.id}`} className="text-xs font-semibold text-theme-ink">{priority.label}</label>
                        <span className="text-xs tabular-nums text-theme-muted">{value === 0 ? 'Ignore' : value}</span>
                      </div>
                      <input
                        id={`auto-stack-priority-${priority.id}`}
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={value}
                        aria-describedby={`auto-stack-priority-${priority.id}-hint`}
                        onChange={(event) => updatePriority(priority.id, Number(event.target.value))}
                        className="h-2 w-full accent-theme-accent"
                      />
                      <p id={`auto-stack-priority-${priority.id}-hint`} className={hint}>{priority.hint}</p>
                    </div>
                  );
                })}
              </section>

              <section className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h3 className={sectionTitle}><label htmlFor="auto-stack-gap">Gap between widgets</label></h3>
                  <span className="text-xs tabular-nums text-theme-muted">{settings.gap === 0 ? 'None (touching)' : `${settings.gap} px`}</span>
                </div>
                <input
                  id="auto-stack-gap"
                  type="range"
                  min={0}
                  max={AUTO_STACK_MAX_GAP}
                  step={WIDGET_GRID_SIZE}
                  value={settings.gap}
                  onChange={(event) => updateSettings({ gap: Number(event.target.value) })}
                  className="h-2 w-full accent-theme-accent"
                />
                <label className={`flex items-start gap-2 text-xs text-theme-ink ${settings.gap > 0 ? 'opacity-50' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-theme-accent"
                    checked={settings.autoAttach && settings.gap === 0}
                    disabled={settings.gap > 0}
                    onChange={(event) => updateSettings({ autoAttach: event.target.checked })}
                  />
                  <span>
                    <span className="font-semibold">Attach widgets that touch</span>
                    <span className={`block ${hint}`}>
                      {settings.gap > 0 ? 'Set the gap to none so that widgets touch.' : 'Widgets sharing an edge are attached, so they move together.'}
                    </span>
                  </span>
                </label>
              </section>
              </div>

              <section className="flex shrink-0 flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <h3 className={sectionTitle}>Preview</h3>
                  {preview && (
                    <span className="text-xs tabular-nums text-theme-muted">
                      {preview.width} × {preview.height} px · {(preview.width / preview.height).toFixed(2)}:1 (aim {preview.targetAspect.toFixed(2)}:1)
                    </span>
                  )}
                </div>
                <div className="h-[clamp(8rem,28vh,18rem)] rounded-theme border border-theme-border/50 bg-theme-background p-2" data-testid="auto-stack-preview">
                  {preview && !previewFailed ? (
                    <AutoStackPreview
                      placements={preview.placements}
                      width={preview.width}
                      height={preview.height}
                      labels={labels}
                      selectedBlockId={expandedId}
                      fixedBlockIds={fixedBlockIds}
                      onSelect={(blockId) => setExpandedId(blockId)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-theme-muted">
                      {previewFailed ? 'The preview is unavailable.' : 'Arranging…'}
                    </div>
                  )}
                </div>
                <p className={hint}>Click a box to edit that widget. Final result may differ slightly.</p>
              </section>
            </div>

            <section className="flex min-h-0 flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <h3 className={sectionTitle}>Widgets</h3>
                <span className="text-xs text-theme-muted">{widgetCount} widgets{customizedCount > 0 ? ` · ${customizedCount} customised` : ''}</span>
              </div>
              <ul className="min-h-0 flex-1 space-y-1.5 md:overflow-y-auto md:pr-1" aria-label="Widget options">
                {measurement.blocks.map((block) => (
                  <WidgetRow
                    key={block.id}
                    block={block}
                    options={options[block.id] ?? {}}
                    expanded={expandedId === block.id}
                    onToggle={() => setExpandedId(expandedId === block.id ? null : block.id)}
                    onChange={(next) => setOptions((current) => ({ ...current, [block.id]: next }))}
                  />
                ))}
              </ul>
            </section>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-theme-border px-4 py-3">
          <p className={`${hint} max-w-md`}>Your current layout is replaced. You can undo it afterwards.</p>
          <div className="flex gap-2">
            <button type="button" onClick={resetAll} disabled={!measurement} className="rounded-button px-3 py-1.5 font-body text-sm text-theme-ink transition-colors hover:bg-theme-accent/20 disabled:opacity-40">
              Reset
            </button>
            <button type="button" onClick={onClose} className="rounded-button px-3 py-1.5 font-body text-sm text-theme-ink transition-colors hover:bg-theme-accent/20">
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!measurement || previewFailed}
              className="rounded-button bg-theme-accent px-3 py-1.5 font-body text-sm text-theme-paper transition-colors hover:bg-theme-accent-hover disabled:opacity-40"
            >
              Auto Stack
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
