import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { DS } from '../ds';
import { useSecuritySearch } from '../api/queries';
import { useDebounced } from '../lib/useDebounced';
import { activeTrigger, applyMention, type MentionTrigger } from './mentions';

/**
 * Suggestions while typing `#` (link) or `!` (card) in the chat composer: a list of securities above
 * the field, arrows move, Enter/Tab picks, Esc closes. Returns the props for DS.ChatComposer; `ref`
 * must be the composer's textarea.
 */
export function useMentions(value: string, setValue: (v: string) => void, ref: RefObject<HTMLTextAreaElement | null>) {
  const listId = useId();
  const [caret, setCaret] = useState(0);
  // Esc hides the list until the trigger changes (another # or a new query).
  const [dismissed, setDismissed] = useState<string | null>(null);
  const pendingCaret = useRef<number | null>(null);

  const trigger = activeTrigger(value, Math.min(caret, value.length));
  const key = trigger ? `${trigger.start}:${trigger.query}` : null;
  const open = !!trigger && dismissed !== key;
  // The marked suggestion belongs to one query – typing on starts again at the top.
  const [marked, setMarked] = useState<{ key: string | null; i: number }>({ key: null, i: 0 });
  const active = marked.key === key ? marked.i : 0;
  const setActive = (i: number) => setMarked({ key, i });
  const query = useDebounced(open ? trigger.query : '', 200);
  // Bonds too (the spread search alone has none), and any listing for a full ASIN.
  const search = useSecuritySearch(query, 8);
  const items =
    open && query.length >= 2
      ? (search.data ?? []).map((r) => ({ asin: r.asin, name: r.name, listingType: r.type, price: r.price }))
      : [];

  // After picking, the caret goes behind the inserted ASIN.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && pendingCaret.current != null) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
      setCaret(pendingCaret.current);
      pendingCaret.current = null;
    }
  }, [value, ref]);

  const readCaret = () => setCaret(ref.current?.selectionStart ?? value.length);

  const pick = (t: MentionTrigger, asin: string) => {
    const next = applyMention(value, t, Math.min(caret, value.length), asin);
    pendingCaret.current = next.caret;
    setValue(next.value);
    ref.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open || !trigger) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setDismissed(key);
    } else if (items.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setActive((active + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length);
    } else if (items.length && (e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey) {
      e.preventDefault();
      pick(trigger, items[Math.min(active, items.length - 1)].asin);
    }
  };

  const typing = trigger ? trigger.query.length : 0;
  const popup = open ? (
    <DS.MentionMenu
      id={listId}
      mode={trigger.mode}
      items={items}
      active={active}
      onActive={setActive}
      onPick={(it) => pick(trigger, it.asin)}
      loading={query.length >= 2 && (search.isFetching || query !== trigger.query)}
      emptyText={typing < 2 ? 'Name oder ASIN tippen' : 'Nichts gefunden.'}
    />
  ) : null;

  return {
    popup,
    onKeyDown,
    /** call from ChatComposer onChange before storing the text */
    onInput: readCaret,
    inputProps: {
      onSelect: readCaret,
      onClick: readCaret,
      onKeyUp: readCaret,
      role: 'combobox',
      'aria-autocomplete': 'list' as const,
      'aria-expanded': open && items.length > 0,
      'aria-controls': open && items.length ? listId : undefined,
      'aria-activedescendant': open && items.length ? `${listId}-o${Math.min(active, items.length - 1)}` : undefined,
    },
  };
}
