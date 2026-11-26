import type { Character } from '../types';
import { applyCharacterPatch, diffCharacters, type Patch } from './patch';

/** The one character a session keeps in sync, wherever it lives (the app store, or a test double). */
export interface CharacterPort {
  get(): Character | undefined;
  /** Stores remote changes without firing automations or recording undo history. */
  replace(character: Character): void;
  subscribe(listener: () => void): () => void;
}

export const SYNC_INTERVAL_MS = 60;

/**
 * Turns local edits of a character into patches (at most one per interval) and applies patches from others.
 * `shadow` is the last state every peer is known to have, so only genuinely new local changes are sent.
 */
export class CharacterSync {
  private shadow: Character | undefined;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private applying = false;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly port: CharacterPort,
    private readonly send: (patch: Patch) => void,
    private readonly onGone: () => void,
    private readonly intervalMs = SYNC_INTERVAL_MS,
  ) {}

  start(): void {
    this.shadow = this.port.get();
    this.unsubscribe = this.port.subscribe(() => {
      if (this.applying) return;
      if (!this.port.get()) {
        this.onGone();
        return;
      }
      this.schedule();
    });
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Sends any local change that has not gone out yet. */
  flush(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    const current = this.port.get();
    if (!current || !this.shadow) return;
    const patch = diffCharacters(this.shadow, current);
    this.shadow = current;
    if (patch) this.send(patch);
  }

  /**
   * Applies a patch from someone else. `reapply` are local patches the host has not confirmed yet:
   * they will win on the host too, so they go back on top.
   */
  applyRemote(patch: Patch, reapply: readonly Patch[] = []): void {
    // Local edits made before this patch arrived must be ordered before it.
    this.flush();
    const current = this.port.get();
    if (!current) return;
    let next = applyCharacterPatch(current, patch);
    for (const pending of reapply) next = applyCharacterPatch(next, pending);
    if (next !== current) {
      this.applying = true;
      try {
        this.port.replace(next);
      } finally {
        this.applying = false;
      }
    }
    this.shadow = this.port.get() ?? next;
  }

  /** Treats the current state as agreed by everyone, e.g. after receiving a full snapshot. */
  resetBaseline(): void {
    this.shadow = this.port.get();
  }

  private schedule(): void {
    if (this.timer !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, this.intervalMs);
  }
}
