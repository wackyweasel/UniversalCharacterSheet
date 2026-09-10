import { useLayoutEffect, useRef, useState } from 'react';
import { RollTableItem } from '../../types';
import { EditorProps } from './types';
import { TrashIcon } from '../icons';
import { CollapsibleSection } from './CollapsibleSection';
import { LabeledNumberField } from './LabeledNumberField';

export function RollTableEditor({ widget, updateData }: EditorProps) {
  const {
    rollTableItems = [{ text: '', weight: 1 }],
    showRollTableItems = true,
    rollTableAnimate = true,
    rollTableResultCount = 1,
    rollTableAllowRepeats = true,
  } = widget.data;
  const [resultCountDraft, setResultCountDraft] = useState<string | null>(null);
  const [draftItem, setDraftItem] = useState<RollTableItem>(() => {
    const existingDraft = rollTableItems.find((item) => !item.text.trim());
    return existingDraft ? { ...existingDraft } : { text: '', weight: 1 };
  });
  const itemTextRefs = useRef<Array<HTMLInputElement | null>>([]);
  const descriptionRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const committedItems = rollTableItems.filter((item) => item.text.trim());

  const resizeDescription = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    const styles = window.getComputedStyle(element);
    const lineHeight = Number.parseFloat(styles.lineHeight) || 16;
    const verticalPadding = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
    const maxHeight = lineHeight * 8 + verticalPadding;
    const contentHeight = Math.min(element.scrollHeight, maxHeight);

    element.style.height = `${contentHeight}px`;
    element.style.overflowY = element.scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  useLayoutEffect(() => {
    descriptionRefs.current.forEach((description) => {
      if (description) resizeDescription(description);
    });
  }, [rollTableItems, draftItem]);

  const updateItem = (index: number, updates: Partial<RollTableItem>) => {
    const newItems = [...committedItems];
    newItems[index] = { ...newItems[index], ...updates };
    updateData({ rollTableItems: newItems });
  };

  const updateDraftItem = (updates: Partial<RollTableItem>) => {
    setDraftItem((current) => ({ ...current, ...updates }));
  };

  const commitDraft = () => {
    if (!draftItem.text.trim()) return false;
    updateData({ rollTableItems: [...committedItems, draftItem] });
    setDraftItem({ text: '', weight: 1 });
    return true;
  };

  const focusItem = (index: number) => {
    window.setTimeout(() => itemTextRefs.current[index]?.focus(), 0);
  };

  const addItemAndFocus = () => {
    const nextIndex = committedItems.length + (draftItem.text.trim() ? 1 : 0);
    commitDraft();
    focusItem(nextIndex);
  };

  const commitResultCount = () => {
    const nextValue = Math.min(100, Math.max(1, Math.floor(Number(resultCountDraft) || 1)));
    updateData({ rollTableResultCount: nextValue });
    setResultCountDraft(null);
  };

  const removeItem = (index: number) => {
    if (committedItems.length <= 1) return;
    const newItems = committedItems.filter((_: RollTableItem, i: number) => i !== index);
    updateData({ rollTableItems: newItems });
  };

  const getTotalWeight = () => {
    return committedItems.reduce((sum: number, item: RollTableItem) => sum + (item.weight || 0), 0);
  };

  const getPercentage = (weight: number) => {
    const total = getTotalWeight();
    if (total === 0) return 0;
    return Math.round((weight / total) * 100);
  };

  const editorItems = [...committedItems, draftItem];

  return (
    <div className="widget-editor widget-editor--roll-table space-y-4">

      <CollapsibleSection className="widget-editor__option-group">
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
        {showRollTableItems && (
          <label className="mt-3 flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={rollTableAnimate}
              onChange={(e) => updateData({ rollTableAnimate: e.target.checked })}
              className="mt-0.5 h-4 w-4 flex-none accent-theme-accent"
            />
            <span className="min-w-0 text-xs text-theme-ink">
              <span className="block font-medium">Animate rolling through items</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-theme-muted">Highlight each item before showing the result.</span>
            </span>
          </label>
        )}
      </CollapsibleSection>

      <CollapsibleSection className="widget-editor__option-group">
        <h3 id={`roll-table-behavior-heading-${widget.id}`} className="widget-editor__section-title">Roll behavior</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3 text-xs text-theme-ink">
            <span>
              <span className="block font-medium">Results per roll</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-theme-muted">Choose how many options to draw at once.</span>
            </span>
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              inputMode="numeric"
              className="h-9 w-16 flex-none border border-theme-border rounded-button bg-theme-paper px-2 text-center text-sm text-theme-ink focus:outline-none focus:border-theme-accent"
              value={resultCountDraft ?? Math.min(100, Math.max(1, Math.floor(Number(rollTableResultCount) || 1)))}
              onChange={(e) => {
                const value = e.target.value;
                setResultCountDraft(value);
                if (value !== '') {
                  const nextValue = Math.floor(Number(value));
                  if (Number.isFinite(nextValue)) {
                    updateData({ rollTableResultCount: Math.min(100, Math.max(1, nextValue)) });
                  }
                }
              }}
              onBlur={commitResultCount}
              aria-label="Results per roll"
            />
          </label>
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={rollTableAllowRepeats}
              onChange={(e) => updateData({ rollTableAllowRepeats: e.target.checked })}
              className="mt-0.5 h-4 w-4 flex-none accent-theme-accent"
            />
            <span className="min-w-0 text-xs text-theme-ink">
              <span className="block font-medium">Allow repeated options</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-theme-muted">When unchecked, one option can only appear once per roll.</span>
            </span>
          </label>
        </div>
      </CollapsibleSection>

      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <div>
            <h3 id={`roll-table-items-heading-${widget.id}`} className="widget-editor__section-title">Table items</h3>
          </div>
          <span className="widget-editor__section-count">{committedItems.length}</span>
        </div>
        
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {editorItems.map((item: RollTableItem, idx: number) => {
            const isDraft = idx === committedItems.length;

            return (
            <div
              key={isDraft ? 'draft-item' : `item-${idx}`}
              className={`widget-editor__roll-table-item-row rounded-button border border-theme-border bg-theme-paper p-2 ${isDraft ? 'widget-editor__roll-table-item-row--draft' : ''}`}
              onBlur={(event) => {
                if (!isDraft) return;
                const nextTarget = event.relatedTarget;
                if (!nextTarget || !event.currentTarget.contains(nextTarget as Node)) {
                  commitDraft();
                }
              }}
            >
              <span className="widget-editor__roll-table-index" aria-hidden="true">{isDraft ? '+' : idx + 1}</span>
              <div className="widget-editor__roll-table-copy">
                <input
                  ref={(input) => { itemTextRefs.current[idx] = input; }}
                  className="widget-editor__roll-table-text h-9 px-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm focus:outline-none focus:border-theme-accent"
                  value={item.text}
                  onChange={(e) => {
                    if (isDraft) {
                      updateDraftItem({ text: e.target.value });
                    } else {
                      updateItem(idx, { text: e.target.value });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const nextIndex = isDraft
                        ? committedItems.length + (draftItem.text.trim() ? 1 : 0)
                        : committedItems.length;
                      if (isDraft) commitDraft();
                      focusItem(nextIndex);
                    }
                  }}
                  placeholder="Option title..."
                />
                <textarea
                  ref={(textarea) => { descriptionRefs.current[idx] = textarea; }}
                  className="widget-editor__roll-table-description h-9 min-h-9 resize-none px-2 py-1 border border-theme-border bg-theme-paper text-theme-ink text-xs focus:outline-none focus:border-theme-accent"
                  value={item.description || ''}
                  onChange={(e) => {
                    resizeDescription(e.currentTarget);
                    if (isDraft) {
                      updateDraftItem({ description: e.target.value });
                    } else {
                      updateItem(idx, { description: e.target.value });
                    }
                  }}
                  placeholder="Description (optional)..."
                  rows={1}
                />
                <div className="widget-editor__roll-table-meta">
                  <label className="widget-editor__roll-table-weight">
                    <span className="widget-editor__roll-table-weight-label">Weight</span>
                    <LabeledNumberField
                      value={item.weight}
                      onChange={(value) => {
                        const nextWeight = Math.max(0, value);
                        if (isDraft) {
                          updateDraftItem({ weight: nextWeight });
                        } else {
                          updateItem(idx, { weight: nextWeight });
                        }
                      }}
                      min={0}
                      step={1}
                      compact
                      controlHeight="row"
                      hideStepperButtons
                      fieldLabel={item.weightLabel}
                      onFieldLabelChange={(weightLabel) => {
                        if (isDraft) {
                          updateDraftItem({ weightLabel });
                        } else {
                          updateItem(idx, { weightLabel });
                        }
                      }}
                      formula={item.weightFormula}
                      onFormulaChange={(weightFormula) => {
                        if (isDraft) {
                          updateDraftItem({ weightFormula });
                        } else {
                          updateItem(idx, { weightFormula });
                        }
                      }}
                      className="widget-editor__roll-table-weight-control"
                    />
                  </label>
                  <span className="widget-editor__roll-table-percentage">
                    {isDraft ? 'New' : `${getPercentage(item.weight)}%`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                disabled={isDraft || committedItems.length <= 1}
                aria-label={isDraft ? 'Remove new option' : `Remove item ${idx + 1}`}
                title="Delete item"
                className="widget-editor__roll-table-delete flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-red-500 transition-colors hover:border-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
            );
          })}
        </div>

        <div className="widget-editor__add-row">
          <button
            type="button"
            onClick={addItemAndFocus}
            className="widget-control w-full px-3 py-2 text-sm"
          >
            + Add item
          </button>
        </div>
      </CollapsibleSection>
    </div>
  );
}
