import type { WalletCurrency } from '../types';

export const DEFAULT_WALLET_RATE = 10;
export const MIN_WALLET_RATE = 2;
export const MAX_WALLET_RATE = 1000;

export function createDefaultWalletCurrencies(): WalletCurrency[] {
  return [
    { name: 'cp', amount: 0, rate: 1 },
    { name: 'sp', amount: 0, rate: DEFAULT_WALLET_RATE },
    { name: 'gp', amount: 0, rate: DEFAULT_WALLET_RATE },
  ];
}

export function normalizeWalletAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
}

export function normalizeWalletRate(value: unknown): number {
  const rate = Math.floor(Number(value));
  return Number.isFinite(rate) ? Math.min(MAX_WALLET_RATE, Math.max(MIN_WALLET_RATE, rate)) : DEFAULT_WALLET_RATE;
}

export function getWalletCurrencyName(currency: WalletCurrency | undefined, index: number): string {
  return currency?.name.trim() || `Currency ${index + 1}`;
}

/** Value of one coin of each currency, in units of the first (smallest) currency. */
export function getWalletUnitValues(currencies: WalletCurrency[]): number[] {
  const values: number[] = [];
  currencies.forEach((currency, index) => {
    values.push(index === 0 ? 1 : values[index - 1] * normalizeWalletRate(currency.rate));
  });
  return values;
}

function getCounts(currencies: WalletCurrency[]): number[] {
  return currencies.map((currency) => normalizeWalletAmount(currency.amount));
}

function sumValue(counts: number[], values: number[]): number {
  return counts.reduce((sum, count, index) => sum + count * values[index], 0);
}

function withCounts(currencies: WalletCurrency[], counts: number[]): WalletCurrency[] {
  return currencies.map((currency, index) => ({ ...currency, amount: counts[index] }));
}

// Spreads a value over the currencies below `limit`, largest first.
function addChange(value: number, values: number[], counts: number[], limit: number) {
  let remaining = value;
  for (let index = limit - 1; index >= 0 && remaining > 0; index--) {
    const coins = Math.floor(remaining / values[index]);
    counts[index] += coins;
    remaining -= coins * values[index];
  }
}

export function getWalletTotal(currencies: WalletCurrency[]): number {
  return sumValue(getCounts(currencies), getWalletUnitValues(currencies));
}

export function addToWallet(currencies: WalletCurrency[], amounts: number[]): WalletCurrency[] {
  return withCounts(currencies, getCounts(currencies).map((count, index) => count + normalizeWalletAmount(amounts[index])));
}

/**
 * Pays with the requested coins first, then with other coins that fit, and finally breaks the
 * smallest larger coin and returns the change. Returns null when the wallet cannot cover the cost.
 */
export function spendFromWallet(currencies: WalletCurrency[], amounts: number[]): WalletCurrency[] | null {
  const values = getWalletUnitValues(currencies);
  const counts = getCounts(currencies);
  const cost = currencies.map((_, index) => normalizeWalletAmount(amounts[index]));
  if (sumValue(cost, values) > sumValue(counts, values)) return null;

  let remaining = 0;
  cost.forEach((coins, index) => {
    const paid = Math.min(counts[index], coins);
    counts[index] -= paid;
    remaining += (coins - paid) * values[index];
  });

  for (let index = counts.length - 1; index >= 0 && remaining > 0; index--) {
    const paid = Math.min(counts[index], Math.floor(remaining / values[index]));
    counts[index] -= paid;
    remaining -= paid * values[index];
  }

  if (remaining > 0) {
    // Every coin left is worth more than the remaining cost.
    const brokenIndex = counts.findIndex((count) => count > 0);
    if (brokenIndex < 0) return null;
    counts[brokenIndex] -= 1;
    addChange(values[brokenIndex] - remaining, values, counts, brokenIndex);
  }

  return withCounts(currencies, counts);
}

export interface WalletConversion {
  currencies: WalletCurrency[];
  used: number;
  gained: number;
}

/** Exchanges up to `count` coins of one currency for whole coins of another. Leftover coins stay unconverted. */
export function convertWalletCurrency(
  currencies: WalletCurrency[],
  fromIndex: number,
  toIndex: number,
  count: number,
): WalletConversion | null {
  if (fromIndex === toIndex || !currencies[fromIndex] || !currencies[toIndex]) return null;
  const values = getWalletUnitValues(currencies);
  const counts = getCounts(currencies);
  const requested = Math.min(normalizeWalletAmount(count), counts[fromIndex]);
  const gained = Math.floor((requested * values[fromIndex]) / values[toIndex]);
  if (gained <= 0) return null;

  const used = (gained * values[toIndex]) / values[fromIndex];
  counts[fromIndex] -= used;
  counts[toIndex] += gained;
  return { currencies: withCounts(currencies, counts), used, gained };
}

/** Exchanges every coin for the fewest coins of the same total value. */
export function consolidateWallet(currencies: WalletCurrency[]): WalletCurrency[] {
  const values = getWalletUnitValues(currencies);
  const counts = currencies.map(() => 0);
  addChange(getWalletTotal(currencies), values, counts, currencies.length);
  return withCounts(currencies, counts);
}

/** Formats coin counts largest currency first, e.g. "4 gp, 3 sp". */
export function formatWalletAmounts(currencies: WalletCurrency[], amounts?: number[]): string {
  if (currencies.length === 0) return '';
  const parts: string[] = [];
  for (let index = currencies.length - 1; index >= 0; index--) {
    const count = normalizeWalletAmount(amounts ? amounts[index] : currencies[index].amount);
    if (count > 0) parts.push(`${count} ${getWalletCurrencyName(currencies[index], index)}`);
  }
  return parts.length > 0 ? parts.join(', ') : `0 ${getWalletCurrencyName(currencies[0], 0)}`;
}

/** Resolves the stored total currency index, falling back to the largest currency. */
export function getWalletTotalCurrencyIndex(currencies: WalletCurrency[], index: number | undefined): number {
  return index !== undefined && Number.isInteger(index) && index >= 0 && index < currencies.length ? index : currencies.length - 1;
}

/** Formats the wallet's total value as a decimal amount of one currency (largest by default), e.g. "12.34 gp". */
export function formatWalletTotal(currencies: WalletCurrency[], currencyIndex?: number): string {
  if (currencies.length === 0) return '';
  const index = getWalletTotalCurrencyIndex(currencies, currencyIndex);
  const unitValue = getWalletUnitValues(currencies)[index];
  const decimals = Math.min(4, Math.ceil(Math.log10(unitValue)));
  const total = Number((getWalletTotal(currencies) / unitValue).toFixed(decimals));
  return `${total} ${getWalletCurrencyName(currencies[index], index)}`;
}
