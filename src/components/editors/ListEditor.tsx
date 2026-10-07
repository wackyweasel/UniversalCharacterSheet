import { useRef } from 'react';
import { usePointerReorder } from '../../hooks';
import { EditorProps } from './types';
import { CollapsibleSection } from './CollapsibleSection';
import { ItemColumnsControl } from './ItemColumnsControl';
import { Tooltip } from '../Tooltip';
import { GripVerticalIcon } from '../icons';

export function ListEditor({ widget, updateData }: EditorProps) {
  const { itemCount = 5, wrapText = true, items = [] } = widget.data;
  const slotCount = Number(itemCount) || 0;
  const slotIdsRef = useRef<string[]>([]);
  const nextSlotIdRef = useRef(0);
  // Stable per-slot ids (list items are plain strings and may repeat or be empty).
  while (slotIdsRef.current.length < slotCount) slotIdsRef.current.push(`list-slot-${nextSlotIdRef.current++}`);
  slotIdsRef.current.length = slotCount;
  const reorderableItems = slotIdsRef.current.map((id, index) => ({ id, text: (items[index] as string | undefined) || '' }));
  const { setRowRef, startDrag, handleReorderKey } = usePointerReorder({
    items: reorderableItems,
    onReorder: (reordered) => {
      slotIdsRef.current = reordered.map(({ id }) => id);
      updateData({ items: reordered.map(({ text }) => text) });
    },
  });

  return (
    <div className="widget-editor widget-editor--list space-y-4">

      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 id="list-behavior-title" className="widget-editor__section-title">List behavior</h3>
          <span className="widget-editor__section-count">{itemCount || 0}</span>
        </div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Number of item slots</label>
        <input
          type="number"
          min="1"
          max="50"
          className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={itemCount}
          onChange={(e) => updateData({ itemCount: e.target.value === '' ? '' : parseInt(e.target.value) || '' })}
          onBlur={(e) => updateData({ itemCount: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) })}
        />

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-medium text-theme-ink">
          <input
            type="checkbox"
            checked={wrapText}
            onChange={(e) => updateData({ wrapText: e.target.checked })}
            className="h-4 w-4 accent-theme-accent"
          />
          Wrap text
        </label>

        <div className="mt-3">
          <ItemColumnsControl id="list-item-columns" value={widget.data.itemColumns} onChange={(itemColumns) => updateData({ itemColumns })} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 id="list-items-title" className="widget-editor__section-title">Items</h3>
          <span className="widget-editor__section-count">{slotCount}</span>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {reorderableItems.map(({ id, text }, idx) => (
            <div
              key={id}
              ref={(element) => setRowRef(id, element)}
              className="pointer-sort-row flex items-center gap-2 rounded-button border border-theme-border bg-theme-accent/5 p-1 text-sm transition-colors"
            >
              <Tooltip content="Drag to reorder">
                <button
                  type="button"
                  className="flex h-10 w-10 flex-shrink-0 cursor-grab items-center justify-center rounded-button px-1 text-theme-muted select-none touch-none hover:text-theme-ink active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
                  onPointerDown={(event) => startDrag(id, event)}
                  onKeyDown={(event) => handleReorderKey(id, event)}
                  disabled={reorderableItems.length < 2}
                  aria-label={`Reorder ${text || `item ${idx + 1}`}`}
                  title="Drag to reorder. Arrow keys also work."
                >
                  <GripVerticalIcon className="h-4 w-4" />
                </button>
              </Tooltip>
              <span className={`min-w-0 flex-1 truncate ${text ? 'text-theme-ink' : 'text-theme-muted'}`}>
                {text || `Empty item ${idx + 1}`}
              </span>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
