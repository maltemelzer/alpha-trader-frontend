// Some texts (alliance descriptions, old posts) are stored as HTML from the old game UI.
// They are shown as plain text: block elements become line breaks, everything else is dropped.

const BLOCK = /<\/(p|div|h[1-6]|li|blockquote)>|<br\s*\/?>/gi;

/** HTML → plain text with paragraph breaks; entities decoded, no markup survives. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  // Source newlines (TinyMCE puts one after every block and <br>) are just whitespace.
  const marked = unwrapJson(html).replace(/\s*\n\s*/g, ' ').replace(BLOCK, (m) => (/^<br/i.test(m) ? '\n' : '\n\n'));
  const doc = new DOMParser().parseFromString(marked, 'text/html');
  return (doc.body.textContent ?? '')
    .replace(/[ \t\u00a0]+\n|\n[ \t\u00a0]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Plain text from an editor → the HTML the game stores: escaped, paragraphs and line breaks. */
export function textToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/[&<>"']/g, (c) => ESC[c]).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

// ---------- Posts: editor markup ⇄ stored HTML ----------
// The original game writes posts with TinyMCE and stores its HTML (<p>, <strong>, <h2>, lists,
// links, images), one block per line. Our editor uses the DS forum markup instead:
// **fett**, *kursiv*, ## Überschrift, > Zitat, - Liste, 1. Liste, [Text](https://…), ![Bild](https://…).

const SAFE_URL = /^https?:\/\/[^\s"'<>]+$/i;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);
// Earliest match wins; at the same position the first alternative does (image before link before URL).
const INLINE =
  /!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<]*[^\s<.,;:!?)"'»“])|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;

function inlineHtml(text: string): string {
  let out = '';
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    out += esc(text.slice(last, m.index));
    const [all, alt, src, label, href, url, bold, italic] = m;
    if (src !== undefined) out += SAFE_URL.test(src) ? `<img src="${esc(src)}" alt="${esc(alt)}" />` : esc(all);
    else if (href !== undefined)
      out += SAFE_URL.test(href) ? `<a href="${esc(href)}">${inlineHtml(label)}</a>` : esc(all);
    else if (url !== undefined) out += `<a href="${esc(url)}">${esc(url)}</a>`;
    else if (bold !== undefined) out += `<strong>${inlineHtml(bold)}</strong>`;
    else out += `<em>${inlineHtml(italic)}</em>`;
    last = m.index + all.length;
  }
  return out + esc(text.slice(last));
}

type LineKind = 'quote' | 'ul' | 'ol' | 'h' | 'text';
const kindOf = (l: string): LineKind =>
  /^>\s?/.test(l) ? 'quote' : /^[-•]\s+/.test(l) ? 'ul' : /^\d+[.)]\s+/.test(l) ? 'ol' : /^#{1,3}\s+/.test(l) ? 'h' : 'text';

/** Consecutive lines of the same kind; blank lines end a group, a heading is always alone. */
function groups(text: string): { kind: LineKind; lines: string[] }[] {
  const out: { kind: LineKind; lines: string[] }[] = [];
  let cur: { kind: LineKind; lines: string[] } | null = null;
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      cur = null;
      continue;
    }
    const kind = kindOf(line);
    if (!cur || cur.kind !== kind || kind === 'h') out.push((cur = { kind, lines: [] }));
    cur.lines.push(line);
  }
  return out;
}

/** Editor markup → HTML as TinyMCE in the original game stores it (escaped, one block per line). */
export function markupToHtml(text: string): string {
  return groups(text.trim())
    .map(({ kind, lines }) => {
      if (kind === 'quote')
        return `<blockquote>\n<p>${lines.map((l) => inlineHtml(l.replace(/^>\s?/, ''))).join('<br />\n')}</p>\n</blockquote>`;
      if (kind === 'ul' || kind === 'ol') {
        const items = lines.map((l) => `<li>${inlineHtml(l.replace(/^([-•]|\d+[.)])\s+/, ''))}</li>`);
        return `<${kind}>\n${items.join('\n')}\n</${kind}>`;
      }
      if (kind === 'h') {
        const level = /^###/.test(lines[0]) ? 3 : 2;
        return `<h${level}>${inlineHtml(lines[0].replace(/^#{1,3}\s+/, ''))}</h${level}>`;
      }
      return `<p>${lines.map(inlineHtml).join('<br />\n')}</p>`;
    })
    .join('\n');
}

/**
 * Posts we sent before the fix went out JSON-encoded (`"<p>…</p>"`); the server kept the quotes.
 * Undo that wrapper so they read (and re-edit) like normal posts.
 */
function unwrapJson(html: string): string {
  const m = /^\s*"\s*(<[\s\S]*>)\s*"\s*$/.exec(html);
  return m ? m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : html;
}

export interface MarkupOptions {
  /** Links into the original game or this app open here (…/security/asin/X → /wertpapier/X). */
  localLinks?: boolean;
}

const GAME_LINKS: [RegExp, string][] = [
  [/^https?:\/\/(?:www\.)?alpha-trader\.com\/(?:v2\/)?security\/(?:asin\/)?([A-Z0-9]+)\/?$/i, '/wertpapier/$1'],
  [/^https?:\/\/(?:www\.)?alpha-trader\.com\/(?:v2\/)?post\/([\w-]+)\/?$/i, '/zeitung/$1'],
  [/^https?:\/\/(?:www\.)?alpha-trader\.com\/(?:v2\/)?user\/([^/?#]+)\/?$/i, '/spieler/$1'],
];

function localHref(href: string): string {
  for (const [re, to] of GAME_LINKS) if (re.test(href)) return href.replace(re, to);
  try {
    const u = new URL(href);
    if (typeof location !== 'undefined' && u.origin === location.origin) return u.pathname + u.search + u.hash;
  } catch {
    /* not a URL */
  }
  return href;
}

/**
 * Stored post HTML → editor markup, for showing it with `ForumText` (no HTML ever reaches the DOM)
 * and for editing. Keeps bold, italics, headings, lists, quotes, links and images; drops styles.
 */
export function htmlToMarkup(html: string | null | undefined, opts: MarkupOptions = {}): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(unwrapJson(html), 'text/html');
  const blocks: string[] = [];
  let buf = '';
  const flush = () => {
    const t = tidy(buf);
    if (t) blocks.push(t);
    buf = '';
  };
  const href = (raw: string | null) => {
    const h = (raw ?? '').trim();
    if (!SAFE_URL.test(h)) return null;
    return opts.localLinks ? localHref(h) : h;
  };

  const inline = (n: Node): string => {
    if (n.nodeType === Node.TEXT_NODE) return (n.textContent ?? '').replace(/[ \t\r\n]+/g, ' ');
    if (!(n instanceof Element)) return '';
    const tag = n.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style') return '';
    if (tag === 'br') return '\n';
    if (tag === 'img') {
      const src = href(n.getAttribute('src'));
      return src ? `![${(n.getAttribute('alt') ?? '').replace(/[[\]]/g, '')}](${src})` : '';
    }
    const inner = Array.from(n.childNodes).map(inline).join('');
    const wrap = (mark: string) => {
      const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner)!;
      return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : inner;
    };
    if (tag === 'strong' || tag === 'b') return wrap('**');
    if (tag === 'em' || tag === 'i') return wrap('*');
    if (tag === 'a') {
      const h = href(n.getAttribute('href'));
      const label = inner.trim();
      if (!h) return inner;
      return !label || label === n.getAttribute('href')?.trim() ? h : `[${label.replace(/[[\]]/g, '')}](${h})`;
    }
    return inner;
  };

  const BLOCK = /^(p|div|h[1-6]|ul|ol|li|blockquote|pre|table|tr|section|article|header|footer|hr)$/;
  const walk = (parent: Node) => {
    for (const n of Array.from(parent.childNodes)) {
      const tag = n instanceof Element ? n.tagName.toLowerCase() : '';
      if (!BLOCK.test(tag)) {
        buf += inline(n);
        continue;
      }
      flush();
      const el = n as Element;
      if (/^h[1-6]$/.test(tag)) {
        const t = tidy(inline(el)).replace(/\n/g, ' ');
        if (t) blocks.push(`${Number(tag[1]) <= 2 ? '##' : '###'} ${t.replace(/^\*\*(.*)\*\*$/, '$1')}`);
      } else if (tag === 'ul' || tag === 'ol') {
        const items = Array.from(el.children)
          .filter((c) => c.tagName.toLowerCase() === 'li')
          .map((li) => tidy(inline(li)).replace(/\n/g, ' '))
          .filter(Boolean);
        if (items.length) blocks.push(items.map((t, i) => (tag === 'ul' ? `- ${t}` : `${i + 1}. ${t}`)).join('\n'));
      } else if (tag === 'blockquote') {
        const inner = htmlToMarkup(el.innerHTML, opts);
        if (inner) blocks.push(inner.split('\n').map((l) => (l ? `> ${l}` : '>')).join('\n'));
      } else if (tag === 'tr') {
        const t = Array.from(el.children).map((c) => tidy(inline(c)).replace(/\n/g, ' ')).filter(Boolean).join(' · ');
        if (t) blocks.push(t);
      } else if (tag !== 'hr') {
        walk(el);
      }
      flush();
    }
  };
  walk(doc.body);
  flush();
  return blocks.join('\n\n');
}

/** Trims every line, collapses spaces (nbsp included) and drops empty lines. */
function tidy(s: string): string {
  return s
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((l) => l.replace(/ {2,}/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

/** A stored post as `ForumText` shows it: markup with game links pointing into this app. */
export const postText = (html: string | null | undefined) => htmlToMarkup(html, { localLinks: true });
