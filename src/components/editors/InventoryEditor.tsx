import { InventoryFieldTemplate, InventoryFieldType } from '../../types';
import { usePointerReorder } from '../../hooks';
import {
  coerceInventoryFieldValue,
  createInventoryFieldTemplate,
  DEFAULT_INVENTORY_ENCUMBRANCE,
  normalizeInventoryFieldType,
  setInventoryEncumbranceEnabled,
} from '../../utils/inventory';
import { GripVerticalIcon, PlusIcon, TrashIcon } from '../icons';
import { Tooltip } from '../Tooltip';
import { LabeledNumberField } from './LabeledNumberField';
import { EditorProps } from './types';

const FIELD_TYPES: { value: InventoryFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'checkbox', label: 'Checkbox' },
];

const inputClass = 'h-8 w-full rounded-button border border-theme-border bg-theme-paper px-2 text-xs text-theme-ink focus:border-theme-accent focus:outline-none';

export function InventoryEditor({ widget, updateData }: EditorProps) {
  const {
    label,
    inventoryItems = [],
    inventoryDefaultFields = [],
    fieldLabels = {},
    fieldFormulas = {},
  } = widget.data;
  const encumbrance = widget.data.inventoryEncumbrance || DEFAULT_INVENTORY_ENCUMBRANCE;
  const {
    setRowRef: setAttributeRowRef,
    startDrag: startAttributeDrag,
    handleReorderKey: handleAttributeReorderKey,
  } = usePointerReorder({
    items: inventoryDefaultFields,
    onReorder: (fields) => updateData({ inventoryDefaultFields: fields }),
  });

  const updateTemplate = (id: string, update: Partial<InventoryFieldTemplate>) => {
    updateData({
      inventoryDefaultFields: inventoryDefaultFields.map((field) => field.id === id
        ? { ...field, ...update, type: normalizeInventoryFieldType(update.type ?? field.type) }
        : field),
    });
  };

  const changeTemplateType = (field: InventoryFieldTemplate, type: InventoryFieldType) => {
    if (field.reserved) return;
    updateTemplate(field.id, {
      type,
      defaultValue: coerceInventoryFieldValue(field.defaultValue, type),
    });
  };

  const setEncumbranceEnabled = (enabled: boolean) => {
    const normalized = setInventoryEncumbranceEnabled(inventoryItems, inventoryDefaultFields, enabled);
    updateData({
      inventoryItems: normalized.items,
      inventoryDefaultFields: normalized.templates,
      inventoryEncumbrance: { ...encumbrance, enabled },
    });
  };

  const updateEncumbrance = (update: Partial<typeof encumbrance>) => {
    updateData({ inventoryEncumbrance: { ...encumbrance, ...update } });
  };

  const setFieldLabel = (field: string, labelName: string | undefined) => {
    const updated = { ...fieldLabels };
    if (labelName) updated[field] = labelName;
    else delete updated[field];
    updateData({
      fieldLabels: updated,
      ...(labelName && encumbrance[field as 'localCapacity' | 'globalCapacity'] === undefined
        ? { inventoryEncumbrance: { ...encumbrance, [field]: 0 } }
        : {}),
    });
  };

  const setFieldFormula = (field: string, formula: string | undefined) => {
    const updated = { ...fieldFormulas };
    if (formula) updated[field] = formula;
    else delete updated[field];
    updateData({ fieldFormulas: updated });
  };

  const renderDefaultValue = (field: InventoryFieldTemplate) => {
    if (field.type === 'checkbox') {
      return (
        <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-button border border-theme-border px-2 text-xs">
          <input
            type="checkbox"
            checked={Boolean(field.defaultValue)}
            onChange={(event) => updateTemplate(field.id, { defaultValue: event.target.checked })}
            className="h-4 w-4 accent-theme-accent"
          />
          Checked by default
        </label>
      );
    }
    return (
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        step={field.type === 'number' ? 'any' : undefined}
        value={String(field.defaultValue)}
        onChange={(event) => updateTemplate(field.id, {
          defaultValue: field.type === 'number'
            ? (event.target.value === '' ? '' : Number(event.target.value))
            : event.target.value,
        })}
        placeholder="Default value"
        className={inputClass}
      />
    );
  };

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2">
        <label className="text-xs font-medium text-theme-ink">Container name</label>
        <input
          value={label || ''}
          onChange={(event) => updateData({ label: event.target.value })}
          placeholder="Backpack"
          className={inputClass}
        />
      </section>

      <section>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-semibold text-theme-ink">New item attributes</h4>
            <p className="mt-0.5 text-[11px] leading-4 text-theme-muted">
              Added to every new item and customizable on each item.
            </p>
          </div>
          <button
            type="button"
            onClick={() => updateData({
              inventoryDefaultFields: [...inventoryDefaultFields, createInventoryFieldTemplate('New attribute', 'text')],
            })}
            className="widget-control flex items-center gap-1 px-2 py-1 text-[11px]"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add attribute
          </button>
        </div>

        <div className="mt-1.5 border-y border-theme-border">
          {inventoryDefaultFields.length === 0 && (
            <div className="px-3 py-3 text-center text-xs text-theme-muted">
              No default attributes
            </div>
          )}
          {inventoryDefaultFields.map((field) => (
            <div
              key={field.id}
              ref={(element) => {
                setAttributeRowRef(field.id, element);
              }}
              data-inventory-attribute-row="true"
              data-inventory-attribute-id={field.id}
              className="inventory-field-row inventory-field-row--defaults grid items-center gap-1.5 py-1.5"
            >
                <button
                  type="button"
                  onPointerDown={(event) => startAttributeDrag(field.id, event)}
                  onKeyDown={(event) => handleAttributeReorderKey(field.id, event)}
                  disabled={inventoryDefaultFields.length < 2}
                  aria-label={`Reorder ${field.name}`}
                  title="Drag to reorder. Arrow keys also work."
                  className="inventory-attribute-drag-handle flex h-8 w-6 touch-none items-center justify-center rounded-button text-theme-muted hover:text-theme-ink disabled:cursor-default disabled:opacity-30"
                >
                  <GripVerticalIcon className="h-3.5 w-3.5" />
                </button>
                <input
                  value={field.name}
                  disabled={Boolean(field.reserved)}
                  onChange={(event) => updateTemplate(field.id, { name: event.target.value })}
                  aria-label="Default attribute name"
                  className={`${inputClass} inventory-field-row__name`}
                />
                <select
                  value={normalizeInventoryFieldType(field.type)}
                  disabled={Boolean(field.reserved)}
                  onChange={(event) => changeTemplateType(field, event.target.value as InventoryFieldType)}
                  aria-label="Default attribute type"
                  className={`${inputClass} inventory-field-row__type`}
                >
                  {FIELD_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
                <div className="inventory-field-row__value min-w-0">
                  {renderDefaultValue(field)}
                </div>
                <Tooltip content={field.reserved ? 'Weight is required for encumbrance' : 'Remove default attribute'}>
                  <button
                    type="button"
                    disabled={Boolean(field.reserved)}
                    onClick={() => updateData({ inventoryDefaultFields: inventoryDefaultFields.filter((entry) => entry.id !== field.id) })}
                    className="inventory-field-row__delete widget-control h-7 w-7 text-red-500"
                    aria-label={`Remove ${field.name}`}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
            </div>
          ))}
        </div>
      </section>

      <section>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={encumbrance.enabled}
            onChange={(event) => setEncumbranceEnabled(event.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 accent-theme-accent"
          />
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-theme-ink">Calculate encumbrance</span>
            <span className="mt-0.5 block text-[11px] leading-4 text-theme-muted">
              Track item weight against container and global limits.
            </span>
          </span>
        </label>

        {encumbrance.enabled && (
          <div className="mt-3 space-y-3">
            <div className="space-y-2">
              <div>
                <h5 className="text-xs font-semibold text-theme-ink">Container load</h5>
                <p className="mt-0.5 text-[11px] leading-4 text-theme-muted">
                  Set an optional limit and the unit used for item weight.
                </p>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_82px] gap-2">
                <LabeledNumberField
                  value={encumbrance.localCapacity}
                  onChange={(value) => updateEncumbrance({ localCapacity: Math.max(0, value) })}
                  onClear={() => updateEncumbrance({ localCapacity: undefined })}
                  fieldLabel={fieldLabels.localCapacity}
                  onFieldLabelChange={(labelName) => setFieldLabel('localCapacity', labelName)}
                  formula={fieldFormulas.localCapacity}
                  onFormulaChange={(formula) => setFieldFormula('localCapacity', formula)}
                  min={0}
                  step={0.1}
                  placeholder="No limit"
                  hideStepperButtons
                  renderRow={({ controls }) => (
                    <div>
                      <span className="mb-0.5 block text-[11px] font-medium text-theme-ink">Capacity</span>
                      {controls}
                    </div>
                  )}
                />
                <label>
                  <span className="mb-0.5 block text-[11px] font-medium text-theme-ink">Unit</span>
                  <input
                    value={encumbrance.unit}
                    onChange={(event) => updateEncumbrance({ unit: event.target.value })}
                    placeholder="kg"
                    className={inputClass}
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-theme-border pt-3">
              <h5 className="text-xs font-semibold text-theme-ink">Global weight</h5>
              <p className="mt-0.5 text-[11px] leading-4 text-theme-muted">
                Control how this container contributes to and displays the character total.
              </p>

              <div className="mt-2 space-y-2">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={encumbrance.includeInGlobalLoad}
                    onChange={(event) => updateEncumbrance({ includeInGlobalLoad: event.target.checked })}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 accent-theme-accent"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-theme-ink">Include in global weight</span>
                    <span className="block text-[11px] leading-4 text-theme-muted">Count this container's items in the character total.</span>
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={encumbrance.showGlobalCounter}
                    onChange={(event) => updateEncumbrance({ showGlobalCounter: event.target.checked })}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 accent-theme-accent"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-theme-ink">Show global weight on widget</span>
                    <span className="block text-[11px] leading-4 text-theme-muted">Display the character total below this container's load.</span>
                  </span>
                </label>

                {encumbrance.showGlobalCounter && (
                  <LabeledNumberField
                    value={encumbrance.globalCapacity}
                    onChange={(value) => updateEncumbrance({ globalCapacity: Math.max(0, value) })}
                    onClear={() => updateEncumbrance({ globalCapacity: undefined })}
                    fieldLabel={fieldLabels.globalCapacity}
                    onFieldLabelChange={(labelName) => setFieldLabel('globalCapacity', labelName)}
                    formula={fieldFormulas.globalCapacity}
                    onFormulaChange={(formula) => setFieldFormula('globalCapacity', formula)}
                    min={0}
                    step={0.1}
                    placeholder="No limit"
                    hideStepperButtons
                    className="pl-6"
                    renderRow={({ controls }) => (
                      <div className="grid gap-1 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center sm:gap-2">
                        <span className="text-[11px] font-medium text-theme-ink">Global capacity</span>
                        {controls}
                      </div>
                    )}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
