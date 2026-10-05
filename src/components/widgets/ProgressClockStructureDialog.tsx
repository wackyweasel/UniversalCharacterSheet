import { useState } from 'react';
import { createPortal } from 'react-dom';
import { v4 as uuidv4 } from 'uuid';
import type { ProgressClockItem } from '../../types';
import { AddMultipleToggle, SelectionActions } from './StructureDialogControls';

interface Props {
  action: 'add' | 'remove';
  clocks: ProgressClockItem[];
  onAdd: (clock: ProgressClockItem) => void;
  onRemove: (ids: Set<string>) => void;
  onClose: () => void;
}

export function ProgressClockStructureDialog({ action, clocks, onAdd, onRemove, onClose }: Props) {
  const [name, setName] = useState('');
  const [segments, setSegments] = useState('6');
  const [addMultiple, setAddMultiple] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const count = Number(segments);
  const canSubmit = action === 'add' ? Number.isSafeInteger(count) && count > 0 : clocks.some((clock) => selected.has(clock.id));
  const title = action === 'add' ? 'Add clock' : 'Remove clocks';

  return createPortal(
    <div data-touch-camera-ignore="true" className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 font-body" onClick={onClose} onMouseDown={(event) => event.stopPropagation()} onTouchStart={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSubmit) return;
          if (action === 'remove') {
            onRemove(selected);
            onClose();
          } else {
            onAdd({ id: uuidv4(), name: name.trim(), segments: count, value: 0 });
            if (addMultiple) setName('');
            else onClose();
          }
        }}
      >
        <h3 className="font-heading text-base font-bold">{title}</h3>
        {action === 'add' ? <>
          <label className="mt-3 block text-sm">
            Label (optional)
            <input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-button border border-theme-border bg-theme-paper px-3 text-theme-ink" />
          </label>
          <label className="mt-3 block text-sm">
            Segments
            <input type="number" min={1} step={1} required value={segments} onChange={(event) => setSegments(event.target.value)} className="mt-1 h-10 w-full rounded-button border border-theme-border bg-theme-paper px-3 text-theme-ink" />
          </label>
          <AddMultipleToggle checked={addMultiple} onChange={setAddMultiple} label="Add multiple clocks" />
        </> : <>
          <SelectionActions onCheckAll={() => setSelected(new Set(clocks.map((clock) => clock.id)))} onUncheckAll={() => setSelected(new Set())} />
          <div className="mt-3 max-h-64 space-y-1 overflow-y-auto overscroll-contain">
            {clocks.map((clock, index) => <label key={clock.id} className="flex items-center gap-3 border-b border-theme-border px-1 py-2 text-sm">
              <input type="checkbox" className="h-4 w-4 flex-shrink-0 accent-theme-accent" checked={selected.has(clock.id)} onChange={(event) => setSelected((current) => {
                const next = new Set(current);
                if (event.target.checked) next.add(clock.id);
                else next.delete(clock.id);
                return next;
              })} />
              <span className="min-w-0 flex-1 break-words">{clock.name || `Clock ${index + 1}`}</span>
              <span className="flex-shrink-0 text-theme-muted tabular-nums">{clock.value}/{clock.segments}</span>
            </label>)}
          </div>
        </>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" autoFocus={action === 'remove'} onClick={onClose} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
          <button type="submit" disabled={!canSubmit} className={action === 'add' ? 'widget-control widget-control--primary px-3 py-1.5 text-sm' : 'rounded-button bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-600 disabled:opacity-40'}>{action === 'add' ? 'Add clock' : `Remove${selected.size ? ` (${selected.size})` : ''}`}</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}