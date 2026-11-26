import type { DataConnection, Peer, PeerError } from 'peerjs';
import type { Connection, HostEndpoint, Transport } from './protocol';

const CONNECT_TIMEOUT_MS = 20_000;
const MAX_RECONNECT_ATTEMPTS = 5;
const ID_PREFIX = 'ucs-';
const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Unguessable: the id is the only secret of a join link. */
function generateSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return ID_PREFIX + Array.from(bytes, (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join('');
}

export function isSessionId(value: string): boolean {
  return /^ucs-[a-z0-9]{20}$/.test(value);
}

function describeError(error: unknown): Error {
  const type = (error as Partial<PeerError<string>> | undefined)?.type;
  switch (type) {
    case 'peer-unavailable':
      return new Error('No session was found for this link. The host may have ended it.');
    case 'browser-incompatible':
      return new Error('This browser does not support peer-to-peer connections.');
    case 'webrtc':
    case 'negotiation':
      return new Error('A direct connection could not be established. A firewall or network may be blocking it.');
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed':
      return new Error('Could not reach the connection service. Check your internet connection.');
    default:
      return error instanceof Error ? error : new Error('The connection failed.');
  }
}

async function openPeer(id?: string): Promise<Peer> {
  const { Peer: PeerClass } = await import('peerjs');
  return new Promise<Peer>((resolve, reject) => {
    const peer = id ? new PeerClass(id) : new PeerClass();
    const timeout = window.setTimeout(() => {
      peer.destroy();
      reject(new Error('Could not reach the connection service. Check your internet connection.'));
    }, CONNECT_TIMEOUT_MS);
    peer.once('open', () => {
      window.clearTimeout(timeout);
      peer.off('error', onError);
      resolve(peer);
    });
    const onError = (error: unknown) => {
      window.clearTimeout(timeout);
      peer.destroy();
      reject(error);
    };
    peer.on('error', onError);
  });
}

function wrapConnection(connection: DataConnection, onClosed?: () => void): Connection {
  let messageListener: ((message: unknown) => void) | null = null;
  let closeListener: (() => void) | null = null;
  const buffered: unknown[] = [];
  let closed = false;

  const notifyClosed = () => {
    if (closed) return;
    closed = true;
    onClosed?.();
    closeListener?.();
  };
  connection.on('data', (data) => {
    if (messageListener) messageListener(data);
    else buffered.push(data);
  });
  connection.on('close', notifyClosed);
  connection.on('error', notifyClosed);

  return {
    id: connection.connectionId,
    send: (message) => {
      if (connection.open) connection.send(JSON.parse(JSON.stringify(message)));
    },
    onMessage: (listener) => {
      messageListener = listener;
      for (const data of buffered.splice(0)) listener(data);
    },
    onClose: (listener) => {
      closeListener = listener;
      if (closed) listener();
    },
    close: () => {
      if (closed) return;
      closed = true;
      onClosed?.();
      connection.close();
    },
  };
}

async function hostEndpoint(): Promise<HostEndpoint> {
  let peer: Peer | null = null;
  for (let attempt = 0; attempt < 3 && !peer; attempt += 1) {
    try {
      peer = await openPeer(generateSessionId());
    } catch (error) {
      if ((error as Partial<PeerError<string>>).type !== 'unavailable-id' || attempt === 2) throw describeError(error);
    }
  }
  if (!peer) throw new Error('Could not start the session.');

  const openedPeer = peer;
  let lostListener: ((reason: string) => void) | null = null;
  let reconnectAttempts = 0;
  let closed = false;

  openedPeer.on('error', (error) => {
    const type = (error as PeerError<string>).type;
    if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') {
      lostListener?.(describeError(error).message);
    }
  });
  // New guests need the broker; guests already connected keep working without it.
  openedPeer.on('disconnected', () => {
    if (closed || openedPeer.destroyed) return;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      lostListener?.('The connection service is unreachable, so new guests cannot join. Guests already connected keep working.');
      return;
    }
    reconnectAttempts += 1;
    window.setTimeout(() => {
      if (!closed && !openedPeer.destroyed) openedPeer.reconnect();
    }, 2000 * reconnectAttempts);
  });
  openedPeer.on('open', () => {
    reconnectAttempts = 0;
  });

  return {
    id: openedPeer.id,
    onConnection: (listener) => {
      openedPeer.on('connection', (dataConnection) => {
        dataConnection.on('open', () => listener(wrapConnection(dataConnection)));
      });
    },
    onLost: (listener) => {
      lostListener = listener;
    },
    close: () => {
      closed = true;
      openedPeer.destroy();
    },
  };
}

async function joinHost(hostId: string): Promise<Connection> {
  const peer = await openPeer().catch((error) => {
    throw describeError(error);
  });

  return new Promise<Connection>((resolve, reject) => {
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      peer.destroy();
      reject(describeError(error));
    };
    const timeout = window.setTimeout(
      () => fail(new Error('The host did not answer. Check the link and try again.')),
      CONNECT_TIMEOUT_MS,
    );
    peer.on('error', fail);

    const dataConnection = peer.connect(hostId, { reliable: true });
    dataConnection.on('error', fail);
    dataConnection.on('open', () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(wrapConnection(dataConnection, () => peer.destroy()));
    });
  });
}

export const peerTransport: Transport = {
  host: hostEndpoint,
  join: joinHost,
};
