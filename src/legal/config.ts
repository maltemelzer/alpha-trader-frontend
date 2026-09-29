// Operator of this site for Impressum and Datenschutz. Not in the code: the container writes /legal.json
// from LEGAL_* at start (docker/40-legal-config.sh), the dev server from .env (vite.config.ts).
import { useQuery } from '@tanstack/react-query';

export interface LegalConfig {
  name: string;
  street: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  /** one sentence where the site runs (host, tunnel/proxy in front) */
  hosting: string;
}

const EMPTY: LegalConfig = { name: '', street: '', city: '', country: '', email: '', phone: '', hosting: '' };

/** Cleans whatever /legal.json holds: only strings, trimmed, missing fields empty. */
export function parseLegal(raw: unknown): LegalConfig {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const text = (k: keyof LegalConfig) => (typeof o[k] === 'string' ? (o[k] as string).trim() : '');
  return { name: text('name'), street: text('street'), city: text('city'), country: text('country'), email: text('email'), phone: text('phone'), hosting: text('hosting') };
}

/** Name, address and e-mail are all there – without them the pages show a notice instead. */
export function isComplete(c: LegalConfig): boolean {
  return !!(c.name && c.street && c.city && c.email);
}

export function useLegalConfig() {
  return useQuery({
    queryKey: ['legal'],
    queryFn: async () => {
      const res = await fetch('/legal.json', { cache: 'no-cache' });
      if (!res.ok) return EMPTY;
      return parseLegal(await res.json().catch(() => null));
    },
    staleTime: Infinity,
    retry: false,
  });
}
