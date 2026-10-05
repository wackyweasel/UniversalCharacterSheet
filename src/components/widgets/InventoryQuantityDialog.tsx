import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { InventoryItem } from '../../types';
import { getInventoryItemQuantity, normalizeInventoryQuantity } from '../../utils/inventory';
import { LayersIcon, MinusIcon, PlusIcon, XIcon } from '../icons';

interface InventoryQuantityDialogProps {
  item: InventoryItem;
  onClose: () => void;
  onSave: (quantity: number) => void;
  onSplit: (keptQuantity: number, splitQuantity: number) => void;
}

type DialogMode = 'quantity' | 'split';

const inputClass = 'h-11 w-24 rounded-button border border-theme-border bg-theme-paper px-2 text-center text-lg font-bold tabular-nums text-theme-ink [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:border-theme-accent focus:outline-none';
const stepButtonClass = 'widget-control flex h-11 w-11 items-center justify-center rounded-button border border-theme-border bg-theme-paper text-theme-ink transition-transform hover:border-theme-accent hover:bg-theme-accent hover:text-theme-paper active:scale-95 disabled:cursor-not-allowed disabled:opacity-35';

function formatQuantity(quantity: number): string {
  return quantity.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function InventoryQuantityDialog({
  item,
  onClose,
  onSave,
  onSplit,
}: InventoryQuantityDialogProps) {
  const quantity = getInventoryItemQuantity(item) ?? 0;
  const [mode, setMode] = useState<DialogMode>('quantity');
  const [quantityDraft, setQuantityDraft] = useState(String(quantity));
  const [splitDraft, setSplitDraft] = useState(String(Math.max(1, Math.floor(quantity / 2))));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const adjustQuantity = (amount: number) => {
    setQuantityDraft((current) => String(Math.max(0, (normalizeInventoryQuantity(current) ?? quantity) + amount)));
  };

  const saveQuantity = (event: React.FormEvent) => {
    event.preventDefault();
    const nextQuantity = normalizeInventoryQuantity(quantityDraft);
    if (nextQuantity === undefined) return;
    onSave(nextQuantity);
  };

  const openSplitMode = () => {
    setSplitDraft(String(Math.max(1, Math.floor(quantity / 2))));
    setMode('split');
  };

  const splitQuantity = normalizeInventoryQuantity(splitDraft);
  const keptQuantity = splitQuantity === undefined ? quantity : quantity - splitQuantity;
  const splitIsValid = splitQuantity !== undefined
    && splitQuantity > 0
    && keptQuantity > 0
    && splitQuantity < quantity;

  const adjustSplit = (amount: number) => {
    setSplitDraft((current) => {
      const currentValue = normalizeInventoryQuantity(current) ?? Math.max(1, Math.floor(quantity / 2));
      return String(Math.max(1, Math.min(quantity - 1, currentValue + amount)));
    });
  };

  const confirmSplit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!splitIsValid || splitQuantity === undefined) return;
    onSplit(keptQuantity, splitQuantity);
  };

  return createPortal(
    <div
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4 animate-fade-in"
      onClick={onClose}
      onMouseDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-quantity-dialog-title"
        className="w-full max-w-md overflow-hidden rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink shadow-theme animate-modal-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-theme-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-theme-muted">Inventory quantity</p>
            <h2 id="inventory-quantity-dialog-title" className="mt-0.5 break-words font-heading text-lg font-bold [overflow-wrap:anywhere]">
              {item.name}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close quantity dialog" className="widget-control flex h-7 w-7 flex-shrink-0 items-center justify-center">
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-4">
          {mode === 'quantity' ? (
            <form onSubmit={saveQuantity}>
              <div className="rounded-theme border border-theme-border bg-theme-background/35 p-4 text-center transition-colors">
                <p className="text-xs font-semibold text-theme-muted">Stack quantity</p>
                <div className="mt-3 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => adjustQuantity(-1)}
                    disabled={quantityDraft === '0'}
                    aria-label="Decrease quantity"
                    className={stepButtonClass}
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <input
                    autoFocus
                    type="number"
                    min="0"
                    step="1"
                    value={quantityDraft}
                    onChange={(event) => setQuantityDraft(event.target.value)}
                    aria-label="Stack quantity"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => adjustQuantity(1)}
                    aria-label="Increase quantity"
                    className={stepButtonClass}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-theme-muted">Use the stepper or enter an exact amount.</p>
              </div>

              <button
                type="button"
                onClick={openSplitMode}
                disabled={quantity < 2}
                className="mt-3 flex w-full items-center gap-3 rounded-theme border border-theme-border px-3 py-2.5 text-left transition-colors hover:border-theme-accent hover:bg-theme-accent/8 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-button bg-theme-accent/12 text-theme-accent">
                  <LayersIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold">Split this stack</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-theme-muted">
                    {quantity > 1 ? 'Create a second identical item stack.' : 'A stack needs at least two items.'}
                  </span>
                </span>
              </button>

              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={onClose} className="widget-control px-3 py-1.5 text-xs">Cancel</button>
                <button type="submit" className="widget-control widget-control--primary px-3 py-1.5 text-xs">Save quantity</button>
              </div>
            </form>
          ) : (
            <form onSubmit={confirmSplit}>
              <div className="rounded-theme border border-theme-border bg-theme-background/35 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold">Split stack</p>
                    <p className="mt-0.5 text-[11px] text-theme-muted">The total stays at {formatQuantity(quantity)}.</p>
                  </div>
                  <button type="button" onClick={() => setMode('quantity')} className="widget-control px-2 py-1 text-[11px]">Back</button>
                </div>

                <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                  <div className="min-w-0 rounded-theme border border-theme-accent/35 bg-theme-accent/8 p-3 text-center transition-all">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-theme-muted">Keep here</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-theme-ink">{formatQuantity(Math.max(0, keptQuantity))}</p>
                  </div>
                  <span className="text-theme-muted">+</span>
                  <div className="min-w-0 rounded-theme border border-theme-border bg-theme-paper p-2 text-center transition-all">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-theme-muted">New stack</p>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => adjustSplit(-1)}
                        disabled={!splitQuantity || splitQuantity <= 1}
                        aria-label="Decrease split quantity"
                        className="widget-control flex h-7 w-7 items-center justify-center rounded-button p-0 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <MinusIcon className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={Math.max(1, quantity - 1)}
                        step="1"
                        value={splitDraft}
                        onChange={(event) => setSplitDraft(event.target.value)}
                        aria-label="New stack quantity"
                        className="h-8 w-14 rounded-button border border-theme-border bg-theme-paper px-1 text-center text-lg font-bold tabular-nums text-theme-ink [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:border-theme-accent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => adjustSplit(1)}
                        disabled={!splitQuantity || splitQuantity >= quantity - 1}
                        aria-label="Increase split quantity"
                        className="widget-control flex h-7 w-7 items-center justify-center rounded-button p-0 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <PlusIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
                <p className={`mt-3 text-center text-[11px] ${splitIsValid ? 'text-theme-muted' : 'text-red-500'}`}>
                  {splitIsValid ? 'Both stacks keep the same item details.' : 'Choose at least one item for each stack.'}
                </p>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={onClose} className="widget-control px-3 py-1.5 text-xs">Cancel</button>
                <button type="submit" disabled={!splitIsValid} className="widget-control widget-control--primary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-45">
                  Split into two
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
