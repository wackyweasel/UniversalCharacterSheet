import { create } from 'zustand';
import { Character } from '../types';
import { stripImages } from '../utils/stripImages';

const TELEMETRY_STORAGE_KEY = 'ucs:telemetry';
const TELEMETRY_CLIENT_ID_KEY = 'ucs:telemetry:clientId';
const TELEMETRY_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwUQu3cqszUWcpBAQ48ChXkUPgs9wFX23PzZDtYc6G-pWvtp9XCs1tdutePaO8CyvyVPw/exec';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const VISIT_WINDOWS = [
  { key: '1h', eventName: 'visit_1h', durationMs: 60 * 60 * 1000 },
  { key: '8h', eventName: 'visit_8h', durationMs: 8 * 60 * 60 * 1000 },
  { key: '24h', eventName: 'visit_24h', durationMs: 24 * 60 * 60 * 1000 },
  { key: '7d', eventName: 'visit_7d', durationMs: 7 * 24 * 60 * 60 * 1000 },
  { key: '1m', eventName: 'visit_1m', durationMs: 30 * 24 * 60 * 60 * 1000 },
] as const;

type VisitWindowKey = typeof VISIT_WINDOWS[number]['key'];
type LastVisitTime = Partial<Record<VisitWindowKey, number>>;

type TelemetryCategory = 'character' | 'sheet' | 'widget' | 'template' | 'theme' | 'gallery' | 'print' | 'timeline' | 'view' | 'app';

type TelemetryMetadata = Record<string, string | number | boolean | null | undefined>;

export interface TelemetryEventInput {
  eventName: string;
  category: TelemetryCategory;
  characterId?: string | null;
  sheetId?: string | null;
  mode?: string | null;
  widgetType?: string | null;
  source?: string | null;
  metadata?: TelemetryMetadata;
}

function createRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getClientId(): string {
  try {
    const existing = localStorage.getItem(TELEMETRY_CLIENT_ID_KEY);
    if (existing) return existing;

    const clientId = createRandomId();
    localStorage.setItem(TELEMETRY_CLIENT_ID_KEY, clientId);
    return clientId;
  } catch {
    return 'unknown';
  }
}

const sessionId = createRandomId();
let visitRequestQueue: Promise<void> = Promise.resolve();

function postTelemetryEvent(event: TelemetryEventInput): Promise<void> {
  const payload = {
    kind: 'event',
    clientTimestamp: new Date().toISOString(),
    eventName: event.eventName,
    category: event.category,
    sessionId,
    clientId: getClientId(),
    characterId: event.characterId ?? null,
    sheetId: event.sheetId ?? null,
    mode: event.mode ?? null,
    widgetType: event.widgetType ?? null,
    source: event.source ?? null,
    metadata: event.metadata ?? {},
  };

  return fetch(TELEMETRY_ENDPOINT, {
    method: 'POST',
    mode: 'no-cors',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).then(() => undefined).catch((e) => {
    console.debug('Telemetry event send failed (this is okay):', e);
  });
}

interface TelemetryState {
  // Map of characterId -> timestamp of last send
  lastSent: Record<string, number>;

  // Map of visit window -> timestamp of the last event sent for that window
  lastVisitTime: LastVisitTime;
  
  // Check if we should send telemetry for this character (24h rate limit)
  shouldSend: (characterId: string) => boolean;
  
  // Send telemetry for a character (respects rate limit)
  sendTelemetry: (character: Character) => void;

  // Record visit events, with one independent rate limit per visit window
  recordVisit: () => void;

  // Record a workflow event in the Telemetry sheet (not rate-limited)
  recordEvent: (event: TelemetryEventInput) => void;
}

export const useTelemetryStore = create<TelemetryState>((set, get) => {
  // Load persisted state
  const persisted = (() => {
    try {
      const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
      if (!raw) return { lastSent: {}, lastVisitTime: {} };
      const data = JSON.parse(raw) as {
        lastSent?: Record<string, number>;
        lastVisitTime?: LastVisitTime;
      };
      return {
        lastSent: data.lastSent ?? {},
        lastVisitTime: data.lastVisitTime ?? {},
      };
    } catch (e) {
      console.error('Failed to load telemetry state', e);
      return { lastSent: {}, lastVisitTime: {} };
    }
  })();

  return {
    lastSent: persisted.lastSent,
    lastVisitTime: persisted.lastVisitTime,
    
    shouldSend: (characterId: string) => {
      const lastSent = get().lastSent[characterId];
      if (!lastSent) return true;
      return Date.now() - lastSent > TWENTY_FOUR_HOURS_MS;
    },
    
    sendTelemetry: (character: Character) => {
      const { shouldSend, lastSent } = get();
      
      // Check rate limit
      if (!shouldSend(character.id)) {
        return;
      }
      
      // Strip images and send
      const strippedCharacter = stripImages(character);
      
      // Update state immediately (optimistic)
      const newLastSent = { ...lastSent, [character.id]: Date.now() };
      set({ lastSent: newLastSent });
      
      // Persist to localStorage
      try {
        localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify({ lastSent: newLastSent }));
      } catch (e) {
        console.error('Failed to persist telemetry state', e);
      }
      
      // Send to endpoint (fire-and-forget, don't await)
      fetch(TELEMETRY_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors', // Google Apps Script requires this from browser
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(strippedCharacter),
      }).catch((e) => {
        // Silently fail - telemetry is not critical
        console.debug('Telemetry send failed (this is okay):', e);
      });
    },

    recordVisit: () => {
      const { lastSent, lastVisitTime } = get();
      const now = Date.now();
      const windowsToSend = VISIT_WINDOWS.filter(({ key, durationMs }) => {
        const lastSentTime = lastVisitTime[key];
        return lastSentTime === undefined || now - lastSentTime >= durationMs;
      });

      if (windowsToSend.length === 0) return;

      const newLastVisitTime = { ...lastVisitTime };
      windowsToSend.forEach(({ key }) => {
        newLastVisitTime[key] = now;
      });
      set({ lastVisitTime: newLastVisitTime });

      try {
        localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify({
          lastSent,
          lastVisitTime: newLastVisitTime,
        }));
      } catch (e) {
        console.error('Failed to persist visit telemetry state', e);
      }

      windowsToSend.forEach(({ key, eventName, durationMs }) => {
        const event = {
          eventName,
          category: 'view' as const,
          source: 'visit_window',
          metadata: {
            window: key,
            windowMilliseconds: durationMs,
          },
        };
        visitRequestQueue = visitRequestQueue.then(() => postTelemetryEvent(event));
      });
    },

    recordEvent: (event) => {
      void postTelemetryEvent(event);
    },
  };
});
