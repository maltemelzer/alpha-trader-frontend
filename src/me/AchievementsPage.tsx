import { DS } from '../ds';
import { useClaimAchievements, useMe, useUnclaimedAchievements, useUserAchievements } from '../api/queries';
import { translate } from '../lib/messages';
import { achievementItems } from '../players/derive';

/** Own achievements: progress bar over all, board with claimable rewards on top. */
export function AchievementsPage() {
  const me = useMe();
  const username = me.data?.username ?? '';
  const all = useUserAchievements(username);
  const unclaimed = useUnclaimedAchievements();
  const claim = useClaimAchievements();

  const open = unclaimed.data ?? [];
  const items = all.data
    ? achievementItems(
        [...open, ...all.data.done.filter((d) => !open.some((o) => o.id === d.id))],
        all.data.progress,
        translate,
      )
    : [];
  const caps = me.data?.userCapabilities;

  return (
    <div className="page">
      <DS.PageHeader
        size="md"
        title="Erfolge"
        meta={caps ? <span>{caps.achievementCount} von {caps.achievementTotal} erreicht</span> : '\u00a0'}
      />
      <DS.Card className="panel">
        <div className="panel__fill scroll">
          {claim.one.isError || claim.all.isError ? (
            <DS.Banner variant="error">Abholen fehlgeschlagen.</DS.Banner>
          ) : null}
          {all.isLoading || !username ? (
            <DS.Loading rows={6} />
          ) : (
            <DS.AchievementBoard
              achievements={items}
              label="Meine Erfolge"
              openFirst
              onClaim={(a) => a.id && claim.one.mutate(a.id)}
              onClaimAll={open.length > 1 ? () => claim.all.mutate() : undefined}
            />
          )}
        </div>
      </DS.Card>
    </div>
  );
}
