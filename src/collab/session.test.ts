import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character } from '../types';
import { GuestSession, HostSession, type SessionStatus } from './session';
import type { Connection, HostEndpoint, Participant, Transport } from './protocol';
import type { CharacterPort } from './sync';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function makeConnection(id: string) {
  const side = () => ({ message: null as ((m: unknown) => void) | null, close: null as (() => void) | null });
  const a = side();
  const b = side();
  const state = { closed: false };
  const deliver = (target: ReturnType<typeof side>, message: unknown) => {
    if (state.closed) return;
    const copy = clone(message);
    queueMicrotask(() => target.message?.(copy));
  };
  const shutdown = () => {
    if (state.closed) return;
    state.closed = true;
    queueMicrotask(() => { a.close?.(); b.close?.(); });
  };
  const connection = (self: ReturnType<typeof side>, other: ReturnType<typeof side>): Connection => ({
    id,
    send: (message) => deliver(other, message),
    onMessage: (listener) => { self.message = listener; },
    onClose: (listener) => { self.close = listener; },
    close: shutdown,
  });
  return { host: connection(a, b), guest: connection(b, a) };
}

function memoryNetwork() {
  let counter = 0;
  let accept: ((connection: Connection) => void) | null = null;
  const transport: Transport = {
    async host(): Promise<HostEndpoint> {
      return {
        id: 'ucs-test',
        onConnection: (listener) => { accept = listener; },
        onLost: () => {},
        close: () => { accept = null; },
      };
    },
    async join(hostId) {
      if (hostId !== 'ucs-test' || !accept) throw new Error('No session was found for this link.');
      const pair = makeConnection(`guest-${++counter}`);
      accept(pair.host);
      return pair.guest;
    },
  };
  return transport;
}

class MemoryPort implements CharacterPort {
  character: Character | undefined;
  private readonly listeners = new Set<() => void>();
  constructor(character?: Character, private readonly id = 'local') {
    this.character = character;
  }
  get = () => this.character;
  replace = (character: Character) => { this.character = character; this.notify(); };
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  open = (character: Character) => { this.character = { ...character, id: this.id }; this.notify(); };
  edit(update: (character: Character) => Character) { this.character = update(this.character!); this.notify(); }
  remove() { this.character = undefined; this.notify(); }
  private notify() { for (const listener of [...this.listeners]) listener(); }
}

function sheetCharacter(): Character {
  const widget = (id: string) => ({ id, type: 'NUMBER', x: 0, y: 0, data: { value: 0 } });
  return {
    id: 'host-char',
    name: 'Hero',
    sheets: [
      { id: 'sheet-1', name: 'Main', widgets: [widget('hp'), widget('mana')] },
      { id: 'sheet-2', name: 'Notes', widgets: [] },
    ],
    activeSheetId: 'sheet-1',
  } as unknown as Character;
}

const setValue = (id: string, value: number) => (character: Character): Character => ({
  ...character,
  sheets: character.sheets.map((sheet) => ({
    ...sheet,
    widgets: sheet.widgets.map((widget) => widget.id === id ? { ...widget, data: { ...widget.data, value } } : widget),
  })),
});

const valueOf = (port: MemoryPort, id: string) => (
  port.character!.sheets.flatMap((sheet) => sheet.widgets).find((widget) => widget.id === id)!.data as unknown as { value: number }
).value;

async function settle() {
  await vi.advanceTimersByTimeAsync(200);
}

function callbacks() {
  const log = { statuses: [] as SessionStatus[], participants: [] as Participant[] };
  return {
    log,
    handlers: {
      onStatus: (status: SessionStatus) => { log.statuses.push(status); },
      onParticipants: (participants: Participant[]) => { log.participants = participants; },
    },
  };
}

async function startSession(guestCount = 1) {
  const transport = memoryNetwork();
  const hostPort = new MemoryPort(sheetCharacter(), 'host-char');
  const hostCallbacks = callbacks();
  const host = new HostSession(transport, hostPort, 'Host', hostCallbacks.handlers);
  const hostId = await host.start();

  const guests = [];
  for (let index = 0; index < guestCount; index += 1) {
    const port = new MemoryPort(undefined, `guest-copy-${index}`);
    const guestCallbacks = callbacks();
    const session = new GuestSession(transport, port, `Guest ${index + 1}`, guestCallbacks.handlers);
    const joined = session.join(hostId);
    await vi.advanceTimersByTimeAsync(10);
    await joined;
    guests.push({ port, session, callbacks: guestCallbacks });
  }
  return { host, hostPort, hostCallbacks, guests };
}

describe('live sessions', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('gives a joining guest the host character and lists who is present', async () => {
    const { hostPort, hostCallbacks, guests } = await startSession(2);

    expect(guests[0].port.character).toMatchObject({ id: 'guest-copy-0', name: 'Hero' });
    expect(guests[0].port.character!.sheets).toEqual(hostPort.character!.sheets);
    expect(hostCallbacks.log.participants.map((entry) => entry.name)).toEqual(['Host', 'Guest 1', 'Guest 2']);
    expect(guests[1].callbacks.log.participants).toHaveLength(3);
  });

  it('carries a guest edit to the host and to the other guests', async () => {
    const { hostPort, guests } = await startSession(2);

    guests[0].port.edit(setValue('hp', 12));
    await settle();

    expect(valueOf(hostPort, 'hp')).toBe(12);
    expect(valueOf(guests[1].port, 'hp')).toBe(12);
  });

  it('carries a host edit to every guest', async () => {
    const { hostPort, guests } = await startSession(2);

    hostPort.edit(setValue('mana', 5));
    await settle();

    expect(valueOf(guests[0].port, 'mana')).toBe(5);
    expect(valueOf(guests[1].port, 'mana')).toBe(5);
  });

  it('keeps edits to different widgets made at the same moment', async () => {
    const { hostPort, guests } = await startSession(1);

    hostPort.edit(setValue('hp', 3));
    guests[0].port.edit(setValue('mana', 8));
    await settle();

    for (const port of [hostPort, guests[0].port]) {
      expect(valueOf(port, 'hp')).toBe(3);
      expect(valueOf(port, 'mana')).toBe(8);
    }
  });

  it('ends with everyone agreeing when two people change the same value at once', async () => {
    const { hostPort, guests } = await startSession(2);

    hostPort.edit(setValue('hp', 1));
    guests[0].port.edit(setValue('hp', 2));
    guests[1].port.edit(setValue('hp', 3));
    await settle();

    const final = valueOf(hostPort, 'hp');
    expect([1, 2, 3]).toContain(final);
    expect(valueOf(guests[0].port, 'hp')).toBe(final);
    expect(valueOf(guests[1].port, 'hp')).toBe(final);
  });

  it('keeps a guest edit that is still waiting for the host over an older host change', async () => {
    const { hostPort, guests } = await startSession(1);

    // The host's value reaches the guest while the guest's own edit is still on its way to the host.
    guests[0].port.edit(setValue('hp', 20));
    await vi.advanceTimersByTimeAsync(61);
    hostPort.edit(setValue('hp', 10));
    await settle();

    expect(valueOf(hostPort, 'hp')).toBe(valueOf(guests[0].port, 'hp'));
  });

  it('does not share which sheet each person is looking at', async () => {
    const { hostPort, guests } = await startSession(1);

    guests[0].port.edit((character) => ({ ...character, activeSheetId: 'sheet-2' }));
    await settle();

    expect(hostPort.character!.activeSheetId).toBe('sheet-1');
    expect(guests[0].port.character!.activeSheetId).toBe('sheet-2');
  });

  it('lets guests keep their copy when the host ends the session', async () => {
    const { host, hostCallbacks, guests } = await startSession(1);

    host.stop();
    await settle();

    expect(hostCallbacks.log.statuses).toContain('ended');
    expect(guests[0].callbacks.log.statuses).toContain('ended');
    expect(guests[0].port.character).toBeDefined();

    guests[0].port.edit(setValue('hp', 99));
    await settle();
    expect(valueOf(guests[0].port, 'hp')).toBe(99);
  });

  it('stops hosting when the shared character is removed', async () => {
    const { hostPort, hostCallbacks, guests } = await startSession(1);

    hostPort.remove();
    await settle();

    expect(hostCallbacks.log.statuses).toContain('ended');
    expect(guests[0].callbacks.log.statuses).toContain('ended');
  });

  it('removes a guest from the list when they leave', async () => {
    const { hostCallbacks, guests } = await startSession(2);

    guests[0].session.leave();
    await settle();

    expect(hostCallbacks.log.participants.map((entry) => entry.name)).toEqual(['Host', 'Guest 2']);
  });

  it('rejects a link with no session behind it', async () => {
    const transport = memoryNetwork();
    const session = new GuestSession(transport, new MemoryPort(), 'Guest', callbacks().handlers);

    await expect(session.join('ucs-missing')).rejects.toThrow('No session');
  });
});
