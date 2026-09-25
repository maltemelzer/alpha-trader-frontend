import { useCallback } from 'react';
import { useNavigate } from 'react-router';

/**
 * Design-system components render plain <a href="/…"> (ticker mentions, list rows). This click
 * handler for a wrapping element routes those links inside the SPA instead of reloading the page.
 */
export function useInternalLinks() {
  const navigate = useNavigate();
  return useCallback(
    (e: React.MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest('a');
      const href = a?.getAttribute('href');
      if (!a || !href?.startsWith('/') || href.startsWith('//') || a.target) return;
      e.preventDefault();
      navigate(href);
    },
    [navigate],
  );
}
