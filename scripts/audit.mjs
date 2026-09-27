#!/usr/bin/env node
// Quality audit of the running dev server in headless Chrome, logged in with the account from .env
// (like shot.mjs). For each page and size it reports:
//   shift     layout shifts while the page loads and polls (elements that jump because others resize)
//   contrast  text below 4.5:1 (3:1 for large text) against its actual background
//   overflow  content wider than its box or reaching past the viewport; page scroll
//   tap       controls smaller than 44 px on the phone
//   name      buttons and links without an accessible name
//   nav       navigation rules (CLAUDE.md „Navigation in drei Ebenen“): at most one tab row per page, no tabs
//             inside cards – a card switches only its own presentation (segmented control in its head)
//   console   errors
//
//   npm run audit                              # all pages, 1440×900 + 390×844
//   npm run audit -- /markt /orders --size 1280x720 --watch 30000
//   npm run audit -- /markt --local at.chatSidebar=1   # localStorage entry before loading
//
// Read-only: it only navigates and hovers nothing.

/* global window, document, getComputedStyle, Node */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PAGES = [
  '/markt',
  '/wertpapier/STSN3G03LB',
  '/wertpapier/ACALPHCOIN',
  '/wertpapier/IDA7LNQJCH',
  '/organisation',
  '/unternehmen',
  '/unternehmen/STSN3G03LB',
  '/kapitalmassnahmen',
  '/orders',
  '/highscores',
  '/spieler/Esteban',
  '/allianzen',
  '/allianz/5bd0fba2-477a-4509-8c62-de080f7b24fa',
  '/forum',
  '/abstimmungen',
  '/miner',
  '/erfolge',
  '/bank',
  '/nachrichten',
  '/zeitung',
  '/sponsoring',
  '/einstellungen',
];

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
  const res = await fetch(`${base}/user/token?${q}`, { method: 'POST' });
  const body = await res.json();
  if (!res.ok || typeof body.message !== 'string') throw new Error(`login failed (HTTP ${res.status})`);
  return body.message;
}

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const paths = args.filter((a, i) => a.startsWith('/') && !['--size', '--watch', '--local'].includes(args[i - 1]));
const local = args.flatMap((a, i) => (args[i - 1] === '--local' ? [a.split('=')] : []));
const sizes = opt('--size') ? [opt('--size')] : ['1440x900', '390x844'];
const watch = Number(opt('--watch', 12000));
const app = opt('--app', 'http://localhost:5173');

// Runs in the page before any script: collects layout shifts with the elements that moved.
function observeShifts() {
  window.__shifts = [];
  const desc = (n) => {
    if (!n || n.nodeType !== 1) return n ? `#text(${(n.textContent || '').trim().slice(0, 20)})` : '?';
    const cls = [...n.classList].slice(0, 2).join('.');
    return `${n.tagName.toLowerCase()}${cls ? '.' + cls : ''}「${(n.textContent || '').trim().slice(0, 24)}」`;
  };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.hadRecentInput || e.value < 0.001) continue;
      window.__shifts.push({
        t: Math.round(e.startTime),
        value: +e.value.toFixed(4),
        sources: (e.sources || []).slice(0, 3).map((s) => `${desc(s.node)} Δy ${Math.round(s.currentRect.y - s.previousRect.y)} Δh ${Math.round(s.currentRect.height - s.previousRect.height)} Δx ${Math.round(s.currentRect.x - s.previousRect.x)}`),
      });
    }
  }).observe({ type: 'layout-shift', buffered: true });
}

function inspect(mobile) {
  const out = { contrast: [], overflow: [], tap: [], name: [], nav: [] };
  {
    const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const lists = [...document.querySelectorAll('[role="tablist"]')].filter(visible).filter((el) => !el.closest('[role="dialog"]'));
    const inCards = lists.filter((el) => el.closest('.bnk-card'));
    if (lists.length > 1) out.nav.push(`${lists.length} tab rows (${lists.map((el) => el.getAttribute('aria-label') || '?').join(', ')})`);
    for (const el of inCards) out.nav.push(`tabs inside a card: ${el.getAttribute('aria-label') || '?'}`);
  }
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return [r, g, b, a];
  };
  const lum = ([r, g, b]) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const blend = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
  const bgOf = (el) => {
    const stack = [];
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c[3] > 0) {
        stack.push(c);
        if (c[3] >= 1) break;
      }
    }
    let bg = [15, 28, 23];
    for (const c of stack.reverse()) bg = blend(c, bg);
    return bg;
  };
  const desc = (n) => {
    const cls = [...n.classList].slice(0, 2).join('.');
    return `${n.tagName.toLowerCase()}${cls ? '.' + cls : ''}「${(n.textContent || n.getAttribute('aria-label') || '').trim().slice(0, 28)}」`;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.opacity !== '0' && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
  };
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || el.closest('[aria-hidden="true"] .js-plotly-plot, .bnk-sr, svg, .js-plotly-plot')) continue;
    const cs = getComputedStyle(el);
    const ownText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (ownText && !el.closest('[disabled], [aria-disabled="true"], .is-disabled')) {
      const fg = parse(cs.color);
      if (fg) {
        const bg = bgOf(el);
        const f = blend(fg, bg);
        const [a, b] = [lum(f), lum(bg)].sort((x, y) => y - x);
        const ratio = (a + 0.05) / (b + 0.05);
        const size = parseFloat(cs.fontSize);
        const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
        if (ratio < (large ? 3 : 4.5)) {
          const key = `${desc(el)}|${ratio.toFixed(1)}`;
          if (!seen.has(key)) {
            seen.add(key);
            out.contrast.push(`${desc(el)} ${ratio.toFixed(2)}:1 (${cs.color} ${size}px)`);
          }
        }
      }
    }
    // Text wider than its box without being clipped on purpose.
    if (ownText && el.scrollWidth > el.clientWidth + 1 && cs.overflowX === 'visible' && cs.display !== 'inline' && el.clientWidth > 0) {
      out.overflow.push(`${desc(el)} scroll ${el.scrollWidth} > box ${el.clientWidth}`);
    }
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth + 1 && !el.closest('.tape, .js-plotly-plot') && getComputedStyle(el.parentElement || el).overflowX === 'visible') {
      out.overflow.push(`${desc(el)} reaches x=${Math.round(r.right)} (viewport ${window.innerWidth})`);
    }
    const interactive = el.matches('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [tabindex="0"]');
    if (interactive) {
      const label = (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent || el.getAttribute('title') || el.getAttribute('placeholder') || el.value || '').trim();
      if (!label && !el.labels?.length) out.name.push(desc(el) + (el.outerHTML.slice(0, 80)));
      const hit = getComputedStyle(el, '::before');
      const hw = hit.content !== 'none' && hit.position === 'absolute' ? Math.max(r.width, parseFloat(hit.width) || 0) : r.width;
      const hh = hit.content !== 'none' && hit.position === 'absolute' ? Math.max(r.height, parseFloat(hit.height) || 0) : r.height;
      if (mobile && (hh < 44 && hw < 44 || hh < 32) && !el.closest('.tape') && !el.matches('.bnk-term, .bnk-amt, .bnk-table__rowlink') && !el.closest('p, .bnk-forumtext')) {
        out.tap.push(`${desc(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    }
  }
  out.overflow = [...new Set(out.overflow)].slice(0, 12);
  out.tap = [...new Set(out.tap)].slice(0, 15);
  out.pageScrolls = document.documentElement.scrollHeight > window.innerHeight + 1;
  return out;
}

const e = env();
const jwt = await token(e, e.VITE_API_BASE || 'https://stable.alpha-trader.com');
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  for (const path of paths.length ? paths : PAGES) {
    for (const size of sizes) {
      const [width, height] = size.split('x').map(Number);
      const mobile = width < 720;
      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)));
      page.on('pageerror', (err) => errors.push(err.message.slice(0, 160)));
      await page.evaluateOnNewDocument((t) => sessionStorage.setItem('at.token', t), jwt);
      await page.evaluateOnNewDocument(observeShifts);
      if (local.length) await page.evaluateOnNewDocument((kv) => kv.forEach(([k, v]) => localStorage.setItem(k, v)), local);
      await page.goto(app + path, { waitUntil: 'networkidle2', timeout: 60000 }).catch((err) => errors.push(`goto: ${err.message}`));
      await new Promise((r) => setTimeout(r, watch));
      const shifts = await page.evaluate(() => window.__shifts);
      const r = await page.evaluate(inspect, mobile);
      const lines = [];
      if (r.pageScrolls) lines.push('  page scrolls');
      const cls = shifts.reduce((s, x) => s + x.value, 0);
      if (shifts.length) lines.push(`  shift CLS ${cls.toFixed(3)}:`, ...shifts.slice(0, 8).map((s) => `    ${s.t}ms ${s.value}  ${s.sources.join(' | ')}`));
      for (const k of ['contrast', 'overflow', 'tap', 'name', 'nav']) if (r[k].length) lines.push(`  ${k}:`, ...r[k].slice(0, 12).map((x) => `    ${x}`));
      if (errors.length) lines.push('  console:', ...[...new Set(errors)].slice(0, 5).map((x) => `    ${x}`));
      console.log(`== ${path} ${size}${lines.length ? '' : ' ok'}`);
      if (lines.length) console.log(lines.join('\n'));
      await page.close();
    }
  }
} finally {
  await browser.close();
}
