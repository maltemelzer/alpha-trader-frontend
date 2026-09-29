// Feedback service for experiments (variants to compare, ratings, comments, usage figures).
// Runs next to the frontend container on the Pi; nginx forwards /feedback-api/ here. See feedback/README.md.
//
//   FEEDBACK_DB      SQLite file (default /data/feedback.db)
//   FEEDBACK_ADMINS  comma-separated game usernames that may read the evaluation
//   API_BASE         game server that verifies the login (default https://stable.alpha-trader.com)
//   PORT             default 8787
//   FEEDBACK_RETENTION_DAYS  delete data not changed for this many days (default 365, checked daily)
import { createServer } from 'node:http';
import { createHandler, cachedVerifier, HttpError } from './app.mjs';
import { openStore } from './store.mjs';

const API_BASE = process.env.API_BASE ?? 'https://stable.alpha-trader.com';
const admins = new Set(
  (process.env.FEEDBACK_ADMINS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

/** Asks the game server whose token this is. The answer also holds the token – only the name is read. */
async function lookup(token) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/user`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new HttpError(503, 'Spielserver nicht erreichbar');
  }
  if (res.status === 401 || res.status === 403) throw new HttpError(401, 'nicht angemeldet');
  if (!res.ok) throw new HttpError(503, `Spielserver antwortet ${res.status}`);
  const user = await res.json().catch(() => ({}));
  if (typeof user.username !== 'string' || !user.username) throw new HttpError(401, 'nicht angemeldet');
  return user.username;
}

const store = openStore(process.env.FEEDBACK_DB ?? '/data/feedback.db');

const retentionMs = Number(process.env.FEEDBACK_RETENTION_DAYS ?? 365) * 86_400_000;
const purge = () => {
  const n = store.purge(Date.now() - retentionMs);
  if (n) console.log(`deleted ${n} rows older than ${retentionMs / 86_400_000} days`);
};
purge();
setInterval(purge, 86_400_000).unref();
const handler = createHandler({ store, verify: cachedVerifier(lookup), admins });
const port = Number(process.env.PORT ?? 8787);

const server = createServer(handler).listen(port, () => {
  console.log(`feedback service on :${port}, ${admins.size} admin(s), game server ${API_BASE}`);
});

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    server.close();
    store.close();
    process.exit(0);
  });
}
