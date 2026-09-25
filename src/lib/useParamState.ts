import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/** A view choice kept in the URL (?key=value), so views can be linked and reloaded. */
export function useParamState(key: string, fallback: string, allowed: { value: string }[]) {
  const [params, setParams] = useSearchParams();
  const raw = params.get(key);
  const value = allowed.some((o) => o.value === raw) ? raw! : fallback;
  const set = useCallback(
    (v: string) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (v === fallback) next.delete(key);
          else next.set(key, v);
          return next;
        },
        { replace: true },
      ),
    [key, fallback, setParams],
  );
  return [value, set] as const;
}
