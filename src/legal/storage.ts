// Everything this site keeps in the browser – the table in the privacy policy (/datenschutz). No cookies.
// storage.test.ts fails when the code uses a key that is not listed here.

export interface StorageEntry {
  /** key; `<id>` stands for a variable part */
  key: string;
  where: 'sessionStorage' | 'localStorage';
  purpose: string;
  /** how long it stays */
  lasts: string;
}

export const STORAGE: StorageEntry[] = [
  { key: 'at.token', where: 'sessionStorage', purpose: 'Deine Anmeldung beim Spiel (Zugangstoken) für diesen Tab.', lasts: 'bis der Tab geschlossen wird oder du dich abmeldest' },
  {
    key: 'at.remember',
    where: 'localStorage',
    purpose: 'Nur bei „Angemeldet bleiben“: das Zugangstoken, damit du nach einem Neustart des Browsers angemeldet bist.',
    lasts: 'höchstens 30 Tage, beim Abmelden sofort gelöscht',
  },
  { key: 'at.lastPage', where: 'sessionStorage', purpose: 'Zuletzt besuchte Unterseite je Bereich (Handy-Navigation).', lasts: 'bis der Tab geschlossen wird' },
  { key: 'at.theme', where: 'localStorage', purpose: 'Farbschema, z. B. der Modus für Farbenblinde.', lasts: 'bis du es änderst oder den Speicher leerst' },
  { key: 'at.chatSidebar', where: 'localStorage', purpose: 'Ob die Chat-Leiste offen ist.', lasts: 'bis du es änderst oder den Speicher leerst' },
  { key: 'at:tape-paused', where: 'localStorage', purpose: 'Ob das Börsenband angehalten ist.', lasts: 'bis du es änderst oder den Speicher leerst' },
  {
    key: 'at.whatsnew',
    where: 'localStorage',
    purpose: 'Welche Neuigkeiten du schon gelesen hast und ob sie von selbst erscheinen sollen (zusätzlich als Einstellung bei deinem Spielkonto).',
    lasts: 'bis du den Speicher leerst',
  },
  {
    key: 'at.exp.<id>',
    where: 'localStorage',
    purpose: 'Bei Tests von Varianten: welche du gesehen und gewählt hast und wie lange (nur für den Hinweis zum Bewerten, bleibt im Browser).',
    lasts: 'bis du den Speicher leerst',
  },
  { key: 'at.exp.collapsed', where: 'localStorage', purpose: 'Ob die Leiste „Test“ eingeklappt ist.', lasts: 'bis du es änderst oder den Speicher leerst' },
  { key: 'at.exp.usage', where: 'localStorage', purpose: 'Ob du dem Mitzählen der Nutzung bei Tests zugestimmt hast.', lasts: 'bis du es änderst oder den Speicher leerst' },
];

/** Names starting with `at.`/`at:` in the code that are not storage keys (channels, events). */
export const NOT_STORAGE = ['at.auth', 'at:logout', 'at:live-reconnected', 'at:experiment', 'at:whatsnew'];
