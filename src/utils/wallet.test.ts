import { describe, expect, it } from 'vitest';
import type { WalletCurrency } from '../types';
import {
  addToWallet,
  consolidateWallet,
  convertWalletCurrency,
  formatWalletAmounts,
  formatWalletTotal,
  getWalletTotal,
  spendFromWallet,
} from './wallet';

const wallet = (cp: number, sp: number, gp: number): WalletCurrency[] => [
  { name: 'cp', amount: cp, rate: 1 },
  { name: 'sp', amount: sp, rate: 10 },
  { name: 'gp', amount: gp, rate: 10 },
];

const amounts = (currencies: WalletCurrency[] | null) => currencies?.map((currency) => currency.amount);

describe('wallet', () => {
  it('totals coins in the smallest currency', () => {
    expect(getWalletTotal(wallet(5, 3, 2))).toBe(235);
  });

  it('adds coins per currency', () => {
    expect(amounts(addToWallet(wallet(1, 2, 3), [4, 0, 10]))).toEqual([5, 2, 13]);
  });

  it('spends the requested coins directly when available', () => {
    expect(amounts(spendFromWallet(wallet(5, 5, 5), [0, 2, 1]))).toEqual([5, 3, 4]);
  });

  it('pays with smaller coins before breaking larger ones', () => {
    expect(amounts(spendFromWallet(wallet(0, 15, 1), [0, 0, 1]))).toEqual([0, 15, 0]);
    expect(amounts(spendFromWallet(wallet(0, 15, 0), [0, 0, 1]))).toEqual([0, 5, 0]);
  });

  it('breaks the smallest larger coin and returns change', () => {
    expect(amounts(spendFromWallet(wallet(0, 0, 3), [5, 0, 0]))).toEqual([5, 9, 2]);
    expect(amounts(spendFromWallet(wallet(0, 5, 1), [15, 0, 0]))).toEqual([5, 3, 1]);
  });

  it('refuses to spend more than the wallet holds', () => {
    expect(spendFromWallet(wallet(9, 9, 0), [0, 0, 1])).toBeNull();
  });

  it('supports uneven exchange rates', () => {
    const pounds: WalletCurrency[] = [
      { name: 'd', amount: 0, rate: 1 },
      { name: 's', amount: 0, rate: 12 },
      { name: '£', amount: 1, rate: 20 },
    ];
    expect(amounts(spendFromWallet(pounds, [3, 0, 0]))).toEqual([9, 19, 0]);
  });

  it('converts down exactly and up into whole coins', () => {
    expect(convertWalletCurrency(wallet(0, 0, 3), 2, 0, 2)).toMatchObject({ used: 2, gained: 200 });
    const upward = convertWalletCurrency(wallet(0, 25, 0), 1, 2, 25);
    expect(upward).toMatchObject({ used: 20, gained: 2 });
    expect(amounts(upward?.currencies ?? null)).toEqual([0, 5, 2]);
    expect(convertWalletCurrency(wallet(9, 0, 0), 0, 1, 9)).toBeNull();
  });

  it('consolidates into the fewest coins', () => {
    expect(amounts(consolidateWallet(wallet(125, 13, 0)))).toEqual([5, 5, 2]);
  });

  it('formats amounts and totals', () => {
    expect(formatWalletAmounts(wallet(5, 0, 2))).toBe('2 gp, 5 cp');
    expect(formatWalletAmounts(wallet(0, 0, 0))).toBe('0 cp');
    expect(formatWalletTotal(wallet(4, 3, 12))).toBe('12.34 gp');
    expect(formatWalletTotal(wallet(4, 3, 12), 1)).toBe('123.4 sp');
    expect(formatWalletTotal(wallet(4, 3, 12), 0)).toBe('1234 cp');
    expect(formatWalletTotal(wallet(4, 3, 12), 7)).toBe('12.34 gp');
  });
});
