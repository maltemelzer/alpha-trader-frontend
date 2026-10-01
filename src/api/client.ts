import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './schema';
import { translate, type ApiMessage } from '../lib/messages';

export const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://stable.alpha-trader.com';
export const PARTNER_ID: string | undefined = import.meta.env.VITE_PARTNER_ID || undefined;

const TOKEN_KEY = 'at.token';
const REMEMBER_KEY = 'at.remember';
/** The JWT carries no `exp` – "stay signed in" gets its own limit. */
export const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;

function remembered(): string | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const { token, savedAt } = JSON.parse(raw) as { token?: unknown; savedAt?: unknown };
    if (typeof token === 'string' && typeof savedAt === 'number' && Date.now() - savedAt < REMEMBER_MS) return token;
    localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* unreadable or unavailable */
  }
  return null;
}

/** Token of this tab (sessionStorage), else a remembered one (localStorage, max. 30 days). */
export function getToken(): string | null {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) return token;
  } catch {
    /* storage unavailable */
  }
  return remembered();
}

/** Stores the token for this tab; `remember` also keeps it across browser restarts. `null` clears both. */
export function setToken(token: string | null, remember = false) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable – token lives only for this page load */
  }
  try {
    if (token && remember) localStorage.setItem(REMEMBER_KEY, JSON.stringify({ token, savedAt: Date.now() }));
    else if (!token) localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* storage unavailable */
  }
}

// Tabs share the login: a new tab asks the open ones for their token, logging out ends all tabs.
type AuthMessage = { type: 'ask' } | { type: 'token'; token: string } | { type: 'logout' };
const channel: BroadcastChannel | null = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('at.auth');

channel?.addEventListener('message', (e: MessageEvent<AuthMessage>) => {
  if (e.data?.type === 'ask') {
    const token = getToken();
    if (token) channel.postMessage({ type: 'token', token } satisfies AuthMessage);
  } else if (e.data?.type === 'logout' && getToken()) {
    setToken(null);
    window.dispatchEvent(new Event(LOGOUT_EVENT));
  }
});

/** Asks other open tabs for their token; resolves with it (and stores it) or `null` after `ms`. */
export function requestTokenFromOtherTabs(ms = 250): Promise<string | null> {
  if (!channel) return Promise.resolve(null);
  return new Promise((resolve) => {
    const done = (token: string | null) => {
      clearTimeout(timer);
      channel.removeEventListener('message', onMessage);
      if (token) setToken(token);
      resolve(token);
    };
    const onMessage = (e: MessageEvent<AuthMessage>) => {
      if (e.data?.type === 'token') done(e.data.token);
    };
    const timer = setTimeout(() => done(null), ms);
    channel.addEventListener('message', onMessage);
    channel.postMessage({ type: 'ask' } satisfies AuthMessage);
  });
}

/** Tells the other tabs to log out too. */
export function broadcastLogout() {
  channel?.postMessage({ type: 'logout' } satisfies AuthMessage);
}

// The JWT goes in `Authorization: Bearer …` – not in X-Authorization (that answers 401).
const auth: Middleware = {
  onRequest({ request }) {
    const token = getToken();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },
};

// An expired or invalid token logs the player out everywhere (see AuthProvider).
export const LOGOUT_EVENT = 'at:logout';
const expire: Middleware = {
  onResponse({ response }) {
    if (response.status === 401 && getToken()) {
      setToken(null);
      window.dispatchEvent(new Event(LOGOUT_EVENT));
    }
    return response;
  },
};

export const api = createClient<paths>({ baseUrl: API_BASE });
api.use(auth, expire);

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Unwraps an openapi-fetch result: returns data or throws ApiError. */
export async function unwrap<T>(p: Promise<{ data?: unknown; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await p;
  if (error !== undefined || !response.ok) {
    const e = (typeof error === 'object' && error) || {};
    const proto = 'messagePrototype' in e ? (e.messagePrototype as ApiMessage) : undefined;
    const msg = proto ? translate(proto) : 'message' in e ? String(e.message) : response.statusText;
    throw new ApiError(response.status, msg || `HTTP ${response.status}`);
  }
  return data as T;
}

/**
 * POST /user/token – the JWT is returned in `message`. The spec lists the credentials as query
 * parameters, but the server also reads them from a form body; keep them out of the URL (access logs).
 */
export async function login(username: string, password: string, remember = false): Promise<string> {
  const q = new URLSearchParams({ username, password });
  if (PARTNER_ID) q.set('partnerId', PARTNER_ID);
  const res = await fetch(`${API_BASE}/user/token`, { method: 'POST', body: q });
  const body: { message?: unknown } = await res.json().catch(() => ({}));
  if (!res.ok || typeof body.message !== 'string') throw new Error(`Login fehlgeschlagen (${res.status})`);
  setToken(body.message, remember);
  return body.message;
}
