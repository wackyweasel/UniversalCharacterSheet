import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  InventoryFieldTemplate,
  InventoryFieldType,
  InventoryItem,
  InventoryItemField,
} from '../../types';
import {
  coerceInventoryFieldValue,
  createInventoryItem,
  createInventoryItemField,
  linkInventoryFieldsToTemplates,
  normalizeInventoryFieldType,
  normalizeInventoryQuantity,
} from '../../utils/inventory';
import { usePointerReorder } from '../../hooks';
import { GripVerticalIcon, PlusIcon, TrashIcon, XIcon } from '../icons';
import { Tooltip } from '../Tooltip';
import { VariableLabelControl } from '../VariableLabelControl';
import { AddMultipleToggle } from './StructureDialogControls';

interface InventoryItemDialogProps {
  item?: InventoryItem;
  defaultFields: InventoryFieldTemplate[];
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
  onDelete?: () => void;
}

const FIELD_TYPES: { value: Exclude<InventoryFieldType, 'textarea'>; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'checkbox', label: 'Checkbox' },
];

const inputClass = 'h-8 w-full rounded-button border border-theme-border bg-theme-paper px-2 text-xs text-theme-ink focus:border-theme-accent focus:outline-none';

export default function InventoryItemDialog({
  item,
  defaultFields,
  onClose,
  onSave,
  onDelete,
}: InventoryItemDialogProps) {
  const isEditing = Boolean(item);
  const [draft, setDraft] = useState<InventoryItem>(() => item
    ? { ...item, fields: linkInventoryFieldsToTemplates(item.fields, defaultFields) }
    : createInventoryItem('', defaultFields));
  const [addMultiple, setAddMultiple] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const defaultTemplateIds = new Set(defaultFields.map((field) => field.id));
  const defaultAttributeFields = defaultFields.flatMap((template) => {
    const field = draft.fields.find((entry) => entry.templateId === template.id);
    return field ? [field] : [];
  });
  const additionalAttributeFields = draft.fields.filter((field) => (
    !field.templateId || !defaultTemplateIds.has(field.templateId)
  ));
  const {
    setRowRef: setAttributeRowRef,
    startDrag: startAttributeDrag,
    handleReorderKey: handleAttributeReorderKey,
  } = usePointerReorder({
    items: additionalAttributeFields,
    onReorder: (fields) => setDraft((current) => ({
      ...current,
      fields: [
        ...defaultFields.flatMap((template) => {
          const field = current.fields.find((entry) => entry.templateId === template.id);
          return field ? [field] : [];
        }),
        ...fields,
      ],
    })),
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const updateField = (fieldId: string, update: Partial<InventoryItemField>) => {
    setDraft((current) => ({
      ...current,
      fields: current.fields.map((field) => field.id === fieldId ? { ...field, ...update } : field),
    }));
  };

  const changeFieldType = (field: InventoryItemField, type: InventoryFieldType) => {
    if (field.reserved) return;
    updateField(field.id, {
      type,
      value: coerceInventoryFieldValue(field.value, type),
      ...(type === 'text' ? { valueLabel: undefined } : {}),
    });
  };

  const addField = () => {
    setDraft((current) => ({
      ...current,
      fields: [...current.fields, createInventoryItemField('', 'text')],
    }));
  };

  const removeField = (fieldId: string) => {
    setDraft((current) => ({
      ...current,
      fields: current.fields.filter((field) => field.id !== fieldId || field.reserved),
    }));
  };

  const setQuantityEnabled = (enabled: boolean) => {
    setDraft((current) => ({
      ...current,
      quantity: enabled ? (normalizeInventoryQuantity(current.quantity) ?? 1) : undefined,
    }));
  };

  const setQuantity = (value: string) => {
    setDraft((current) => ({
      ...current,
      quantity: normalizeInventoryQuantity(value) ?? 0,
    }));
  };

  const renderFieldValue = (
    field: InventoryItemField,
    ariaLabel = 'Attribute value',
    placeholder?: string,
  ) => {
    if (field.type === 'checkbox') {
      return (
        <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-button border border-theme-border px-2 text-xs text-theme-ink">
          <input
            type="checkbox"
            checked={Boolean(field.value)}
            onChange={(event) => updateField(field.id, { value: event.target.checked })}
            aria-label={ariaLabel}
            className="h-4 w-4 accent-theme-accent"
          />
          Enabled
        </label>
      );
    }

    return (
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        step={field.type === 'number' ? 'any' : undefined}
        value={String(field.value)}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={(event) => updateField(field.id, {
          value: field.type === 'number'
            ? (event.target.value === '' ? '' : Number(event.target.value))
            : event.target.value,
        })}
        className={inputClass}
      />
    );
  };

  const renderLabeledFieldValue = (
    field: InventoryItemField,
    ariaLabel = 'Attribute value',
    placeholder?: string,
  ) => (
    <div className="flex min-w-0 items-start gap-1.5">
      <div className="min-w-0 flex-1">
        {renderFieldValue(field, ariaLabel, placeholder)}
      </div>
      {(field.type === 'number' || field.type === 'checkbox') && (
        <VariableLabelControl
          valueLabel={field.valueLabel}
          onValueLabelChange={(valueLabel) => updateField(field.id, { valueLabel })}
        />
      )}
    </div>
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    onSave({ ...draft, name });
    if (!isEditing && addMultiple) {
      setDraft(createInventoryItem('', defaultFields));
      setConfirmDelete(false);
      return;
    }
    onClose();
  };

  return createPortal(
    <div
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-2 animate-fade-in"
      onClick={onClose}
      onMouseDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-item-dialog-title"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink shadow-theme animate-modal-in"
      >
        <div className="flex items-center justify-between border-b border-theme-border px-3 py-2">
          <h2 id="inventory-item-dialog-title" className="font-heading text-base font-bold">
            {isEditing ? 'Edit item' : 'Add item'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close item dialog" className="widget-control h-7 w-7">
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
          <label className="block">
            <span className="mb-0.5 block text-xs font-semibold">Item name</span>
            <input
              autoFocus
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="What is this item?"
              className={inputClass}
            />
          </label>

          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={draft.quantity !== undefined}
                onChange={(event) => setQuantityEnabled(event.target.checked)}
                className="h-4 w-4 accent-theme-accent"
              />
              Track quantity
            </label>
            {draft.quantity !== undefined && (
              <label className="block max-w-32">
                <span className="mb-0.5 block text-xs font-medium">Quantity</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className={inputClass}
                />
              </label>
            )}
          </div>

          <section>
            <h3 className="font-heading text-xs font-bold">Default attributes</h3>
            <p className="mt-0.5 text-[11px] leading-4 text-theme-muted">
              Fill in the attributes configured for this inventory.
            </p>

            <div className="mt-1.5 space-y-1.5 border-y border-theme-border py-1.5">
              {defaultAttributeFields.length === 0 && (
                <p className="py-2 text-center text-xs text-theme-muted">No default attributes</p>
              )}
              {defaultAttributeFields.map((field) => (
                <div key={field.id} className="grid grid-cols-[minmax(88px,0.42fr)_minmax(0,1fr)] items-center gap-2">
                  <span className="min-w-0 break-words text-xs font-medium text-theme-ink [overflow-wrap:anywhere]">
                    {field.name}
                  </span>
                  <div className="min-w-0">
                    {renderLabeledFieldValue(field, `${field.name} value`)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-xs font-bold">Additional attributes</h3>
                <p className="mt-0.5 text-[11px] leading-4 text-theme-muted">
                  Add information needed only for this item.
                </p>
              </div>
              <button type="button" onClick={addField} className="widget-control flex items-center gap-1 px-2 py-1 text-[11px]">
                <PlusIcon className="h-3 w-3" />
                Add attribute
              </button>
            </div>

            <div className={`mt-1.5 ${additionalAttributeFields.length > 0 ? 'border-y border-theme-border' : ''}`}>
              {additionalAttributeFields.length === 0 && (
                <div className="rounded-button border border-dashed border-theme-border px-3 py-2 text-center text-xs text-theme-muted">
                  No additional attributes
                </div>
              )}
              {additionalAttributeFields.map((field) => (
                <div
                  key={field.id}
                  ref={(element) => setAttributeRowRef(field.id, element)}
                  data-inventory-attribute-row="true"
                  data-inventory-attribute-id={field.id}
                  className="inventory-field-row inventory-field-row--defaults grid items-center gap-1.5 py-1.5"
                >
                    <button
                      type="button"
                      onPointerDown={(event) => startAttributeDrag(field.id, event)}
                      onKeyDown={(event) => handleAttributeReorderKey(field.id, event)}
                      disabled={additionalAttributeFields.length < 2}
                      aria-label={`Reorder ${field.name || 'attribute'}`}
                      title="Drag to reorder. Arrow keys also work."
                      className="inventory-attribute-drag-handle flex h-8 w-6 touch-none items-center justify-center rounded-button text-theme-muted hover:text-theme-ink disabled:cursor-default disabled:opacity-30"
                    >
                      <GripVerticalIcon className="h-3.5 w-3.5" />
                    </button>
                    <input
                      aria-label="Attribute name"
                      required
                      value={field.name}
                      onChange={(event) => updateField(field.id, { name: event.target.value })}
                      placeholder="Attribute name"
                      className={`${inputClass} inventory-field-row__name`}
                    />
                    <select
                      aria-label="Attribute type"
                      value={normalizeInventoryFieldType(field.type)}
                      onChange={(event) => changeFieldType(field, event.target.value as InventoryFieldType)}
                      className={`${inputClass} inventory-field-row__type`}
                    >
                      {FIELD_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <div className="inventory-field-row__value min-w-0">
                      {renderLabeledFieldValue(field, `${field.name || 'Additional attribute'} value`, 'Value')}
                    </div>
                    <Tooltip content="Remove attribute">
                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        aria-label={`Remove ${field.name || 'attribute'}`}
                        className="inventory-field-row__delete widget-control h-7 w-7 text-red-500"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                </div>
              ))}
            </div>
          </section>

          {!isEditing && (
            <AddMultipleToggle checked={addMultiple} onChange={setAddMultiple} label="Keep adding items" />
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-theme-border px-3 py-2">
          <div>
            {isEditing && onDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-theme-muted">Delete this item?</span>
                  <button type="button" onClick={onDelete} className="rounded-button bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700">Delete</button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="widget-control px-2 py-1 text-xs">Keep</button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="widget-control flex items-center gap-1 px-2 py-1 text-xs text-red-500">
                  <TrashIcon className="h-3 w-3" />
                  Delete item
                </button>
              )
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="widget-control px-2.5 py-1 text-xs">Cancel</button>
            <button type="submit" disabled={!draft.name.trim()} className="widget-control widget-control--primary px-3 py-1 text-xs">
              {isEditing ? 'Save item' : 'Add item'}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}
