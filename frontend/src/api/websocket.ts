// ---------------------------------------------------------------------------
// WebSocket client with auto-reconnect and typed message dispatching
// ---------------------------------------------------------------------------

import type { WsMessage } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MessageListener = (message: WsMessage) => void;
export type ConnectionListener = () => void;

interface WebSocketClient {
  /** Register a listener for incoming messages. Returns an unsubscribe function. */
  onMessage: (listener: MessageListener) => () => void;
  /** Register a listener for successful connections. Returns an unsubscribe function. */
  onConnect: (listener: ConnectionListener) => () => void;
  /** Register a listener for disconnections. Returns an unsubscribe function. */
  onDisconnect: (listener: ConnectionListener) => () => void;
  /** Close the connection and stop reconnecting. */
  close: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a WebSocket connection to the backend.
 * Automatically reconnects with exponential backoff on disconnection.
 */
export function createWebSocket(): WebSocketClient {
  const messageListeners = new Set<MessageListener>();
  const connectListeners = new Set<ConnectionListener>();
  const disconnectListeners = new Set<ConnectionListener>();

  let ws: WebSocket | null = null;
  let backoff = INITIAL_BACKOFF_MS;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  function getWsUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  function connect(): void {
    if (closed) return;

    ws = new WebSocket(getWsUrl());

    ws.addEventListener('open', () => {
      backoff = INITIAL_BACKOFF_MS;
      for (const listener of connectListeners) {
        listener();
      }
    });

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data) as WsMessage;
        for (const listener of messageListeners) {
          listener(data);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.addEventListener('close', () => {
      for (const listener of disconnectListeners) {
        listener();
      }
      scheduleReconnect();
    });

    ws.addEventListener('error', () => {
      // The close event will fire after this, triggering reconnect.
      ws?.close();
    });
  }

  function scheduleReconnect(): void {
    if (closed) return;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, backoff);

    backoff = Math.min(backoff * BACKOFF_MULTIPLIER, MAX_BACKOFF_MS);
  }

  function close(): void {
    closed = true;
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    ws?.close();
    ws = null;
    messageListeners.clear();
    connectListeners.clear();
    disconnectListeners.clear();
  }

  function onMessage(listener: MessageListener): () => void {
    messageListeners.add(listener);
    return () => messageListeners.delete(listener);
  }

  function onConnect(listener: ConnectionListener): () => void {
    connectListeners.add(listener);
    return () => connectListeners.delete(listener);
  }

  function onDisconnect(listener: ConnectionListener): () => void {
    disconnectListeners.add(listener);
    return () => disconnectListeners.delete(listener);
  }

  // Start the initial connection.
  connect();

  return { onMessage, onConnect, onDisconnect, close };
}
