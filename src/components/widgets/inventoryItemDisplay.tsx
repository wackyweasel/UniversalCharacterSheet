import type { InventoryItem, InventoryItemField } from '../../types';
import { getInventoryItemQuantity } from '../../utils/inventory';

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
