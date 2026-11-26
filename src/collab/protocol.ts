import type { Character } from '../types';
import { isPatch, type Patch } from './patch';

export const PROTOCOL_VERSION = 1;
export const MAX_GUESTS = 8;
export const MAX_NAME_LENGTH = 32;

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
}

export type GuestMessage =
  | { t: 'hello'; proto: number; name: string }
  | { t: 'patch'; n: number; patch: Patch };

export type HostMessage =
  | { t: 'welcome'; you: string; character: Character; peers: Participant[] }
  | { t: 'reject'; reason: string }
  | { t: 'patch'; patch: Patch }
  | { t: 'ack'; n: number }
  | { t: 'peers'; peers: Participant[] }
  | { t: 'end' };

/** One ordered, reliable message channel between the host and a guest. */
export interface Connection {
  id: string;
  send(message: unknown): void;
  onMessage(listener: (message: unknown) => void): void;
  onClose(listener: () => void): void;
  close(): void;
}

export interface HostEndpoint {
  id: string;
  onConnection(listener: (connection: Connection) => void): void;
  /** Called when the host can no longer be reached by new guests and could not recover. */
  onLost(listener: (reason: string) => void): void;
  close(): void;
}

export interface Transport {
  host(): Promise<HostEndpoint>;
  join(hostId: string): Promise<Connection>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function cleanName(name: unknown, fallback: string): string {
  const cleaned = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH) : '';
  return cleaned || fallback;
}

export function parseGuestMessage(value: unknown): GuestMessage | null {
  if (!isRecord(value)) return null;
  if (value.t === 'hello' && typeof value.proto === 'number') {
    return { t: 'hello', proto: value.proto, name: cleanName(value.name, 'Guest') };
  }
  if (value.t === 'patch' && typeof value.n === 'number' && isPatch(value.patch)) {
    return { t: 'patch', n: value.n, patch: value.patch };
  }
  return null;
}

function isParticipantList(value: unknown): value is Participant[] {
  return Array.isArray(value) && value.every((entry) => (
    isRecord(entry) && typeof entry.id === 'string' && typeof entry.name === 'string' && typeof entry.isHost === 'boolean'
  ));
}

export function parseHostMessage(value: unknown): HostMessage | null {
  if (!isRecord(value)) return null;
  switch (value.t) {
    case 'welcome':
      return typeof value.you === 'string' && isRecord(value.character) && isParticipantList(value.peers)
        ? { t: 'welcome', you: value.you, character: value.character as unknown as Character, peers: value.peers }
        : null;
    case 'reject':
      return { t: 'reject', reason: typeof value.reason === 'string' ? value.reason : 'The host refused the connection.' };
    case 'patch':
      return isPatch(value.patch) ? { t: 'patch', patch: value.patch } : null;
    case 'ack':
      return typeof value.n === 'number' ? { t: 'ack', n: value.n } : null;
    case 'peers':
      return isParticipantList(value.peers) ? { t: 'peers', peers: value.peers } : null;
    case 'end':
      return { t: 'end' };
    default:
      return null;
  }
}
