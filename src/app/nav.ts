// Main areas of the game. Desktop: AppHeader with dropdowns; phone: BottomNav (max 5).
export interface Area {
  value: string;
  label: string;
  icon: 'markt' | 'organisation' | 'orders' | 'highscores' | 'community';
  href?: string;
  children?: { label: string; href: string; description?: string }[];
}

export const AREAS: Area[] = [
  {
    value: 'markt',
    label: 'Markt',
    icon: 'markt',
    children: [
      { label: 'Wertpapiere', href: '/markt', description: 'Aktien, Anleihen, Coins, Indizes, Fonds' },
      { label: 'Geldflüsse', href: '/stroeme', description: 'Wer mit wem handelt, was gehandelt wird – Netzwerk, Geldfluss, Auffälliges' },
      { label: 'Kapitalmaßnahmen', href: '/kapitalmassnahmen', description: 'Laufende Kapitalerhöhungen und -herabsetzungen' },
      { label: 'Zentralbank', href: '/zentralbank', description: 'Leitzins, Einlagen der Banken, Zentralbankkredite, Zinstender' },
    ],
  },
  {
    value: 'organisation',
    label: 'Organisation',
    icon: 'organisation',
    children: [
      { label: 'Meine Organisation', href: '/organisation', description: 'Portfolio, Orders, Trades, Beteiligungen' },
      { label: 'Meine Unternehmen', href: '/unternehmen', description: 'Als CEO geführt, Unternehmen gründen' },
      { label: 'Bank', href: '/bank', description: 'Kontostände, Überweisungen, Kontoauszug' },
      { label: 'Miner', href: '/miner', description: 'AlphaCoins schürfen' },
      { label: 'Erfolge', href: '/erfolge' },
      { label: 'Abstimmungen', href: '/abstimmungen', description: 'Hauptversammlungen deiner Beteiligungen' },
    ],
  },
  { value: 'orders', label: 'Orders', icon: 'orders', href: '/orders' },
  { value: 'highscores', label: 'Highscores', icon: 'highscores', href: '/highscores' },
  {
    value: 'community',
    label: 'Community',
    icon: 'community',
    children: [
      { label: 'Nachrichten', href: '/nachrichten', description: 'Direktnachrichten, Gruppen, Lobbys' },
      { label: 'Zeitung', href: '/zeitung' },
      { label: 'Forum', href: '/forum' },
      { label: 'Allianzen', href: '/allianzen' },
      { label: 'Sponsoring', href: '/sponsoring', description: 'Spieler finanzieren Server und neue Funktionen' },
    ],
  },
];

/** Pages outside the areas, shown in the phone's „Mehr“ sheet. */
export const EXTRA_PAGES = [
  { label: 'Einstellungen', href: '/einstellungen', description: 'Konto, Gold, Werben, Notizen' },
];

// Detail pages belong to an area page: shown under that page's name in the phone header.
const DETAIL_PARENTS: [string, string][] = [
  ['/wertpapier/', '/markt'],
  ['/unternehmen/', '/unternehmen'],
  ['/allianz/', '/allianzen'],
  ['/spieler/', '/highscores'],
];

const DETAIL_TITLES: [string, string][] = [
  ['/wertpapier/', 'Wertpapier'],
  ['/unternehmen/', 'Unternehmen'],
  ['/allianz/', 'Allianz'],
  ['/spieler/', 'Spieler'],
];

/** Every page of an area (areas without children are their own single page). */
export const pagesOf = (a: Area) => a.children ?? (a.href ? [{ label: a.label, href: a.href }] : []);

const matches = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + '/');

/** The area page a path belongs to (the page itself, or the parent of a detail page). */
export function pageOf(pathname: string): { label: string; href: string } | undefined {
  const parent = DETAIL_PARENTS.find(([prefix]) => pathname.startsWith(prefix))?.[1];
  const all = [...AREAS.flatMap(pagesOf), ...EXTRA_PAGES];
  return all.find((p) => matches(parent ?? pathname, p.href));
}

/** Title for the phone header: the page's name, or the kind of detail page. */
export function titleOf(pathname: string): string {
  if (pathname === '/') return 'Meine Organisation';
  if (pathname === '/experimente') return 'Experimente';
  const detail = DETAIL_TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1];
  return detail ?? pageOf(pathname)?.label ?? 'Alpha-Trader';
}

const hrefs = (a: Area) => (a.href ? [a.href] : (a.children ?? []).map((c) => c.href));

/** The area a path belongs to (securities pages count as Markt). */
export function areaOf(pathname: string): string | undefined {
  if (pathname.startsWith('/wertpapier/')) return 'markt';
  if (pathname.startsWith('/unternehmen/')) return 'organisation';
  if (pathname.startsWith('/allianz/') || pathname.startsWith('/spieler/')) return 'community';
  if (pathname === '/') return 'organisation';
  return AREAS.find((a) => hrefs(a).some((h) => pathname === h || pathname.startsWith(h + '/')))?.value;
}
