import type { PageFilter } from '../app/pagenav';
import { rangeOptions } from '../lib/ranges';

export const RANGES = rangeOptions(['7T', '30T', 'alle']);

export const ASSUME = [
  { value: 'buch', label: 'Buch jetzt' },
  { value: 'gestern', label: 'wie zuletzt' },
];

/** Filters of the Zentralbank page – shared by the page and the tender panels (both read the same URL). */
export const CB_FILTERS: PageFilter[] = [
  // `verlauf` was the tender history's own range – now one range for the whole page
  { key: 'zeitraum', label: 'Zeitraum', fallback: '30T', options: RANGES, primary: true, bare: true, views: ['zinsen', 'tender'], aliases: ['verlauf'] },
  {
    key: 'annahme',
    label: 'Übrige Gebote',
    fallback: 'buch',
    options: ASSUME,
    views: ['tender'],
    note: 'Womit die Schätzung für den laufenden Tender rechnet: mit den Geboten, die jetzt im Buch stehen, oder so wie beim letzten Tender.',
  },
];
