import type { InventoryItem, InventoryItemField, Widget } from '../../types';
import { useState } from 'react';
import { getInventoryItemQuantity } from '../../utils/inventory';
import { useStore } from '../../store/useStore';
import { getItemEffectProblems } from '../../utils/itemEffects';

export function ItemActivation({ item, widget, canInteract }: { item: InventoryItem; widget: Widget; canInteract: boolean }) {
  const activate = useStore((state) => state.setInventoryItemActive);
  const character = useStore((state) => state.characters.find((entry) => entry.id === state.activeCharacterId));
  const editing = useStore((state) => state.editingWidgetId !== null);
  const [activationError, setActivationError] = useState<string | null>(null);
  if (!item.effects?.length) return null;
  const problems = character ? getItemEffectProblems(character, item) : [];
  const interactive = canInteract && !widget.locked && !editing;
  const switchClass = `relative h-4 w-7 flex-shrink-0 rounded-full border border-theme-border transition-colors ${
    item.active ? 'bg-theme-accent' : 'bg-theme-background'
  }`;
  const thumb = <span aria-hidden="true" className={`absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-black/25 bg-theme-paper shadow-sm transition-transform ${
    item.active ? 'translate-x-3.5' : 'translate-x-0.5'
  }`} />;
  return (
    <span
      title={activationError || (problems.length ? problems.join(' ') : 'Apply this item\'s effects')}
      data-touch-camera-ignore="true"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex flex-shrink-0 items-center gap-0.5 text-[10px] font-body font-normal"
    >
      {interactive ? <button type="button" role="switch" aria-label={`Activate ${item.name}`} aria-checked={item.active === true}
        disabled={!item.active && problems.length > 0}
        onClick={() => {
          try {
            activate(widget.id, item.id, !item.active);
            setActivationError(null);
          } catch (error) {
            console.error('Could not change item activation', error);
            setActivationError(error instanceof Error ? error.message : 'Could not change item activation.');
          }
        }}
        className={`${switchClass} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {thumb}
      </button> : <span role="img" aria-label={`${item.name}: ${item.active ? 'Active' : 'Inactive'}`} className={switchClass}>{thumb}</span>}
      {(problems.length > 0 || activationError) && <span aria-label="Effect problem" className="text-red-500">!</span>}
      {activationError && <span role="alert" className="text-red-500">{activationError}</span>}
    </span>
  );
}

export function formatFieldValue(item: InventoryItem, fieldIndex: number): string {
  const field = item.fields[fieldIndex];
  if (!field) return '';
  if (field.type === 'checkbox') return field.value ? 'Yes' : 'No';
  if (field.type === 'number') {
    const value = Number(field.value);
    const formattedValue = Number.isFinite(value)
      ? value.toLocaleString(undefined, { maximumFractionDigits: 3 })
      : '0';
    const quantity = getInventoryItemQuantity(item);
    if (field.reserved === 'weight' && quantity !== undefined && quantity !== 1) {
      const multipliedValue = Number.isFinite(value) ? value * quantity : 0;
      return `${formattedValue} (${multipliedValue.toLocaleString(undefined, { maximumFractionDigits: 3 })})`;
    }
    return formattedValue;
  }
  return String(field.value) || '-';
}

export function isInventoryFieldEmpty(field: InventoryItemField): boolean {
  return (field.type === 'text' || field.type === 'textarea' || field.type === 'number')
    && String(field.value).trim() === '';
}

function formatTimelineFieldValue(field: InventoryItemField): string {
  if (field.type === 'checkbox') return field.value ? 'Yes' : 'No';
  return String(field.value) || '-';
}

export function describeInventoryItemChange(previous: InventoryItem, next: InventoryItem): string | null {
  const changes: string[] = [];
  if (previous.name !== next.name) changes.push(`renamed to "${next.name}"`);

  const previousQuantity = getInventoryItemQuantity(previous);
  const nextQuantity = getInventoryItemQuantity(next);
  if (previousQuantity !== nextQuantity) {
    changes.push(`quantity ${previousQuantity ?? 'none'} → ${nextQuantity ?? 'none'}`);
  }

  next.fields.forEach((field) => {
    const previousField = previous.fields.find((entry) => entry.id === field.id);
    const fieldName = field.name || 'Field';
    if (!previousField) changes.push(`added ${fieldName}`);
    else if (previousField.value !== field.value) {
      changes.push(`${fieldName} ${formatTimelineFieldValue(previousField)} → ${formatTimelineFieldValue(field)}`);
    }
  });
  previous.fields
    .filter((field) => !next.fields.some((entry) => entry.id === field.id))
    .forEach((field) => changes.push(`removed ${field.name || 'Field'}`));

  if ((previous.description || '') !== (next.description || '')) changes.push('description updated');
  if (JSON.stringify(previous.effects ?? []) !== JSON.stringify(next.effects ?? [])) changes.push('effects updated');
  return changes.length > 0 ? `${previous.name}: ${changes.join(', ')}` : null;
}

export function LoadMeter({ value, capacity, unit, label }: { value: number; capacity?: number; unit: string; label: string }) {
  const hasCapacity = typeof capacity === 'number' && Number.isFinite(capacity) && capacity >= 0;
  const overloaded = hasCapacity && value > capacity;
  const percentage = hasCapacity && capacity > 0 ? Math.min(100, (value / capacity) * 100) : 0;
  const formattedValue = value.toLocaleString(undefined, { maximumFractionDigits: 3 });
  const formattedCapacity = hasCapacity
    ? capacity.toLocaleString(undefined, { maximumFractionDigits: 3 })
    : '';
  const overage = hasCapacity
    ? (value - capacity).toLocaleString(undefined, { maximumFractionDigits: 3 })
    : '';

  return (
    <div
      className={`inventory-load ${overloaded ? 'inventory-load--over' : ''}`}
      role={hasCapacity ? 'progressbar' : 'status'}
      aria-label={`${label}: ${value}${hasCapacity ? ` of ${capacity}` : ''} ${unit}`}
      aria-valuemin={hasCapacity ? 0 : undefined}
      aria-valuemax={hasCapacity ? capacity : undefined}
      aria-valuenow={hasCapacity ? value : undefined}
    >
      <div className="inventory-load__summary">
        <span className="inventory-load__label">{label}</span>
        <span className="inventory-load__value">
          <strong>{formattedValue}</strong>
          {hasCapacity && <span className="inventory-load__capacity"> / {formattedCapacity}</span>}
          <span className="inventory-load__unit"> {unit}</span>
        </span>
      </div>
      {overloaded && <div className="inventory-load__warning">Over by {overage} {unit}</div>}
      {hasCapacity && (
        <div className="inventory-load__track" aria-hidden="true">
          <div className="inventory-load__fill" style={{ width: `${percentage}%` }} />
          <span className="inventory-load__limit" />
        </div>
      )}
    </div>
  );
}

interface InventoryQuantityProps {
  item: InventoryItem;
  canInteract: boolean;
  onEdit: (item: InventoryItem) => void;
}

export function InventoryQuantity({ item, canInteract, onEdit }: InventoryQuantityProps) {
  const quantity = getInventoryItemQuantity(item);
  if (quantity === undefined) return null;

  const formattedQuantity = quantity.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (!canInteract) return <span> (x{formattedQuantity})</span>;

  return (
    <span className="whitespace-nowrap">(x<button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onEdit(item);
      }}
      onMouseDown={(event) => event.stopPropagation()}
      aria-label={`Edit quantity for ${item.name}`}
      title="Edit quantity"
      data-touch-camera-ignore="true"
      className="border-b border-dashed border-theme-muted font-bold text-theme-ink hover:border-theme-accent hover:text-theme-accent"
    >
      {formattedQuantity}
    </button>)</span>
  );
}
