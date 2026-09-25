// The API sends texts as English templates with „#“ placeholders ({ message, substitutions,
// filledString }). Known templates are translated here; numbers in substitutions are formatted
// the German way. Unknown templates fall back to the API's filledString.
import { short } from './format';

export interface ApiMessage {
  message?: string;
  substitutions?: (string | number | null)[];
  filledString?: string;
}

const DE: Record<string, string> = {
  // Suggestions
  'You can claim AlphaCoins as reward for # personal achievements': 'Für # Erfolge kannst du AlphaCoins als Belohnung abholen.',
  'You can upgrade your private miner to produce more AlphaCoins': 'Du kannst deinen Miner ausbauen, damit er mehr AlphaCoins schürft.',
  'You can realize # of cash if you sell # pieces of # (#)': 'Du kannst # € erlösen, wenn du # Stück # (#) verkaufst.',
  'You do not control a company, you should get a spare company':
    'Du führst kein Unternehmen – übernimm eine freie Spare-AG.',
  'You can transfer # AlphaCoins to your private portfolio': 'Du kannst # AlphaCoins in dein Privatportfolio übertragen.',
  // Achievements
  'Control a company with a banking license': 'Führe ein Unternehmen mit Banklizenz.',
  'Stay the best in a user highscore': 'Bleib Erster in einem Spieler-Highscore.',
  'Confirm your email address': 'Bestätige deine E-Mail-Adresse.',
  'Transfer an AlphaCoin to your own portfolio': 'Übertrage einen AlphaCoin in dein Portfolio.',
  'Place an order with your own portfolio': 'Gib eine Order aus deinem Portfolio auf.',
  'Make 1000 trades in 45 days': 'Handle 1.000-mal in 45 Tagen.',
  'Trade 5 times in the last 24 hours': 'Handle 5-mal in 24 Stunden.',
  'Trade 100 times in the last 7 days': 'Handle 100-mal in 7 Tagen.',
  'Reach 100 online minutes': 'Sei insgesamt 100 Minuten online.',
  'Reach 250 online minutes': 'Sei insgesamt 250 Minuten online.',
  'Reach 1000 online minutes': 'Sei insgesamt 1.000 Minuten online.',
  'Reach 2000 online minutes': 'Sei insgesamt 2.000 Minuten online.',
  'Reach 5000 online minutes': 'Sei insgesamt 5.000 Minuten online.',
  'Reach 10000 online minutes': 'Sei insgesamt 10.000 Minuten online.',
  'Be online within the last 60 minutes': 'Sei in den letzten 60 Minuten online gewesen.',
  'Reach the top 50% in a user highscore': 'Komm in einem Spieler-Highscore in die obere Hälfte.',
  'Reach the top 10% in a user highscore': 'Komm in einem Spieler-Highscore unter die besten 10 %.',
  'Write your first posting in a message board': 'Schreib deinen ersten Forenbeitrag.',
  'Write a news for the newspaper': 'Schreib einen Artikel für die Zeitung.',
  'Write a news for the newspaper once a week': 'Schreib jede Woche einen Artikel für die Zeitung.',
  'Reach the top 50% in an alliance highscore': 'Kommt in einem Allianz-Highscore in die obere Hälfte.',
  'Reach the top 10% in an alliance highscore': 'Kommt in einem Allianz-Highscore unter die besten 10 %.',
  'Stay the best in a alliance highscore': 'Bleibt Erste in einem Allianz-Highscore.',
  // History of a company/player (GET /api/v2/history)
  '# founded #': '# hat # gegründet.',
  '# became a bank': '# hat die Banklizenz erhalten.',
  'The CEO # of # with a salary of # was replaced by # with a salary of #':
    'CEO # von # (Gehalt # €) wurde durch # (Gehalt # €) ersetzt.',
  '# changed the name from # to #': '# hat den Namen von # in # geändert.',
  '# changed the logo of # from # to #': '# hat das Logo von # geändert.',
  '# ended a capital increase with # pcs sold for a price of # and a resulting volume of #':
    '# hat eine Kapitalerhöhung abgeschlossen: # Stück zu # € verkauft, Volumen # €.',
  '# (#) was acquired by # (#) with a price of # per share and a resulting volume of #':
    '# (#) wurde von # (#) übernommen: # € je Aktie, Volumen # €.',
  '# launched the fund #': '# hat den Fonds # aufgelegt.',
  '# could not fully repay bond # and had to issue # new stocks':
    '# konnte die Anleihe # nicht voll zurückzahlen und musste # neue Aktien ausgeben.',
  // Errors
  'An unexpected error occurred. Please try again.': 'Ein unerwarteter Fehler ist aufgetreten. Bitte erneut versuchen.',
};

/** „1079380.08“ → „1,08 Mio.“, „54“ → „54“; anything else unchanged. */
function formatSub(s: string | number | null | undefined): string {
  if (s == null) return '';
  const str = String(s);
  if (!/^-?\d+(\.\d+)?$/.test(str)) return str;
  const n = Number(str);
  if (Math.abs(n) >= 1e6) return short(n);
  return n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

function fill(template: string, subs: ApiMessage['substitutions'] = []): string {
  let i = 0;
  return template.replace(/#/g, () => formatSub(subs?.[i++]));
}

/** German text for an API message (or a plain string, returned as is). */
export function translate(m: ApiMessage | string | null | undefined): string {
  if (m == null) return '';
  if (typeof m === 'string') return DE[m] ?? m;
  const de = m.message ? DE[m.message] : undefined;
  if (de) return fill(de, m.substitutions);
  return m.filledString ?? (m.message ? fill(m.message, m.substitutions) : '');
}
