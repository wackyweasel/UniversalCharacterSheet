let depth = 0;

/** Runs `fn` without firing events for the changes it makes, e.g. imports and workspace loads. */
export function withEventsSuppressed<T>(fn: () => T): T {
  depth += 1;
  try {
    return fn();
  } finally {
    depth -= 1;
  }
}

export function areEventsSuppressed(): boolean {
  return depth > 0;
}
