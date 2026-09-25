import type { AchievementItem } from '../../vendor/bankiersgruen';
import type { ApiMessage } from '../lib/messages';

/**
 * Achieved and in-progress achievements for AchievementBoard: achieved first (newest first),
 * then progress by how close it is. Descriptions go through the translator.
 */
export function achievementItems(
  done: AchievementItem[],
  progress: AchievementItem[],
  translate: (m: ApiMessage | string | undefined) => string,
): AchievementItem[] {
  const text = (d: AchievementItem['description']) => translate(d as ApiMessage | string | undefined);
  const achieved = [...done]
    .sort((a, b) => (b.achievedDate ?? 0) - (a.achievedDate ?? 0))
    .map((a) => ({ ...a, description: text(a.description) }));
  const open = [...progress]
    .filter((p) => !done.some((d) => d.type === p.type))
    .sort((a, b) => (b.progressInPercent ?? 0) - (a.progressInPercent ?? 0))
    .map((a) => ({ ...a, description: text(a.description) }));
  return [...achieved, ...open];
}
