import { useMemo } from 'react';
import { DS } from '../ds';
import { useSponsoringGoals, useSponsors } from '../api/queries';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useIsPhone } from '../lib/useMediaQuery';
import { useParamState } from '../lib/useParamState';
import { goalHours, goalName, goalSponsors, groupGoals, hoursText, pctText, periodCoverage, type SponsoringGoal } from './derive';
import './SponsoringPage.css';

const GOALS = [
  { value: 'features', label: 'Features' },
  { value: 'kosten', label: 'Laufende Kosten' },
  { value: 'erreicht', label: 'Finanziert' },
];
const PHONE = [
  { value: 'features', label: 'Features' },
  { value: 'kosten', label: 'Kosten' },
  { value: 'erreicht', label: 'Erreicht' },
  { value: 'sponsoren', label: 'Spender' },
];

const day = (ms: number) => new Date(ms).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric', year: 'numeric' });

/**
 * Sponsoring (/sponsoring): players fund the game with gold hours – the running costs of the
 * current month and wished-for features, each a goal with a progress bar – and the ranking of the
 * sponsors. Sponsoring itself happens in the official game; the API only lists it.
 */
export function SponsoringPage() {
  const onLinkClick = useInternalLinks();
  const isPhone = useIsPhone();
  const goals = useSponsoringGoals();
  const sponsors = useSponsors();
  const [view, setView] = useParamState('ansicht', 'features', isPhone ? PHONE : GOALS);
  const now = goals.dataUpdatedAt;
  const groups = useMemo(() => groupGoals(goals.data?.content ?? [], now), [goals.data, now]);
  const cover = periodCoverage(groups.costs);
  const list = sponsors.data?.content ?? [];
  const total = list.reduce((s, x) => s + (x.hours ?? 0), 0);
  const top = list[0]?.hours ?? 0;

  const goalList = (items: SponsoringGoal[], empty: string, showEnd = false) =>
    goals.isLoading ? (
      <DS.Loading rows={6} />
    ) : !items.length ? (
      <DS.EmptyState compact as="h3" title={empty} />
    ) : (
      <ul className="spons__goals">
        {items.map((g) => {
          const given = goalHours(g);
          const who = goalSponsors(g);
          return (
            <li key={g.id}>
              <DS.ProgressBar
                variant={(g.achievedPercentage ?? 0) >= 100 ? 'reward' : 'neutral'}
                label={goalName(g.description)}
                value={Math.min(g.achievedPercentage ?? 0, 100)}
                valueText={pctText(g.achievedPercentage ?? 0)}
                hint={
                  <>
                    <span className="num">{hoursText(Math.min(given, g.neededGoldHours ?? given))}</span> von{' '}
                    <span className="num">{hoursText(g.neededGoldHours ?? 0)}</span>
                    {who.length ? ` · ${who.slice(0, 3).map((w) => w.username).join(', ')}${who.length > 3 ? ` +${who.length - 3}` : ''}` : ''}
                    {showEnd && g.endDate ? ` · ${day(g.endDate)}` : ''}
                  </>
                }
              />
            </li>
          );
        })}
      </ul>
    );

  const goalContent =
    view === 'kosten'
      ? goalList(groups.costs, 'Keine laufenden Kosten offen')
      : view === 'erreicht'
        ? goalList(groups.funded, 'Noch nichts finanziert', true)
        : goalList(groups.features, 'Keine offenen Features');

  const sponsorList = sponsors.isLoading ? (
    <DS.Loading rows={5} />
  ) : !list.length ? (
    <DS.EmptyState compact as="h3" title="Noch keine Sponsoren" />
  ) : (
    <ol className="spons__ranking">
      {list.map((s, i) => (
        <li key={s.id ?? i}>
          <DS.ProgressBar
            size="sm"
            variant="neutral"
            label={
              <>
                <span className="num">{i + 1}.</span>{' '}
                <a href={`/spieler/${encodeURIComponent(s.user?.username ?? '')}`}>{s.user?.username ?? '–'}</a>
              </>
            }
            value={s.hours ?? 0}
            max={top || 1}
            valueText={hoursText(s.hours ?? 0)}
            hint={s.user?.userCapabilities?.lastSponsoringDate ? `zuletzt ${day(s.user.userCapabilities.lastSponsoringDate)}` : ' '}
          />
        </li>
      ))}
    </ol>
  );

  return (
    <div className="page spons" onClick={onLinkClick}>
      <DS.PageHeader
        size="md"
        title="Sponsoring"
        meta={<span>Gold-Stunden für Server und neue Funktionen</span>}
      />
      <div className="spons__body">
        <DS.StatGroup columns="repeat(4, minmax(0, 1fr))" aria-label="Sponsoring in Zahlen" className="spons__stats">
          <DS.StatTile label="Gold-Stunden" value={sponsors.data ? hoursText(total) : '–'} hint={`von ${list.length} Sponsoren`} />
          <DS.StatTile
            label="Kosten diesen Monat"
            value={goals.data ? pctText(cover.pct) : '–'}
            hint={groups.periodEnd ? `gedeckt · Monat endet ${day(groups.periodEnd - 1)}` : ' '}
          />
          <DS.StatTile label="Offene Features" value={goals.data ? String(groups.features.length) : '–'} hint="warten auf Sponsoren" />
          <DS.StatTile
            label="Finanziert"
            value={goals.data ? String(groups.funded.length) : '–'}
            hint={goals.data ? `Features · ${groups.fundedPeriods} Monate Betrieb` : ' '}
          />
        </DS.StatGroup>
        {isPhone ? (
          <DS.Card fill flush className="spons__card">
            <div className="spons__seg">
              <DS.SegmentedControl size="sm" fullWidth aria-label="Ansicht" options={PHONE} value={view} onChange={setView} />
            </div>
            <div className="panel__fill scroll spons__scroll">{view === 'sponsoren' ? sponsorList : goalContent}</div>
          </DS.Card>
        ) : (
          <div className="spons__grid">
            <DS.Card fill flush className="spons__card" title="Ziele">
              <div className="spons__seg">
                <DS.SegmentedControl size="sm" aria-label="Ziele" options={GOALS} value={view} onChange={setView} />
              </div>
              <div className="panel__fill scroll spons__scroll">{goalContent}</div>
            </DS.Card>
            <DS.Card fill flush className="spons__card" title="Sponsoren">
              <div className="panel__fill scroll spons__scroll">{sponsorList}</div>
            </DS.Card>
          </div>
        )}
      </div>
    </div>
  );
}
