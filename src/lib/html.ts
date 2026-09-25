// Some texts (alliance descriptions, old posts) are stored as HTML from the old game UI.
// They are shown as plain text: block elements become line breaks, everything else is dropped.

const BLOCK = /<\/(p|div|h[1-6]|li|blockquote)>|<br\s*\/?>/gi;

/** HTML → plain text with paragraph breaks; entities decoded, no markup survives. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  const marked = html.replace(BLOCK, (m) => (/^<br/i.test(m) ? '\n' : '\n\n'));
  const doc = new DOMParser().parseFromString(marked, 'text/html');
  return (doc.body.textContent ?? '')
    .replace(/[ \t\u00a0]+\n/g, '\n')
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
