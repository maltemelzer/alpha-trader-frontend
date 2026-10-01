#!/usr/bin/env node
// Screenshots for „Neu bei Alpha-Trader“: every entry in src/whatsnew/changelog.ts with a `shot` gets
// a picture of its view, taken from the running dev server in headless Chrome and logged in with the
// account from .env (or AT_USERNAME/AT_PASSWORD – also USERNAME/PASSWORD – in the environment). Written as WebP to
// src/whatsnew/shots/<id>.webp, the size (CSS px) into shots/sizes.json – the dialog shows every
// picture that exists there, sized before it loads.
//
//   npm run whatsnew:shots                     # entries without a picture yet
//   npm run whatsnew:shots -- --all            # take all again
//   npm run whatsnew:shots -- 2026-09-28-4     # just these entries (again)
//
// Read-only: it navigates, clicks only what an entry names (tabs, sheets) and never submits.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { UI_CHANGES } from '../src/whatsnew/changelog.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = join(root, 'src/whatsnew/shots');
const SIZES = join(OUT, 'sizes.json');

/** .env first, the environment fills the gaps (cloud containers have no .env). */
function env() {
  const out = {};
  const file = join(root, '.env');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  for (const k of ['AT_USERNAME', 'AT_PASSWORD', 'PARTNER_ID', 'VITE_API_BASE']) out[k] ??= process.env[k];
  // Cloud environments name them without the prefix.
  out.AT_USERNAME ??= process.env.USERNAME;
  out.AT_PASSWORD ??= process.env.PASSWORD;
  return out;
}

async function token(e, base) {
  if (!e.AT_USERNAME || !e.AT_PASSWORD) throw new Error('no account: AT_USERNAME/AT_PASSWORD in .env or the environment (or USERNAME/PASSWORD)');
  const q = new URLSearchParams({ username: e.AT_USERNAME, password: e.AT_PASSWORD });
  if (e.PARTNER_ID) q.set('partnerId', e.PARTNER_ID);
  const res = await fetch(`${base}/user/token`, { method: 'POST', body: q });
  const body = await res.json();
  if (!res.ok || typeof body.message !== 'string') throw new Error(`login failed (HTTP ${res.status})`);
  return body.message;
}

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const app = opt('--app', 'http://localhost:5173');
const only = args.filter((a) => /^\d{4}-\d{2}-\d{2}/.test(a));
const todo = UI_CHANGES.filter(
  (c) => c.shot && (only.length ? only.includes(c.id) : args.includes('--all') || !existsSync(join(OUT, `${c.id}.webp`))),
);
if (!todo.length) {
  console.log('Nothing to do – every entry with `shot` has its picture (--all takes them again).');
  process.exit(0);
}

const e = env();
const jwt = await token(e, e.VITE_API_BASE || 'https://stable.alpha-trader.com');
mkdirSync(OUT, { recursive: true });
const sizes = existsSync(SIZES) ? JSON.parse(readFileSync(SIZES, 'utf8')) : {};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Root (containers) needs Chrome without its sandbox.
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: process.getuid?.() === 0 ? ['--no-sandbox'] : [],
});
try {
  for (const c of todo) {
    const s = c.shot;
    const [width, height] = (s.size ?? '1280x800').split('x').map(Number);
    const page = await browser.newPage();
    // Twice the pixels: the dialog shows the picture at about half its width, phones at a third.
    await page.setViewport({ width, height, deviceScaleFactor: 2, isMobile: width < 720, hasTouch: width < 720 });
    await page.evaluateOnNewDocument(
      (t) => {
        sessionStorage.setItem('at.token', t);
        localStorage.setItem('at.whatsnew', '{"engine":9e15,"ui":"9999"}');
        localStorage.setItem('at.chatSidebar', '0');
      },
      jwt,
    );
    await page.goto(app + s.path, { waitUntil: 'networkidle2' });
    await pause(s.wait ?? 2500);
    for (const sel of s.click ?? []) {
      const el = await page.$(sel);
      if (!el) console.log(`  ${c.id}: nothing to click at ${sel}`);
      else {
        await (width < 720 ? el.tap() : el.click());
        await pause(800);
      }
    }
    if (s.type) {
      const el = await page.$(s.type[0]);
      if (!el) console.log(`  ${c.id}: nothing to type into at ${s.type[0]}`);
      else {
        await el.click();
        await page.keyboard.type(s.type[1], { delay: 40 });
        await pause(1500);
      }
    }
    // Without the header and the market tape, unless the entry names another part of the page.
    const target = (await page.$(s.crop ?? 'main')) ?? null;
    if (s.crop && !target) console.log(`  ${c.id}: ${s.crop} not found – whole page`);
    const file = join(OUT, `${c.id}.webp`);
    await (target ?? page).screenshot({ path: file, type: 'webp', quality: 72 });
    const box = target ? await target.boundingBox() : { width, height };
    sizes[c.id] = [Math.round(box.width), Math.round(box.height)];
    console.log(`${c.id}: ${file}`);
    await page.close();
  }
} finally {
  await browser.close();
  const sorted = Object.fromEntries(Object.entries(sizes).sort(([a], [b]) => b.localeCompare(a)));
  writeFileSync(SIZES, JSON.stringify(sorted, null, 2) + '\n');
}
