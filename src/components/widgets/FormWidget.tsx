import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Widget, FormItem } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { Tooltip } from '../Tooltip';
import { WidgetEmptyState } from './WidgetPrimitives';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  showFieldControls?: boolean;
}

export default function FormWidget({ widget, height, showFieldControls = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const mode = useStore((state) => state.mode);
  const isPrintMode = mode === 'print';
  const { label, formItems = [], labelWidth = 33 } = widget.data;
  const controlsVisible = showFieldControls && !isPrintMode;
  const [fieldDialog, setFieldDialog] = useState<'add' | 'remove' | null>(null);
  const [fieldNameDraft, setFieldNameDraft] = useState('');
  const [selectedFields, setSelectedFields] = useState<Set<number>>(new Set());

  // Fixed small sizing
  const labelClass = 'text-xs';
  const itemClass = 'text-xs';
  const gapClass = 'gap-1';
  
  // Calculate items area height
  const labelHeight = controlsVisible ? 24 : label ? 16 : 0;
  const gapSize = 4;
  const padding = 0;
  const itemsHeight = Math.max(30, height - labelHeight - gapSize - padding * 2);

  // Track previous values for timeline on blur
  const prevFormValues = useRef<Record<number, string>>({});

  const handleValueChange = (index: number, value: string) => {
    const updated = [...formItems] as FormItem[];
    if (!(index in prevFormValues.current)) {
      prevFormValues.current[index] = updated[index].value;
    }
    updated[index] = { ...updated[index], value };
    updateWidgetData(widget.id, { formItems: updated });
  };

  const handleValueBlur = (index: number) => {
    const item = (formItems as FormItem[])[index];
    const prevVal = prevFormValues.current[index];
    if (prevVal !== undefined && prevVal !== item.value) {
      addTimelineEvent(label || 'Form', 'FORM', `${item.name} changed`, '📝');
    }
    delete prevFormValues.current[index];
  };

  const addField = () => {
    const fieldName = fieldNameDraft.trim();
    if (!fieldName) return;
    updateWidgetData(widget.id, {
      formItems: [...formItems, { name: fieldName, value: '' }],
    });
    setFieldNameDraft('');
    setFieldDialog(null);
  };

  const removeSelectedFields = () => {
    if (selectedFields.size === 0) return;
    const updated = (formItems as FormItem[]).filter((_, index) => !selectedFields.has(index));
    prevFormValues.current = {};
    updateWidgetData(widget.id, { formItems: updated });
    setSelectedFields(new Set());
    setFieldDialog(null);
  };

  const openAddFieldDialog = () => {
    setFieldNameDraft('');
    setFieldDialog('add');
  };

  const openRemoveFieldDialog = () => {
    if (formItems.length === 0) return;
    setSelectedFields(new Set());
    setFieldDialog('remove');
  };

  const closeFieldDialog = () => {
    setFieldDialog(null);
    setFieldNameDraft('');
    setSelectedFields(new Set());
  };

  const toggleFieldSelection = (index: number) => {
    setSelectedFields((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  useEffect(() => {
    if (!fieldDialog) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFieldDialog();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fieldDialog]);

  return (
    <div className={`form-widget flex flex-col ${gapClass} w-full h-full`}>
      {(label || controlsVisible) && (
        <div className={`form-widget__header flex min-h-6 flex-shrink-0 items-center gap-2 ${controlsVisible ? 'pr-4' : ''}`}>
          {label && (
            <div className={`form-widget__label min-w-0 flex-1 truncate font-bold ${labelClass} text-theme-ink font-heading`}>
              {label}
            </div>
          )}
          {controlsVisible && (
            <div className="form-widget__controls ml-auto flex flex-shrink-0 items-center gap-1">
              <Tooltip content={formItems.length > 0 ? 'Choose fields to remove' : 'No fields to remove'}>
                <button
                  type="button"
                  onClick={openRemoveFieldDialog}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={formItems.length === 0}
                  aria-label="Choose fields to remove"
                  className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold"
                >
                  −
                </button>
              </Tooltip>
              <Tooltip content="Add field">
                <button
                  type="button"
                  onClick={openAddFieldDialog}
                  onMouseDown={(e) => e.stopPropagation()}
                  aria-label="Add field"
                  className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold"
                >
                  +
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      )}

      {/* Form Items */}
      <div 
        className={`flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden flex-1 pr-1`}
        style={{ maxHeight: `${itemsHeight}px` }}
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight > el.clientHeight) {
            e.stopPropagation();
          }
        }}
      >
        {(formItems as FormItem[]).map((item, idx) => (
          <div key={idx} className={`flex items-center ${gapClass}`}>
            {/* Item Name */}
            <span 
              className={`${itemClass} text-theme-ink font-body truncate flex-shrink-0`}
              style={{ width: `${labelWidth}%` }}
            >
              {mode === 'play' && item.tooltip ? (
                <Tooltip content={item.tooltip}><span>{item.name}</span></Tooltip>
              ) : item.name}
            </span>

            {/* Value Input */}
            <input
              type="text"
              value={item.value}
              onChange={(e) => handleValueChange(idx, e.target.value)}
              onBlur={() => handleValueBlur(idx)}
              onMouseDown={(e) => e.stopPropagation()}
              className={`flex-1 ${itemClass} px-1 py-0.5 border-b border-theme-border focus:border-theme-accent focus:outline-none bg-transparent text-theme-ink font-body min-w-0`}
              placeholder={isPrintMode ? '' : '...'}
            />
          </div>
        ))}
        {formItems.length === 0 && (
          <WidgetEmptyState title="No fields yet" hint={controlsVisible ? 'Use + to add a field.' : undefined} compact />
        )}
      </div>

      {fieldDialog && createPortal(
        <div
          data-touch-camera-ignore="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
          onClick={closeFieldDialog}
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`form-field-dialog-title-${widget.id}`}
            className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`form-field-dialog-title-${widget.id}`} className="font-heading text-base font-bold">
              {fieldDialog === 'add' ? 'Add field' : 'Remove fields'}
            </h3>

            {fieldDialog === 'add' ? (
              <form
                className="mt-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  addField();
                }}
              >
                <label htmlFor={`form-field-name-${widget.id}`} className="block text-sm font-medium">
                  Field name
                </label>
                <input
                  id={`form-field-name-${widget.id}`}
                  autoFocus
                  type="text"
                  value={fieldNameDraft}
                  onChange={(event) => setFieldNameDraft(event.target.value)}
                  placeholder="e.g. Background"
                  className="mt-1 w-full rounded-button border border-theme-border bg-theme-paper px-3 py-2 text-sm text-theme-ink focus:border-theme-accent focus:outline-none"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={closeFieldDialog} className="widget-control px-3 py-1.5 text-sm">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!fieldNameDraft.trim()}
                    className="widget-control widget-control--primary px-3 py-1.5 text-sm"
                  >
                    Add field
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-theme-muted">Select one or more fields to remove.</p>
                <div className="mt-2 max-h-64 space-y-1 overflow-y-auto overscroll-contain pr-1">
                  {(formItems as FormItem[]).map((item, index) => (
                    <label
                      key={`${item.name}-${index}`}
                      className="flex cursor-pointer items-center gap-3 rounded-button border border-theme-border px-3 py-2 text-sm transition-colors hover:bg-theme-accent hover:text-theme-paper"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.has(index)}
                        onChange={() => toggleFieldSelection(index)}
                        className="h-4 w-4 flex-shrink-0 accent-theme-accent"
                      />
                      <span className="min-w-0 flex-1 truncate">{item.name || `Field ${index + 1}`}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" autoFocus onClick={closeFieldDialog} className="widget-control px-3 py-1.5 text-sm">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={removeSelectedFields}
                    disabled={selectedFields.size === 0}
                    className="min-h-8 rounded-button border border-red-700 bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove{selectedFields.size > 0 ? ` (${selectedFields.size})` : ''}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}






