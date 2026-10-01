#!/usr/bin/env node
// Screenshots a page of the running dev server in headless Chrome, logged in with the account
// from .env (token injected into sessionStorage – the password never touches the page).
// Reports whether the page scrolls (goal: one screen) and any console errors.
//
//   npm run shot -- /wertpapier/STSN3G03LB                 # 1440×900 + 1280×720 + 390×844
//   npm run shot -- /markt --size 390x844 --out /tmp/shots
//   npm run shot -- /anmelden --anon                       # without login
//   npm run shot -- /markt --local at.chatSidebar=1        # localStorage entry before loading (chat sidebar open)
//   npm run shot -- / --whatsnew                      # with „Neu bei Alpha-Trader“ (hidden by default)
//   npm run shot -- / --hover '.bnk-psum__bar'              # hover an element before the shot (tooltips)
//   npm run shot -- /markt --click '.shell__title'          # click an element before the shot (menus, sheets)
//   npm run shot -- / --type '.global-search input=BOXLWU96VV' # type into a field before the shot (search, chat)
//
// Read-only: it only navigates; it never clicks buy/sell.

/* global window, document, getComputedStyle */

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SIZES = ['1440x900', '1280x720', '390x844'];

function env() {
  const out = {};
  for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

async function token(e, base) {
  const q = new URLSearchParams({ username: e.AT_USERNAME, password: e.AT_PASSWORD });
  if (e.PARTNER_ID) q.set('partnerId', e.PARTNER_ID);
  const res = await fetch(`${base}/user/token`, { method: 'POST', body: q });
  const body = await res.json();
  if (!res.ok || typeof body.message !== 'string') throw new Error(`login failed (HTTP ${res.status})`);
  return body.message;
}

const args = process.argv.slice(2);
const path = args.find((a) => a.startsWith('/')) ?? '/';
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const sizes = opt('--size') ? [opt('--size')] : SIZES;
const outDir = resolve(opt('--out', join(root, 'shots')));
const app = opt('--app', 'http://localhost:5173');
const wait = Number(opt('--wait', 2500));
const hover = opt('--hover');
const click = opt('--click');
const type = opt('--type');
const local = args.flatMap((a, i) => (args[i - 1] === '--local' ? [a.split('=')] : []));
// „Neu bei Alpha-Trader“ would cover every page: count everything as read, unless --whatsnew.
if (!args.includes('--whatsnew')) local.unshift(['at.whatsnew', '{"engine":9e15,"ui":"9999"}']);

const e = env();
const jwt = args.includes('--anon') ? null : await token(e, e.VITE_API_BASE || 'https://stable.alpha-trader.com');
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  for (const size of sizes) {
    const [width, height] = size.split('x').map(Number);
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 720, hasTouch: width < 720 });
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (err) => errors.push(err.message));
    if (jwt) await page.evaluateOnNewDocument((t) => sessionStorage.setItem('at.token', t), jwt);
    if (local.length) await page.evaluateOnNewDocument((kv) => kv.forEach(([k, v]) => localStorage.setItem(k, v)), local);
    await page.goto(app + path, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, wait));

    const m = await page.evaluate(() => {
      const scrollers = [...document.querySelectorAll('*')]
        .filter((el) => el.scrollHeight > el.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowY))
        .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} (${el.scrollHeight}/${el.clientHeight})`);
      // Elements reaching below the viewport – the likely cause when the page scrolls.
      const below = [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().bottom > window.innerHeight + 1 && getComputedStyle(el).position !== 'fixed')
        .filter((el) => !el.parentElement || el.parentElement.getBoundingClientRect().bottom <= window.innerHeight + 1)
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} (bottom ${Math.round(el.getBoundingClientRect().bottom)})`);
      return {
        below,
        pageScrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
        docHeight: document.documentElement.scrollHeight,
        scrollers,
      };
    });
    if (click) {
      const el = await page.$(click);
      if (el) {
        // With touch emulation a mouse click does not arrive – tap instead.
        await (width < 720 ? el.tap() : el.click());
        await new Promise((r) => setTimeout(r, 600));
      } else console.log(`  click: no element matches ${click}`);
    }
    if (type) {
      const at = type.indexOf('=');
      const sel = type.slice(0, at);
      const el = await page.$(sel);
      if (el) {
        await el.focus();
        await page.keyboard.type(type.slice(at + 1), { delay: 30 });
        await new Promise((r) => setTimeout(r, 3500));
      } else console.log(`  type: no element matches ${sel}`);
    }
    if (hover) {
      const el = await page.$(hover);
      if (el) {
        await el.hover();
        await new Promise((r) => setTimeout(r, 400));
      } else console.log(`  hover: no element matches ${hover}`);
    }
    const file = join(outDir, `${path.replace(/\W+/g, '_').replace(/^_|_$/g, '') || 'root'}-${size}.png`);
    await page.screenshot({ path: file });
    console.log(`${size}: ${file}`);
    console.log(`  page scrolls: ${m.pageScrolls ? `YES (${m.docHeight}px) – below the fold: ${m.below.join(', ')}` : 'no'}`);
    if (m.scrollers.length) console.log(`  inner scroll: ${m.scrollers.join(', ')}`);
    if (errors.length) console.log(`  console errors:\n    ${errors.join('\n    ')}`);
    await page.close();
  }
} finally {
  await browser.close();
}
