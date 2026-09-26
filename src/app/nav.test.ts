import { describe, expect, it } from 'vitest';
import { AREAS, areaOf, pageOf, pagesOf, titleOf } from './nav';

describe('phone navigation', () => {
  it('names area pages and their sub-routes', () => {
    expect(titleOf('/zentralbank')).toBe('Zentralbank');
    expect(titleOf('/forum/12/34')).toBe('Forum');
    expect(titleOf('/')).toBe('Meine Organisation');
    expect(titleOf('/einstellungen')).toBe('Einstellungen');
  });

  it('names detail pages by kind and maps them to their overview', () => {
    expect(titleOf('/unternehmen/STSN3G03LB')).toBe('Unternehmen');
    expect(pageOf('/unternehmen/STSN3G03LB')?.href).toBe('/unternehmen');
    expect(pageOf('/allianz/abc')?.href).toBe('/allianzen');
    expect(areaOf('/wertpapier/X')).toBe('markt');
  });

  it('lists every page, areas without children as one page', () => {
    const orders = AREAS.find((a) => a.value === 'orders')!;
    expect(pagesOf(orders)).toEqual([{ label: 'Orders', href: '/orders' }]);
    expect(AREAS.flatMap(pagesOf).map((p) => p.href)).toContain('/zentralbank');
  });
});
