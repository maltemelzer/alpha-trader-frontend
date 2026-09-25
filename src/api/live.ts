// Live updates over STOMP. The server speaks SockJS at /ws; its raw WebSocket transport
// (/ws/websocket) needs no SockJS client. One connection per page, shared by all hooks.
import { Client, type StompSubscription } from '@stomp/stompjs';
import { useEffect, useRef } from 'react';
import { API_BASE, getToken } from './client';

type Handler = (body: unknown) => void;

let client: Client | null = null;
const handlers = new Map<string, Set<Handler>>();
const subs = new Map<string, StompSubscription>();
let connects = 0;

const wsUrl = () => API_BASE.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws/websocket';

function subscribe(dest: string) {
  if (!client?.connected || subs.has(dest)) return;
  subs.set(
    dest,
    client.subscribe(dest, (frame) => {
      let body: unknown;
      try {
        body = JSON.parse(frame.body);
      } catch {
        return;
      }
      handlers.get(dest)?.forEach((h) => h(body));
    }),
  );
}

function connection() {
  if (client) return client;
  client = new Client({
    brokerURL: wsUrl(),
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    // The token may change between reconnects (new login) – read it every time.
    beforeConnect: (c) => {
      c.connectHeaders = { Authorization: `Bearer ${getToken() ?? ''}` };
    },
    onConnect: () => {
      subs.clear();
      handlers.forEach((_, dest) => subscribe(dest));
      connects += 1;
      if (connects > 1) window.dispatchEvent(new Event(LIVE_RECONNECTED_EVENT));
    },
  });
  client.activate();
  return client;
}

/** Fired after a reconnect – whatever was sent while offline must be refetched. */
export const LIVE_RECONNECTED_EVENT = 'at:live-reconnected';

/** Closes the connection (logout). */
export function disconnectLive() {
  const c = client;
  client = null;
  subs.clear();
  connects = 0;
  void c?.deactivate();
}

/** Calls `onMessage` with each JSON payload sent to `dest` (e.g. `/user/topic/my/chats`). */
export function useTopic<T>(dest: string | null, onMessage: (body: T) => void) {
  const ref = useRef(onMessage);
  useEffect(() => {
    ref.current = onMessage;
  });
  useEffect(() => {
    if (!dest || !getToken()) return;
    const h: Handler = (b) => ref.current(b as T);
    let set = handlers.get(dest);
    if (!set) handlers.set(dest, (set = new Set()));
    set.add(h);
    connection();
    subscribe(dest);
    return () => {
      set.delete(h);
      if (set.size === 0) {
        handlers.delete(dest);
        try {
          subs.get(dest)?.unsubscribe();
        } catch {
          /* connection already gone */
        }
        subs.delete(dest);
      }
    };
  }, [dest]);
}
