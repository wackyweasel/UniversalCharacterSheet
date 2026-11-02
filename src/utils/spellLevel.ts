export function ordinalSuffix(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const value = n % 100;
  return n + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
}

// Level 0 spells are cantrips; other levels read "1st level", "2nd level", ...
export function spellLevelName(level: number): string {
  return level === 0 ? 'Cantrip' : `${ordinalSuffix(level)} level`;
}

export function spellLevelShortName(level: number): string {
  return level === 0 ? 'C' : ordinalSuffix(level);
}

export function spellLevelPlainName(level: number): string {
  return level === 0 ? 'Cantrips' : `Level ${level}`;
}
