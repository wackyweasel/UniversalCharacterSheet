import { create } from 'zustand';
import type { Character } from '../types';
import { GuestSession, HostSession, type SessionStatus } from '../collab/session';
import { isSessionId, peerTransport } from '../collab/peerTransport';
import { cleanName, type Participant } from '../collab/protocol';
import type { CharacterPort } from '../collab/sync';
import { useStore } from './useStore';

const NAME_STORAGE_KEY = 'ucs:sessionName';
const JOIN_HASH_PREFIX = '#join=';

export type SessionRole = 'none' | 'host' | 'guest';
type SessionPhase = 'idle' | 'starting' | 'connecting' | SessionStatus;

interface SessionState {
  role: SessionRole;
  phase: SessionPhase;
  hostId: string | null;
  link: string | null;
  participants: Participant[];
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
}

let hostSession: HostSession | null = null;
let guestSession: GuestSession | null = null;
let guestCharacterId: string | null = null;
let guestHostId: string | null = null;
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
    set({ role: 'host', phase: 'starting', characterId, detail: null, participants: [], hostId: null, link: null });
    const session = new HostSession(
      peerTransport,
      createStorePort(() => characterId),
      cleanName(state.displayName, 'Host'),
      {
        onParticipants: (participants) => {
          if (hostSession === session) set({ participants });
        },
        onStatus: (status, detail) => {
          if (hostSession !== session) return;
          if (status === 'ended') {
            hostSession = null;
            set({ role: 'none', phase: 'idle', hostId: null, link: null, characterId: null, participants: [], detail: detail ?? null });
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
      set({ phase: 'active', hostId, link: buildJoinLink(hostId) });
    } catch (error) {
      if (hostSession === session) hostSession = null;
      session.stop();
      set({
        role: 'none',
        phase: 'idle',
        characterId: null,
        detail: error instanceof Error ? error.message : 'Could not start the session.',
      });
    }
  },

  joinSession: async (hostId) => {
    const previous = get();
    if (previous.role === 'host') hostSession?.stop();
    guestSession?.leave();

    // Reconnecting to the same host keeps the local copy instead of opening a new one.
    const reuseId = guestHostId === hostId ? guestCharacterId : null;
    guestHostId = hostId;
    guestCharacterId = reuseId;
    set({ role: 'guest', phase: 'connecting', hostId, link: null, characterId: reuseId, detail: null, participants: [], pendingJoinId: null });

    const port = {
      ...createStorePort(() => guestCharacterId),
      open: (character: Character) => {
        guestCharacterId = useStore.getState()._openSharedCharacter(character, guestCharacterId);
        set({ characterId: guestCharacterId });
      },
    };
    const session = new GuestSession(peerTransport, port, get().displayName, {
      onParticipants: (participants) => {
        if (guestSession === session) set({ participants });
      },
      onStatus: (status, detail) => {
        if (guestSession !== session) return;
        if (status === 'connecting') return;
        // After the host ends the session or the connection drops, the copy stays on screen.
        const gone = !findCharacter(guestCharacterId);
        if (gone && status === 'ended') {
          guestSession = null;
          guestCharacterId = null;
          guestHostId = null;
          set({ role: 'none', phase: 'idle', hostId: null, characterId: null, participants: [], detail: null });
          return;
        }
        set({ phase: status, detail: detail ?? null });
      },
    });
    guestSession = session;
    try {
      await session.join(hostId);
    } catch (error) {
      if (guestSession !== session) return;
      guestSession = null;
      session.leave();
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
      guestSession = null;
      guestCharacterId = null;
      guestHostId = null;
      useStore.getState().cleanupTransientCharacters();
    }
    set({ role: 'none', phase: 'idle', hostId: null, link: null, characterId: null, participants: [], detail: null, dialogOpen: false });
  },

  saveGuestCopy: () => {
    const character = findCharacter(get().characterId);
    if (!character || get().role !== 'guest') return false;
    useStore.getState().importCharacter(character, 'unknown');
    return true;
  },
}));
