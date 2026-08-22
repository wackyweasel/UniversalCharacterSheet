import { useState } from 'react';
import { EditorProps } from './types';
import { Tooltip } from '../Tooltip';
import { TrashIcon } from '../icons';

interface RollTableItem {
  text: string;
  weight: number;
}

export function RollTableEditor({ widget, updateData }: EditorProps) {
  const { label, rollTableItems = [{ text: '', weight: 1 }], showRollTableItems = true } = widget.data;
  const [weightDrafts, setWeightDrafts] = useState<Record<number, string>>({});

  const updateItem = (index: number, field: 'text' | 'weight', value: string | number) => {
    const newItems = [...rollTableItems];
    if (field === 'text') {
      newItems[index] = { ...newItems[index], text: value as string };
    } else {
      const numValue = Math.max(0, Number(value) || 0);
      newItems[index] = { ...newItems[index], weight: numValue };
    }
    updateData({ rollTableItems: newItems });
  };

  const addItem = () => {
    const newItems = [...rollTableItems, { text: '', weight: 1 }];
    updateData({ rollTableItems: newItems });
  };

  const updateWeight = (index: number, value: string) => {
    setWeightDrafts((current) => ({ ...current, [index]: value }));
    updateItem(index, 'weight', value);
  };

  const commitWeight = (index: number) => {
    setWeightDrafts((current) => {
      if (!(index in current)) return current;
      const next = { ...current };
      delete next[index];
      return next;
    });
  };

  const removeItem = (index: number) => {
    if (rollTableItems.length <= 1) return;
    const newItems = rollTableItems.filter((_: RollTableItem, i: number) => i !== index);
    updateData({ rollTableItems: newItems });
  };

  const getTotalWeight = () => {
    return rollTableItems.reduce((sum: number, item: RollTableItem) => sum + (item.weight || 0), 0);
  };

  const getPercentage = (weight: number) => {
    const total = getTotalWeight();
    if (total === 0) return 0;
    return Math.round((weight / total) * 100);
  };

  return (
    <div className="widget-editor widget-editor--roll-table space-y-4">
      <section className="widget-editor__section">
        <label className="block text-xs font-semibold text-theme-ink">
          Widget label
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Roll Table Title"
          />
          {label && (
            <Tooltip content="Clear label">
              <button
                type="button"
                onClick={() => updateData({ label: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-ink transition-colors"
              >
                ×
              </button>
            </Tooltip>
          )}
        </div>
        </label>
      </section>

      <section className="widget-editor__option-group" aria-labelledby={`roll-table-display-heading-${widget.id}`}>
        <h3 id={`roll-table-display-heading-${widget.id}`} className="widget-editor__section-title">Display</h3>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={showRollTableItems}
            onChange={(e) => updateData({ showRollTableItems: e.target.checked })}
            className="mt-0.5 h-4 w-4 flex-none accent-theme-accent"
          />
          <span className="min-w-0 text-xs text-theme-ink">
            <span className="block font-medium">Show items in widget</span>
            <span className="mt-0.5 block text-[11px] leading-4 text-theme-muted">When unchecked, only the roll button and result will be visible.</span>
          </span>
        </label>
      </section>

      <section className="widget-editor__section" aria-labelledby={`roll-table-items-heading-${widget.id}`}>
        <div className="widget-editor__section-heading">
          <div>
            <h3 id={`roll-table-items-heading-${widget.id}`} className="widget-editor__section-title">Table items</h3>
            <p className="widget-editor__hint mt-2 text-[11px] leading-4 text-theme-muted">
              Add items with weights. Higher weights = higher probability.
            </p>
          </div>
          <span className="widget-editor__section-count">{rollTableItems.length}</span>
        </div>
        
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {rollTableItems.map((item: RollTableItem, idx: number) => (
            <div key={idx} className="flex items-center gap-2 rounded-button border border-theme-border bg-theme-paper p-2">
              <span className="text-xs text-theme-muted w-6">{idx + 1}.</span>
              <input
                className="h-10 flex-1 px-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm focus:outline-none focus:border-theme-accent"
                value={item.text}
                onChange={(e) => updateItem(idx, 'text', e.target.value)}
                placeholder="Item text..."
              />
              <div className="flex items-center gap-1">
                <label className="text-xs text-theme-muted">Weight:</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  className="roll-table-weight-input h-10 w-16 px-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm text-center focus:outline-none focus:border-theme-accent"
                  value={weightDrafts[idx] ?? item.weight}
                  onChange={(e) => updateWeight(idx, e.target.value)}
                  onBlur={() => commitWeight(idx)}
                />
              </div>
              <span className="text-xs text-theme-muted w-10 text-right">
                {getPercentage(item.weight)}%
              </span>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                disabled={rollTableItems.length <= 1}
                aria-label={`Remove item ${idx + 1}`}
                title="Delete item"
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-red-500 transition-colors hover:border-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="widget-editor__add-row">
          <button
            type="button"
            onClick={addItem}
            className="widget-control w-full px-3 py-2 text-sm"
          >
            + Add item
          </button>
        </div>
      </section>

      <div className="widget-editor__hint text-xs text-theme-muted">
        <strong>How it works:</strong> When you roll, each item's probability is calculated as 
        (item weight / total weight). For example, if you have items with weights 1, 2, and 3, 
        they have ~17%, ~33%, and ~50% chance respectively.
      </div>
    </div>
  );
}

