import { useState } from 'react';
import { Link } from 'react-router';
import { DS } from '../ds';
import { FeedbackError, MAX_COMMENT, useMyFeedback, useSaveFavorite, useSaveRating } from './api';
import { shouldPrompt } from './assign';
import { updateLocal, type ExperimentState } from './useExperiment';
import './ExperimentBar.css';

const COLLAPSED_KEY = 'at.exp.collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Floating „Test“ pill of a running experiment: which variant you see, switch, rate. Asks once per
 * variant for a rating after a few minutes of visible time (toast, never a modal on its own).
 */
export function ExperimentBar({ x }: { x: ExperimentState }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const variant = x.choice?.variant;
  const mine = useMyFeedback(x.exp.id, x.running && !!variant);
  const rated = !!mine.data?.ratings.some((r) => r.variant === variant);
  const prompt = !!variant && mine.isSuccess && !open && shouldPrompt(x.local, variant, rated);

  const collapse = (v: boolean) => {
    setCollapsed(v);
    try {
      localStorage.setItem(COLLAPSED_KEY, v ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  };
  const markPrompted = () => {
    if (variant) updateLocal(x.exp.id, (s) => (s.prompted.includes(variant) ? s : { ...s, prompted: [...s.prompted, variant] }));
  };

  if (!x.running || !variant) return null;
  const current = x.exp.variants.find((v) => v.id === variant);
  const index = x.exp.variants.findIndex((v) => v.id === variant) + 1;

  return (
    <>
      {collapsed ? (
        <button type="button" className="expbar expbar--mini" onClick={() => collapse(false)} aria-label={`${x.exp.title}: im Test – Leiste zeigen`}>
          Test
        </button>
      ) : (
        <div className="expbar" role="region" aria-label={`${x.exp.title} im Test`}>
          <button type="button" className="expbar__main" onClick={() => setOpen(true)}>
            <span className="expbar__tag">Test</span>
            <span className="expbar__text">
              {x.exp.title}: <strong>{current?.label}</strong>
              <span className="expbar__count">
                {' '}
                · {index}/{x.exp.variants.length}
              </span>
            </span>
            <span className="expbar__action">{rated ? 'Ändern' : 'Bewerten'}</span>
          </button>
          <button type="button" className="expbar__close" onClick={() => collapse(true)} aria-label="Leiste einklappen">
            <DS.Icon name="schliessen" size={16} />
          </button>
        </div>
      )}

      {prompt && (
        <DS.ToastRegion>
          <DS.Toast
            title={`${x.exp.title} im Test`}
            onClose={markPrompted}
            action={
              <DS.Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  markPrompted();
                  setOpen(true);
                }}
              >
                Bewerten
              </DS.Button>
            }
          >
            Du nutzt „{current?.label}“ jetzt eine Weile. Wie gefällt sie dir?
          </DS.Toast>
        </DS.ToastRegion>
      )}

      <FeedbackSheet x={x} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function FeedbackSheet({ x, open, onClose }: { x: ExperimentState; open: boolean; onClose: () => void }) {
  const variant = x.choice!.variant;
  const mine = useMyFeedback(x.exp.id, open);
  const save = useSaveRating();
  const favorite = useSaveFavorite();
  const saved = mine.data?.ratings.find((r) => r.variant === variant);

  // The form follows the variant: its saved rating until the player changes something (draft per key).
  const key = `${variant}:${saved?.updated ?? 0}`;
  const [draft, setDraft] = useState<{ key: string; stars: number | null; comment: string } | null>(null);
  const [sentFor, setSentFor] = useState<string | null>(null);
  const own = draft?.key === key ? draft : null;
  const stars = own ? own.stars : (saved?.stars ?? null);
  const comment = own ? own.comment : (saved?.comment ?? '');
  const edit = (patch: { stars?: number | null; comment?: string }) => setDraft({ key, stars, comment, ...patch });
  const sent = sentFor === variant && !own;
  const failed = save.error && save.variables?.variant === variant ? save.error : null;

  const current = x.exp.variants.find((v) => v.id === variant)!;
  const seen = x.exp.variants.filter((v) => x.local.seen.includes(v.id) || v.id === variant);
  const offline = mine.error instanceof FeedbackError && mine.error.status !== 401 && mine.error.status !== 400;
  const ratingOf = (id: string) => mine.data?.ratings.find((r) => r.variant === id)?.stars;

  const submit = () => {
    if (!stars) return;
    save.mutate({ experiment: x.exp.id, variant, stars, comment }, { onSuccess: () => setSentFor(variant) });
  };

  return (
    <DS.Sheet
      open={open}
      onClose={onClose}
      title={`${x.exp.title} im Test`}
      width={440}
      footer={
        <div className="expsheet__foot">
          {mine.data?.admin && (
            <Link to={`/experimente?experiment=${x.exp.id}`} className="expsheet__admin" onClick={onClose}>
              Auswertung
            </Link>
          )}
          <DS.Button variant="ghost" onClick={onClose}>
            Schließen
          </DS.Button>
          <DS.Button variant="primary" onClick={submit} disabled={!stars || save.isPending || offline} loading={save.isPending}>
            {saved ? 'Bewertung ändern' : 'Bewertung senden'}
          </DS.Button>
        </div>
      }
    >
      <div className="expsheet">
        <p className="expsheet__intro">
          Wir probieren {x.exp.variants.length} Varianten aus.{' '}
          {x.choice!.chosen ? 'Du siehst gerade eine, die du selbst gewählt hast.' : 'Dir ist diese zugeteilt.'} Schau dir gern alle an und sag
          uns, was dir gefällt und was fehlt.
        </p>

        <DS.RadioGroup
          label="Variante"
          value={variant}
          onChange={(v) => x.choose(v === x.assigned ? null : v)}
          options={x.exp.variants.map((v) => {
            const s = ratingOf(v.id);
            const notes = [v.id === x.assigned ? 'dir zugeteilt' : '', s ? `von dir: ${'★'.repeat(s)}` : ''].filter(Boolean).join(' · ');
            return { value: v.id, label: notes ? `${v.label} (${notes})` : v.label, description: v.description };
          })}
        />

        {offline && <DS.Banner variant="info">Bewerten geht gerade nicht – der Feedback-Dienst ist nicht erreichbar.</DS.Banner>}

        <div className="expsheet__rate">
          <DS.RatingInput
            label={`${x.exp.question} – „${current.label}“`}
            size="lg"
            value={stars}
            onChange={(n) => edit({ stars: n })}
            disabled={offline}
          />
          <DS.Textarea
            label="Was gefällt dir, was fehlt? (freiwillig)"
            rows={4}
            maxLength={MAX_COMMENT}
            value={comment}
            onChange={(e) => edit({ comment: e.target.value })}
            disabled={offline}
          />
          <p className="expsheet__note">
            Wird mit deinem Spielernamen gespeichert, damit wir nachfragen können. Du kannst deine Bewertung jederzeit ändern.
          </p>
          {failed && <DS.Banner variant="error">{failed.message}</DS.Banner>}
          {sent && !save.isPending && <DS.Banner variant="info">Danke! Deine Bewertung ist gespeichert.</DS.Banner>}
        </div>

        {seen.length >= 2 && (
          <DS.RadioGroup
            label="Welche soll bleiben?"
            inline
            value={mine.data?.favorite ?? null}
            onChange={(v) => favorite.mutate({ experiment: x.exp.id, variant: v })}
            disabled={offline || favorite.isPending}
            options={seen.map((v) => ({ value: v.id, label: v.label }))}
            hint={favorite.error ? favorite.error.message : 'Nur unter denen, die du schon gesehen hast.'}
          />
        )}
      </div>
    </DS.Sheet>
  );
}
