// Start page (/start): four variants in the experiment „start“ (src/experiments/registry.ts). Each variant is
// its own folder under src/home/ and its own chunk – only the one shown is loaded.
import { lazy } from 'react';
import { ExperimentHost } from '../experiments/ExperimentHost';

const PAGES = {
  buehne: lazy(() => import('./buehne/HomePage').then((m) => ({ default: m.HomePage }))),
  saal: lazy(() => import('./saal/HomePage').then((m) => ({ default: m.HomePage }))),
  meintag: lazy(() => import('./meintag/HomePage').then((m) => ({ default: m.HomePage }))),
  zeitung: lazy(() => import('./zeitung/HomePage').then((m) => ({ default: m.HomePage }))),
};

export function StartPage() {
  return <ExperimentHost id="start" pages={PAGES} />;
}
