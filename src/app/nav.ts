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

const hrefs = (a: Area) => (a.href ? [a.href] : (a.children ?? []).map((c) => c.href));

/** The area a path belongs to (securities pages count as Markt). */
export function areaOf(pathname: string): string | undefined {
  if (pathname.startsWith('/wertpapier/')) return 'markt';
  if (pathname.startsWith('/unternehmen/')) return 'organisation';
  if (pathname.startsWith('/allianz/') || pathname.startsWith('/spieler/')) return 'community';
  return AREAS.find((a) => hrefs(a).some((h) => pathname === h || pathname.startsWith(h + '/')))?.value;
}
