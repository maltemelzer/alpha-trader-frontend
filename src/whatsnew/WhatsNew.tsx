import { useMemo, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router';
import { DS } from '../ds';
import { useEngineUpdatePosts, useFrontendPref, useSaveFrontendPref } from '../api/queries';
import { useNow } from '../lib/useNow';
import { UI_CHANGES, type UiChange } from './changelog';
import {
  autoOpen,
  dayLabel,
  engineUpdates,
  mergeSeen,
  parseSeen,
  SEEN_IDENTIFIER,
  SEEN_KEY,
  seenAfter,
  unseen,
  type EngineUpdate,
  withAuto,
  type Seen,
} from './derive';
import shotSizes from './shots/sizes.json';
import './WhatsNew.css';

// Pictures from `npm run whatsnew:shots`: only entries whose picture exists get one. The file names
// are hashed by Vite; the browser loads a picture only when its entry is shown.
const SHOT_URLS = import.meta.glob<string>('./shots/*.webp', { eager: true, query: '?url', import: 'default' });
// JSON arrays type as number[] – each entry is [width, height].
const SHOT_SIZES = shotSizes as unknown as Record<string, [number, number] | undefined>;

function shotOf(c: UiChange) {
  const src = SHOT_URLS[`./shots/${c.id}.webp`];
  const size = SHOT_SIZES[c.id];
  return c.shot && src && size ? { src, width: size[0], height: size[1], alt: c.shot.alt, href: c.shot.path } : null;
}

// The local copy as a tiny store: the dialog in the shell and the switch in the settings share it
// (same tab via an event, other tabs via `storage`).
const CHANGED = 'at:whatsnew';

function readLocalRaw(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function writeLocal(s: Seen) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(s));
  } catch {
    /* private mode: the server record still holds it */
  }
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(fn: () => void) {
  window.addEventListener(CHANGED, fn);
  window.addEventListener('storage', fn);
  return () => {
    window.removeEventListener(CHANGED, fn);
    window.removeEventListener('storage', fn);
  };
}

/**
 * What the player hasn't seen yet: engine updates from the newspaper and changes to this UI. „Seen“
 * lives in localStorage and in a user preference on the game server (AT_FRONTEND / whatsnew), so it
 * follows the player to other devices; the later of both wins. `ready` once both sources answered.
 */
export function useWhatsNew() {
  const posts = useEngineUpdatePosts();
  const pref = useFrontendPref(SEEN_IDENTIFIER);
  const save = useSaveFrontendPref(SEEN_IDENTIFIER);
  const raw = useSyncExternalStore(subscribe, readLocalRaw);
  const local = useMemo(() => parseSeen(raw), [raw]);
  const now = useNow(10 * 60_000);

  const engine = useMemo(() => engineUpdates(posts.data?.content ?? []), [posts.data]);
  const server = parseSeen(pref.data?.content);
  const seen = mergeSeen(local, server);
  const fresh = unseen({ engine, ui: UI_CHANGES, seen, now });
  const ready = !posts.isLoading && !pref.isLoading;

  // Local at once, then the server record (failures stay local).
  const store = (next: Seen) => {
    writeLocal(next);
    const content = JSON.stringify(next);
    if (pref.isSuccess && pref.data?.content !== content) save.mutate({ id: pref.data?.id, content });
  };
  /** Everything shown counts as read. */
  const markSeen = (shown: { engine: EngineUpdate[]; ui: UiChange[] }) => store(seenAfter(seen, shown.engine, shown.ui));
  /** Setting: open the dialog by itself when something is new. */
  const setAuto = (on: boolean) => store(withAuto(seen, on));

  return {
    engine,
    fresh,
    count: fresh.engine.length + fresh.ui.length,
    ready,
    auto: autoOpen(seen),
    saving: save.isPending,
    markSeen,
    setAuto,
  };
}

const paragraphs = (text: string) => text.split(/\n{2,}/).filter(Boolean);

/**
 * „Neu bei Alpha-Trader“: opens by itself when something is unseen (`mode="new"`) or from the player
 * menu with the recent history (`mode="all"`, unseen marked „neu“). Closing marks everything shown as read.
 */
export function WhatsNewDialog({
  mode,
  engine,
  fresh,
  onClose,
}: {
  mode: 'new' | 'all';
  engine: EngineUpdate[];
  fresh: { engine: EngineUpdate[]; ui: UiChange[] };
  onClose: (shown: { engine: EngineUpdate[]; ui: UiChange[] }) => void;
}) {
  const navigate = useNavigate();
  const shown = mode === 'new' ? fresh : { engine: engine.slice(0, 3), ui: UI_CHANGES.slice(0, 5) };
  const [tab, setTab] = useState<'spiel' | 'oberflaeche'>(shown.engine.length ? 'spiel' : 'oberflaeche');
  const both = shown.engine.length > 0 && shown.ui.length > 0;
  const isNew = (id: string) => fresh.engine.some((u) => u.id === id) || fresh.ui.some((c) => c.id === id);
  const close = () => onClose(shown);
  const go = (href: string) => {
    close();
    navigate(href);
  };
  const newTag = <span className="wn__new">neu</span>;

  return (
    <DS.Dialog
      open
      size="lg"
      className="wn"
      eyebrow={mode === 'new' ? 'Seit deinem letzten Besuch' : 'Neuigkeiten'}
      title="Neu bei Alpha-Trader"
      onClose={close}
      actions={
        <DS.Button variant="primary" onClick={close}>
          {mode === 'new' ? 'Gelesen' : 'Schließen'}
        </DS.Button>
      }
    >
      {both && (
        <DS.SegmentedControl
          size="sm"
          aria-label="Neuigkeiten"
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          options={[
            { value: 'spiel', label: `Spiel (${shown.engine.length})` },
            { value: 'oberflaeche', label: `Diese Oberfläche (${shown.ui.length})` },
          ]}
        />
      )}
      <div className="wn__scroll">
        {tab === 'spiel' && shown.engine.length > 0 ? (
          shown.engine.map((u, i) => (
            <article key={u.id} className="wn__block">
              <header className="wn__head">
                <h3>
                  Spiel-Engine · {dayLabel(u.day)} {mode === 'all' && isNew(u.id) && newTag}
                </h3>
                <a
                  href={`/zeitung/${u.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    go(`/zeitung/${u.id}`);
                  }}
                >
                  In der Zeitung
                </a>
              </header>
              {/* Older updates start folded, so the newest one stays on screen. */}
              <details open={i === 0} className="wn__details">
                <summary>{u.sections.map((s) => s.heading).filter(Boolean).join(' · ') || 'Details'}</summary>
                {u.sections.map((s, j) => (
                  <section key={j} className="wn__topic">
                    {s.heading && <h4>{s.heading}</h4>}
                    {paragraphs(s.text).map((p, k) => (
                      <p key={k}>{p}</p>
                    ))}
                  </section>
                ))}
              </details>
            </article>
          ))
        ) : shown.ui.length ? (
          shown.ui.map((c) => {
            const shot = shotOf(c);
            return (
              <article key={c.id} className="wn__block">
                <header className="wn__head">
                  <h3>
                    {c.title} {mode === 'all' && isNew(c.id) && newTag}
                  </h3>
                  <span className="wn__date">{dayLabel(c.id)}</span>
                </header>
                <ul className="wn__items">
                  {c.items.map((it, k) => (
                    <li key={k}>
                      <span>{it.text}</span>
                      {it.href && (
                        <DS.Button variant="ghost" size="sm" onClick={() => go(it.href!)}>
                          Ansehen
                        </DS.Button>
                      )}
                    </li>
                  ))}
                </ul>
                {shot && (
                  <a
                    className="wn__shot"
                    href={shot.href}
                    onClick={(e) => {
                      e.preventDefault();
                      go(shot.href);
                    }}
                  >
                    <img src={shot.src} width={shot.width} height={shot.height} alt={shot.alt} loading="lazy" decoding="async" />
                  </a>
                )}
              </article>
              );
          })
        ) : (
          <DS.EmptyState compact as="h3" title="Keine Neuigkeiten" />
        )}
      </div>
    </DS.Dialog>
  );
}
