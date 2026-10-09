import { useEffect, useState, type FormEvent } from 'react';
import { WalletCurrency } from '../../types';
import { EditorProps } from './types';
import { CollapsibleSection } from './CollapsibleSection';
import { TrashIcon } from '../icons';
import {
  DEFAULT_WALLET_RATE,
  MAX_WALLET_RATE,
  MIN_WALLET_RATE,
  getWalletCurrencyName,
  getWalletTotalCurrencyIndex,
  getWalletUnitValues,
  normalizeWalletAmount,
  normalizeWalletRate,
} from '../../utils/wallet';

const INPUT_CLASS = 'h-10 rounded-button border border-theme-border bg-theme-paper px-2 text-sm text-theme-ink focus:border-theme-accent focus:outline-none';

// Keeps partial input (e.g. an empty field) local and only commits valid integers.
function IntegerInput({
  value,
  min,
  max,
  onCommit,
  className,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
  className: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step="1"
      aria-label={ariaLabel}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        const next = Number(event.target.value);
        if (event.target.value.trim() !== '' && Number.isInteger(next) && next >= min && next <= max) onCommit(next);
      }}
      onBlur={() => setDraft(String(value))}
      className={className}
    />
  );
}

export function WalletEditor({ widget, updateData }: EditorProps) {
  const currencies: WalletCurrency[] = widget.data.walletCurrencies ?? [];
  const showTotal = widget.data.walletShowTotal !== false;
  const totalCurrency = widget.data.walletTotalCurrency;
  const [newName, setNewName] = useState('');
  const values = getWalletUnitValues(currencies);
  const baseName = getWalletCurrencyName(currencies[0], 0);

  const updateCurrency = (index: number, patch: Partial<WalletCurrency>) => {
    updateData({ walletCurrencies: currencies.map((currency, i) => (i === index ? { ...currency, ...patch } : currency)) });
  };

  const removeCurrency = (index: number) => {
    const next = currencies.filter((_, i) => i !== index);
    // Keep the next currency's value by folding the removed rate into it.
    if (index > 0 && index < currencies.length - 1) {
      next[index] = {
        ...next[index],
        rate: Math.min(MAX_WALLET_RATE, normalizeWalletRate(currencies[index].rate) * normalizeWalletRate(currencies[index + 1].rate)),
      };
    }
    // Keep the total on the same currency; fall back to the largest if it was removed.
    let nextTotalCurrency = totalCurrency;
    if (totalCurrency !== undefined) {
      nextTotalCurrency = totalCurrency === index ? undefined : totalCurrency > index ? totalCurrency - 1 : totalCurrency;
    }
    updateData({ walletCurrencies: next, walletTotalCurrency: nextTotalCurrency });
  };

  const addCurrency = (event: FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    updateData({
      walletCurrencies: [...currencies, { name, amount: 0, rate: currencies.length === 0 ? 1 : DEFAULT_WALLET_RATE }],
    });
    setNewName('');
  };

  return (
    <div className="widget-editor widget-editor--wallet space-y-4">
      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 id={`wallet-currencies-title-${widget.id}`} className="widget-editor__section-title">Currencies</h3>
          <span className="widget-editor__section-count">{currencies.length}</span>
        </div>
        <p className="text-xs text-theme-muted">List currencies from smallest to largest. Each one is worth a whole number of the previous one.</p>
        <div className="space-y-1">
          {currencies.map((currency, index) => {
            const name = getWalletCurrencyName(currency, index);
            const previousName = getWalletCurrencyName(currencies[index - 1], index - 1);
            return (
              <div key={index} className="space-y-1 rounded-theme border border-theme-border bg-theme-accent/5 p-1.5">
                <div className="flex items-center gap-2">
                  <input
                    className={`${INPUT_CLASS} min-w-0 flex-1`}
                    value={currency.name}
                    onChange={(event) => updateCurrency(index, { name: event.target.value })}
                    placeholder="Name"
                    aria-label={`Currency ${index + 1} name`}
                  />
                  <IntegerInput
                    value={normalizeWalletAmount(currency.amount)}
                    min={0}
                    max={Number.MAX_SAFE_INTEGER}
                    onCommit={(amount) => updateCurrency(index, { amount })}
                    ariaLabel={`${name} amount`}
                    className={`${INPUT_CLASS} w-20 text-center`}
                  />
                  <button
                    type="button"
                    onClick={() => removeCurrency(index)}
                    disabled={currencies.length <= 1}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-red-500 transition-colors hover:border-red-500 hover:text-red-700 disabled:opacity-40"
                    aria-label={`Delete ${name}`}
                    title="Delete currency"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                {index === 0 ? (
                  <p className="px-1 text-xs text-theme-muted">Smallest currency</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5 px-1 text-xs text-theme-muted">
                    <span>1 {name} =</span>
                    <IntegerInput
                      value={normalizeWalletRate(currency.rate)}
                      min={MIN_WALLET_RATE}
                      max={MAX_WALLET_RATE}
                      onCommit={(rate) => updateCurrency(index, { rate })}
                      ariaLabel={`${previousName} per ${name}`}
                      className={`${INPUT_CLASS} h-8 w-16 text-center`}
                    />
                    <span>{previousName}</span>
                    {index > 1 && <span>({values[index]} {baseName})</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <form onSubmit={addCurrency} className="widget-editor__add-row flex gap-2">
          <input
            className={`${INPUT_CLASS} flex-1 px-3`}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Add larger currency..."
            aria-label="New currency name"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="h-10 rounded-button bg-theme-accent px-3 text-sm text-white transition-colors hover:bg-theme-accentHover disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </CollapsibleSection>

      <CollapsibleSection className="widget-editor__option-group">
        <h3 id={`wallet-display-title-${widget.id}`} className="widget-editor__section-title">Display</h3>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={showTotal}
            onChange={(event) => updateData({ walletShowTotal: event.target.checked })}
            className="mt-0.5 h-4 w-4 flex-none accent-theme-accent"
          />
          <span className="text-xs text-theme-ink">Show total value</span>
        </label>
        {showTotal && currencies.length > 1 && (
          <label className="flex items-center gap-2 text-xs text-theme-ink">
            <span>Total in</span>
            <select
              value={getWalletTotalCurrencyIndex(currencies, totalCurrency)}
              onChange={(event) => updateData({ walletTotalCurrency: Number(event.target.value) })}
              className={`${INPUT_CLASS} h-8 min-w-0 flex-1`}
            >
              {currencies.map((currency, index) => (
                <option key={index} value={index}>{getWalletCurrencyName(currency, index)}</option>
              ))}
            </select>
          </label>
        )}
      </CollapsibleSection>
    </div>
  );
}
