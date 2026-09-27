// Local gallery of all component previews (dev server only: http://localhost:5173/design-system/).
// Each preview.html runs in its own iframe with what the design-system host provides:
// tokens.css, bundle.css, the fonts, React 18 and the bundle.

import tokensCss from './tokens.css?raw';
import bundleCss from './components/bundle.css?raw';
import bundleJs from './components/bundle.js?raw';
import reactJs from '../node_modules/react/umd/react.production.min.js?raw';
import reactDomJs from '../node_modules/react-dom/umd/react-dom.production.min.js?raw';

const previews = import.meta.glob('./components/*/preview.html', { query: '?raw', import: 'default', eager: true });

const FONTS =
  'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600&family=Libre+Franklin:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap';
const inline = (js) => `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`;
const HEAD = [
  `<link rel="stylesheet" href="${FONTS}">`,
  `<style>${tokensCss}\n${bundleCss}</style>`,
  inline(reactJs),
  inline(reactDomJs),
  inline(bundleJs),
].join('\n');

function card(path, html) {
  const name = path.split('/')[2];
  const meta = html.match(/<!--\s*@dsCard([^>]*)-->/)?.[1] ?? '';
  const num = (k) => Number(meta.match(new RegExp(`${k}=(\\d+)`))?.[1]) || null;
  return {
    name,
    group: meta.match(/group="([^"]*)"/)?.[1] ?? 'Übersicht',
    subtitle: meta.match(/subtitle="([^"]*)"/)?.[1] ?? '',
    height: num('height') ?? 320,
    width: num('width'),
    doc: html.replace(/<head>/i, () => `<head>\n${HEAD}`), // function: HEAD contains `$` patterns
  };
}

const cards = Object.entries(previews)
  .map(([p, html]) => card(p, html))
  .sort((a, b) => a.group.localeCompare(b.group, 'de') || a.name.localeCompare(b.name, 'de'));

const root = document.getElementById('gallery');
const style = document.createElement('style');
style.textContent = `${tokensCss}
  body { margin: 0; background: var(--bg-page); color: var(--text-primary); font-family: var(--font-sans); }
  #gallery { padding: 24px; max-width: 1320px; margin: 0 auto; }
  h1 { font-family: var(--font-serif); font-size: 40px; margin: 0 0 4px; }
  .intro { color: var(--text-secondary); margin: 0 0 24px; }
  h2 { font: 600 12px/16px var(--font-sans); letter-spacing: .06em; text-transform: uppercase; color: var(--text-secondary); margin: 32px 0 8px; }
  section { border: 1px solid var(--line); border-radius: 4px; margin-bottom: 16px; background: var(--bg-card); }
  header { display: flex; gap: 12px; align-items: baseline; padding: 12px 16px; border-bottom: 1px solid var(--line); }
  header strong { font-family: var(--font-serif); font-size: 18px; }
  header span { color: var(--text-muted); font-size: 13px; }
  .frame { overflow-x: auto; }
  iframe { display: block; border: 0; width: 100%; }`;
document.head.append(style);

root.innerHTML = `<h1>Bankiersgrün</h1><p class="intro">${cards.length} Komponenten und Seitenvorlagen · Markenbuch: design-system/README.md</p>`;
let group = null;
for (const c of cards) {
  if (c.group !== group) {
    group = c.group;
    root.insertAdjacentHTML('beforeend', `<h2>${group}</h2>`);
  }
  const section = document.createElement('section');
  section.id = c.name;
  section.innerHTML = `<header><strong>${c.name}</strong><span>${c.subtitle}</span></header><div class="frame"></div>`;
  const frame = document.createElement('iframe');
  frame.title = c.name;
  frame.loading = 'lazy';
  frame.style.height = `${c.height}px`;
  if (c.width) frame.style.minWidth = `${c.width}px`;
  frame.srcdoc = c.doc;
  section.querySelector('.frame').append(frame);
  root.append(section);
}
