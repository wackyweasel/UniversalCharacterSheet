export interface HealthBarValues {
  currentValue: number;
  temporaryValue: number;
}

export function normalizeHealthBarValue(value: number | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback;
}

export function applyHealthDamage(
  currentValue: number,
  temporaryValue: number,
  amount: number,
): HealthBarValues {
  const safeCurrentValue = normalizeHealthBarValue(currentValue);
  const safeTemporaryValue = normalizeHealthBarValue(temporaryValue);
  const safeAmount = normalizeHealthBarValue(amount);
  const absorbedAmount = Math.min(safeTemporaryValue, safeAmount);

  return {
    currentValue: Math.max(0, safeCurrentValue - (safeAmount - absorbedAmount)),
    temporaryValue: safeTemporaryValue - absorbedAmount,
  };
}

export function applyHealthHealing(
  currentValue: number,
  temporaryValue: number,
  maxValue: number,
  amount: number,
  overflowToTemporary = false,
): HealthBarValues {
  const safeCurrentValue = normalizeHealthBarValue(currentValue);
  const safeTemporaryValue = normalizeHealthBarValue(temporaryValue);
  const safeMaxValue = normalizeHealthBarValue(maxValue);
  const safeAmount = normalizeHealthBarValue(amount);
  const availableHealing = Math.max(0, safeMaxValue - safeCurrentValue);
  const overflowAmount = overflowToTemporary
    ? Math.max(0, safeAmount - availableHealing)
    : 0;

  return {
    currentValue: Math.min(safeMaxValue, safeCurrentValue + safeAmount),
    temporaryValue: safeTemporaryValue + overflowAmount,
  };
}
