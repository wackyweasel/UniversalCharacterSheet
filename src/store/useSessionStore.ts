import { create } from 'zustand';
import type { Character } from '../types';
import { GuestSession, HostSession, type SessionStatus } from '../collab/session';
import { isSessionId, peerTransport } from '../collab/peerTransport';
import { cleanName, SessionError, type CursorPosition, type CursorUpdate, type Participant, type SharedTimelineEntry } from '../collab/protocol';
import type { CharacterPort } from '../collab/sync';
import { useStore } from './useStore';
import { setLiveTimelineBridge, useTimelineStore } from './useTimelineStore';
import { useTelemetryStore } from './useTelemetryStore';

const NAME_STORAGE_KEY = 'ucs:sessionName';
const JOIN_HASH_PREFIX = '#join=';

/** Only counts and reasons are reported; never names, links, session ids or character content. */
function track(eventName: string, metadata?: Record<string, string | number | boolean>): void {
  useTelemetryStore.getState().recordEvent({ eventName, category: 'app', source: 'live_session', metadata });
}

function errorKind(error: unknown): string {
  return error instanceof SessionError ? error.kind : 'unknown';
}

function secondsSince(start: number): number {
  return Math.round((Date.now() - start) / 1000);
}

function endGuestTracking(reason: 'host_ended' | 'connection_lost' | 'left'): void {
  if (guestActiveAt === null) return;
  track('live_session_ended', { role: 'guest', reason, duration_s: secondsSince(guestActiveAt) });
  guestActiveAt = null;
}

export type SessionRole = 'none' | 'host' | 'guest';
type SessionPhase = 'idle' | 'starting' | 'connecting' | SessionStatus;
type Cursors = Record<string, CursorPosition>;

function withCursor(cursors: Cursors, id: string, at: CursorUpdate): Cursors {
  if (at === null) {
    if (!(id in cursors)) return cursors;
    const next = { ...cursors };
    delete next[id];
    return next;
  }
  return { ...cursors, [id]: at };
}

function addRemoteTimelineEntry(characterId: string, entry: SharedTimelineEntry): void {
  useTimelineStore.getState().addEvent(characterId, entry, { remote: true });
}

function onlyParticipants(cursors: Cursors, participants: Participant[]): Cursors {
  const ids = new Set(participants.map((participant) => participant.id));
  const kept = Object.entries(cursors).filter(([id]) => ids.has(id));
  return kept.length === Object.keys(cursors).length ? cursors : Object.fromEntries(kept);
}

interface SessionState {
  role: SessionRole;
  phase: SessionPhase;
  hostId: string | null;
  link: string | null;
  participants: Participant[];
  /** This tab's own participant id. */
  selfId: string | null;
  /** Where the other participants' pointers are, by participant id. */
  cursors: Cursors;
  characterId: string | null;
  /** Latest problem or ending reason to show the user. */
  detail: string | null;
  displayName: string;
  dialogOpen: boolean;
  /** A join link opened in this tab, waiting for the user to confirm. */
  pendingJoinId: string | null;

  setDisplayName: (name: string) => void;
  openDialog: () => void;
  closeDialog: () => void;
  setPendingJoinId: (hostId: string | null) => void;
  startHosting: (characterId: string) => Promise<void>;
  joinSession: (hostId: string) => Promise<void>;
  leaveSession: () => void;
  saveGuestCopy: () => boolean;
  /** Shares this tab's pointer position with the other participants. */
  sendCursor: (at: CursorUpdate) => void;
}

let hostSession: HostSession | null = null;
let guestSession: GuestSession | null = null;
let guestCharacterId: string | null = null;
let guestHostId: string | null = null;
let hostStartedAt = 0;
let hostPeakGuests = 0;
let guestActiveAt: number | null = null;
let pageHideInstalled = false;

function readStoredName(): string {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function buildJoinLink(hostId: string): string {
  return `${window.location.origin}${window.location.pathname}${JOIN_HASH_PREFIX}${hostId}`;
}

/** The session id in a `#join=` link, if the current URL has one. */
export function readJoinIdFromLocation(): string | null {
  if (!window.location.hash.startsWith(JOIN_HASH_PREFIX)) return null;
  const hostId = decodeURIComponent(window.location.hash.slice(JOIN_HASH_PREFIX.length));
  return isSessionId(hostId) ? hostId : null;
}

export function clearJoinHash(): void {
  if (!window.location.hash.startsWith(JOIN_HASH_PREFIX)) return;
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

function findCharacter(id: string | null): Character | undefined {
  return id ? useStore.getState().characters.find((character) => character.id === id) : undefined;
}

function subscribeToCharacter(getId: () => string | null, listener: () => void): () => void {
  let last = findCharacter(getId());
  return useStore.subscribe(() => {
    const current = findCharacter(getId());
    if (current === last) return;
    last = current;
    listener();
  });
}

function createStorePort(getId: () => string | null): CharacterPort {
  return {
    get: () => findCharacter(getId()),
    replace: (character) => {
      const id = getId();
      if (id) useStore.getState()._applyRemoteCharacter(id, character);
    },
    subscribe: (listener) => subscribeToCharacter(getId, listener),
  };
}

function installPageHide(): void {
  if (pageHideInstalled) return;
  pageHideInstalled = true;
  // Lets guests know right away instead of waiting for their connection to time out.
  window.addEventListener('pagehide', () => hostSession?.stop());
}

export const useSessionStore = create<SessionState>((set, get) => ({
  role: 'none',
  phase: 'idle',
  hostId: null,
  link: null,
  participants: [],
  selfId: null,
  cursors: {},
  characterId: null,
  detail: null,
  displayName: readStoredName(),
  dialogOpen: false,
  pendingJoinId: null,

  setDisplayName: (name) => {
    set({ displayName: name });
    try {
      localStorage.setItem(NAME_STORAGE_KEY, name);
    } catch {
      // The name is only a convenience; a blocked storage just means it is not remembered.
    }
  },
  openDialog: () => set({ dialogOpen: true }),
  closeDialog: () => set({ dialogOpen: false, pendingJoinId: null }),
  setPendingJoinId: (hostId) => set({ pendingJoinId: hostId, dialogOpen: hostId !== null ? true : get().dialogOpen }),

  startHosting: async (characterId) => {
    const state = get();
    const character = findCharacter(characterId);
    if (state.role !== 'none' || !character || useStore.getState().transientCharacterIds.includes(characterId)) return;

    installPageHide();
    set({ role: 'host', phase: 'starting', characterId, detail: null, participants: [], selfId: 'host', cursors: {}, hostId: null, link: null });
    const session = new HostSession(
      peerTransport,
      createStorePort(() => characterId),
      cleanName(state.displayName, 'Host'),
      {
        onParticipants: (participants) => {
          if (hostSession !== session) return;
          hostPeakGuests = Math.max(hostPeakGuests, participants.length - 1);
          set({ participants, cursors: onlyParticipants(get().cursors, participants) });
        },
        onCursor: (id, at) => {
          if (hostSession === session) set({ cursors: withCursor(get().cursors, id, at) });
        },
        onTimeline: (entry) => {
          if (hostSession === session) addRemoteTimelineEntry(characterId, entry);
        },
        onStatus: (status, detail) => {
          if (hostSession !== session) return;
          if (status === 'ended') {
            hostSession = null;
            track('live_session_ended', {
              role: 'host',
              reason: detail ? 'character_removed' : 'ended_by_host',
              duration_s: secondsSince(hostStartedAt),
              peak_guests: hostPeakGuests,
            });
            set({ role: 'none', phase: 'idle', hostId: null, link: null, characterId: null, participants: [], cursors: {}, selfId: null, detail: detail ?? null });
          } else if (status === 'error') {
            set({ detail: detail ?? null });
          }
        },
      },
    );
    hostSession = session;
    try {
      const hostId = await session.start();
      if (hostSession !== session) return;
      hostStartedAt = Date.now();
      hostPeakGuests = 0;
      track('live_session_started');
      set({ phase: 'active', hostId, link: buildJoinLink(hostId) });
    } catch (error) {
      if (hostSession === session) hostSession = null;
      session.stop();
      track('live_session_failed', { stage: 'start', kind: errorKind(error) });
      set({
        role: 'none',
        phase: 'idle',
        characterId: null,
        selfId: null,
        detail: error instanceof Error ? error.message : 'Could not start the session.',
      });
    }
  },

  joinSession: async (hostId) => {
    const previous = get();
    if (previous.role === 'host') hostSession?.stop();
    guestSession?.leave();
    endGuestTracking('left');

    // Reconnecting to the same host keeps the local copy instead of opening a new one.
    const reuseId = guestHostId === hostId ? guestCharacterId : null;
    guestHostId = hostId;
    guestCharacterId = reuseId;
    set({ role: 'guest', phase: 'connecting', hostId, link: null, characterId: reuseId, detail: null, participants: [], selfId: null, cursors: {}, pendingJoinId: null });

    const port = {
      ...createStorePort(() => guestCharacterId),
      open: (character: Character) => {
        guestCharacterId = useStore.getState()._openSharedCharacter(character, guestCharacterId);
        set({ characterId: guestCharacterId });
      },
    };
    const session = new GuestSession(peerTransport, port, get().displayName, {
      onParticipants: (participants) => {
        if (guestSession === session) set({ participants, cursors: onlyParticipants(get().cursors, participants) });
      },
      onCursor: (id, at) => {
        if (guestSession === session) set({ cursors: withCursor(get().cursors, id, at) });
      },
      onTimeline: (entry) => {
        if (guestSession === session && guestCharacterId) addRemoteTimelineEntry(guestCharacterId, entry);
      },
      onIdentity: (id) => {
        if (guestSession === session) set({ selfId: id });
      },
      onStatus: (status, detail) => {
        if (guestSession !== session) return;
        if (status === 'connecting') return;
        if (status === 'active' && guestActiveAt === null) {
          guestActiveAt = Date.now();
          track('live_session_joined', { participants: get().participants.length, reconnected: reuseId !== null });
        } else if (status !== 'active') {
          endGuestTracking(findCharacter(guestCharacterId) ? (status === 'ended' ? 'host_ended' : 'connection_lost') : 'left');
        }
        // After the host ends the session or the connection drops, the copy stays on screen.
        const gone = !findCharacter(guestCharacterId);
        if (gone && status === 'ended') {
          guestSession = null;
          guestCharacterId = null;
          guestHostId = null;
          set({ role: 'none', phase: 'idle', hostId: null, characterId: null, participants: [], selfId: null, cursors: {}, detail: null });
          return;
        }
        set({ phase: status, detail: detail ?? null, ...(status === 'active' ? {} : { cursors: {} }) });
      },
    });
    guestSession = session;
    try {
      await session.join(hostId);
    } catch (error) {
      if (guestSession !== session) return;
      guestSession = null;
      session.leave();
      track('live_session_failed', { stage: 'join', kind: errorKind(error) });
      const hadCopy = findCharacter(guestCharacterId) !== undefined;
      if (!hadCopy) {
        guestCharacterId = null;
        guestHostId = null;
      }
      set({
        role: hadCopy ? 'guest' : 'none',
        phase: hadCopy ? 'lost' : 'idle',
        hostId: hadCopy ? hostId : null,
        pendingJoinId: hadCopy ? null : hostId,
        detail: error instanceof Error ? error.message : 'Could not join the session.',
      });
    }
  },

  leaveSession: () => {
    const { role } = get();
    if (role === 'host') {
      hostSession?.stop();
      hostSession = null;
    } else if (role === 'guest') {
      guestSession?.leave();
      endGuestTracking('left');
      guestSession = null;
      guestCharacterId = null;
      guestHostId = null;
      useStore.getState().cleanupTransientCharacters();
    }
    set({ role: 'none', phase: 'idle', hostId: null, link: null, characterId: null, participants: [], selfId: null, cursors: {}, detail: null, dialogOpen: false });
  },

  sendCursor: (at) => {
    if (get().phase !== 'active') return;
    if (get().role === 'host') hostSession?.sendCursor(at);
    else guestSession?.sendCursor(at);
  },

  saveGuestCopy: () => {
    const character = findCharacter(get().characterId);
    if (!character || get().role !== 'guest') return false;
    useStore.getState().importCharacter(character, 'unknown');
    track('live_session_copy_saved');
    return true;
  },
}));

setLiveTimelineBridge({
  authorFor: (characterId) => {
    const { phase, characterId: sharedId, participants, selfId } = useSessionStore.getState();
    if (phase !== 'active' || characterId !== sharedId) return null;
    const self = participants.find((participant) => participant.id === selfId);
    return self ? { author: self.name, authorColor: self.color } : null;
  },
  publish: (_characterId, entry) => {
    if (useSessionStore.getState().role === 'host') hostSession?.sendTimeline(entry);
    else guestSession?.sendTimeline(entry);
  },
});
