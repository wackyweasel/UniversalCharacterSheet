import { create } from 'zustand';
import { Character } from '../types';
import { stripImages } from '../utils/stripImages';

const TELEMETRY_STORAGE_KEY = 'ucs:telemetry';
const TELEMETRY_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyRj89srSi2oUB3ZYNkhALCf5LkAXVzzm5P4L2jYkWBmcB-8JLk9aUXfUtRW5XlZEPMYQ/exec';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface TelemetryState {
  // Map of characterId -> timestamp of last send
  lastSent: Record<string, number>;
  
  // Check if we should send telemetry for this character (24h rate limit)
  shouldSend: (characterId: string) => boolean;
  
  // Send telemetry for a character (respects rate limit)
  sendTelemetry: (character: Character) => void;
}

export const useTelemetryStore = create<TelemetryState>((set, get) => {
  // Load persisted state
  const persisted = (() => {
    try {
      const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
      if (!raw) return { lastSent: {} };
      return JSON.parse(raw) as { lastSent: Record<string, number> };
    } catch (e) {
      console.error('Failed to load telemetry state', e);
      return { lastSent: {} };
    }
  })();

  return {
    lastSent: persisted.lastSent,
    
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
  };
});
