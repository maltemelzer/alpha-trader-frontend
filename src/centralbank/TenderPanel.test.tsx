import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { MyBank } from '../api/queries';

// No request leaves the test: reads are canned, writes go to spies, fetch itself fails loudly.
const addOrder = vi.fn();
const deleteOrder = vi.fn();
const issue = vi.fn();
const check = vi.fn();
let banks: MyBank[] = [];
let ownOrders: { id: string; action: 'BUY'; type: 'LIMIT'; price: number; numberOfShares: number; securityIdentifier: string; accountId: string }[] = [];

const END = Date.now() + 3_600_000;
// nine daily tenders: odd days Bank B with 3.000 bonds at 102 %, even days Bank A with 1.000 at 98 %
const allotments = Array.from({ length: 9 }, (_, k) => {
  const i = k + 1;
  return {
    securityIdentifier: `ITIOLD0000${i}`,
    date: END - i * 86_400_000,
    price: i % 2 ? 102 : 98,
    numberOfShares: i % 2 ? 3000 : 1000,
    buyerSecuritiesAccountName: i % 2 ? 'Bank B' : 'Bank A',
  };
});
const mutation = (fn: typeof addOrder) => ({ mutate: fn, reset: vi.fn(), isPending: false, error: null });

vi.mock('../api/queries', () => ({
  useInterestTender: () => ({
    isLoading: false,
    data: { endDate: END, bondListing: { name: 'Interest Tender', securityIdentifier: 'ITINOW0001', type: 'INTEREST_TENDER_BOND', endDate: END + 7 * 86_400_000 } },
  }),
  useOrderbook: () => ({ data: { buyEntries: [{ priceLimit: 102, size: 500 }], sellEntries: [] } }),
  useTenderAllotments: () => ({ isLoading: false, data: allotments, dataUpdatedAt: END }),
  useMainInterestRate: () => ({ data: { value: 1, reserveInterestRate: 0.5 } }),
  useInterestHistory: () => ({ isLoading: false, data: [] }),
  useMyBanks: () => ({ banks, isLoading: false, companies: banks.length }),
  useOrdersOn: () => ({ orders: ownOrders, isLoading: false }),
  useAddOrder: () => mutation(addOrder),
  useDeleteOrder: () => mutation(deleteOrder),
  useIssue: () => mutation(issue),
  checkOrder: (q: unknown) => check(q),
}));
vi.mock('../charts/Plot', () => ({ Plot: (p: { 'aria-label': string }) => <div role="img" aria-label={p['aria-label']} /> }));

const { TenderBid, TenderSide } = await import('./TenderPanel');
const { CreditForm } = await import('./CreditForm');

const bank: MyBank = {
  id: 'c1',
  name: 'Testbank AG',
  securityIdentifier: 'STTEST0001',
  securitiesAccountId: 'acct-1',
  cash: 1_000_000,
  maxCentralBankLoans: 500_000, // → at most 5.000 bonds at 100 % (the line caps the cost)
  takenCentralBankLoans: 0,
};

const renderBid = (url = '/zentralbank?ansicht=tender') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <TenderBid />
    </MemoryRouter>,
  );

beforeEach(() => {
  addOrder.mockReset();
  deleteOrder.mockReset();
  issue.mockReset();
  check.mockReset().mockResolvedValue({ checkResult: { ok: true, failed: false } });
  banks = [];
  ownOrders = [];
  vi.stubGlobal('fetch', () => Promise.reject(new Error('no network in tests')));
});
afterEach(() => vi.unstubAllGlobals());

describe('TenderBid', () => {
  it('shows the effect for everyone, but bidding only for banks', () => {
    renderBid('/zentralbank?ansicht=tender&gebot=102,00&stueck=1000');
    expect(screen.getByRole('img', { name: /Neuer Leitzins/ })).toBeInTheDocument();
    // last six tenders: 3 × 3000 × +2 + 3 × 1000 × −2 = 12.000, book 500 × +2 → 13.000 / 12.500 bonds;
    // with 1000 more at +2 → 15.000 / 13.500 = 1,11 %
    expect(screen.getByText(/^1,11\s%$/)).toBeInTheDocument();
    expect(screen.getByText(/Bieten können nur Banken/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Gebot abgeben/ })).not.toBeInTheDocument();
  });

  it('places a limit buy on the tender bond only after confirming', async () => {
    banks = [bank];
    renderBid('/zentralbank?ansicht=tender&gebot=101,50&stueck=1000');
    fireEvent.click(screen.getByRole('button', { name: /Gebot abgeben/ }));
    const dialog = screen.getByRole('alertdialog');
    await act(async () => {}); // the read-only check resolves
    expect(check).toHaveBeenCalledWith(expect.objectContaining({ owner: 'acct-1', securityIdentifier: 'ITINOW0001', price: '101.5' }));
    expect(addOrder).not.toHaveBeenCalled();
    expect(within(dialog).getByText(/^101,50\s%\s\(Leitzins \+1,50\s%\)$/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Verbindlich bieten' }));
    expect(addOrder).toHaveBeenCalledTimes(1);
    expect(addOrder.mock.calls[0][0]).toEqual({
      owner: 'acct-1',
      securityIdentifier: 'ITINOW0001',
      action: 'BUY',
      type: 'LIMIT',
      price: '101.5',
      numberOfShares: 1000,
    });
  });

  it('blocks bids over the credit line or outside 98–102 %', () => {
    banks = [bank];
    const { unmount } = renderBid('/zentralbank?ansicht=tender&gebot=100,00&stueck=6000');
    expect(screen.getByRole('button', { name: /Gebot abgeben/ })).toBeDisabled();
    expect(screen.getByText('Mehr als dein Kreditrahmen erlaubt.')).toBeInTheDocument();
    unmount();
    const { unmount: unmount2 } = renderBid('/zentralbank?ansicht=tender&gebot=103&stueck=10');
    expect(screen.getByRole('button', { name: /Gebot abgeben/ })).toBeDisabled();
    // the credit line (500.000 €) caps the cost: 103 % counts as 102 %, 98 % buys more bonds
    fireEvent.click(screen.getByRole('button', { name: 'Max.' }));
    expect(screen.getByLabelText('Stück')).toHaveValue('4.901');
    unmount2();
    renderBid('/zentralbank?ansicht=tender&gebot=98,00&stueck=10');
    fireEvent.click(screen.getByRole('button', { name: 'Max.' }));
    expect(screen.getByLabelText('Stück')).toHaveValue('5.102');
  });

  it('lists own bids and withdraws one only after confirming', () => {
    banks = [bank];
    ownOrders = [{ id: 'o1', action: 'BUY', type: 'LIMIT', price: 98, numberOfShares: 200, securityIdentifier: 'ITINOW0001', accountId: 'acct-1' }];
    renderBid();
    fireEvent.click(screen.getByRole('button', { name: 'Zurückziehen …' }));
    expect(deleteOrder).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Zurückziehen' }));
    expect(deleteOrder).toHaveBeenCalledWith('o1', expect.anything());
  });
});

describe('TenderSide', () => {
  it('filters by bidder with the legend chips', () => {
    render(
      <MemoryRouter initialEntries={['/zentralbank?ansicht=tender']}>
        <TenderSide />
      </MemoryRouter>,
    );
    const chip = screen.getByRole('button', { name: /Bank B/ });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(chip);
    expect(screen.getByRole('button', { name: /Bank B/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Ohne Bank B/)).toBeInTheDocument();
  });
});

describe('CreditForm', () => {
  it('is only for banks', () => {
    render(<CreditForm />);
    expect(screen.getByText(/Kredit nehmen können nur Banken/)).toBeInTheDocument();
  });

  it('issues system bonds within the credit line only after confirming', () => {
    banks = [{ ...bank, takenCentralBankLoans: 100_000 }]; // room: (500.000 − 100.000) / 100 = 4.000
    render(<CreditForm />);
    const input = screen.getByLabelText('Systemanleihen');
    fireEvent.change(input, { target: { value: '5000' } });
    expect(screen.getByText(/höchstens 4\.000 Stück/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kredit aufnehmen/ })).toBeDisabled();
    fireEvent.change(input, { target: { value: '1.000' } });
    fireEvent.click(screen.getByRole('button', { name: /Kredit aufnehmen/ }));
    expect(issue).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Verbindlich aufnehmen' }));
    expect(issue).toHaveBeenCalledWith({ kind: 'system', numberOfBonds: 1000 }, expect.anything());
  });
});
