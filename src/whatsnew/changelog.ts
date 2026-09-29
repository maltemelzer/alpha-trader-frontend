/**
 * Changes to this frontend, newest first – shown once in „Neu bei Alpha-Trader“. Add an entry with every
 * PR that changes something a player notices; `id` is the release date (YYYY-MM-DD, several entries
 * a day get -2, -3 …). Links are app paths, so the dialog can open the new view directly.
 *
 * `shot` describes a picture of the new view: `npm run whatsnew:shots` (dev server running) takes it
 * as src/whatsnew/shots/<id>.webp, the dialog shows it under the entry.
 */
export interface UiShot {
  /** app path, view in the URL (`/zentralbank?ansicht=einlage`) */
  path: string;
  /** what the picture shows – alt text */
  alt: string;
  /** part of the page (CSS selector), default `main` = without header and market tape */
  crop?: string;
  /** viewport, default 1280x800 */
  size?: string;
  /** clicked one after the other before the picture (tabs, sheets) – never anything that submits */
  click?: string[];
  /** [selector, text] typed into a field before the picture, e.g. to open suggestions */
  type?: [string, string];
  /** ms to wait after loading, default 2500 */
  wait?: number;
}

export interface UiChange {
  id: string;
  title: string;
  items: { text: string; href?: string }[];
  shot?: UiShot;
}

export const UI_CHANGES: UiChange[] = [
  {
    id: '2026-09-29-5',
    title: 'Mehr Platz auf jeder Seite',
    items: [
      { text: 'Die große Überschrift über jeder Seite ist weg – der Reiter oben in der Kopfleiste trägt jetzt den Namen der offenen Seite, etwa „Geldflüsse“ statt „Markt“. Auch der Browser-Tab heißt so.' },
      {
        text: 'Markt aufgeräumt: Ansichten und Marktzahlen stehen in einer Zeile, Trefferzahl und Herkunft der Liste unten bei den Seiten, die Leseanleitung des Diagramms hinter ⓘ. Die „Letzten Trades“ laufen im Börsenband – die Umsatz-Heatmap hat jetzt die ganze rechte Spalte.',
        href: '/markt',
      },
    ],
    shot: { path: '/markt', alt: 'Der Markt ohne Seitenüberschrift: Ansichten und Marktzahlen in einer Zeile, Liste mit Diagramm, rechts die Umsatz-Heatmap' },
  },
  {
    id: '2026-09-29-4',
    title: 'Impressum und Datenschutz',
    items: [
      { text: 'Impressum und Datenschutzerklärung findest du jetzt im Spielermenü (oben rechts), am Handy unter „Mehr“ und unter der Anmeldung.', href: '/datenschutz' },
      { text: 'Die Schriften kommen jetzt von diesem Server statt von Google – beim Laden geht keine Verbindung mehr zu Google.' },
      { text: 'Bei Tests von Varianten zählen wir die Nutzung nur noch, wenn du „Nutzung mitzählen“ in der Leiste „Test“ einschaltest.' },
    ],
  },
  {
    id: '2026-09-29-3',
    title: 'Spieler im Chat blockieren',
    items: [
      {
        text: 'Fahr im Chat mit der Maus über den Kreis eines Spielers (oder tipp darauf): Ein kleines Menü bietet Direktnachricht, Profil und „Blockieren …“. Nach dem Bestätigen siehst du die Chatnachrichten des Spielers nicht mehr – weder alte noch neue, in Lobbys wie in privaten Chats –, und sie zählen nicht mehr als ungelesen. Der Spieler erfährt davon nichts.',
        href: '/nachrichten',
      },
      { text: 'Das Verbotszeichen (⃠) oben in der Chatliste öffnet „Blockierte Spieler“. Entsperrst du dort jemanden, erscheinen seine Nachrichten wieder.', href: '/nachrichten' },
    ],
  },
  {
    id: '2026-09-29-2',
    title: 'Links im Chat anklickbar',
    items: [
      { text: 'Adressen wie https://… in Chatnachrichten sind jetzt Links und öffnen in einem neuen Tab.', href: '/nachrichten' },
    ],
  },
  {
    id: '2026-09-29',
    title: 'Suche findet Anleihen, Spiel-Links als #ASIN',
    items: [
      { text: 'Die Suche oben findet jetzt auch Anleihen – per Name oder ASIN. Eine vollständige ASIN findet jedes Wertpapier, auch Optionsscheine und abgelaufene Anleihen.' },
      { text: 'Auch die Vorschläge nach „#“ und „!“ im Chat finden jetzt Anleihen.', href: '/nachrichten' },
      { text: '„#BOXLWU96VV“ ist jetzt auch in Zeitung und Forum ein Link aufs Wertpapier.' },
      { text: 'Links ins Original-Spiel (alpha-trader.com/security/asin/…) erscheinen als #ASIN und öffnen das Wertpapier hier.' },
    ],
  },
  {
    id: '2026-09-28-7',
    title: 'Order: Limit ist jetzt Standard',
    items: [
      {
        text: 'Die Order-Maske öffnet immer als Limit-Order, vorbelegt mit dem Brief (Kaufen) bzw. Geld (Verkaufen). Eine Market-Order gibt es nur, wenn du sie ausdrücklich wählst.',
        href: '/wertpapier/STSN3G03LB',
      },
      { text: 'Steht kein Geld- oder Briefkurs, kannst du trotzdem auf Kaufen bzw. Verkaufen tippen – das Limit steht dann auf dem letzten Kurs.' },
    ],
  },
  {
    id: '2026-09-28-6',
    title: 'Chat: Wertpapiere mit # und !',
    items: [
      {
        text: 'Tipp im Chat # und dann den Namen oder die ASIN: Eine Liste schlägt passende Wertpapiere vor, Pfeiltasten und Enter (oder Antippen) setzen den Link.',
        href: '/nachrichten',
      },
      { text: 'Mit ! statt # hängst du das Wertpapier als kleine Karte an – Kurs, Veränderung, Verlauf der letzten 30 Tage, Geld und Brief. Ein Klick öffnet das Wertpapier.' },
      { text: 'Alte Nachrichten mit $ bleiben verlinkt.' },
    ],
    shot: {
      path: '/nachrichten',
      alt: 'Chat mit geöffneter Vorschlagsliste nach „#Alpha“',
      type: ['.bnk-chatwin__foot textarea', '#Alphak'],
    },
  },
  {
    id: '2026-09-28-5',
    title: 'Anleihen: Deckung in der Liste',
    items: [
      {
        text: 'Im Markt gibt es für Anleihen die Spalte und den Filter „Deckung“: Net Cash des Emittenten geteilt durch die Rückzahlung aller seiner laufenden Anleihen. So findest du gedeckte Anleihen, ohne jede einzeln zu öffnen.',
        href: '/markt?art=BOND&mit=brief&lz=0.04166667..&deck=100..&sort=-rt',
      },
      { text: 'Neue Vorlage „Gedeckte Anleihen“. Auch die Kachel „Deckung“ auf der Anleihe rechnet jetzt mit allen Anleihen des Emittenten, nicht nur mit dieser einen.' },
    ],
    shot: {
      path: '/markt?art=BOND&mit=brief&lz=0.04166667..&deck=100..&sort=-rt&sp=kurs,rt,lz,deck',
      alt: 'Markt: Anleihen mit Spalte Deckung, gefiltert auf mindestens 100 %',
      wait: 8000,
    },
  },
  {
    id: '2026-09-28-4',
    title: 'Zentralbank: Einlage erhöhen',
    items: [
      {
        text: 'Neue Ansicht „Einlage“: Als CEO einer Bank legst du Bargeld bei der Zentralbank an und siehst schon beim Tippen, wie viel vom Bargeld in die Einlage wandert, was sie am Tag an Zinsen bringt und wie weit dein Kreditrahmen wächst.',
        href: '/zentralbank?ansicht=einlage',
      },
      { text: 'Schnellwahl 10 % · 25 % · 50 % · Alles, und vor dem Absenden eine Bestätigung – eine Einlage lässt sich nicht zurückholen.' },
      { text: 'Ohne Bank zeigt die Ansicht, wie weit deine Unternehmen von der Banklizenz (5 Mio. € Bargeld) entfernt sind.' },
    ],
    shot: { path: '/zentralbank?ansicht=einlage', alt: 'Zentralbank, Ansicht Einlage: Betrag, Schnellwahl und Balken Bargeld → Einlage' },
  },
  {
    id: '2026-09-28-3',
    title: 'Market Maker: Regeln im Quote',
    items: [
      {
        text: 'Der Reiter „Quote“ heißt jetzt „Market Maker“. Spread (mindestens 5 %) und Volumen je Seite (1–2 % der Anteile) stellst du mit zwei Reglern ein, sie füllen Kurse und Stückzahlen – ein Verstoß steht direkt am Feld.',
      },
      { text: 'Vorbelegt sind die Mindestwerte: 5 % Spread um die Mitte, 1 % der Anteile auf jeder Seite.' },
    ],
  },
  {
    id: '2026-09-28-2',
    title: 'Zeitung und Forum: Formatierung wie im Spiel',
    items: [
      {
        text: 'Artikel, Kommentare und Forenbeiträge werden als echtes HTML gespeichert, so wie im Original – fett, kursiv, Zwischenüberschriften, Listen, Links und Bilder kommen dort richtig an, ohne Anführungszeichen drumherum.',
        href: '/zeitung?schreiben=1',
      },
      { text: 'Neu im Editor: Zwischenüberschrift (## …), nummerierte Liste und Link ([Text](https://…)).' },
      { text: 'Beiträge aus dem Spiel zeigen ihre Formatierung jetzt auch hier: Überschriften, Links, Listen und Bilder.', href: '/zeitung' },
      { text: 'Eigene Artikel kannst du bearbeiten („Bearbeiten“ oben im Artikel).' },
    ],
    shot: { path: '/zeitung?schreiben=1', alt: 'Editor für einen Zeitungsartikel mit Formatierungsleiste', crop: '.bnk-sheet__panel', wait: 5000 },
  },
  {
    id: '2026-09-28',
    title: 'Umbuchen, Neuigkeiten und Zinstender',
    items: [
      {
        text: 'Umbuchen zwischen deinen eigenen Depots: Aktien vom Privatdepot in deine AG, zurück oder zwischen zwei AGs – die beiden OTC-Orders legt die App für dich an.',
        href: '/orders?ansicht=otc&umbuchen=1',
      },
      { text: 'Die Gegenpartei-Suche bei OTC-Orders zeigt wieder alle Treffer, passende Namen zuerst.', href: '/orders?ansicht=otc&neu=1' },
      {
        text: 'Dieses Fenster: Neues aus der Spiel-Engine (die „Updates on Alpha-Trader.com“ der Zeitung) und Neues in dieser Oberfläche, einmal je Neuigkeit. Abschalten kannst du es in den Einstellungen.',
        href: '/einstellungen?bereich=konto',
      },
      {
        text: 'Zinstender: Der Kreditrahmen begrenzt den Kaufpreis deines Gebots, nicht den Nennwert – bei 98 % passen mehr Stück hinein.',
        href: '/zentralbank?ansicht=tender',
      },
    ],
    shot: { path: '/orders?ansicht=otc&umbuchen=1', alt: 'Umbuchen zwischen eigenen Depots', crop: '.bnk-sheet__panel', wait: 5000 },
  },
  {
    id: '2026-09-27',
    title: 'Geldflüsse: woher kommt das Geld?',
    items: [
      {
        text: 'Klick auf ein Konto zeigt seine Herkunft: von wem es kaufte, was es verkaufte, Kontoauszug und Übertragungen zum heutigen Kurs.',
        href: '/stroeme',
      },
      { text: 'Zentralbank und Geldflüsse: eine Reiterleiste für Ansichten, Filter rechts daneben – am Handy im Filter-Sheet.', href: '/zentralbank' },
    ],
    shot: { path: '/stroeme', alt: 'Geldflüsse: Sankey Verkäufer → Wertpapiere → Käufer', wait: 6000 },
  },
  {
    id: '2026-09-26',
    title: 'Optionsscheine: Wenn … dann …',
    items: [
      {
        text: 'Auf der Seite eines Optionsscheins rechnest du durch, was er bei einem bestimmten Kurs des Basiswerts auszahlt – mit Gewinnschwelle und Cap.',
        href: '/markt?art=WARRANT',
      },
      { text: 'Das Börsenband läuft ruhiger und zeigt Namen statt ASINs.' },
    ],
    shot: { path: '/markt?art=WARRANT', alt: 'Markt: Optionsscheine' },
  },
];
