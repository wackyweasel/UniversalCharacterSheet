import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Widget, WalletCurrency } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { InlineFormulaText } from '../InlineFormulaText';
import { Tooltip } from '../Tooltip';
import { WidgetEmptyState } from './WidgetPrimitives';
import {
  addToWallet,
  consolidateWallet,
  convertWalletCurrency,
  formatWalletAmounts,
  formatWalletTotal,
  getWalletCurrencyName,
  getWalletTotal,
  getWalletUnitValues,
  normalizeWalletAmount,
  spendFromWallet,
} from '../../utils/wallet';

interface Props {
  widget: Widget;
  mode: 'play' | 'print';
  width: number;
  height: number;
  interactive?: boolean;
}

type WalletDialogState =
  | { kind: 'add' | 'spend' }
  | { kind: 'convert' }
  | { kind: 'set'; index: number }
  | null;

const INPUT_CLASS = 'h-10 w-full min-w-0 rounded-button border border-theme-border bg-theme-paper px-2 text-center text-lg font-bold text-theme-ink placeholder:font-normal placeholder:text-theme-muted focus:border-theme-accent focus:outline-none';
const SELECT_CLASS = 'h-10 w-full min-w-0 rounded-button border border-theme-border bg-theme-paper px-1 text-sm text-theme-ink focus:border-theme-accent focus:outline-none';

const stopPropagation = (event: { stopPropagation: () => void }) => event.stopPropagation();

function WalletDialogShell({
  titleId,
  title,
  onCancel,
  onSubmit,
  children,
}: {
  titleId: string;
  title: string;
  onCancel: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return createPortal(
    <div
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 animate-fade-in"
      onClick={onCancel}
      onMouseDown={stopPropagation}
      onTouchStart={stopPropagation}
      onWheel={stopPropagation}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme animate-modal-in"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        onClick={stopPropagation}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      >
        <h3 id={titleId} className="font-heading text-base font-bold">{title}</h3>
        {children}
      </form>
    </div>,
    document.body,
  );
}

function TransactionDialog({
  kind,
  widgetId,
  currencies,
  onConfirm,
  onCancel,
}: {
  kind: 'add' | 'spend';
  widgetId: string;
  currencies: WalletCurrency[];
  onConfirm: (amounts: number[], result: WalletCurrency[]) => void;
  onCancel: () => void;
}) {
  const [drafts, setDrafts] = useState<string[]>(() => currencies.map(() => ''));
  const amounts = drafts.map(normalizeWalletAmount);
  const hasAmount = amounts.some((amount) => amount > 0);
  const result = kind === 'spend' ? spendFromWallet(currencies, amounts) : addToWallet(currencies, amounts);
  const canSubmit = hasAmount && result !== null;
  const isSpend = kind === 'spend';

  return (
    <WalletDialogShell
      titleId={`wallet-${kind}-title-${widgetId}`}
      title={isSpend ? 'Spend money' : 'Add money'}
      onCancel={onCancel}
      onSubmit={() => {
        if (canSubmit) onConfirm(amounts, result);
      }}
    >
      {isSpend && <p className="mt-1 text-xs text-theme-muted">Change is made automatically when you lack the exact coins.</p>}
      <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))' }}>
        {currencies.map((currency, index) => {
          const inputId = `wallet-${kind}-${widgetId}-${index}`;
          return (
            <div key={index} className="min-w-0">
              <label htmlFor={inputId} className="block truncate text-center text-sm font-medium">
                {getWalletCurrencyName(currency, index)}
              </label>
              <input
                id={inputId}
                autoFocus={index === currencies.length - 1}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="0"
                value={drafts[index]}
                onChange={(event) => {
                  const value = event.target.value;
                  setDrafts((current) => current.map((draft, draftIndex) => (draftIndex === index ? value : draft)));
                }}
                className={`mt-1 ${INPUT_CLASS}`}
              />
            </div>
          );
        })}
      </div>
      <p className={`mt-3 text-sm ${hasAmount && !result ? 'font-semibold text-red-600' : 'text-theme-muted'}`} aria-live="polite">
        {!hasAmount
          ? `Balance: ${formatWalletAmounts(currencies)}`
          : result
            ? `Balance after: ${formatWalletAmounts(result)}`
            : `Not enough money. Balance: ${formatWalletAmounts(currencies)}`}
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
        <button type="submit" disabled={!canSubmit} className="widget-control widget-control--primary px-3 py-1.5 text-sm">
          {isSpend ? 'Spend' : 'Add'}
        </button>
      </div>
    </WalletDialogShell>
  );
}

function ConvertDialog({
  widgetId,
  currencies,
  onConvert,
  onConsolidate,
  onCancel,
}: {
  widgetId: string;
  currencies: WalletCurrency[];
  onConvert: (fromIndex: number, toIndex: number, used: number, gained: number, result: WalletCurrency[]) => void;
  onConsolidate: (result: WalletCurrency[]) => void;
  onCancel: () => void;
}) {
  const firstWithCoins = currencies.findIndex((currency) => normalizeWalletAmount(currency.amount) > 0);
  const initialFrom = Math.max(0, firstWithCoins);
  const [fromIndex, setFromIndex] = useState(initialFrom);
  const [toIndex, setToIndex] = useState(initialFrom < currencies.length - 1 ? initialFrom + 1 : Math.max(0, initialFrom - 1));
  const [countDraft, setCountDraft] = useState(String(normalizeWalletAmount(currencies[initialFrom]?.amount)));
  const count = normalizeWalletAmount(countDraft);
  const conversion = convertWalletCurrency(currencies, fromIndex, toIndex, count);
  const fromName = getWalletCurrencyName(currencies[fromIndex], fromIndex);
  const toName = getWalletCurrencyName(currencies[toIndex], toIndex);
  const values = getWalletUnitValues(currencies);
  const consolidated = consolidateWallet(currencies);
  const canConsolidate = consolidated.some((currency, index) => currency.amount !== normalizeWalletAmount(currencies[index].amount));

  const getPreview = () => {
    if (conversion) {
      const leftover = Math.min(count, normalizeWalletAmount(currencies[fromIndex].amount)) - conversion.used;
      return `${conversion.used} ${fromName} → ${conversion.gained} ${toName}${leftover > 0 ? ` (${leftover} ${fromName} left over)` : ''}`;
    }
    if (fromIndex === toIndex) return 'Choose two different currencies.';
    if (normalizeWalletAmount(currencies[fromIndex].amount) === 0) return `No ${fromName} to convert.`;
    if (count === 0) return 'Enter an amount to convert.';
    return `1 ${toName} needs ${values[toIndex] / values[fromIndex]} ${fromName}.`;
  };

  const selectFrom = (index: number) => {
    setFromIndex(index);
    setCountDraft(String(normalizeWalletAmount(currencies[index].amount)));
    if (index === toIndex) setToIndex(index < currencies.length - 1 ? index + 1 : index - 1);
  };

  return (
    <WalletDialogShell
      titleId={`wallet-convert-title-${widgetId}`}
      title="Convert money"
      onCancel={onCancel}
      onSubmit={() => {
        if (conversion) onConvert(fromIndex, toIndex, conversion.used, conversion.gained, conversion.currencies);
      }}
    >
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
        <div className="min-w-0">
          <label htmlFor={`wallet-convert-count-${widgetId}`} className="block text-sm font-medium">Amount</label>
          <input
            id={`wallet-convert-count-${widgetId}`}
            autoFocus
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={countDraft}
            onChange={(event) => setCountDraft(event.target.value)}
            className={`mt-1 ${INPUT_CLASS}`}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={`wallet-convert-from-${widgetId}`} className="block text-sm font-medium">From</label>
          <select
            id={`wallet-convert-from-${widgetId}`}
            value={fromIndex}
            onChange={(event) => selectFrom(Number(event.target.value))}
            className={`mt-1 ${SELECT_CLASS}`}
          >
            {currencies.map((currency, index) => (
              <option key={index} value={index}>{getWalletCurrencyName(currency, index)}</option>
            ))}
          </select>
        </div>
        <span className="flex h-10 items-center text-theme-muted" aria-hidden="true">→</span>
        <div className="min-w-0">
          <label htmlFor={`wallet-convert-to-${widgetId}`} className="block text-sm font-medium">To</label>
          <select
            id={`wallet-convert-to-${widgetId}`}
            value={toIndex}
            onChange={(event) => setToIndex(Number(event.target.value))}
            className={`mt-1 ${SELECT_CLASS}`}
          >
            {currencies.map((currency, index) => (
              <option key={index} value={index} disabled={index === fromIndex}>{getWalletCurrencyName(currency, index)}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="mt-3 text-sm text-theme-muted" aria-live="polite">{getPreview()}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
        <button type="submit" disabled={!conversion} className="widget-control widget-control--primary px-3 py-1.5 text-sm">Convert</button>
      </div>
      <div className="mt-4 border-t border-theme-border pt-3">
        <p className="text-xs text-theme-muted">
          Exchange all coins for the fewest coins: <span className="font-semibold text-theme-ink">{formatWalletAmounts(consolidated)}</span>
        </p>
        <button
          type="button"
          disabled={!canConsolidate}
          onClick={() => onConsolidate(consolidated)}
          className="widget-control mt-2 w-full px-3 py-1.5 text-sm"
        >
          Consolidate all coins
        </button>
      </div>
    </WalletDialogShell>
  );
}

function SetAmountDialog({
  widgetId,
  currencyName,
  amount,
  onConfirm,
  onCancel,
}: {
  widgetId: string;
  currencyName: string;
  amount: number;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(String(amount));
  const inputId = `wallet-set-${widgetId}`;

  return (
    <WalletDialogShell
      titleId={`wallet-set-title-${widgetId}`}
      title={`Set ${currencyName}`}
      onCancel={onCancel}
      onSubmit={() => onConfirm(normalizeWalletAmount(draft))}
    >
      <label htmlFor={inputId} className="mt-3 block text-sm font-medium">Amount</label>
      <input
        id={inputId}
        autoFocus
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        className={`mt-1 ${INPUT_CLASS}`}
      />
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
        <button type="submit" className="widget-control widget-control--primary px-3 py-1.5 text-sm">Save</button>
      </div>
    </WalletDialogShell>
  );
}

export default function WalletWidget({ widget, mode, interactive = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, walletCurrencies = [], walletShowTotal = true, walletTotalCurrency } = widget.data;
  const [dialog, setDialog] = useState<WalletDialogState>(null);
  const isPrintMode = mode === 'print';
  const controlsEnabled = interactive && !isPrintMode;
  const timelineLabel = label || 'Wallet';
  const hasMoney = getWalletTotal(walletCurrencies) > 0;
  const transactionKind = dialog?.kind === 'add' || dialog?.kind === 'spend' ? dialog.kind : null;

  const save = (currencies: WalletCurrency[]) => {
    updateWidgetData(widget.id, { walletCurrencies: currencies });
    setDialog(null);
  };

  const confirmTransaction = (kind: 'add' | 'spend', amounts: number[], result: WalletCurrency[]) => {
    save(result);
    const verb = kind === 'add' ? 'Added' : 'Spent';
    addTimelineEvent(
      timelineLabel,
      'WALLET',
      `${verb} ${formatWalletAmounts(walletCurrencies, amounts)} (balance: ${formatWalletAmounts(result)})`,
      kind === 'add' ? '💰' : '💸',
    );
  };

  const setAmount = (index: number, amount: number) => {
    const previous = normalizeWalletAmount(walletCurrencies[index].amount);
    if (amount === previous) {
      setDialog(null);
      return;
    }
    save(walletCurrencies.map((currency, currencyIndex) => (currencyIndex === index ? { ...currency, amount } : currency)));
    addTimelineEvent(timelineLabel, 'WALLET', `${getWalletCurrencyName(walletCurrencies[index], index)}: ${previous} → ${amount}`, '🪙');
  };

  const actionClass = 'widget-control h-6 min-h-0 flex-1 px-1.5 text-[11px] font-semibold';

  return (
    <div className="wallet-widget flex h-full w-full flex-col gap-1.5 font-body">
      {label && (
        <div className="widget-header flex-shrink-0">
          <div className="widget-header-title min-w-0 flex-1 truncate">
            <InlineFormulaText text={label} />
          </div>
        </div>
      )}

      {walletCurrencies.length === 0 ? (
        <WidgetEmptyState title="No currencies" hint={controlsEnabled ? 'Add currencies in the widget editor.' : undefined} />
      ) : (
        <>
          <div className="grid flex-shrink-0 gap-1" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(44px, 1fr))' }}>
            {walletCurrencies.map((currency, index) => {
              const name = getWalletCurrencyName(currency, index);
              const amount = normalizeWalletAmount(currency.amount);
              const content = (
                <>
                  <span className="max-w-full truncate text-base font-bold leading-tight tabular-nums">{amount}</span>
                  <span className="max-w-full truncate text-[10px] leading-tight opacity-70">{name}</span>
                </>
              );
              const tileClass = 'flex min-w-0 flex-col items-center justify-center rounded-button px-1 py-1';
              return controlsEnabled ? (
                <button
                  key={index}
                  type="button"
                  onClick={() => setDialog({ kind: 'set', index })}
                  onMouseDown={stopPropagation}
                  aria-label={`Set ${name}, currently ${amount}`}
                  className={`widget-control ${tileClass}`}
                >
                  {content}
                </button>
              ) : (
                <div key={index} className={`${tileClass} border border-theme-border text-theme-ink`}>
                  {content}
                </div>
              );
            })}
          </div>

          {walletShowTotal && walletCurrencies.length > 1 && (
            <div className="flex-shrink-0 truncate text-[11px] text-theme-muted">
              Total <strong className="tabular-nums text-theme-ink">{formatWalletTotal(walletCurrencies, walletTotalCurrency)}</strong>
            </div>
          )}

          {!isPrintMode && (
            <div className="mt-auto flex flex-shrink-0 gap-1">
              <Tooltip content="Spend money, making change automatically">
                <button
                  type="button"
                  disabled={!controlsEnabled || !hasMoney}
                  onClick={() => setDialog({ kind: 'spend' })}
                  onMouseDown={stopPropagation}
                  className={actionClass}
                >
                  Spend
                </button>
              </Tooltip>
              <Tooltip content="Add money">
                <button
                  type="button"
                  disabled={!controlsEnabled}
                  onClick={() => setDialog({ kind: 'add' })}
                  onMouseDown={stopPropagation}
                  className={actionClass}
                >
                  Add
                </button>
              </Tooltip>
              {walletCurrencies.length > 1 && (
                <Tooltip content="Exchange coins between currencies">
                  <button
                    type="button"
                    disabled={!controlsEnabled || !hasMoney}
                    onClick={() => setDialog({ kind: 'convert' })}
                    onMouseDown={stopPropagation}
                    className={actionClass}
                  >
                    Convert
                  </button>
                </Tooltip>
              )}
            </div>
          )}
        </>
      )}

      {transactionKind && (
        <TransactionDialog
          kind={transactionKind}
          widgetId={widget.id}
          currencies={walletCurrencies}
          onConfirm={(amounts, result) => confirmTransaction(transactionKind, amounts, result)}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'convert' && (
        <ConvertDialog
          widgetId={widget.id}
          currencies={walletCurrencies}
          onConvert={(fromIndex, toIndex, used, gained, result) => {
            save(result);
            addTimelineEvent(
              timelineLabel,
              'WALLET',
              `Converted ${used} ${getWalletCurrencyName(walletCurrencies[fromIndex], fromIndex)} → ${gained} ${getWalletCurrencyName(walletCurrencies[toIndex], toIndex)}`,
              '🔄',
            );
          }}
          onConsolidate={(result) => {
            save(result);
            addTimelineEvent(timelineLabel, 'WALLET', `Consolidated coins (balance: ${formatWalletAmounts(result)})`, '🔄');
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'set' && walletCurrencies[dialog.index] && (
        <SetAmountDialog
          widgetId={widget.id}
          currencyName={getWalletCurrencyName(walletCurrencies[dialog.index], dialog.index)}
          amount={normalizeWalletAmount(walletCurrencies[dialog.index].amount)}
          onConfirm={(amount) => setAmount(dialog.index, amount)}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}
