/**
 * Monitors localStorage usage and provides warnings when approaching quota limits.
 *
 * Typical localStorage quota is ~5 MB (varies by browser, some allow 10 MB).
 * We use 5 MB as a conservative estimate unless we can detect the actual limit.
 */

const ASSUMED_QUOTA_BYTES = 5 * 1024 * 1024; // 5 MB conservative estimate
const PROBE_KEY = '__ucs_quota_probe__';

/** Cached result so we only probe once per session. */
let detectedQuotaBytes: number | null = null;

/**
 * Detect the actual localStorage quota by binary-searching for the maximum
 * writable size using a temporary key. The probe takes <10 ms on modern
 * browsers and cleans up after itself.
 *
 * quota = current usage (chars) + max writable remaining (chars), all × 2
 *
 * Falls back to the conservative 5 MB estimate if anything goes wrong.
 */
function probeQuota(): number {
  const usedChars = (() => {
    let t = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      t += k.length + (localStorage.getItem(k)?.length ?? 0);
    }
    return t;
  })();

  let lo = 0;
  let hi = 12 * 1024 * 1024; // 12 M chars (~24 MB) — more than any browser allows

  try {
    // Binary search for the max number of chars we can still write
    while (hi - lo > 1024) {
      const mid = Math.floor((lo + hi) / 2);
      try {
        localStorage.setItem(PROBE_KEY, 'x'.repeat(mid));
        lo = mid; // it fit
      } catch {
        hi = mid; // too big
      }
    }
  } finally {
    // Always clean up
    try { localStorage.removeItem(PROBE_KEY); } catch { /* */ }
  }

  const totalChars = usedChars + lo;
  return totalChars * 2; // UTF-16 → 2 bytes per char
}

/** Measure total bytes used by localStorage (keys + values, UTF-16 ⇒ ×2). */
export function getLocalStorageUsageBytes(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      // JavaScript strings are UTF-16 → 2 bytes per character
      total += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2;
    }
  }
  return total;
}

/** Return per-key usage for keys matching a prefix, sorted largest first. */
export function getStorageBreakdown(prefix = 'ucs:'): { key: string; bytes: number }[] {
  const items: { key: string; bytes: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const val = localStorage.getItem(key) ?? '';
      items.push({ key, bytes: (key.length + val.length) * 2 });
    }
  }
  return items.sort((a, b) => b.bytes - a.bytes);
}

/**
 * Detect the real localStorage quota by probing with a temporary key.
 * Result is cached for the session. Falls back to 5 MB on failure.
 */
export function estimateQuotaBytes(): number {
  if (detectedQuotaBytes !== null) return detectedQuotaBytes;
  try {
    detectedQuotaBytes = probeQuota();
  } catch {
    detectedQuotaBytes = ASSUMED_QUOTA_BYTES;
  }
  return detectedQuotaBytes;
}

export interface StorageStatus {
  usedBytes: number;
  quotaBytes: number;
  /** 0-1 fraction of quota used */
  ratio: number;
  /** Formatted strings for UI */
  usedMB: string;
  quotaMB: string;
  percentUsed: number;
  /** Top storage consumers */
  breakdown: { key: string; bytes: number }[];
}

export function getStorageStatus(): StorageStatus {
  const usedBytes = getLocalStorageUsageBytes();
  const quotaBytes = estimateQuotaBytes();
  const ratio = Math.min(usedBytes / quotaBytes, 1);

  return {
    usedBytes,
    quotaBytes,
    ratio,
    usedMB: (usedBytes / (1024 * 1024)).toFixed(2),
    quotaMB: (quotaBytes / (1024 * 1024)).toFixed(0),
    percentUsed: Math.round(ratio * 100),
    breakdown: getStorageBreakdown(),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Thresholds
export const WARN_THRESHOLD = 0.8;   // 80 %
export const CRITICAL_THRESHOLD = 0.95; // 95 %

export type StorageSeverity = 'ok' | 'warning' | 'critical';

export function getSeverity(ratio: number): StorageSeverity {
  if (ratio >= CRITICAL_THRESHOLD) return 'critical';
  if (ratio >= WARN_THRESHOLD) return 'warning';
  return 'ok';
}
