// Securities in chat messages (pure, tested in mentions.test.ts).
// `#ASIN` links a security, `!ASIN` also attaches a small card. Old messages use `$ASIN` – still a link.
// Same patterns as renderChatText/chatEmbeds in the design system's ChatThread.

/** `#`/`!` need the full ASIN (10 characters) and no word character before – „#1“, „#Top“, „Super!“ stay text. */
const TOKEN = /(?<![\w$#!])(\$[A-Z][A-Z0-9]{1,9}|[#!][A-Z][A-Z0-9]{9})\b/g;

/** All securities mentioned in a text (`$`, `#`, `!`), without duplicates, in order. */
export function mentionedAsins(text: string | undefined | null): string[] {
  const out: string[] = [];
  for (const [, t] of (text ?? '').matchAll(TOKEN)) {
    const asin = t.slice(1);
    if (!out.includes(asin)) out.push(asin);
  }
  return out;
}

export type MentionMode = 'link' | 'embed';

export interface MentionTrigger {
  mode: MentionMode;
  /** index of `#`/`!` */
  start: number;
  /** what was typed after it, up to the caret */
  query: string;
}

/**
 * The `#`/`!` the caret is typing after, if any: at the start or after a space/bracket, followed by
 * letters and digits only (a space ends it). „Super!“ does not open the list, „Super !“ does.
 */
export function activeTrigger(value: string, caret: number): MentionTrigger | null {
  const before = value.slice(0, caret);
  const m = /(^|[\s(„"'])([#!])([A-Za-z0-9]{0,20})$/.exec(before);
  if (!m) return null;
  const start = caret - m[3].length - 1;
  return { mode: m[2] === '!' ? 'embed' : 'link', start, query: m[3] };
}

/** Replaces the typed trigger with `#ASIN ` / `!ASIN ` and returns the new text and caret. */
export function applyMention(value: string, trigger: MentionTrigger, caret: number, asin: string) {
  const token = `${trigger.mode === 'embed' ? '!' : '#'}${asin}`;
  const after = value.slice(caret);
  const space = after.startsWith(' ') ? '' : ' ';
  const text = value.slice(0, trigger.start) + token + space + after;
  return { value: text, caret: trigger.start + token.length + 1 };
}
