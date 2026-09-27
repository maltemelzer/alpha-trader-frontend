import type { AchievementItem } from '../../design-system/components';
import type { ApiMessage } from '../lib/messages';
import { achievementItems } from '../players/derive';

/** `my/notyetclaimedallianceachievements` is about the player's own alliance – keep only this one's. */
export function belongsTo(a: AchievementItem, allianceId: string): boolean {
  const owner = (a as AchievementItem & { alliance?: { id?: string } }).alliance?.id;
  return !owner || owner === allianceId;
}

/**
 * Board items: claimable first (unclaimed ones replace their reached twin), then reached ones by
 * date, then open ones by progress.
 */
export function allianceAchievements(
  data: { done: AchievementItem[]; progress: AchievementItem[] } | undefined,
  unclaimed: AchievementItem[],
  translate: (m: ApiMessage | string | undefined) => string,
): AchievementItem[] {
  if (!data) return [];
  const done = [...unclaimed, ...data.done.filter((d) => !unclaimed.some((u) => u.id === d.id))];
  return achievementItems(done, data.progress, translate);
}
