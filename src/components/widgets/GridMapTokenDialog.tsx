import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GridMapAttributeKind, GridMapToken, GridMapTokenAttribute, GridMapTokenSize } from '../../types';
import {
  ATTRIBUTE_PRESETS,
  CONDITION_PRESETS,
  CUSTOM_CONDITION_COLOR,
  HEX_TOKEN_CELLS,
  SQUARE_TOKEN_CELLS,
  TOKEN_SIZES,
  TOKEN_SIZE_NAMES,
  createAttribute,
  getBarFraction,
  normalizeAttributes,
  readTokenImage,
} from '../../utils/gridMapTokens';
import { CheckIcon, EyeIcon, MinusIcon, PlusIcon, TrashIcon, UploadIcon, XIcon } from '../icons';

export type GridMapTokenDraft = Pick<GridMapToken, 'name' | 'color' | 'size' | 'image' | 'showName' | 'attributes'>;

interface Props {
  mode: 'add' | 'edit';
  token: GridMapTokenDraft;
  gridType: 'square' | 'hex';
  onSave: (draft: GridMapTokenDraft) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

const KIND_LABELS: Record<GridMapAttributeKind, string> = {
  bar: 'Bar',
  number: 'Number',
  text: 'Text',
  condition: 'Condition',
};

const fieldClass = 'w-full rounded-button border border-theme-border bg-theme-paper px-2.5 py-1.5 text-sm text-theme-ink focus:border-theme-accent focus:outline-none';
const numberFieldClass = `${fieldClass} text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;
const sectionTitleClass = 'text-[11px] font-bold uppercase tracking-wide text-theme-muted';

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

function parseNumberInput(raw: string): number | undefined {
  if (raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

interface NumberInputProps {
  label: string;
  value: number | string | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
}

function NumberInput({ label, value, onChange, min }: NumberInputProps) {
  return (
    <input
      type="number"
      aria-label={label}
      min={min}
      value={value === undefined ? '' : String(value)}
      onChange={(event) => onChange(parseNumberInput(event.target.value))}
      onFocus={(event) => event.target.select()}
      className={numberFieldClass}
    />
  );
}

interface StepperProps {
  label: string;
  onStep: (delta: number) => void;
}

function Stepper({ label, onStep, children }: StepperProps & { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => onStep(-1)} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-theme-ink hover:bg-theme-background">
        <MinusIcon className="h-3.5 w-3.5" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
      <button type="button" aria-label={`Increase ${label}`} onClick={() => onStep(1)} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-theme-ink hover:bg-theme-background">
        <PlusIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface AttributeRowProps {
  attribute: GridMapTokenAttribute;
  onChange: (changes: Partial<GridMapTokenAttribute>) => void;
  onRemove: () => void;
}

function AttributeRow({ attribute, onChange, onRemove }: AttributeRowProps) {
  const color = attribute.color || '#475569';
  const label = attribute.name || KIND_LABELS[attribute.kind];

  return (
    <li className="rounded-theme border border-theme-border bg-theme-background/60 p-2" style={{ borderLeftColor: color, borderLeftWidth: 4 }}>
      <div className="flex items-center gap-1.5">
        <label className="relative h-8 w-8 flex-shrink-0 cursor-pointer overflow-hidden rounded-full border border-theme-border" style={{ backgroundColor: color }} title="Attribute color">
          <span className="sr-only">{label} color</span>
          <input type="color" value={color} onChange={(event) => onChange({ color: event.target.value })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </label>
        <input
          aria-label={`${KIND_LABELS[attribute.kind]} name`}
          value={attribute.name}
          maxLength={24}
          placeholder={attribute.kind === 'condition' ? 'Condition' : 'Name'}
          onChange={(event) => onChange({ name: event.target.value })}
          className={`${fieldClass} min-w-0 flex-1 font-semibold`}
        />
        <span className="hidden flex-shrink-0 rounded-full bg-theme-paper px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-theme-muted sm:inline">{KIND_LABELS[attribute.kind]}</span>
        <button
          type="button"
          aria-label={`${attribute.showOnToken ? 'Hide' : 'Show'} ${label} on token`}
          aria-pressed={attribute.showOnToken}
          title={attribute.showOnToken ? 'Shown on token' : 'Hidden on token'}
          onClick={() => onChange({ showOnToken: !attribute.showOnToken })}
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-button border transition-colors ${
            attribute.showOnToken ? 'border-theme-accent bg-theme-accent text-theme-paper' : 'border-theme-border text-theme-muted hover:bg-theme-paper'
          }`}
        >
          {attribute.showOnToken ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
        </button>
        <button type="button" aria-label={`Remove ${label}`} onClick={onRemove} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-button text-theme-muted hover:bg-red-500/15 hover:text-red-500">
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {attribute.kind === 'bar' && (
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-1.5">
              <Stepper label={label} onStep={(delta) => onChange({ value: Math.max(0, (Number(attribute.value) || 0) + delta) })}>
                <NumberInput label={`${label} current value`} value={attribute.value} min={0} onChange={(value) => onChange({ value })} />
              </Stepper>
              <span className="text-sm font-semibold text-theme-muted">/</span>
              <NumberInput label={`${label} maximum`} value={attribute.max} min={0} onChange={(max) => onChange({ max })} />
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-theme-border/60">
            <div className="h-full rounded-full transition-[width]" style={{ width: `${getBarFraction(attribute) * 100}%`, backgroundColor: color }} />
          </div>
        </div>
      )}

      {attribute.kind === 'number' && (
        <div className="mt-2">
          <Stepper label={label} onStep={(delta) => onChange({ value: (Number(attribute.value) || 0) + delta })}>
            <NumberInput label={`${label} value`} value={attribute.value} onChange={(value) => onChange({ value })} />
          </Stepper>
        </div>
      )}

      {attribute.kind === 'text' && (
        <input
          aria-label={`${label} text`}
          value={String(attribute.value ?? '')}
          maxLength={40}
          placeholder="Text"
          onChange={(event) => onChange({ value: event.target.value })}
          className={`${fieldClass} mt-2`}
        />
      )}
    </li>
  );
}

export function GridMapTokenDialog({ mode, token, gridType, onSave, onDelete, onCancel }: Props) {
  const [name, setName] = useState(token.name);
  const [color, setColor] = useState(token.color);
  const [size, setSize] = useState<GridMapTokenSize>(token.size || 'medium');
  const [image, setImage] = useState(token.image);
  const [showName, setShowName] = useState(token.showName !== false);
  const [attributes, setAttributes] = useState<GridMapTokenAttribute[]>(() => (token.attributes || []).map((attribute) => ({ ...attribute })));
  const [imageError, setImageError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameId = useRef(`grid-map-token-name-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const activeConditions = useMemo(
    () => new Set(attributes.filter((attribute) => attribute.kind === 'condition').map((attribute) => attribute.name.trim().toLowerCase())),
    [attributes],
  );
  const cells = gridType === 'hex' ? HEX_TOKEN_CELLS : SQUARE_TOKEN_CELLS;
  const trimmedName = name.trim();

  const updateAttribute = (id: string, changes: Partial<GridMapTokenAttribute>) => {
    setAttributes((current) => current.map((attribute) => attribute.id === id ? { ...attribute, ...changes } : attribute));
  };

  const toggleCondition = (condition: { name: string; color: string }) => {
    setAttributes((current) => {
      const key = condition.name.toLowerCase();
      if (current.some((attribute) => attribute.kind === 'condition' && attribute.name.trim().toLowerCase() === key)) {
        return current.filter((attribute) => !(attribute.kind === 'condition' && attribute.name.trim().toLowerCase() === key));
      }
      return [...current, createAttribute({ kind: 'condition', name: condition.name, color: condition.color })];
    });
  };

  const handleImagePicked = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setImage(await readTokenImage(file));
      setImageError(null);
    } catch {
      setImageError('That image could not be loaded.');
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!trimmedName) return;
    onSave({
      name: trimmedName,
      color,
      size,
      image,
      showName,
      attributes: normalizeAttributes(attributes),
    });
  };

  const previewBar = attributes.find((attribute) => attribute.kind === 'bar' && attribute.showOnToken);

  return createPortal(
    <div
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-3 backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${nameId}-title`}
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-theme border border-theme-border bg-theme-paper text-theme-ink shadow-theme"
      >
        <header className="flex items-center gap-3 border-b border-theme-border bg-theme-background/70 px-4 py-3">
          <div className="relative flex-shrink-0 pb-2">
            <div
              className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-white text-lg font-bold text-white shadow-md"
              style={{ backgroundColor: color, boxShadow: '0 0 0 1px rgba(15,23,42,0.25), 0 2px 6px rgba(15,23,42,0.3)' }}
            >
              {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : (trimmedName[0] || '?').toUpperCase()}
            </div>
            {previewBar && (
              <div className="absolute -bottom-0 left-1/2 h-1.5 w-11 -translate-x-1/2 overflow-hidden rounded-full border border-black/40 bg-black/60">
                <div className="h-full" style={{ width: `${getBarFraction(previewBar) * 100}%`, backgroundColor: previewBar.color }} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 id={`${nameId}-title`} className="font-heading text-base font-bold leading-tight">{mode === 'add' ? 'New token' : 'Token details'}</h3>
            <p className="truncate text-xs text-theme-muted">{trimmedName || 'Unnamed token'}</p>
          </div>
          <button type="button" aria-label="Close token dialog" onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-button text-theme-muted hover:bg-theme-background hover:text-theme-ink">
            <XIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <section className="space-y-3" aria-label="Token appearance">
            <div>
              <label htmlFor={nameId} className="mb-1 block text-xs font-medium">Name</label>
              <input id={nameId} autoFocus required maxLength={40} value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-3">
              <div>
                <span className="mb-1 block text-xs font-medium">Color</span>
                <label className="block h-9 w-14 cursor-pointer overflow-hidden rounded-button border border-theme-border" style={{ backgroundColor: color }}>
                  <span className="sr-only">Token color</span>
                  <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-full w-full cursor-pointer opacity-0" />
                </label>
              </div>
              <div>
                <label htmlFor={`${nameId}-size`} className="mb-1 block text-xs font-medium">Size</label>
                <select id={`${nameId}-size`} value={size} onChange={(event) => setSize(event.target.value as GridMapTokenSize)} className={`${fieldClass} h-9`}>
                  {TOKEN_SIZES.map((option) => {
                    const count = cells[option];
                    const unit = gridType === 'hex' ? (count <= 1 ? 'hex' : 'hexes') : (count <= 1 ? 'square' : 'squares');
                    return <option key={option} value={option}>{TOKEN_SIZE_NAMES[option]} - {count} {unit}</option>;
                  })}
                </select>
              </div>
            </div>

            <div>
              <span className="mb-1 block text-xs font-medium">Image <span className="font-normal text-theme-muted">(optional)</span></span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="widget-control flex items-center gap-1.5 px-3 py-1.5 text-xs">
                  <UploadIcon className="h-3.5 w-3.5" />
                  {image ? 'Replace image' : 'Upload image'}
                </button>
                {image && (
                  <button type="button" onClick={() => setImage(undefined)} className="widget-control flex items-center gap-1.5 px-3 py-1.5 text-xs">
                    <TrashIcon className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" tabIndex={-1} onChange={(event) => void handleImagePicked(event)} />
              </div>
              {imageError && <p role="alert" className="mt-1 text-xs text-red-500">{imageError}</p>}
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={showName} onChange={(event) => setShowName(event.target.checked)} className="h-4 w-4 accent-theme-accent" />
              Show name on token
            </label>
          </section>

          <section className="space-y-3" aria-label="Token attributes">
            <div>
              <h4 className={sectionTitleClass}>Add attribute</h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ATTRIBUTE_PRESETS.map((preset) => (
                  <button key={preset.label} type="button" onClick={() => setAttributes((current) => [...current, createAttribute(preset)])} className="flex items-center gap-1 rounded-full border border-theme-border bg-theme-background px-2.5 py-1 text-xs font-medium hover:border-theme-accent hover:bg-theme-paper">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: preset.color }} />
                    <PlusIcon className="h-3 w-3" />
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className={sectionTitleClass}>Conditions</h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CONDITION_PRESETS.map((condition) => {
                  const active = activeConditions.has(condition.name.toLowerCase());
                  return (
                    <button
                      key={condition.name}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleCondition(condition)}
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${active ? 'text-white' : 'border-theme-border bg-theme-background text-theme-ink hover:bg-theme-paper'}`}
                      style={active ? { backgroundColor: condition.color, borderColor: condition.color } : undefined}
                    >
                      {active ? <CheckIcon className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full" style={{ backgroundColor: condition.color }} />}
                      {condition.name}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setAttributes((current) => [...current, createAttribute({ kind: 'condition', name: '', color: CUSTOM_CONDITION_COLOR })])} className="flex items-center gap-1 rounded-full border border-dashed border-theme-border px-2.5 py-1 text-xs font-medium text-theme-muted hover:border-theme-accent hover:text-theme-ink">
                  <PlusIcon className="h-3 w-3" />
                  Custom
                </button>
              </div>
            </div>

            {attributes.length > 0 ? (
              <ul className="space-y-2">
                {attributes.map((attribute) => (
                  <AttributeRow
                    key={attribute.id}
                    attribute={attribute}
                    onChange={(changes) => updateAttribute(attribute.id, changes)}
                    onRemove={() => setAttributes((current) => current.filter((candidate) => candidate.id !== attribute.id))}
                  />
                ))}
              </ul>
            ) : (
              <p className="rounded-theme border border-dashed border-theme-border px-3 py-4 text-center text-xs text-theme-muted">
                No attributes yet. Add health, armor class, conditions, or anything else to track on this token.
              </p>
            )}
          </section>
        </div>

        <footer className="flex items-center gap-2 border-t border-theme-border bg-theme-background/70 px-4 py-3">
          {onDelete && (confirmDelete ? (
            <>
              <button type="button" onClick={onDelete} className="rounded-button bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600">Delete token</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="widget-control px-3 py-1.5 text-xs">Keep</button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 rounded-button px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/15">
              <TrashIcon className="h-3.5 w-3.5" />
              Delete
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onCancel} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
            <button type="submit" disabled={!trimmedName} className="widget-control widget-control--primary flex items-center gap-1.5 px-3 py-1.5 text-sm">
              <CheckIcon className="h-4 w-4" />
              {mode === 'add' ? 'Add token' : 'Save'}
            </button>
          </div>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
