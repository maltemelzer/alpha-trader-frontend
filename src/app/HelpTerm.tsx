import { useState } from 'react';
import { DS } from '../ds';
import { useHelpComment } from '../api/queries';
import { helpText, type HelpId } from '../lib/help';

/**
 * A term with the game's own explanation (help texts of the server) in a DS.Term tooltip.
 * The text is fetched on first hover/focus/tap and kept for the session; `fallback` shows while it
 * loads or if the server has none.
 */
export function HelpTerm({ id, children, fallback }: { id: HelpId; children: string; fallback?: string }) {
  const [asked, setAsked] = useState(false);
  const help = useHelpComment(id, asked);
  const text = helpText(help.data?.text) ?? (help.isLoading && asked ? 'Wird geladen …' : fallback ?? 'Keine Erklärung vorhanden.');
  const ask = () => setAsked(true);
  return (
    <span className="help-term" onMouseEnter={ask} onFocus={ask} onTouchStart={ask}>
      <DS.Term title={children} definition={text} width={300}>
        {children}
      </DS.Term>
    </span>
  );
}
