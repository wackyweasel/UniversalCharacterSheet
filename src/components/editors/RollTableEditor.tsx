import { EditorProps } from './types';

interface RollTableItem {
  text: string;
  weight: number;
}

export function RollTableEditor({ widget, updateData }: EditorProps) {
  const { label, rollTableItems = [{ text: '', weight: 1 }], showRollTableItems = true } = widget.data;

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
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Roll Table Title"
          />
          {label && (
            <button
              type="button"
              onClick={() => updateData({ label: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-ink transition-colors"
              title="Clear label"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showRollTableItems}
            onChange={(e) => updateData({ showRollTableItems: e.target.checked })}
            className="w-4 h-4 rounded border-theme-border text-theme-accent focus:ring-theme-accent"
          />
          <span className="text-sm text-theme-ink">Show items in widget</span>
        </label>
        <p className="text-xs text-theme-muted mt-1 mb-4">When unchecked, only the roll button and result will be visible</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Table Items</label>
        <p className="text-xs text-theme-muted mb-2">
          Add items with weights. Higher weights = higher probability. All weights are normalized when rolling.
        </p>
        
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {rollTableItems.map((item: RollTableItem, idx: number) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-theme-background rounded-button">
              <span className="text-xs text-theme-muted w-6">{idx + 1}.</span>
              <input
                className="flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm focus:outline-none focus:border-theme-accent"
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
                  className="w-16 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm text-center focus:outline-none focus:border-theme-accent"
                  value={item.weight}
                  onChange={(e) => updateItem(idx, 'weight', e.target.value)}
                />
              </div>
              <span className="text-xs text-theme-muted w-10 text-right">
                {getPercentage(item.weight)}%
              </span>
              <button
                onClick={() => removeItem(idx)}
                disabled={rollTableItems.length <= 1}
                className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed px-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addItem}
          className="mt-2 w-full px-3 py-2 text-sm border border-dashed border-theme-border rounded-button text-theme-muted hover:text-theme-ink hover:border-theme-accent transition-colors"
        >
          + Add Item
        </button>
      </div>

      <div className="text-xs text-theme-muted bg-theme-background p-2 rounded-button">
        <strong>How it works:</strong> When you roll, each item's probability is calculated as 
        (item weight / total weight). For example, if you have items with weights 1, 2, and 3, 
        they have ~17%, ~33%, and ~50% chance respectively.
      </div>
    </div>
  );
}

