import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useDebounced } from './useDebounced';

/**
 * Search text of an input kept in the URL (?suche=…): typing goes into state and only reaches the URL
 * once the input rests for `ms` (binding the field to the URL loses keystrokes). Writing the search
 * also drops the keys in `reset` (e.g. the page), all in one setSearchParams call. When the URL changes
 * from elsewhere (link, back button, switching the view), the field follows.
 *
 * Returns [text in the field, setter, search in the URL].
 */
export function useUrlSearch(key = 'suche', ms = 400, reset: string[] = ['seite']) {
  const [params, setParams] = useSearchParams();
  const url = params.get(key) ?? '';
  const [text, setText] = useState(url);
  const [seen, setSeen] = useState(url);
  if (url !== seen) {
    setSeen(url);
    if (url !== text.trim()) setText(url);
  }
  const debounced = useDebounced(text, ms);
  const resetKeys = reset.join(',');
  useEffect(() => {
    // Only a settled input is written – right after the URL changed elsewhere, `debounced` is stale.
    if (debounced !== text) return;
    const v = debounced.trim();
    if (v === url) return;
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v) next.set(key, v);
        else next.delete(key);
        for (const k of resetKeys ? resetKeys.split(',') : []) next.delete(k);
        return next;
      },
      { replace: true },
    );
  }, [debounced, text, url, key, resetKeys, setParams]);
  return [text, setText, url] as const;
}
