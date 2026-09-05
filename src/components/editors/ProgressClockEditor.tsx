import { v4 as uuidv4 } from 'uuid';
import type { ProgressClockItem } from '../../types';
import { getClockSegments, getClockValue } from '../../utils/progressClock';
import { usePointerReorder } from '../../hooks';
import { GripVerticalIcon, PlusIcon, ResetIcon, TrashIcon } from '../icons';
import { Tooltip } from '../Tooltip';
import { CollapsibleSection } from './CollapsibleSection';
import { LabeledNumberField } from './LabeledNumberField';
import { useStore } from '../../store/useStore';
import { collectLabels, resolveProgressClockFormulas } from '../../utils/formulaEngine';
import type { EditorProps } from './types';

const inputClass = 'h-10 w-full min-w-0 px-2 text-sm border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent';

export function ProgressClockEditor({ widget, updateData }: EditorProps) {
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const character = characters.find((item) => item.id === activeCharacterId);
  const labels = character ? collectLabels(character) : {};
  const {
    label, clockItems = [], clockLayout = 'horizontal', clockSize = 100,
    clockShowValues = false, clockLabelPosition = 'below', clockCounterClockwise = false, clockStartAngle = 0,
  } = widget.data;
  const { setRowRef, startDrag, handleReorderKey } = usePointerReorder({
    items: clockItems,
    onReorder: (items) => updateData({ clockItems: items }),
  });
  const updateClock = (id: string, changes: Partial<ProgressClockItem>) => {
    updateData({ clockItems: clockItems.map((clock) => {
      if (clock.id !== id) return clock;
      const updated = { ...clock, ...changes };
      updated.segments = getClockSegments(updated.segments);
      updated.value = getClockValue(updated.value, updated.segments);
      return updated;
    }) });
  };

  return (
    <div className="widget-editor widget-editor--progress-clock space-y-4">
      <CollapsibleSection title="General">
        <label className="block text-sm font-medium text-theme-ink">
          Widget Label
          <input className={`${inputClass} mt-1`} value={label || ''} onChange={(event) => updateData({ label: event.target.value })} />
        </label>
      </CollapsibleSection>

      <CollapsibleSection title="Clocks" count={clockItems.length}>
        <div className="space-y-3">
          {clockItems.map((clock, index) => {
            const name = clock.name || `Clock ${index + 1}`;
            const resolvedClock = resolveProgressClockFormulas(clock, labels);
            return (
              <div key={clock.id} ref={(element) => setRowRef(clock.id, element)} className="pointer-sort-row space-y-2 border-b border-theme-border pb-3">
                <div className="flex items-center gap-2">
                  <Tooltip content="Reorder clock">
                    <button type="button" aria-label={`Reorder ${name}`} className="widget-control h-10 w-8 flex-shrink-0 touch-none cursor-grab" disabled={clockItems.length < 2} onPointerDown={(event) => startDrag(clock.id, event)} onKeyDown={(event) => handleReorderKey(clock.id, event)}>
                      <GripVerticalIcon className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <input aria-label={`Clock ${index + 1} label`} className={inputClass} value={clock.name} placeholder="Label (optional)" onChange={(event) => updateClock(clock.id, { name: event.target.value })} />
                  <Tooltip content="Delete clock">
                    <button type="button" aria-label={`Delete ${name}`} className="widget-control h-10 w-10 flex-shrink-0 text-red-500" onClick={() => updateData({ clockItems: clockItems.filter((item) => item.id !== clock.id) })}>
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  <div role="group" aria-label={`${name} segments`} className="min-w-0">
                    <LabeledNumberField
                      displayLabel="Segments"
                      value={resolvedClock.segments}
                      min={1}
                      step={1}
                      controlHeight="input"
                      hideStepperButtons
                      allowEmpty
                      onChange={(segments) => updateClock(clock.id, { segments })}
                      fieldLabel={clock.segmentsLabel}
                      onFieldLabelChange={(segmentsLabel) => updateClock(clock.id, { segmentsLabel })}
                      formula={clock.segmentsFormula}
                      onFormulaChange={(segmentsFormula) => updateClock(clock.id, { segmentsFormula })}
                    />
                  </div>
                  <div role="group" aria-label={`${name} filled segments`} className="min-w-0">
                    <LabeledNumberField
                      displayLabel="Filled"
                      value={resolvedClock.value}
                      min={0}
                      max={resolvedClock.segments}
                      step={1}
                      controlHeight="input"
                      hideStepperButtons
                      allowEmpty
                      onChange={(value) => updateClock(clock.id, { value, segments: resolvedClock.segments })}
                      fieldLabel={clock.valueLabel}
                      onFieldLabelChange={(valueLabel) => updateClock(clock.id, { valueLabel })}
                      formula={clock.valueFormula}
                      onFormulaChange={(valueFormula) => updateClock(clock.id, { valueFormula })}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="relative block h-8 w-8 flex-shrink-0 overflow-hidden rounded-button border border-theme-border bg-theme-accent" style={clock.fillColor ? { backgroundColor: clock.fillColor } : undefined}>
                    <input aria-label={`${name} fill color`} type="color" value={clock.fillColor || '#2563eb'} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={(event) => updateClock(clock.id, { fillColor: event.target.value })} />
                  </label>
                  <span className="text-sm text-theme-muted">{clock.fillColor ? clock.fillColor.toUpperCase() : 'Theme highlight'}</span>
                  {clock.fillColor && <Tooltip content="Use theme highlight">
                    <button type="button" aria-label={`Use theme highlight for ${name}`} className="widget-control h-8 w-8" onClick={() => updateClock(clock.id, { fillColor: undefined })}><ResetIcon className="h-4 w-4" /></button>
                  </Tooltip>}
                </div>
              </div>
            );
          })}
        </div>
        <button type="button" className="widget-control widget-control--primary mt-3 gap-2 px-3 py-2 text-sm" onClick={() => updateData({ clockItems: [...clockItems, { id: uuidv4(), name: '', segments: 6, value: 0 }] })}>
          <PlusIcon className="h-4 w-4" /> Add clock
        </button>
      </CollapsibleSection>

      <CollapsibleSection title="Appearance" className="progress-clock-editor__appearance">
        <div>
          <span className="mb-1 block text-sm font-medium text-theme-ink">Arrangement</span>
          <div role="group" aria-label="Clock arrangement" className="flex gap-1">
            {(['horizontal', 'vertical'] as const).map((layout) => <button key={layout} type="button" aria-pressed={clockLayout === layout} className={`widget-control flex-1 px-3 py-2 text-sm ${clockLayout === layout ? 'widget-control--primary' : ''}`} onClick={() => updateData({ clockLayout: layout })}>{layout === 'horizontal' ? 'Horizontal' : 'Vertical'}</button>)}
          </div>
        </div>
        <div className="grid gap-1">
          <label htmlFor={`clock-size-${widget.id}`} className="block text-sm text-theme-ink">Clock size: {clockSize}px</label>
          <input id={`clock-size-${widget.id}`} type="range" min={40} max={240} step={5} value={clockSize} onChange={(event) => updateData({ clockSize: Number(event.target.value) })} className="m-0 block h-4 w-full" style={{ accentColor: 'var(--color-accent)' }} />
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-theme-ink">Label position</span>
          <div role="group" aria-label="Label position" className="grid grid-cols-2 gap-1">
            {(['above', 'below'] as const).map((position) => (
              <button key={position} type="button" aria-pressed={clockLabelPosition === position} className={`widget-control min-w-0 px-3 py-2 text-sm ${clockLabelPosition === position ? 'widget-control--primary' : ''}`} onClick={() => updateData({ clockLabelPosition: position })}>
                {position === 'above' ? 'Above' : 'Below'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-theme-ink">Starting point</span>
          <div role="group" aria-label="Starting point" className="grid grid-cols-4 gap-1">
            {([{ angle: 0, name: 'Top' }, { angle: 90, name: 'Right' }, { angle: 180, name: 'Bottom' }, { angle: 270, name: 'Left' }] as const).map(({ angle, name }) => (
              <button key={angle} type="button" aria-pressed={clockStartAngle === angle} className={`widget-control min-w-0 px-1 py-2 text-xs sm:text-sm ${clockStartAngle === angle ? 'widget-control--primary' : ''}`} onClick={() => updateData({ clockStartAngle: angle })}>
                {name}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-theme-ink"><input type="checkbox" className="h-4 w-4 accent-theme-accent" checked={clockCounterClockwise} onChange={(event) => updateData({ clockCounterClockwise: event.target.checked })} />Fill counterclockwise</label>
        <label className="flex items-center gap-2 text-sm text-theme-ink"><input type="checkbox" className="h-4 w-4 accent-theme-accent" checked={clockShowValues} onChange={(event) => updateData({ clockShowValues: event.target.checked })} />Show filled / total</label>
      </CollapsibleSection>
    </div>
  );
}