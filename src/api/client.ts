import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './schema';
import { translate, type ApiMessage } from '../lib/messages';

export const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://stable.alpha-trader.com';
export const PARTNER_ID: string | undefined = import.meta.env.VITE_PARTNER_ID || undefined;

const TOKEN_KEY = 'at.token';

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable – token lives only for this page load */
  }
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

/** POST /user/token – the JWT is returned in `message`. */
export async function login(username: string, password: string): Promise<string> {
  const q = new URLSearchParams({ username, password });
  if (PARTNER_ID) q.set('partnerId', PARTNER_ID);
  const res = await fetch(`${API_BASE}/user/token?${q}`, { method: 'POST' });
  const body: { message?: unknown } = await res.json().catch(() => ({}));
  if (!res.ok || typeof body.message !== 'string') throw new Error(`Login fehlgeschlagen (${res.status})`);
  setToken(body.message);
  return body.message;
}
