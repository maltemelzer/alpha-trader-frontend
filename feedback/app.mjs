// HTTP handling of the feedback service: validation, login check, rate limit, evaluation.
// Everything lives under PREFIX (nginx forwards /feedback-api/… unchanged). No framework, node:http only.
import { createHash } from 'node:crypto';

export const PREFIX = '/feedback-api';
const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const TARGET = /^[a-z0-9/_:-]{1,60}$/;
export const MAX_COMMENT = 2000;
const MAX_BODY = 16 * 1024;
const MAX_DWELL = 30 * 60_000; // per batch – a tab left open all night does not count as 8 hours of reading

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const isId = (s) => typeof s === 'string' && ID.test(s);

/** Checks a rating from the dialog; returns the cleaned value or throws 400. */
export function parseRating(body) {
  const { experiment, variant, stars, comment = '' } = body ?? {};
  if (!isId(experiment) || !isId(variant)) throw new HttpError(400, 'experiment/variant ungültig');
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new HttpError(400, 'stars muss 1–5 sein');
  if (typeof comment !== 'string') throw new HttpError(400, 'comment muss Text sein');
  const text = comment.trim();
  if (text.length > MAX_COMMENT) throw new HttpError(400, `comment höchstens ${MAX_COMMENT} Zeichen`);
  return { experiment, variant, stars, comment: text };
}

export function parseFavorite(body) {
  const { experiment, variant } = body ?? {};
  if (!isId(experiment) || !isId(variant)) throw new HttpError(400, 'experiment/variant ungültig');
  return { experiment, variant };
}

/** Usage batch: `visit` (a new page view), `dwellMs` (visible time), `clicks` ({ target: n }). */
export function parseUsage(body) {
  const { experiment, variant, visit = false, dwellMs = 0, clicks = {} } = body ?? {};
  if (!isId(experiment) || !isId(variant)) throw new HttpError(400, 'experiment/variant ungültig');
  if (typeof visit !== 'boolean') throw new HttpError(400, 'visit muss true/false sein');
  if (typeof dwellMs !== 'number' || !Number.isFinite(dwellMs) || dwellMs < 0) throw new HttpError(400, 'dwellMs ungültig');
  if (typeof clicks !== 'object' || clicks === null || Array.isArray(clicks)) throw new HttpError(400, 'clicks ungültig');
  const entries = Object.entries(clicks);
  if (entries.length > 20) throw new HttpError(400, 'zu viele Klickziele');
  const clean = {};
  for (const [target, n] of entries) {
    if (!TARGET.test(target) || !Number.isInteger(n) || n < 1) throw new HttpError(400, 'Klickziel ungültig');
    clean[target] = Math.min(n, 100);
  }
  return { experiment, variant, visits: visit ? 1 : 0, dwellMs: Math.round(Math.min(dwellMs, MAX_DWELL)), clicks: clean };
}

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Evaluation per variant from the raw rows of `store.rows()`. */
export function summarize(experiment, rows) {
  const variants = {};
  const of = (v) =>
    (variants[v] ??= { people: 0, visits: 0, dwellMedianMs: null, dwell: [], ratings: 0, stars: [0, 0, 0, 0, 0], avgStars: null, favorites: 0, clicks: [] });
  for (const e of rows.exposures) {
    const v = of(e.variant);
    v.people += 1;
    v.visits += e.visits;
    v.dwell.push(e.visits ? e.dwell_ms / e.visits : e.dwell_ms);
  }
  for (const r of rows.ratings) {
    const v = of(r.variant);
    v.ratings += 1;
    v.stars[r.stars - 1] += 1;
  }
  for (const f of rows.favorites) of(f.variant).favorites = f.n;
  for (const c of rows.clicks) of(c.variant).clicks.push({ target: c.target, count: c.count });
  for (const v of Object.values(variants)) {
    v.dwellMedianMs = median(v.dwell);
    delete v.dwell;
    const sum = v.stars.reduce((s, n, i) => s + n * (i + 1), 0);
    v.avgStars = v.ratings ? sum / v.ratings : null;
    v.clicks = v.clicks.slice(0, 12);
  }
  return { experiment, variants, comments: rows.ratings };
}

/** Fixed-window limit per key (player): `max` requests per `windowMs`. */
export function rateLimiter(max, windowMs) {
  const hits = new Map();
  return (key, now) => {
    const h = hits.get(key);
    if (!h || now - h.start >= windowMs) {
      hits.set(key, { start: now, n: 1 });
      if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
      return true;
    }
    h.n += 1;
    return h.n <= max;
  };
}

/**
 * Login check with cache: the game's JWT is verified by asking the game server who it belongs to
 * (`GET /api/user`). Only the username is kept – never the token (the cache key is its hash).
 */
export function cachedVerifier(lookup, ttlMs = 10 * 60_000) {
  const cache = new Map();
  return async (token, now) => {
    const key = createHash('sha256').update(token).digest('hex');
    const hit = cache.get(key);
    if (hit && hit.until > now) return hit.username;
    const username = await lookup(token);
    if (cache.size > 2000) cache.clear();
    cache.set(key, { username, until: now + ttlMs });
    return username;
  };
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw new HttpError(413, 'zu groß');
    chunks.push(c);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'kein JSON');
  }
}

/**
 * The request handler. `verify(token, now)` → username or throws HttpError(401/503);
 * `admins` = lower-case usernames allowed to read the evaluation.
 */
export function createHandler({ store, verify, admins, now = () => Date.now(), limit = rateLimiter(120, 60_000) }) {
  const isAdmin = (u) => admins.has(u.toLowerCase());

  async function route(req, url) {
    const path = url.pathname.startsWith(PREFIX) ? url.pathname.slice(PREFIX.length) || '/' : url.pathname;
    if (req.method === 'GET' && path === '/health') return { ok: true };

    const auth = req.headers.authorization ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token) throw new HttpError(401, 'nicht angemeldet');
    const t = now();
    const username = await verify(token, t);
    if (!limit(username.toLowerCase(), t)) throw new HttpError(429, 'zu viele Anfragen');

    const experiment = url.searchParams.get('experiment') ?? '';
    switch (`${req.method} ${path}`) {
      case 'GET /me':
        if (!isId(experiment)) throw new HttpError(400, 'experiment fehlt');
        return { username, admin: isAdmin(username), ...store.mine(experiment, username) };
      case 'PUT /rating': {
        const r = parseRating(await readJson(req));
        store.saveRating({ ...r, username }, t);
        return { ok: true };
      }
      case 'PUT /favorite': {
        const f = parseFavorite(await readJson(req));
        store.saveFavorite({ ...f, username }, t);
        return { ok: true };
      }
      case 'POST /usage': {
        const u = parseUsage(await readJson(req));
        store.saveUsage({ ...u, username }, t);
        return { ok: true };
      }
      case 'GET /results':
        if (!isAdmin(username)) throw new HttpError(403, 'nur für Auswertende');
        if (!isId(experiment)) throw new HttpError(400, 'experiment fehlt');
        return summarize(experiment, store.rows(experiment));
      case 'GET /experiments':
        if (!isAdmin(username)) throw new HttpError(403, 'nur für Auswertende');
        return store.experiments();
      default:
        throw new HttpError(404, 'unbekannt');
    }
  }

  return async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local');
    let status = 200;
    let body;
    try {
      body = await route(req, url);
    } catch (e) {
      status = e instanceof HttpError ? e.status : 500;
      body = { error: e instanceof HttpError ? e.message : 'Fehler' };
      if (status === 500) console.error(e);
    }
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  };
}
