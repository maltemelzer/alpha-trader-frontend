import {
  ceoRequests,
  companyStake,
  logoUrlError,
  parseAmount,
  ratingLevel,
  requestUrl,
  sponsorEligibility,
  volumeRateText,
  wageFigures,
  wageParam,
  type Sponsorship,
} from './derive';

describe('ceoRequests', () => {
  it('builds the logo requests (URL as query parameter, no upload)', () => {
    expect(requestUrl(ceoRequests.setLogo('c1', ' https://img.example/logo.png '))).toBe(
      'PUT /api/companies/logo/c1?logoUrl=https%3A%2F%2Fimg.example%2Flogo.png',
    );
    expect(requestUrl(ceoRequests.removeLogo('c1'))).toBe('DELETE /api/companies/logo/c1');
  });

  it('builds the market maker policy request', () => {
    expect(requestUrl(ceoRequests.setMarketMakerPolicy('c1', 'CLOSED'))).toBe('PUT /api/companies/marketmakerpolicy/c1?policy=CLOSED');
    expect(ceoRequests.setMarketMakerPolicy('c1', 'OPEN').params).toEqual({ path: { companyId: 'c1' }, query: { policy: 'OPEN' } });
  });

  it('builds the salary requests', () => {
    expect(requestUrl(ceoRequests.setPayAutomatically('c1', true))).toBe(
      'PATCH /api/v2/employmentagreements/company/c1?payAutomatically=true',
    );
    expect(requestUrl(ceoRequests.resign('a9'))).toBe('DELETE /api/v2/employmentagreements/a9');
    expect(requestUrl(ceoRequests.employCeoPoll('c1', 2_521_136_126.584))).toBe(
      'POST /api/v2/employceopolls?companyId=c1&dailyWage=2521136126.58',
    );
  });

  it('builds the sponsorship requests', () => {
    expect(requestUrl(ceoRequests.startSponsorship('s1', 'STB1437D0A'))).toBe(
      'POST /api/v2/sponsorships?sponsor=s1&securityIdentifier=STB1437D0A',
    );
    expect(requestUrl(ceoRequests.endSponsorship('s1', 'STB1437D0A'))).toBe(
      'DELETE /api/v2/sponsorships?sponsor=s1&securityIdentifier=STB1437D0A',
    );
  });
});

describe('wageParam', () => {
  it('sends a plain decimal without grouping', () => {
    expect(wageParam(2500000000)).toBe('2500000000');
    expect(wageParam(12.345)).toBe('12.35');
  });
});

describe('parseAmount', () => {
  it('reads German numbers', () => {
    expect(parseAmount('1.234,50')).toBe(1234.5);
    expect(parseAmount('2500000')).toBe(2_500_000);
    expect(parseAmount('  12,5 € ')).toBe(12.5);
  });
  it('reads short forms', () => {
    expect(parseAmount('2,5 Mrd.')).toBe(2_500_000_000);
    expect(parseAmount('3 Mio')).toBe(3_000_000);
    expect(parseAmount('1,2 Bio.')).toBeCloseTo(1.2e12);
  });
  it('rejects anything else', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('1,2,3')).toBeNull();
  });
});

describe('logoUrlError', () => {
  it('accepts http(s) URLs only', () => {
    expect(logoUrlError('https://s1.directupload.eu/images/x.png')).toBeNull();
    expect(logoUrlError('')).toMatch(/Adresse/);
    expect(logoUrlError('kein link')).toMatch(/gültige/);
    expect(logoUrlError('javascript:alert(1)')).toMatch(/http/);
  });
});

describe('wageFigures', () => {
  it('relates the wage to book value and cash', () => {
    const f = wageFigures(1000, 365_000, 10_500);
    expect(f.perYear).toBe(365_000);
    expect(f.shareOfBookValue).toBe(100);
    expect(f.daysOfCash).toBe(10);
  });
  it('handles a missing wage', () => {
    expect(wageFigures(undefined, 1, 1)).toEqual({ perYear: 0, shareOfBookValue: undefined, daysOfCash: undefined });
  });
});

const sponsorship = (sponsor: string, asin: string): Sponsorship => ({
  listing: { name: asin, securityIdentifier: asin, type: 'STOCK' },
  designatedSponsor: { id: sponsor, name: sponsor },
  sponsorRating: { value: 'A', dailyVolumeRate: 0.001 },
});

describe('sponsoring helpers', () => {
  it('maps the rating to segments', () => {
    expect(ratingLevel('A')).toBe(4);
    expect(ratingLevel('D')).toBe(1);
    expect(ratingLevel(undefined)).toBe(0);
  });

  it('formats the quoted volume per day', () => {
    expect(volumeRateText(0.001)).toBe('0,10 %');
    expect(volumeRateText(undefined)).toBe('–');
  });

  it('finds the stake of a company among the shareholders', () => {
    const holders = [{ company: null, shareInPercent: 60 }, { company: { id: 'c1' }, shareInPercent: 7.5 }];
    expect(companyStake(holders, 'c1')).toBe(7.5);
    expect(companyStake(holders, 'c2')).toBe(0);
    expect(companyStake(undefined, 'c1')).toBeUndefined();
  });

  it('checks whether a mandate can be taken up', () => {
    const base = { companyId: 'c1', asin: 'STX', policy: 'OPEN', sponsored: [] as Sponsorship[] };
    expect(sponsorEligibility({ ...base, stake: 5 })).toEqual({ ok: true, reasons: [] });
    expect(sponsorEligibility({ ...base, stake: 4.99 }).reasons[0]).toMatch(/4,99 %, nötig sind 5 %/);
    expect(sponsorEligibility({ ...base, stake: 10, policy: 'CLOSED' }).reasons).toEqual(['Der Emittent lässt keine Market Maker zu.']);
    expect(sponsorEligibility({ ...base, stake: 10, sponsored: [sponsorship('c1', 'STX')] }).ok).toBe(false);
    expect(sponsorEligibility({ ...base, stake: undefined }).ok).toBe(false);
  });
});
