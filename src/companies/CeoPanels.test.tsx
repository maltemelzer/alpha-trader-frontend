import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { CompanyProfile } from '../api/queries';
import { requestUrl, type Sponsorship, type WriteRequest } from './derive';

// No request leaves the test: every write goes to this spy, reads are canned.
const mutate = vi.fn();
vi.mock('../api/queries', () => ({
  useCompanyWrite: () => ({ mutate, reset: vi.fn(), isPending: false, isError: false, error: null }),
  useCompanyEmployment: () => ({
    data: { id: 'agr-1', dailyWage: 1000, payAutomatically: false, lastPayment: { date: 1, nextPossiblePaymentDate: Date.now() + 3_600_000 } },
  }),
  usePossibleSalaryOf: () => ({ data: { value: 1000 } }),
  useSpreadSearch: () => ({ data: undefined, isFetching: false }),
  useShareholders: (asin: string) => ({
    isSuccess: !!asin,
    data: asin ? [{ company: { id: 'c1' }, shareInPercent: 6 }] : undefined,
  }),
  useListingProfile: (asin: string) => ({ data: asin ? { name: 'Bank of Geldern', company: { marketMakerPolicy: 'OPEN' } } : undefined }),
}));

const { CeoPollButton, LogoForm, SalaryPanel } = await import('./CeoPanels');
const { MarketMakerFacts, MarketMakerManage } = await import('./Sponsorships');

const sent = () => requestUrl(mutate.mock.calls.at(-1)![0] as WriteRequest);

const sponsorship = (sponsorId: string, sponsorName: string, asin: string, name: string): Sponsorship => ({
  listing: { name, securityIdentifier: asin, type: 'STOCK' },
  designatedSponsor: { id: sponsorId, name: sponsorName, securityIdentifier: 'STSPONSOR1', ceo: { username: 'eromax' } },
  sponsorRating: { value: 'B', dailyVolumeRate: 0.002 },
});

const company: CompanyProfile = {
  id: 'c1',
  name: 'Alphakasse SE',
  securityIdentifier: 'STSN3G03LB',
  logoUrl: 'https://img.example/old.png',
  marketMakerPolicy: 'OPEN',
  ceo: { id: 'u1', username: 'Esteban' } as CompanyProfile['ceo'],
  ceoEmploymentAgreement: { dailyWage: 1000 },
  bankAccount: { id: 'b1', cash: 10_000 },
  companyCapabilities: { bookValue: 365_000 },
  designatedSponsors: [sponsorship('s9', '$4You', 'STSN3G03LB', 'Alphakasse SE')],
  sponsoredListings: [sponsorship('c1', 'Alphakasse SE', 'STS821B8E3', 'Iftar')],
};

const dialog = () => screen.getByRole('dialog');
const alert = () => screen.getByRole('alertdialog');

beforeEach(() => mutate.mockReset());

describe('CeoPollButton', () => {
  it('starts an employ-CEO poll with the parsed wage after confirming', () => {
    render(<CeoPollButton company={company} currentWage={1000} label="Als CEO bewerben" onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Als CEO bewerben' }));
    const start = within(dialog()).getByRole('button', { name: 'Abstimmung starten' });
    expect(start).toBeDisabled();
    fireEvent.change(within(dialog()).getByLabelText(/Tagesgehalt/), { target: { value: '2,5 Mrd.' } });
    expect(within(dialog()).getByText(/zum jetzigen Gehalt/)).toBeInTheDocument();
    fireEvent.click(start);
    expect(sent()).toBe('POST /api/v2/employceopolls?companyId=c1&dailyWage=2500000000');
  });
});

describe('SalaryPanel', () => {
  it('toggles automatic payment and asks before resigning', () => {
    render(<SalaryPanel company={company} onDone={vi.fn()} />);
    expect(screen.getByText('Das Bargeld reicht für 10 Tagesgehälter.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: /automatisch auszahlen/ }));
    expect(sent()).toBe('PATCH /api/v2/employmentagreements/company/c1?payAutomatically=true');

    fireEvent.click(screen.getByRole('button', { name: 'Als CEO zurücktreten' }));
    expect(mutate).toHaveBeenCalledTimes(1);
    fireEvent.click(within(alert()).getByRole('button', { name: 'Zurücktreten' }));
    expect(sent()).toBe('DELETE /api/v2/employmentagreements/agr-1');
  });
});

describe('LogoForm', () => {
  it('saves a logo URL and removes the logo only after confirming', () => {
    render(<LogoForm company={company} onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Adresse des Bildes/), { target: { value: 'https://img.example/new.png' } });
    fireEvent.click(screen.getByRole('button', { name: 'Logo speichern' }));
    expect(sent()).toBe('PUT /api/companies/logo/c1?logoUrl=https%3A%2F%2Fimg.example%2Fnew.png');

    fireEvent.click(screen.getByRole('button', { name: 'Logo entfernen' }));
    fireEvent.click(within(alert()).getByRole('button', { name: 'Entfernen' }));
    expect(sent()).toBe('DELETE /api/companies/logo/c1');
  });
});

describe('MarketMakerFacts', () => {
  it('lists the sponsors of the share and the mandates of the company', () => {
    render(<MarketMakerFacts company={company} isCeo={false} />);
    expect(screen.getByRole('link', { name: /\$4You/ })).toHaveAttribute('href', '/wertpapier/STSPONSOR1?ansicht=ueberblick');
    expect(screen.getByRole('link', { name: /Iftar/ })).toHaveAttribute('href', '/wertpapier/STS821B8E3');
    expect(screen.getAllByRole('img', { name: 'Rating B von A bis D' })).toHaveLength(2);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('MarketMakerManage', () => {
  const renderManage = (url = '/') =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <MarketMakerManage company={company} onDone={vi.fn()} />
      </MemoryRouter>,
    );

  it('sets the policy and removes a sponsor or ends a mandate after confirming', () => {
    renderManage();
    fireEvent.click(screen.getByRole('switch', { name: /Market Maker für STSN3G03LB zulassen/ }));
    expect(sent()).toBe('PUT /api/companies/marketmakerpolicy/c1?policy=CLOSED');

    fireEvent.click(screen.getByRole('button', { name: 'Entziehen' }));
    fireEvent.click(within(alert()).getByRole('button', { name: 'Entziehen' }));
    expect(sent()).toBe('DELETE /api/v2/sponsorships?sponsor=s9&securityIdentifier=STSN3G03LB');

    fireEvent.click(screen.getByRole('button', { name: 'Beenden' }));
    fireEvent.click(within(alert()).getByRole('button', { name: 'Mandat beenden' }));
    expect(sent()).toBe('DELETE /api/v2/sponsorships?sponsor=c1&securityIdentifier=STS821B8E3');
  });

  it('takes up a new mandate when the stake is at least 5 %', () => {
    renderManage('/?mandat=STB1437D0A');
    expect(screen.getByText('6 % von 5 %')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mandat übernehmen …' }));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Mandat übernehmen' }));
    expect(sent()).toBe('POST /api/v2/sponsorships?sponsor=c1&securityIdentifier=STB1437D0A');
  });
});
