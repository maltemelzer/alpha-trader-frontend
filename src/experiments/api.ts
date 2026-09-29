// Client of the feedback service (feedback/): same origin, `/feedback-api/…`, the game's JWT as login –
// the service asks the game server whose it is. Without the service (e.g. `npm run dev` without
// `npm run feedback`) the page works as before; only rating and evaluation report an error.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getToken } from '../api/client';

/** Same limit as the service (feedback/app.mjs). */
export const MAX_COMMENT = 2000;

export const FEEDBACK_BASE: string = import.meta.env.VITE_FEEDBACK_API ?? '/feedback-api';

export class FeedbackError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new FeedbackError(401, 'nicht angemeldet');
  let res: Response;
  try {
    res = await fetch(FEEDBACK_BASE + path, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    throw new FeedbackError(0, 'Der Feedback-Dienst ist nicht erreichbar.');
  }
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) {
    const msg = res.status >= 502 && !body?.error ? 'Der Feedback-Dienst ist nicht erreichbar.' : (body?.error ?? `Fehler ${res.status}`);
    throw new FeedbackError(res.status, msg);
  }
  return body as T;
}

export interface MyRating {
  variant: string;
  stars: number;
  comment: string;
  updated: number;
}

export interface MyFeedback {
  username: string;
  admin: boolean;
  ratings: MyRating[];
  favorite: string | null;
  /** what the favourite should take over from the others */
  favoriteNote: string;
}

export interface VariantResult {
  people: number;
  visits: number;
  dwellMedianMs: number | null;
  ratings: number;
  /** count per star, index 0 = 1 star */
  stars: number[];
  avgStars: number | null;
  favorites: number;
  clicks: { target: string; count: number }[];
}

export interface ResultComment {
  variant: string;
  username: string;
  stars: number;
  comment: string;
  created: number;
  updated: number;
}

/** A decision with a wish: „Puls should stay, with the headline of Titelseite“. */
export interface ResultNote {
  variant: string;
  username: string;
  note: string;
  updated: number;
}

export interface ExperimentResults {
  experiment: string;
  variants: Record<string, VariantResult>;
  comments: ResultComment[];
  notes: ResultNote[];
}

/** Own ratings + favourite in one experiment, and whether this player may see the evaluation. */
export function useMyFeedback(experiment: string, enabled = true) {
  return useQuery({
    queryKey: ['feedback', 'me', experiment],
    queryFn: () => call<MyFeedback>(`/me?experiment=${experiment}`),
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useExperimentResults(experiment: string) {
  return useQuery({
    queryKey: ['feedback', 'results', experiment],
    queryFn: () => call<ExperimentResults>(`/results?experiment=${experiment}`),
    refetchInterval: 60_000,
    retry: false,
  });
}

export function useSaveRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (r: { experiment: string; variant: string; stars: number; comment: string }) =>
      call<{ ok: true }>('/rating', { method: 'PUT', body: JSON.stringify(r) }),
    onSuccess: (_, r) => qc.invalidateQueries({ queryKey: ['feedback', 'me', r.experiment] }),
  });
}

export function useSaveFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (f: { experiment: string; variant: string; note: string }) => call<{ ok: true }>('/favorite', { method: 'PUT', body: JSON.stringify(f) }),
    onSuccess: (_, f) => qc.invalidateQueries({ queryKey: ['feedback', 'me', f.experiment] }),
  });
}

export interface UsageBatch {
  experiment: string;
  variant: string;
  visit: boolean;
  dwellMs: number;
  clicks: Record<string, number>;
}

/** Fire and forget; `keepalive` lets the last batch through while the tab closes. */
export function sendUsage(batch: UsageBatch) {
  const token = getToken();
  if (!token) return;
  fetch(`${FEEDBACK_BASE}/usage`, {
    method: 'POST',
    keepalive: true,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(batch),
  }).catch(() => {
    /* no service – usage is optional */
  });
}
