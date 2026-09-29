import { useState } from 'react';
import { Link } from 'react-router';
import { DS } from '../ds';
import { FeedbackError, MAX_COMMENT, useMyFeedback, useSaveFavorite, useSaveRating, type MyFeedback } from './api';
import { nextInTour, PROMPT_AFTER_MS, shouldPrompt } from './assign';
import { setUsageConsent, updateLocal, useUsageConsent, type ExperimentState } from './useExperiment';
import './ExperimentBar.css';

const COLLAPSED_KEY = 'at.exp.collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Where the player stands: what the bar offers next. */
function stepOf(x: ExperimentState, variant: string) {
  const rated = x.rated.includes(variant);
  const next = x.mode === 'compare' ? nextInTour(x.order, x.rated, variant) : undefined;
  const allRated = x.exp.variants.every((v) => x.rated.includes(v.id));
  if (!rated) return { action: 'Bewerten', next };
  if (next) return { action: 'Weiter', next };
  if (x.mode === 'compare' && allRated && !x.favorite) return { action: 'Entscheiden', next };
  return { action: 'Ändern', next };
}

/**
 * Floating „Test“ pill on every page with a running experiment: which variant you see, how far you are, rate.
 * In a tour (mode compare) it leads from variant to variant; a toast asks once per variant for a rating.
 */
export function ExperimentBar({ x }: { x: ExperimentState }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const variant = x.choice?.variant;
  const mine = useMyFeedback(x.exp.id, x.running && !!variant);
  const afterMs = PROMPT_AFTER_MS[x.mode];
  const prompt = !!variant && mine.isSuccess && !open && shouldPrompt(x.local, variant, x.rated.includes(variant), afterMs);

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

  if (!x.running || !variant || x.choice?.source === 'fallback') return null;
  const current = x.exp.variants.find((v) => v.id === variant);
  const pos = x.order.indexOf(variant) + 1;
  const step = stepOf(x, variant);
  const onMain = () => (step.action === 'Weiter' ? x.choose(null) : setOpen(true));

  return (
    <>
      {collapsed ? (
        <button type="button" className="expbar expbar--mini" onClick={() => collapse(false)} aria-label={`${x.exp.title}: im Test – Leiste zeigen`}>
          Test
        </button>
      ) : (
        <div className="expbar" role="region" aria-label={`${x.exp.title} im Test`}>
          <button type="button" className="expbar__main" onClick={onMain}>
            <span className="expbar__tag">Test</span>
            <span className="expbar__text">
              {x.exp.title}: <strong>{current?.label}</strong>
              <span className="expbar__count">
                {' '}
                · {pos}/{x.order.length}
              </span>
            </span>
            <span className="expbar__action">{step.action}</span>
          </button>
          {step.action === 'Weiter' && (
            <button type="button" className="expbar__close" onClick={() => setOpen(true)} aria-label="Alle Varianten und deine Bewertungen">
              <DS.Icon name="menue" size={16} />
            </button>
          )}
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
            {x.mode === 'compare'
              ? `Wie gefällt dir „${current?.label}“? Bewerte sie – danach geht es mit der nächsten Variante weiter.`
              : `Du nutzt „${current?.label}“ jetzt eine Weile. Wie gefällt sie dir?`}
          </DS.Toast>
        </DS.ToastRegion>
      )}

      <FeedbackSheet x={x} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function Steps({ x, variant, ratings }: { x: ExperimentState; variant: string; ratings: MyFeedback['ratings'] }) {
  return (
    <ol className="expsteps" aria-label="Varianten">
      {x.order.map((id, i) => {
        const v = x.exp.variants.find((w) => w.id === id)!;
        const stars = ratings.find((r) => r.variant === id)?.stars;
        const now = id === variant;
        const status = now ? 'jetzt' : stars ? '' : 'offen';
        return (
          <li key={id}>
            <button
              type="button"
              className={`expsteps__item${now ? ' is-current' : ''}`}
              aria-current={now ? 'page' : undefined}
              onClick={() => x.choose(x.mode === 'ab' && id === x.assigned ? null : id)}
            >
              <span className="expsteps__num">{i + 1}</span>
              <span className="expsteps__text">
                <span className="expsteps__label">
                  {v.label}
                  {x.favorite === id && <span className="expsteps__fav"> · deine Wahl</span>}
                  {x.mode === 'ab' && x.assigned === id && <span className="expsteps__fav"> · dir zugeteilt</span>}
                </span>
                <span className="expsteps__desc">{v.description}</span>
              </span>
              <span className="expsteps__status">
                {stars ? (
                  <span className="expsteps__stars" aria-label={`von dir ${stars} von 5 Sternen`}>
                    {'★'.repeat(stars)}
                  </span>
                ) : (
                  status
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function FeedbackSheet({ x, open, onClose }: { x: ExperimentState; open: boolean; onClose: () => void }) {
  const variant = x.choice!.variant;
  const mine = useMyFeedback(x.exp.id, open);
  const save = useSaveRating();
  const favorite = useSaveFavorite();
  const ratings = mine.data?.ratings ?? [];
  const saved = ratings.find((r) => r.variant === variant);

  // The forms follow the saved state until the player changes something (a draft per key).
  const key = `${variant}:${saved?.updated ?? 0}`;
  const [draft, setDraft] = useState<{ key: string; stars: number | null; comment: string } | null>(null);
  const [sentFor, setSentFor] = useState<string | null>(null);
  const own = draft?.key === key ? draft : null;
  const stars = own ? own.stars : (saved?.stars ?? null);
  const comment = own ? own.comment : (saved?.comment ?? '');
  const edit = (patch: { stars?: number | null; comment?: string }) => setDraft({ key, stars, comment, ...patch });
  const sent = sentFor === variant && !own;
  const failed = save.error && save.variables?.variant === variant ? save.error : null;

  const decisionKey = `${mine.data?.favorite ?? ''}:${mine.data?.favoriteNote ?? ''}`;
  const [pick, setPick] = useState<{ key: string; variant: string | null; note: string } | null>(null);
  const ownPick = pick?.key === decisionKey ? pick : null;
  const pickVariant = ownPick ? ownPick.variant : (mine.data?.favorite ?? null);
  const pickNote = ownPick ? ownPick.note : (mine.data?.favoriteNote ?? '');
  const editPick = (patch: { variant?: string | null; note?: string }) => setPick({ key: decisionKey, variant: pickVariant, note: pickNote, ...patch });

  const current = x.exp.variants.find((v) => v.id === variant)!;
  const offline = mine.error instanceof FeedbackError && mine.error.status !== 401 && mine.error.status !== 400;
  const next = x.mode === 'compare' ? nextInTour(x.order, x.rated, variant) : undefined;
  const openCount = x.exp.variants.filter((v) => !x.rated.includes(v.id) && v.id !== variant).length + (saved ? 0 : 1);
  const canDecide = x.mode === 'compare' ? x.exp.variants.every((v) => x.rated.includes(v.id)) : x.local.seen.length >= 2;
  const decideFrom = x.mode === 'compare' ? x.exp.variants : x.exp.variants.filter((v) => x.local.seen.includes(v.id) || v.id === variant);

  const submit = () => {
    if (!stars) return;
    save.mutate(
      { experiment: x.exp.id, variant, stars, comment },
      {
        onSuccess: () => {
          setSentFor(variant);
          // In a tour: on to the next unrated variant (the automatic pick), the sheet closes.
          if (next) {
            x.choose(null);
            onClose();
          }
        },
      },
    );
  };
  const decide = () => {
    if (!pickVariant) return;
    favorite.mutate({ experiment: x.exp.id, variant: pickVariant, note: pickNote }, { onSuccess: () => x.choose(null) });
  };

  const consent = useUsageConsent();
  const primary = saved ? (next ? 'Ändern und weiter' : 'Bewertung ändern') : next ? 'Bewerten und weiter' : 'Bewertung senden';

  return (
    <DS.Sheet
      open={open}
      onClose={onClose}
      title={`${x.exp.title} im Test`}
      width={460}
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
            {primary}
          </DS.Button>
        </div>
      }
    >
      <div className="expsheet">
        <p className="expsheet__intro">
          {x.mode === 'compare'
            ? `Wir probieren ${x.exp.variants.length} Varianten aus. Schau dir jede eine Weile an und bewerte sie – danach geht es mit der nächsten weiter. Am Ende sagst du, welche bleiben soll.`
            : `Wir probieren ${x.exp.variants.length} Varianten aus. Dir ist eine zugeteilt; schau dir gern auch die anderen an und sag uns, was dir gefällt und was fehlt.`}
        </p>

        <Steps x={x} variant={variant} ratings={ratings} />

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
            rows={3}
            maxLength={MAX_COMMENT}
            value={comment}
            onChange={(e) => edit({ comment: e.target.value })}
            disabled={offline}
          />
          <p className="expsheet__note">
            Wird mit deinem Spielernamen gespeichert, damit wir nachfragen können. Du kannst alles jederzeit ändern.
          </p>
          {failed && <DS.Banner variant="error">{failed.message}</DS.Banner>}
          {sent && !save.isPending && <DS.Banner variant="info">Danke! Deine Bewertung ist gespeichert.</DS.Banner>}
        </div>

        {canDecide ? (
          <div className="expsheet__rate">
            <DS.RadioGroup
              label="Welche soll bleiben?"
              inline
              value={pickVariant}
              onChange={(v) => editPick({ variant: v })}
              disabled={offline || favorite.isPending}
              options={decideFrom.map((v) => ({ value: v.id, label: v.label }))}
            />
            <DS.Textarea
              label="Was sollte sie von den anderen übernehmen? (freiwillig)"
              rows={3}
              maxLength={MAX_COMMENT}
              value={pickNote}
              onChange={(e) => editPick({ note: e.target.value })}
              disabled={offline}
            />
            <div className="expsheet__decide">
              <DS.Button variant="secondary" onClick={decide} disabled={!pickVariant || !ownPick || favorite.isPending || offline} loading={favorite.isPending}>
                {mine.data?.favorite ? 'Entscheidung ändern' : 'Entscheidung senden'}
              </DS.Button>
              {favorite.error && <span className="expsheet__err">{favorite.error.message}</span>}
              {!ownPick && mine.data?.favorite && (
                <span className="expsheet__note">Du siehst jetzt „{x.exp.variants.find((v) => v.id === mine.data!.favorite)?.label}“.</span>
              )}
            </div>
          </div>
        ) : (
          x.mode === 'compare' && (
            <p className="expsheet__note">
              Noch {openCount} {openCount === 1 ? 'Variante' : 'Varianten'} zu bewerten – danach fragen wir, welche bleiben soll.
            </p>
          )
        )}

        <div className="expsheet__rate">
          <DS.Switch
            label="Nutzung mitzählen"
            checked={consent}
            onChange={setUsageConsent}
            hint={
              <>
                Wie lange du jede Variante ansiehst und welche Bereiche du anklickst – ohne deinen Namen, nur für die Auswertung dieses Tests.
                Freiwillig, jederzeit abschaltbar. <Link to="/datenschutz#experimente">Datenschutz</Link>
              </>
            }
          />
        </div>
      </div>
    </DS.Sheet>
  );
}
