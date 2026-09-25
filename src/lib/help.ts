// Help texts of the game (GET /api/v2/helpcomments?identifier=&locale=de). The server knows only a few
// identifiers (found by probing the field names of the spec); everything else answers 200 with
// „Es gibt keine Hilfe für diese Kennung“.

/** Identifiers with a help text (checked 2026-09 against stable). */
export const HELP_IDS = [
  'alphaCoins',
  'asin',
  'averageBondInterestRate',
  'centralBankReserves',
  'counterParty',
  'faceValue',
  'freeFloatInPercent',
  'hourlyChange',
  'limitOrder',
  'listingType',
  'mainInterestRate',
  'marketCap',
  'marketOrder',
  'maxCentralBankLoans',
  'netCash',
  'privateCash',
  'spread',
  'systemBond',
] as const;
export type HelpId = (typeof HELP_IDS)[number];

const NONE = /keine Hilfe für diese Kennung|no help for this identifier/i;

// The texts address the player with „Sie“; the interface says „du“. Known phrases, then typos.
const FIXES: [RegExp, string][] = [
  [/wenn Sie große Mengen an Stücken, welche (.+?) übersteigen, traden wollen/g, 'wenn du große Mengen an Stücken, welche $1 übersteigen, traden willst'],
  [/die Sie auf Ihrem privaten Bankkonto haben/g, 'die du auf deinem privaten Bankkonto hast'],
  [/in Ihr Portfolio/g, 'in dein Portfolio'],
  [/\bIhr(e[mnrs]?)?\b/g, 'dein$1'],
  [/Mulitplikation/g, 'Multiplikation'],
];

/** Server text → text for the interface: null if there is none; „du“ instead of „Sie“, known typos fixed. */
export function helpText(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t || NONE.test(t)) return null;
  let out = t;
  for (const [re, to] of FIXES) out = out.replace(re, to);
  return /[.!?)]$/.test(out) ? out : `${out}.`;
}
