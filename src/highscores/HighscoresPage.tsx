import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { DS } from '../ds';
import { useHighscoreHistory, useHighscores, useMe, type HighscoreKind } from '../api/queries';
import { Plot } from '../charts/Plot';
import { useDebounced } from '../lib/useDebounced';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useIsPhone, useMediaQuery } from '../lib/useMediaQuery';
import { ViewList } from '../app/phone';
import { positionChart } from './charts';
import type { HighscoreType } from '../../design-system/components';
import './HighscoresPage.css';
import { companyHref } from '../companies/views';

const PAGE = 50;

/** Categories the API fills for each kind (checked against stable). */
export const TYPES_BY_KIND: Record<HighscoreKind, HighscoreType[]> = {
  user: ['TRADES', 'ACHIEVEMENTS', 'MINER', 'CHAT_MESSAGES', 'ONLINE_TIME'],
  company: ['BOOK_VALUE', 'NET_CASH', 'RESERVES', 'CASH_FLOW', 'TRADES', 'ACHIEVEMENTS', 'BUILDING'],
  alliance: ['BOOK_VALUE', 'NET_CASH', 'RESERVES', 'CASH_FLOW', 'TRADES', 'ACHIEVEMENTS'],
};
const KINDS: { value: HighscoreKind; label: string }[] = [
  { value: 'user', label: 'Spieler' },
  { value: 'company', label: 'Unternehmen' },
  { value: 'alliance', label: 'Allianzen' },
];

const hrefFor = (e: { username?: string; securityIdentifier?: string; id?: string }, kind: HighscoreKind) =>
  kind === 'user'
    ? `/spieler/${encodeURIComponent(e.username ?? '')}`
    : kind === 'company'
      ? companyHref(e.securityIdentifier ?? '')
      : `/allianz/${e.id}`;

/** Highscores: players, companies or alliances by category; own place and its history on the side. */
export function HighscoresPage() {
  const isWide = useMediaQuery('(min-width: 1100px)');
  const phone = useIsPhone();
  const [picking, setPicking] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mineOpen, setMineOpen] = useState(false);
  const onLinkClick = useInternalLinks();
  const [params, setParams] = useSearchParams();
  const set = useCallback(
    (entries: Record<string, string | null>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(entries)) {
            if (v) next.set(k, v);
            else next.delete(k);
          }
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const kind = (KINDS.find((k) => k.value === params.get('art'))?.value ?? 'user') as HighscoreKind;
  const types = TYPES_BY_KIND[kind];
  const type = (types.find((t) => t === params.get('kategorie')) ?? types[0]) as HighscoreType;
  const page = Math.max(0, Number(params.get('seite') ?? 1) - 1);
  const search = params.get('suche') ?? '';
  const debounced = useDebounced(search, 300);

  const list = useHighscores(kind, type, page, debounced, PAGE);
  const total = list.data?.totalElements ?? 0;

  const me = useMe();
  const mine = useHighscores('user', kind === 'user' ? type : 'TRADES', 0, me.data?.username ?? '', 1);
  const myEntry = mine.data?.content.find((e) => e.user?.myUser);
  const history = useHighscoreHistory(type, kind === 'user' ? me.data?.id : undefined);
  const info = DS.HIGHSCORE_TYPES[type];

  const typeOptions = useMemo(() => types.map((t) => ({ value: t, label: DS.HIGHSCORE_TYPES[t].label })), [types]);

  const table = (
    <DS.Card flush className="panel">
      {phone ? (
        // Phone: one row – „Spieler · Trades ▾“ (sheet with kind, categories and their descriptions) + search.
        <div className="ph-bar hs__phonebar">
          {searchOpen || search ? (
            <>
              <DS.Input
                aria-label="Name suchen"
                placeholder="Name suchen"
                type="search"
                autoFocus={searchOpen}
                value={search}
                onChange={(e) => set({ suche: e.target.value || null, seite: null })}
              />
              <button
                type="button"
                className="ph-btn ph-btn--icon"
                aria-label="Suche schließen"
                onClick={() => {
                  setSearchOpen(false);
                  set({ suche: null, seite: null });
                }}
              >
                <DS.Icon name="schliessen" size={20} />
              </button>
            </>
          ) : (
            <>
              <button type="button" className="ph-pick hs__pick" aria-haspopup="dialog" aria-expanded={picking} onClick={() => setPicking(true)}>
                <span className="hs__pickText">
                  <span className="ph-pick__label">{KINDS.find((k) => k.value === kind)?.label}</span>
                  <span className="ph-pick__value">{info.label}</span>
                </span>
                <span className="bnk-chev" aria-hidden="true" />
              </button>
              <button type="button" className="ph-btn ph-btn--icon" aria-label="Name suchen" onClick={() => setSearchOpen(true)}>
                <DS.Icon name="suche" size={20} />
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="hs__controls">
            <DS.SegmentedControl
              aria-label="Rangliste"
              size="sm"
              value={kind}
              options={KINDS}
              onChange={(v) => set({ art: v === 'user' ? null : v, kategorie: null, seite: null })}
            />
            <DS.Select
              aria-label="Kategorie"
              size="sm"
              fullWidth={false}
              value={type}
              options={typeOptions}
              onChange={(e) => set({ kategorie: e.target.value, seite: null })}
            />
            <DS.Input
              aria-label="Name suchen"
              placeholder="Name suchen"
              size="sm"
              value={search}
              onChange={(e) => set({ suche: e.target.value || null, seite: null })}
            />
          </div>
          <p className="hs__desc">{info.description}</p>
        </>
      )}
      <div className="panel__fill scroll hs__table">
        {list.isLoading ? (
          <DS.Loading rows={12} label="Rangliste wird geladen" />
        ) : list.isError ? (
          <DS.Banner variant="error">Rangliste konnte nicht geladen werden: {list.error.message}</DS.Banner>
        ) : (
          <DS.HighscoreTable
            kind={kind}
            type={type}
            entries={(list.data?.content ?? []).map((e, i) => ({ ...e, rank: debounced ? undefined : page * PAGE + i + 1 }))}
            offset={page * PAGE}
            hrefFor={(e, k) => hrefFor(e, k)}
            emptyText={debounced ? 'Niemand gefunden.' : 'Noch keine Einträge.'}
          />
        )}
      </div>
      {total > PAGE && (
        <div className="hs__pages">
          <DS.Pagination
            page={page + 1}
            pages={Math.ceil(total / PAGE)}
            total={`${total.toLocaleString('de-DE')} Einträge`}
            onChange={(p) => set({ seite: p > 1 ? String(p) : null })}
          />
        </div>
      )}
      {/* last in the card (thumb zone), so the pagination arriving later does not move it */}
      {phone && kind === 'user' && (
        <button type="button" className="hs__me" aria-haspopup="dialog" onClick={() => setMineOpen(true)}>
          <span className="hs__meLabel">Dein Platz</span>
          <span className="hs__meValue num">
            {myEntry?.historyPosition != null ? `${myEntry.historyPosition.toLocaleString('de-DE')}.` : '–'}
          </span>
          <span className="hs__meMeta">
            {info.label} {myEntry ? formatValue(type, myEntry.value) : '–'}
          </span>
          <span className="hs__meMore">Verlauf</span>
        </button>
      )}
    </DS.Card>
  );

  const mineBody = (
    <>
      <DS.StatGroup columns="1fr 1fr">
        <DS.StatTile
          label="Platz"
          value={myEntry?.historyPosition != null ? myEntry.historyPosition.toLocaleString('de-DE') : '–'}
          hint={total ? `von ${total.toLocaleString('de-DE')}` : '\u00a0'}
        />
        <DS.StatTile label={info.label} value={myEntry ? formatValue(type, myEntry.value) : '–'} />
      </DS.StatGroup>
      <div className="hs__chart">
        {history.data?.length ? (
          <Plot aria-label={`Platz im Verlauf, ${info.label}`} figure={(t, w) => positionChart(t, w, history.data!)} />
        ) : history.isLoading ? (
          <DS.Loading rows={4} />
        ) : (
          <DS.EmptyState compact as="h3" title="Noch kein Verlauf" />
        )}
      </div>
    </>
  );

  const side = kind === 'user' && (
    <DS.Card className="panel" title="Mein Platz" footer={`${info.label} · Verlauf der letzten Tage`}>
      <div className="panel__fill hs__mine">{mineBody}</div>
    </DS.Card>
  );

  return (
    <div className={`page hs${isWide && side ? ' hs--wide' : ''}`} onClick={onLinkClick}>
      <DS.PageHeader size="md" title="Highscores" meta={<span>{KINDS.find((k) => k.value === kind)?.label} · {info.label}</span>} />
      <div className="page__body hs__body">
        {table}
        {isWide && side}
      </div>
      {phone && (
        <DS.Sheet open={picking} onClose={() => setPicking(false)} title="Rangliste" side="bottom">
          <div className="ph-sheet">
            <DS.SegmentedControl
              aria-label="Rangliste"
              size="sm"
              value={kind}
              options={KINDS}
              onChange={(v) => set({ art: v === 'user' ? null : v, kategorie: null, seite: null })}
            />
            <ViewList
              label="Kategorie"
              views={types.map((t) => ({ value: t, label: DS.HIGHSCORE_TYPES[t].label, description: DS.HIGHSCORE_TYPES[t].description }))}
              value={type}
              onPick={(t) => {
                set({ kategorie: t, seite: null });
                setPicking(false);
              }}
            />
          </div>
        </DS.Sheet>
      )}
      {phone && kind === 'user' && (
        <DS.Sheet open={mineOpen} onClose={() => setMineOpen(false)} title={`Mein Platz · ${info.label}`} side="bottom">
          <div className="hs__mine hs__mine--sheet">{mineBody}</div>
        </DS.Sheet>
      )}
    </div>
  );
}

function formatValue(type: HighscoreType, v: number) {
  const f = DS.HIGHSCORE_TYPES[type].format;
  if (f === 'money') return DS.format.money(v, '€', 2, 'auto');
  if (f === 'percent') return `${v.toLocaleString('de-DE')} %`;
  if (f === 'minutes') return `${Math.round(v / 60).toLocaleString('de-DE')} h`;
  return v.toLocaleString('de-DE');
}
