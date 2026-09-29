// Experiments: several variants of one page, each player gets one of them (fixed by name), can look at the
// others and rates them. Ratings, comments and usage figures go to the feedback service (feedback/).
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
export const EXPERIMENTS: Experiment[] = [];

export function experimentOf(id: string): Experiment | undefined {
  return EXPERIMENTS.find((e) => e.id === id);
}
