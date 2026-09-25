import { useParams, useSearchParams } from 'react-router';
import { DS } from '../ds';
import { useAllianceOf, useCeoCompaniesByName, useUserAchievements, useUserProfile } from '../api/queries';
import { useDirectChat } from '../chat/useDirectChat';
import { useInternalLinks } from '../lib/useInternalLinks';
import { translate } from '../lib/messages';
import { achievementItems } from './derive';
import './PlayerPage.css';

const TEAM: Record<string, string> = { OWNER: 'Leitung', DEPUTY: 'Stellvertretung', MEMBER: 'Team' };

/** Player profile: header with key figures, then companies, employments, achievements as tabs. */
export function PlayerPage() {
  const { username = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const onLinkClick = useInternalLinks();
  const profile = useUserProfile(username);
  const companies = useCeoCompaniesByName(username);
  const achievements = useUserAchievements(username);
  const alliance = useAllianceOf(username);
  const chat = useDirectChat();

  if (profile.isError) {
    return (
      <div className="page">
        <DS.EmptyState title="Spieler nicht gefunden">„{username}“ gibt es nicht (mehr).</DS.EmptyState>
      </div>
    );
  }
  const user = profile.data?.user;
  const caps = user?.userCapabilities;
  const own = !!user?.myUser;
  const tab = params.get('ansicht') ?? 'unternehmen';

  const tags = [
    ...(caps?.premium ? [{ label: 'Goldzugang', gold: true }] : []),
    ...(caps?.teamRole && caps.teamRole !== 'NO_MEMBER'
      ? [{ label: `${TEAM[caps.teamRole] ?? 'Team'} · ${caps.teamDepartment ?? 'Alpha-Trader'}`, title: caps.teamRoleDescription ?? undefined }]
      : []),
  ];

  const tabs = [
    {
      value: 'unternehmen',
      label: 'Unternehmen',
      count: companies.data?.length,
      content: companies.isLoading ? (
        <DS.Loading rows={4} />
      ) : companies.data?.length ? (
        <ul className="player-list">
          {companies.data.map((c) => (
            <li key={c.id}>
              <a href={`/unternehmen/${c.securityIdentifier}`}>{c.name}</a>
              <span className="player-list__meta">{c.securityIdentifier}</span>
              {c.achievementTotal ? (
                <span className="player-list__bar">
                  <DS.ProgressBar value={c.achievementCount ?? 0} max={c.achievementTotal} aria-label={`Erfolge ${c.name}`} size="sm" />
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <DS.EmptyState compact as="h3" title="Kein Unternehmen" />
      ),
    },
    {
      value: 'anstellungen',
      label: 'Anstellungen',
      count: profile.data?.employments.length,
      content: (
        <DS.EmploymentList
          employments={profile.data?.employments ?? []}
          hrefFor={(e) => `/wertpapier/${e.company.securityIdentifier}`}
          density="sm"
          empty={<DS.EmptyState compact as="h3" title="Keine Anstellungen" />}
        />
      ),
    },
    {
      value: 'erfolge',
      label: 'Erfolge',
      count: caps ? `${caps.achievementCount}/${caps.achievementTotal}` : undefined,
      content: achievements.data ? (
        <div className="player-pad">
          <DS.AchievementBoard
            achievements={achievementItems(achievements.data.done, achievements.data.progress, translate)}
            label={`Erfolge von ${username}`}
          />
        </div>
      ) : (
        <DS.Loading rows={4} />
      ),
    },
  ];

  const al = alliance.data?.alliance;
  return (
    <div className="page player" onClick={onLinkClick}>
      <DS.ProfileHeader
        kind="user"
        kindLabel="Spieler"
        name={username}
        eyebrow={al ? [<a key="a" href={`/allianz/${al.id}`}>{al.name}</a>] : [alliance.isLoading ? '\u00a0' : 'Keine Allianz']}
        meta={user?.registrationDate ? [`Dabei seit ${new Date(user.registrationDate).getFullYear()}`] : ['\u00a0']}
        tags={tags}
        actions={
          !own && user ? (
            <DS.Button variant="primary" size="sm" loading={chat.pending} onClick={() => chat.open(user)}>
              Nachricht
            </DS.Button>
          ) : undefined
        }
        stats={[
          { label: 'Erfolge', value: caps ? `${caps.achievementCount} von ${caps.achievementTotal}` : '–' },
          { label: 'Unternehmen', value: companies.data ? String(companies.data.length) : '–', sub: 'als CEO' },
          { label: 'Anstellungen', value: profile.data ? String(profile.data.employments.length) : '–' },
          ...(al ? [{ label: 'Allianz', value: al.name, sub: ALLIANCE_ROLE[alliance.data!.role] }] : []),
        ]}
      />
      <DS.Card flush className="panel">
        <div className="panel__tabs">
          <DS.Tabs
            size="sm"
            aria-label="Profil"
            items={tabs}
            value={tab}
            onChange={(v) => setParams({ ansicht: v }, { replace: true })}
          />
        </div>
      </DS.Card>
    </div>
  );
}

const ALLIANCE_ROLE: Record<string, string> = {
  OWNER: 'Gründer',
  DEPUTY: 'Stellvertretung',
  PRESS_OFFICER: 'Pressesprecher',
  MEMBER: 'Mitglied',
};
