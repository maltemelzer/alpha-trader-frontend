// Experiments: several variants of one page. Players go through all of them (or get one, `mode: 'ab'`),
// rate each and say which one should stay. Ratings, comments and usage figures go to the feedback service (feedback/).
// A new experiment: add an entry here and render its page through `<ExperimentHost id pages={{ variant: Page }}>`.

export interface Variant {
  id: string;
  /** short name in the bar and the evaluation */
  label: string;
  /** one sentence: what is different */
  description: string;
}

export interface Experiment {
  id: string;
  /** name for players, e.g. „Neue Startseite“ */
  title: string;
  /** question in the rating dialog */
  question: string;
  variants: Variant[];
  /** last day (inclusive, JJJJ-MM-TT); afterwards everyone sees `fallback` and the bar is gone */
  until: string;
  fallback: string;
  /**
   * compare (default): every player sees every variant in turn (own order), rates each and decides at the
   * end – for few players. ab: each player gets one variant, the others only on request – for many players.
   */
  mode?: 'compare' | 'ab';
}

// No experiment running. Example (the variants' pages go to <ExperimentHost id="start" pages={…}>):
//   {
//     id: 'start',
//     title: 'Neue Startseite',
//     question: 'Wie gefällt dir diese Startseite?',
//     variants: [
//       { id: 'puls', label: 'Puls', description: 'Leitstand: der Herzschlag des Markts, dein Depot live daneben.' },
//       { id: 'titelseite', label: 'Titelseite', description: 'Zeitung: eine Schlagzeile aus den Live-Daten.' },
//     ],
//     until: '2026-10-31',
//     fallback: 'puls',
//   },
export const EXPERIMENTS: Experiment[] = [
  {
    id: 'start',
    title: 'Neue Startseite',
    question: 'Wie gefällt dir diese Startseite – würdest du sie offen lassen?',
    variants: [
      { id: 'buehne', label: 'Bühne', description: 'Ein großes Motiv nach dem anderen, alle 8 Sekunden: Kursbewegungen, Zeitung, Forum, Abstimmungen, Börsengänge.' },
      { id: 'saal', label: 'Börsensaal', description: 'Die große Anzeigetafel mit Klappziffern, Nachrichten als Laufschrift.' },
      { id: 'meintag', label: 'Mein Tag', description: 'Dein Tag als Zeitstrahl: was seit deinem Besuch passiert ist und was ansteht, darunter Zu tun, Zeitung und Depot.' },
      { id: 'zeitung', label: 'Zeitung', description: 'Die Titelseite des Tages: Schlagzeile, Spalten und Kurszettel wie in einer Wirtschaftszeitung.' },
    ],
    until: '2026-10-31',
    fallback: 'buehne',
  },
];

export function experimentOf(id: string): Experiment | undefined {
  return EXPERIMENTS.find((e) => e.id === id);
}
