export function hasExplicitPositiveSign(value: string): boolean {
  return value.trim().startsWith('+');
}

export function formatNumberWithSign(value: number, showPositiveSign = false): string {
  return showPositiveSign && value >= 0 ? `+${value}` : String(value);
}
