#!/usr/bin/env node
// Read-only API probe for development: logs in with the credentials from .env and GETs a path.
// Only GET is supported on purpose – stable is the live game.
//
//   npm run api:get -- /api/v2/my/portfolio
//   npm run api:get -- /api/listings/STALSTERKS --base https://nightly.alpha-trader.com
//
// Prints the JSON response. Never prints the token.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function fail(msg) {
  console.error(`api:get: ${msg}`);
  process.exit(1);
}

// Some responses carry credentials (GET /api/user returns the JWT as `jwtToken`) – never print them.
export function redact(key, value) {
  return /token|jwt|password/i.test(key) && typeof value === 'string' ? '[redacted]' : value;
}

function loadEnv() {
  const file = join(root, '.env');
  if (!existsSync(file)) fail('.env not found');
  const env = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return env;
}

function parseArgs(argv, env) {
  const args = { path: null, base: env.VITE_API_BASE || 'https://stable.alpha-trader.com' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') args.base = argv[++i];
    else if (!args.path) args.path = argv[i];
    else fail(`unexpected argument "${argv[i]}"`);
  }
  if (!args.path?.startsWith('/')) fail('usage: npm run api:get -- /api/... [--base <url>]');
  return args;
}

async function login(base, env) {
  const { AT_USERNAME, AT_PASSWORD, PARTNER_ID } = env;
  if (!AT_USERNAME || !AT_PASSWORD) fail('AT_USERNAME / AT_PASSWORD missing in .env');
  const q = new URLSearchParams({ username: AT_USERNAME, password: AT_PASSWORD });
  if (PARTNER_ID) q.set('partnerId', PARTNER_ID);
  const res = await fetch(`${base}/user/token`, { method: 'POST', body: q });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || typeof body.message !== 'string') fail(`login failed (HTTP ${res.status})`);
  return body.message;
}

async function main() {
  const env = loadEnv();
  const { path, base } = parseArgs(process.argv.slice(2), env);
  const token = await login(base, env);
  const res = await fetch(base + path, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const text = await res.text();
  console.error(`GET ${path} → ${res.status}`);
  try {
    console.log(JSON.stringify(JSON.parse(text), redact, 2));
  } catch {
    console.log(text);
  }
  if (!res.ok) process.exit(1);
}

main();
