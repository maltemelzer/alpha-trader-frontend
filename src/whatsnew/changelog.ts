/**
 * Changes to this frontend, newest first – shown once in „Neu bei Alpha-Trader“. Add an entry with every
 * PR that changes something a player notices; `id` is the release date (YYYY-MM-DD, several entries
 * a day get -2, -3 …). Links are app paths, so the dialog can open the new view directly.
 */
export interface UiChange {
  id: string;
  title: string;
  items: { text: string; href?: string }[];
}

export const UI_CHANGES: UiChange[] = [
  {
    id: '2026-09-28',
    title: 'Neuigkeiten und Zinstender',
    items: [
      { text: 'Dieses Fenster: Neues aus der Spiel-Engine (die „Updates on Alpha-Trader.com“ der Zeitung) und Neues in dieser Oberfläche, einmal je Neuigkeit.' },
      {
        text: 'Zinstender: Der Kreditrahmen begrenzt den Kaufpreis deines Gebots, nicht den Nennwert – bei 98 % passen mehr Stück hinein.',
        href: '/zentralbank?ansicht=tender',
      },
    ],
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
  },
];
