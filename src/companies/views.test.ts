import { describe, expect, it } from 'vitest';
import { resolveView, visibleViews } from '../lib/pagenav';
import { companyHref, companyRedirect, presseOf, stockAliases, stockFallback, stockViews, withQuery, zahlenOf } from './views';

const q = (s: string) => new URLSearchParams(s);
const view = (raw: string | null, phone: boolean, opts = { bank: false, ceo: false }) =>
  resolveView(raw, stockViews(opts, phone), stockFallback(phone), phone, stockAliases(phone));

describe('stock views', () => {
  it('opens „Handel“ wide and „Kurs“ on the phone', () => {
    expect(view(null, false)).toBe('handel');
    expect(view(null, true)).toBe('price');
  });
  it('shows the trading card as one tab wide, split up on the phone', () => {
    const wide = visibleViews(stockViews({ bank: false, ceo: false }, false), false).map((v) => v.value);
    expect(wide.slice(0, 3)).toEqual(['handel', 'ueberblick', 'zahlen']);
    const phone = visibleViews(stockViews({ bank: false, ceo: false }, true), true).map((v) => v.value);
    expect(phone.slice(0, 5)).toEqual(['price', 'markt', 'holders', 'scheine', 'ueberblick']);
    expect(phone).not.toContain('handel');
  });
  it('maps phone views to „Handel“ on wide screens and back', () => {
    expect(view('markt', false)).toBe('handel');
    expect(view('holders', false)).toBe('handel');
    expect(view('handel', true)).toBe('price');
    expect(view('trades', true)).toBe('markt');
  });
  it('maps the old company tabs', () => {
    expect(view('bilanz', false)).toBe('zahlen');
    expect(view('einordnung', true)).toBe('zahlen');
    expect(view('chronik', false)).toBe('presse');
  });
  it('offers Bank and Führen only when they apply', () => {
    expect(view('bank', false)).toBe('handel');
    expect(view('bank', false, { bank: true, ceo: false })).toBe('bank');
    expect(view('fuehren', false, { bank: false, ceo: true })).toBe('fuehren');
  });
});

describe('card presentations', () => {
  it('reads the old view value when the own key is missing', () => {
    expect(zahlenOf(q('ansicht=einordnung&kennzahl=netCash'))).toBe('einordnung');
    expect(zahlenOf(q('ansicht=zahlen&zahlen=bilanz'))).toBe('bilanz');
    expect(zahlenOf(q('ansicht=zahlen&zahlen=quatsch'))).toBe('entwicklung');
    expect(presseOf(q('ansicht=chronik'))).toBe('chronik');
    expect(presseOf(q('ansicht=presse'))).toBe('meldungen');
  });
  it('writes view and presentation together, without defaults', () => {
    expect(withQuery(q('ansicht=bilanz&bilanz=1'), { ansicht: 'zahlen', zahlen: 'einordnung' }, 'handel').toString()).toBe(
      'ansicht=zahlen&bilanz=1&zahlen=einordnung',
    );
    expect(withQuery(q('ansicht=zahlen&zahlen=bilanz'), { ansicht: 'handel', zahlen: 'entwicklung' }, 'handel').toString()).toBe('');
  });
});

describe('links', () => {
  it('builds links to a company view', () => {
    expect(companyHref('STX')).toBe('/wertpapier/STX?ansicht=ueberblick');
    expect(companyHref('STX', 'zahlen', { zahlen: 'bilanz' })).toBe('/wertpapier/STX?ansicht=zahlen&zahlen=bilanz');
  });
  it('redirects the old company URL, keeping every parameter', () => {
    expect(companyRedirect('STX', '')).toBe('/wertpapier/STX?ansicht=ueberblick');
    expect(companyRedirect('STX', '?ansicht=fuehren&aktion=bank')).toBe('/wertpapier/STX?ansicht=fuehren&aktion=bank');
  });
});
