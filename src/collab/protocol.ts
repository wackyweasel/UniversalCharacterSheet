import type { Character } from '../types';
import { isPatch, type Patch } from './patch';

export const PROTOCOL_VERSION = 2;
export const MAX_GUESTS = 8;
export const MAX_NAME_LENGTH = 32;

export type SessionErrorKind =
  | 'host_not_found'
  | 'unsupported_browser'
  | 'connection_blocked'
  | 'service_unreachable'
  | 'host_timeout'
  | 'rejected'
  | 'closed'
  | 'unknown';

/** An error with a message for the user and a kind that is safe to report in telemetry. */
export class SessionError extends Error {
  constructor(message: string, readonly kind: SessionErrorKind) {
    super(message);
  }
}

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  /** Hex colour that identifies this person's cursor and list entry. */
  color: string;
}

/** A pointer position in sheet coordinates, so it lands on the same spot whatever each person's pan and zoom. */
export interface CursorPosition {
  sheetId: string;
  x: number;
  y: number;
}

/** `null` means the pointer left the sheet. */
export type CursorUpdate = CursorPosition | null;

/** A timeline entry as a guest sends it; the host adds the author. */
export interface TimelineEntry {
  widgetLabel: string;
  widgetType: string;
  description: string;
  icon: string;
}

export interface SharedTimelineEntry extends TimelineEntry {
  author: string;
  authorColor: string;
}

export type GuestMessage =
  | { t: 'hello'; proto: number; name: string }
  | { t: 'patch'; n: number; patch: Patch }
  | { t: 'cursor'; at: CursorUpdate }
  | { t: 'timeline'; entry: TimelineEntry };

export type HostMessage =
  | { t: 'welcome'; you: string; character: Character; peers: Participant[] }
  | { t: 'reject'; reason: string }
  | { t: 'patch'; patch: Patch }
  | { t: 'ack'; n: number }
  | { t: 'peers'; peers: Participant[] }
  | { t: 'cursor'; id: string; at: CursorUpdate }
  | { t: 'timeline'; entry: SharedTimelineEntry }
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

const MAX_COORDINATE = 1_000_000;
const MAX_ID_LENGTH = 100;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

/** Colours handed out in join order; the host gets the first. */
export const PARTICIPANT_COLORS = [
  '#e8590c', '#1c7ed6', '#2f9e44', '#ae3ec9', '#e03131',
  '#0c8599', '#f08c00', '#5c7cfa', '#d6336c',
] as const;

function parseCursor(value: unknown): CursorUpdate | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const { sheetId, x, y } = value;
  if (typeof sheetId !== 'string' || sheetId.length === 0 || sheetId.length > MAX_ID_LENGTH) return undefined;
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  if (Math.abs(x) > MAX_COORDINATE || Math.abs(y) > MAX_COORDINATE) return undefined;
  return { sheetId, x, y };
}

const MAX_ENTRY_TEXT = 1000;

function parseTimelineEntry(value: unknown): TimelineEntry | undefined {
  if (!isRecord(value)) return undefined;
  const { widgetLabel, widgetType, description, icon } = value;
  if (typeof widgetLabel !== 'string' || typeof widgetType !== 'string' || typeof description !== 'string' || typeof icon !== 'string') return undefined;
  if (description.length > MAX_ENTRY_TEXT || widgetLabel.length > MAX_ENTRY_TEXT || widgetType.length > MAX_ID_LENGTH || icon.length > 16) return undefined;
  return { widgetLabel, widgetType, description, icon };
}

export function parseGuestMessage(value: unknown): GuestMessage | null {
  if (!isRecord(value)) return null;
  if (value.t === 'hello' && typeof value.proto === 'number') {
    return { t: 'hello', proto: value.proto, name: cleanName(value.name, 'Guest') };
  }
  if (value.t === 'patch' && typeof value.n === 'number' && isPatch(value.patch)) {
    return { t: 'patch', n: value.n, patch: value.patch };
  }
  if (value.t === 'cursor') {
    const at = parseCursor(value.at);
    return at === undefined ? null : { t: 'cursor', at };
  }
  if (value.t === 'timeline') {
    const entry = parseTimelineEntry(value.entry);
    return entry ? { t: 'timeline', entry } : null;
  }
  return null;
}

function isParticipantList(value: unknown): value is Participant[] {
  return Array.isArray(value) && value.every((entry) => (
    isRecord(entry)
    && typeof entry.id === 'string'
    && typeof entry.name === 'string'
    && typeof entry.isHost === 'boolean'
    && typeof entry.color === 'string'
    && COLOR_PATTERN.test(entry.color)
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
    case 'cursor': {
      const at = parseCursor(value.at);
      return typeof value.id === 'string' && at !== undefined ? { t: 'cursor', id: value.id, at } : null;
    }
    case 'timeline': {
      const entry = parseTimelineEntry(isRecord(value.entry) ? value.entry : null);
      const { author, authorColor } = isRecord(value.entry) ? value.entry : {};
      return entry && typeof author === 'string' && typeof authorColor === 'string' && COLOR_PATTERN.test(authorColor)
        ? { t: 'timeline', entry: { ...entry, author: cleanName(author, 'Guest'), authorColor } }
        : null;
    }
    case 'end':
      return { t: 'end' };
    default:
      return null;
  }
}
