// Game sponsoring: players fund the running costs and new features of Alpha-Trader with
// „Gold-Stunden“ (GET /api/v2/sponsors, /api/v2/sponsoringgoals). Not to be confused with
// designated sponsoring (market maker mandates) of companies.

export interface GoalSponsor {
  hours?: number;
  date?: number;
  user?: { id?: string; username?: string };
}

export interface SponsoringGoal {
  id?: string;
  description?: string;
  achievedPercentage?: number;
  neededGoldHours?: number;
  recurring?: boolean;
  endDate?: number;
  sponsors?: GoalSponsor[];
}

export interface Sponsor {
  id?: string;
  hours?: number;
  user?: { id?: string; username?: string; userCapabilities?: { lastSponsoringDate?: number | null } };
}

const NAMES: Record<string, string> = {
  server: 'Server',
  'email feature': 'E-Mail-Versand',
  'floating ip feature': 'Feste IP-Adresse',
  'backup feature': 'Backups',
  'domains feature': 'Domains',
  'interest tender feature': 'Zinstender',
  'google ads feature': 'Ohne Google-Werbung',
  'trade earnings overview feature': 'Übersicht Handelsgewinne',
  'own indices feature': 'Eigene Indizes',
  'stock split feature': 'Aktiensplit',
  'more filter criteria feature': 'Mehr Filterkriterien',
  'own warrants feature': 'Eigene Optionsscheine',
  'stock favs feature': 'Favoriten',
  'windows app feature': 'Windows-App',
  'subsidiary company feature': 'Tochterunternehmen',
  'script exchange feature': 'Skript-Börse',
  'custom securities feature': 'Eigene Wertpapiere',
  'dark mode feature': 'Dunkles Design',
  'business angels feature': 'Business Angels',
  'rating agency feature': 'Ratingagentur',
  'designated sponsors feature': 'Designated Sponsors',
  'yt video feature': 'YouTube-Video',
  'balance sheet feature': 'Bilanzen',
  'ats theme feature': 'ATS-Design',
  'ios app dev feature': 'iOS-App',
};

/** German name of a goal; unknown ones without the „ feature“ suffix, first letter upper case. */
export function goalName(description: string | undefined): string {
  const d = (description ?? '').trim();
  const known = NAMES[d.toLowerCase()];
  if (known) return known;
  const s = d.replace(/\s+feature$/i, '');
  return s ? s[0].toUpperCase() + s.slice(1) : 'Ziel';
}

/** Gold hours already given to a goal. */
export function goalHours(g: SponsoringGoal): number {
  const sum = (g.sponsors ?? []).reduce((s, x) => s + (x.hours ?? 0), 0);
  if (sum > 0) return sum;
  return Math.round(((g.achievedPercentage ?? 0) / 100) * (g.neededGoldHours ?? 0));
}

/** Sponsors of one goal, hours summed per player, largest first. */
export function goalSponsors(g: SponsoringGoal): { username: string; hours: number }[] {
  const by = new Map<string, number>();
  for (const s of g.sponsors ?? []) {
    const name = s.user?.username;
    if (name) by.set(name, (by.get(name) ?? 0) + (s.hours ?? 0));
  }
  return [...by.entries()].map(([username, hours]) => ({ username, hours })).sort((a, b) => b.hours - a.hours);
}

export interface GoalGroups {
  /** recurring running costs of the current period (Server, backups …), still open */
  costs: SponsoringGoal[];
  /** feature wishes still open, most funded first */
  features: SponsoringGoal[];
  /** one-off features that were fully funded, newest first */
  funded: SponsoringGoal[];
  /** how many periods of running costs were fully funded */
  fundedPeriods: number;
  /** end of the current period of running costs */
  periodEnd?: number;
}

/**
 * Splits the goals: the API lists every past month of the recurring costs (mostly 0 %), so only the
 * running period counts; features run for years.
 */
export function groupGoals(goals: SponsoringGoal[], now: number): GoalGroups {
  const open = goals.filter((g) => (g.endDate ?? 0) > now);
  const byPct = (a: SponsoringGoal, b: SponsoringGoal) =>
    (b.achievedPercentage ?? 0) - (a.achievedPercentage ?? 0) || (a.neededGoldHours ?? 0) - (b.neededGoldHours ?? 0);
  const costs = open.filter((g) => g.recurring).sort(byPct);
  const features = open.filter((g) => !g.recurring && (g.achievedPercentage ?? 0) < 100).sort(byPct);
  const funded = goals
    .filter((g) => !g.recurring && (g.achievedPercentage ?? 0) >= 100)
    .sort((a, b) => (b.endDate ?? 0) - (a.endDate ?? 0));
  const periods = new Set(goals.filter((g) => g.recurring && (g.achievedPercentage ?? 0) >= 100).map((g) => g.endDate));
  const periodEnd = costs.length ? Math.min(...costs.map((g) => g.endDate ?? Infinity)) : undefined;
  return { costs, features, funded, fundedPeriods: periods.size, periodEnd };
}

/** Share of the running period's costs covered, over all its goals (weighted by hours). */
export function periodCoverage(costs: SponsoringGoal[]): { given: number; needed: number; pct: number } {
  const needed = costs.reduce((s, g) => s + (g.neededGoldHours ?? 0), 0);
  const given = costs.reduce((s, g) => s + Math.min(goalHours(g), g.neededGoldHours ?? 0), 0);
  return { given, needed, pct: needed ? (given / needed) * 100 : 0 };
}

/** „13.920 Std.“ */
export function hoursText(h: number): string {
  return `${h.toLocaleString('de-DE')} Std.`;
}

/** „20,5 %“ – one decimal below 10 %, whole numbers above 99,5 %. */
export function pctText(p: number): string {
  const d = p >= 99.5 || p === 0 ? 0 : 1;
  return `${p.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })} %`;
}
