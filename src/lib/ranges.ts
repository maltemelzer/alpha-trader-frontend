/**
 * Time ranges – one vocabulary for every page (URL `?zeitraum=`), so „7 T“ means and reads the same
 * everywhere. Pages pick the ranges that make sense for their data with `rangeOptions`.
 */
const NBSP = String.fromCharCode(0xa0);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const RANGE_VOCAB = {
  '15m': { label: `15${NBSP}Min`, ms: 15 * MIN },
  '1h': { label: `1${NBSP}Std`, ms: HOUR },
  '3h': { label: `3${NBSP}Std`, ms: 3 * HOUR },
  '12h': { label: `12${NBSP}Std`, ms: 12 * HOUR },
  '24h': { label: `24${NBSP}Std`, ms: DAY },
  '7T': { label: `7${NBSP}T`, ms: 7 * DAY },
  '14T': { label: `14${NBSP}T`, ms: 14 * DAY },
  '30T': { label: `30${NBSP}T`, ms: 30 * DAY },
  '90T': { label: `90${NBSP}T`, ms: 90 * DAY },
  alle: { label: 'Alle', ms: undefined },
} as const satisfies Record<string, { label: string; ms: number | undefined }>;

export type RangeKey = keyof typeof RANGE_VOCAB;

export interface RangeOption {
  value: RangeKey;
  label: string;
  /** length of the range; undefined = everything */
  ms: number | undefined;
}

/** The chosen ranges as options for a segmented control / filter, in the given order. */
export function rangeOptions(keys: RangeKey[]): RangeOption[] {
  return keys.map((k) => ({ value: k, label: RANGE_VOCAB[k].label, ms: RANGE_VOCAB[k].ms }));
}

/** Length of a range key (undefined for „alle“ or an unknown key). */
export function rangeMs(key: string): number | undefined {
  return (RANGE_VOCAB as Record<string, { ms: number | undefined }>)[key]?.ms;
}
