import type { Character } from '../types';
import {
  MAX_GUESTS,
  PROTOCOL_VERSION,
  cleanName,
  parseGuestMessage,
  parseHostMessage,
  type Connection,
  type HostEndpoint,
  type HostMessage,
  type Participant,
  type Transport,
} from './protocol';
import { CharacterSync, type CharacterPort } from './sync';
import type { Patch } from './patch';

export type SessionStatus = 'connecting' | 'active' | 'ended' | 'lost' | 'error';

export interface SessionCallbacks {
  onParticipants(participants: Participant[]): void;
  onStatus(status: SessionStatus, detail?: string): void;
}

const JOIN_TIMEOUT_MS = 20_000;
const END_GRACE_MS = 150;

interface Guest {
  id: string;
  name: string;
  connection: Connection;
}

/** Owns the character: every change from a guest goes through it, and it tells everyone else. */
export class HostSession {
  private readonly guests = new Map<string, Guest>();
  private endpoint: HostEndpoint | null = null;
  private sync: CharacterSync | null = null;
  private stopped = false;

  constructor(
    private readonly transport: Transport,
    private readonly port: CharacterPort,
    private readonly hostName: string,
    private readonly callbacks: SessionCallbacks,
  ) {}

  /** Starts accepting guests and returns the id they join with. */
  async start(): Promise<string> {
    const endpoint = await this.transport.host();
    this.endpoint = endpoint;
    this.sync = new CharacterSync(
      this.port,
      (patch) => this.broadcast({ t: 'patch', patch }),
      () => this.stop('ended', 'The shared character was removed.'),
    );
    this.sync.start();
    endpoint.onConnection((connection) => this.accept(connection));
    endpoint.onLost((reason) => this.callbacks.onStatus('error', reason));
    this.callbacks.onStatus('active');
    this.callbacks.onParticipants(this.participants());
    return endpoint.id;
  }

  stop(status: SessionStatus = 'ended', detail?: string): void {
    if (this.stopped) return;
    this.stopped = true;
    this.sync?.flush();
    this.sync?.stop();
    this.broadcast({ t: 'end' });
    const guests = [...this.guests.values()];
    const endpoint = this.endpoint;
    this.guests.clear();
    // Closing right away can drop the message that tells guests the session is over.
    setTimeout(() => {
      for (const guest of guests) guest.connection.close();
      endpoint?.close();
    }, END_GRACE_MS);
    this.callbacks.onStatus(status, detail);
    this.callbacks.onParticipants([]);
  }

  private participants(): Participant[] {
    return [
      { id: 'host', name: this.hostName, isHost: true },
      ...[...this.guests.values()].map((guest) => ({ id: guest.id, name: guest.name, isHost: false })),
    ];
  }

  private broadcast(message: HostMessage, exceptId?: string): void {
    for (const guest of this.guests.values()) {
      if (guest.id !== exceptId) guest.connection.send(message);
    }
  }

  private announcePeers(): void {
    const peers = this.participants();
    this.broadcast({ t: 'peers', peers });
    this.callbacks.onParticipants(peers);
  }

  private accept(connection: Connection): void {
    let guest: Guest | null = null;

    connection.onMessage((raw) => {
      const message = parseGuestMessage(raw);
      if (!message || this.stopped || !this.sync) return;

      if (!guest) {
        if (message.t !== 'hello') return;
        const refusal = message.proto !== PROTOCOL_VERSION
          ? 'This session runs a different version of the app. Reload the page and try again.'
          : this.guests.size >= MAX_GUESTS ? 'This session is full.' : null;
        if (refusal) {
          connection.send({ t: 'reject', reason: refusal });
          connection.close();
          return;
        }
        // Everything the host did so far is part of the snapshot; later changes reach the guest as patches.
        this.sync.flush();
        const character = this.port.get();
        if (!character) return;
        guest = { id: connection.id, name: message.name, connection };
        this.guests.set(guest.id, guest);
        connection.send({ t: 'welcome', you: guest.id, character, peers: this.participants() });
        this.announcePeers();
        return;
      }

      if (message.t === 'patch') {
        this.sync.applyRemote(message.patch);
        this.broadcast({ t: 'patch', patch: message.patch }, guest.id);
        connection.send({ t: 'ack', n: message.n });
      }
    });

    connection.onClose(() => {
      if (!guest || this.guests.get(guest.id) !== guest || this.stopped) return;
      this.guests.delete(guest.id);
      this.announcePeers();
    });
  }
}

export interface GuestPort extends CharacterPort {
  /** Shows the snapshot as a local, unsaved copy of the shared character (reusing it after a reconnect). */
  open(character: Character): void;
}

/** A temporary copy of the host's character that sends its edits to the host. */
export class GuestSession {
  private connection: Connection | null = null;
  private sync: CharacterSync | null = null;
  private pending: { n: number; patch: Patch }[] = [];
  private counter = 0;
  private finished = false;

  constructor(
    private readonly transport: Transport,
    private readonly port: GuestPort,
    private readonly guestName: string,
    private readonly callbacks: SessionCallbacks,
  ) {}

  /** Resolves once the host has sent the character; rejects if the host cannot be reached or refuses. */
  async join(hostId: string): Promise<void> {
    this.callbacks.onStatus('connecting');
    const connection = await this.transport.join(hostId);
    this.connection = connection;

    await new Promise<void>((resolve, reject) => {
      let welcomed = false;
      const timeout = setTimeout(() => {
        if (welcomed) return;
        reject(new Error('The host did not answer. Check the link and try again.'));
        this.fail(connection);
      }, JOIN_TIMEOUT_MS);

      connection.onMessage((raw) => {
        const message = parseHostMessage(raw);
        if (!message || this.finished) return;
        switch (message.t) {
          case 'welcome':
            welcomed = true;
            clearTimeout(timeout);
            this.welcome(message.character, message.peers);
            resolve();
            break;
          case 'reject':
            clearTimeout(timeout);
            reject(new Error(message.reason));
            this.fail(connection);
            break;
          case 'patch':
            this.sync?.applyRemote(message.patch, this.pending.map((entry) => entry.patch));
            break;
          case 'ack':
            this.pending = this.pending.filter((entry) => entry.n > message.n);
            break;
          case 'peers':
            this.callbacks.onParticipants(message.peers);
            break;
          case 'end':
            this.finish('ended', 'The host ended the session.');
            break;
        }
      });

      connection.onClose(() => {
        if (!welcomed) {
          clearTimeout(timeout);
          reject(new Error('Could not connect to the host.'));
        }
        this.finish('lost', 'The connection to the host was lost. The host may have ended the session.');
      });

      connection.send({ t: 'hello', proto: PROTOCOL_VERSION, name: cleanName(this.guestName, 'Guest') });
    });
  }

  /** Leaves the session; the local copy stays until the caller removes it. */
  leave(): void {
    this.finished = true;
    this.sync?.stop();
    this.connection?.close();
    this.connection = null;
  }

  private welcome(character: Character, peers: Participant[]): void {
    this.sync?.stop();
    this.pending = [];
    this.port.open(character);
    this.sync = new CharacterSync(
      this.port,
      (patch) => {
        const n = ++this.counter;
        this.pending.push({ n, patch });
        this.connection?.send({ t: 'patch', n, patch });
      },
      () => this.leaveAndReport('ended', 'You left the shared character.'),
    );
    this.sync.start();
    this.callbacks.onParticipants(peers);
    this.callbacks.onStatus('active');
  }

  private leaveAndReport(status: SessionStatus, detail: string): void {
    if (this.finished) return;
    this.leave();
    this.callbacks.onStatus(status, detail);
    this.callbacks.onParticipants([]);
  }

  private finish(status: SessionStatus, detail: string): void {
    if (this.finished) return;
    this.finished = true;
    this.sync?.stop();
    this.connection?.close();
    this.connection = null;
    this.callbacks.onStatus(status, detail);
    this.callbacks.onParticipants([]);
  }

  private fail(connection: Connection): void {
    this.finished = true;
    this.sync?.stop();
    connection.close();
    this.connection = null;
  }
}
