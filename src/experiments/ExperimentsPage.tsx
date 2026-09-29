// Evaluation of the experiments (/experimente) – only for players in FEEDBACK_ADMINS of the feedback service.
// Wide: comparison per variant left, comments right. Phone: the two as views.
import { useMemo, useState } from 'react';
import { DS } from '../ds';
import { PageNav, useFilters, usePageView, type PageFilter, type PageView } from '../app/pagenav';
import { useIsPhone } from '../lib/useMediaQuery';
import { useNow } from '../lib/useNow';
import { FeedbackError, useExperimentResults, type ResultComment } from './api';
import { EXPERIMENTS, experimentOf } from './registry';
import { formatDwell, formatStars, leader, resultRows, type ResultRow } from './results';
import './ExperimentsPage.css';

const VIEWS: PageView[] = [
  { value: 'vergleich', label: 'Vergleich' },
  { value: 'kommentare', label: 'Kommentare', parent: 'vergleich' },
];

// The experiment is a filter only once there is more than one.
const FILTERS: PageFilter[] = EXPERIMENTS.length < 2 ? [] : [
  {
    key: 'experiment',
    label: 'Experiment',
    fallback: EXPERIMENTS[0].id,
    primary: true,
    bare: true,
    options: EXPERIMENTS.map((e) => ({ value: e.id, label: e.title })),
  },
];

const pct = (x: number) => `${Math.round(x * 100)} %`;
/** CSS width – no space before the unit */
const width = (x: number) => `${(x * 100).toFixed(1)}%`;

function Row({ r, lead }: { r: ResultRow; lead: boolean }) {
  return (
    <li className={`xr${lead ? ' xr--lead' : ''}`}>
      <div className="xr__head">
        <span className="xr__name">{r.label}</span>
        {lead && <span className="xr__lead">vorn</span>}
        <span className="xr__people">
          {r.people} {r.people === 1 ? 'Person' : 'Personen'} · {r.visits} {r.visits === 1 ? 'Besuch' : 'Besuche'} · Median {formatDwell(r.dwellMedianMs)} je Besuch
        </span>
      </div>
      <div className="xr__grid">
        <div className="xr__stars">
          <span className="xr__avg">{formatStars(r.avgStars)}</span>
          <span className="xr__unit">
            ★ · {r.ratings} {r.ratings === 1 ? 'Bewertung' : 'Bewertungen'}
          </span>
        </div>
        <ol className="xr__dist" aria-label={`Verteilung der Sterne für ${r.label}`}>
          {[5, 4, 3, 2, 1].map((s) => (
            <li key={s}>
              <span className="xr__dlabel">{s} ★</span>
              <span className="xr__dbar">
                <span style={{ width: width(r.starShares[s - 1]) }} />
              </span>
              <span className="xr__dn">{r.stars[s - 1]}</span>
            </li>
          ))}
        </ol>
        <div className="xr__fav">
          <DS.ProgressBar label="Soll bleiben" value={Math.round(r.favoriteShare * 100)} valueText={`${r.favorites} · ${pct(r.favoriteShare)}`} />
          <ul className="xr__clicks" aria-label="Häufigste Klickziele">
            {r.clicks.slice(0, 4).map((c) => (
              <li key={c.target}>
                <span>{c.target}</span>
                <span className="num">{c.count}</span>
              </li>
            ))}
            {!r.clicks.length && <li className="xr__muted">noch keine Klicks</li>}
          </ul>
        </div>
      </div>
    </li>
  );
}

function Comments({ comments, labels, now }: { comments: ResultComment[]; labels: Record<string, string>; now: number }) {
  if (!comments.length)
    return (
      <DS.EmptyState compact as="h3" title="Noch keine Kommentare">
        Bewertungen mit Text erscheinen hier, neueste zuerst.
      </DS.EmptyState>
    );
  return (
    <ul className="xc">
      {comments.map((c) => (
        <li key={`${c.variant}:${c.username}`} className="xc__item">
          <div className="xc__meta">
            <a href={`/spieler/${encodeURIComponent(c.username)}`}>{c.username}</a>
            <span>{labels[c.variant] ?? c.variant}</span>
            <span className="xc__stars" aria-label={`${c.stars} von 5 Sternen`}>
              {'★'.repeat(c.stars)}
              <span className="xc__off">{'☆'.repeat(5 - c.stars)}</span>
            </span>
            <span className="xc__when">{ago(now - c.updated)}</span>
          </div>
          <p className="xc__text">{c.comment}</p>
        </li>
      ))}
    </ul>
  );
}

function ago(ms: number): string {
  const m = Math.round(ms / 60_000);
  if (m < 60) return `vor ${Math.max(m, 1)} Min.`;
  const h = Math.round(m / 60);
  if (h < 48) return `vor ${h} Std.`;
  return `vor ${Math.round(h / 24)} Tagen`;
}

function Evaluation() {
  const isPhone = useIsPhone();
  const [view, setView, views] = usePageView(VIEWS, 'vergleich');
  const filters = useFilters(FILTERS);
  const exp = experimentOf(filters.values.experiment ?? '') ?? EXPERIMENTS[0];
  const results = useExperimentResults(exp.id);
  const now = useNow();
  const [only, setOnly] = useState('alle');

  const rows = useMemo(() => resultRows(exp, results.data), [exp, results.data]);
  const lead = leader(rows);
  const labels = Object.fromEntries(exp.variants.map((v) => [v.id, v.label]));
  const withText = (results.data?.comments ?? []).filter((c) => c.comment && (only === 'alle' || c.variant === only));
  const totals = rows.reduce((s, r) => ({ people: s.people + r.people, ratings: s.ratings + r.ratings }), { people: 0, ratings: 0 });

  const denied = results.error instanceof FeedbackError ? results.error : undefined;
  if (denied)
    return (
      <div className="page xp">
        <DS.PageHeader title="Experimente" />
        <DS.EmptyState title={denied.status === 403 ? 'Nur für Auswertende' : 'Auswertung nicht erreichbar'}>
          {denied.status === 403
            ? 'Die Auswertung sehen nur Spieler, die im Feedback-Dienst als Auswertende eingetragen sind (FEEDBACK_ADMINS).'
            : denied.message}
        </DS.EmptyState>
      </div>
    );

  const compare = (
    <DS.Card flush className="panel" title={isPhone ? undefined : 'Varianten im Vergleich'}>
      <div className="panel__fill scroll">
        {results.isLoading ? (
          <DS.Loading rows={3} />
        ) : (
          <ul className="xr__list">
            {rows.map((r) => (
              <Row key={r.id} r={r} lead={r.id === lead} />
            ))}
          </ul>
        )}
      </div>
    </DS.Card>
  );

  const comments = (
    <DS.Card
      flush
      className="panel"
      title={isPhone ? undefined : 'Kommentare'}
      action={
        <DS.SegmentedControl
          size="sm"
          aria-label="Kommentare zu"
          value={only}
          onChange={setOnly}
          options={[{ value: 'alle', label: 'Alle' }, ...exp.variants.map((v) => ({ value: v.id, label: v.label }))]}
        />
      }
    >
      <div className="panel__fill scroll">
        <Comments comments={withText} labels={labels} now={now} />
      </div>
    </DS.Card>
  );

  return (
    <div className="page xp">
      <DS.PageHeader
        size="md"
        title="Experimente"
        meta={`${exp.title} · bis ${new Date(exp.until).toLocaleDateString('de-DE')} · ${totals.people} ${totals.people === 1 ? 'Person' : 'Personen'} · ${totals.ratings} ${totals.ratings === 1 ? 'Bewertung' : 'Bewertungen'}`}
        tabs={<PageNav label="Ansicht" views={views} view={view} onView={setView} filters={filters} />}
      />
      <div className="page__body xp__body">
        {(!isPhone || view === 'vergleich') && compare}
        {(!isPhone || view === 'kommentare') && comments}
      </div>
    </div>
  );
}

export function ExperimentsPage() {
  if (EXPERIMENTS.length) return <Evaluation />;
  return (
    <div className="page xp">
      <DS.PageHeader size="md" title="Experimente" />
      <DS.EmptyState title="Gerade läuft kein Experiment">
        Wenn mehrere Varianten einer Seite zur Wahl stehen, siehst du hier, wie die Spieler sie bewerten – Sterne, Kommentare und welche
        bleiben soll.
      </DS.EmptyState>
    </div>
  );
}
