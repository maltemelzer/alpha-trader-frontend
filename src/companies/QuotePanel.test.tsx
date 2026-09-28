import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Sponsorship } from './derive';

// No request leaves the test: the quote goes to this spy, reads are canned.
const mutate = vi.fn();
vi.mock('../api/queries', () => ({
  usePlaceQuote: () => ({ mutate, reset: vi.fn(), isPending: false, isError: false, error: null }),
  useOrderbook: () => ({
    isFetched: true,
    data: { buyEntries: [{ priceLimit: 90, size: 5 }], sellEntries: [{ priceLimit: 110, size: 7 }] },
  }),
  usePriceSpread: () => ({ data: undefined }),
  useListingProfile: () => ({ isFetched: true, data: { type: 'STOCK', outstandingShares: 10_000, lastPrice: { value: 100 } } }),
  useAccountPortfolio: () => ({
    isFetched: true,
    data: { cash: 10_000, positions: [{ securityIdentifier: 'STX', numberOfShares: 1_200, committedShares: 200 }] },
  }),
  useOpenOrders: () => ({ data: { content: [] } }),
}));

const { QuotePanel } = await import('./QuotePanel');

const sponsorship: Sponsorship = {
  listing: { name: 'Iftar', securityIdentifier: 'STX', type: 'STOCK' },
  designatedSponsor: { id: 'c1', name: 'Alphakasse SE', securitiesAccountId: 'acc-1' },
  sponsorRating: { value: 'B', dailyVolumeRate: 0.002 },
};

beforeEach(() => mutate.mockReset());

describe('QuotePanel', () => {
  it('prefills the minimum the rules allow and sends it only after confirming', () => {
    render(<QuotePanel compact sponsorship={sponsorship} owner="acc-1" onDone={vi.fn()} />);
    // middle 100 → 5 % spread; 10.000 shares outstanding → 1 % = 100 per side
    expect(screen.getByLabelText('Kaufen zu')).toHaveValue('97,43');
    expect(screen.getByLabelText('Verkaufen zu')).toHaveValue('102,56');
    expect(screen.getByLabelText('Stück Kauf')).toHaveValue('100');
    expect(screen.getByLabelText('Stück Verkauf')).toHaveValue('100');
    expect(screen.getByLabelText('Spread')).toHaveValue('5');
    expect(screen.getByLabelText('Volumen je Seite')).toHaveValue('1');
    expect(screen.getByText(/1–2.% = 100.Stk\.–200.Stk\./)).toBeInTheDocument();
    expect(screen.getByText(/enger als der Markt/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quote stellen …' }));
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Quote stellen' }));
    expect(mutate.mock.calls[0][0]).toEqual({ owner: 'acc-1', securityIdentifier: 'STX', buyPrice: 97.43, sellPrice: 102.56, buyShares: 100, sellShares: 100 });
  });

  it('sets prices from the spread and both sizes from the volume', () => {
    render(<QuotePanel compact sponsorship={sponsorship} owner="acc-1" onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Spread'), { target: { value: '10' } });
    expect(screen.getByLabelText('Kaufen zu')).toHaveValue('94,73');
    expect(screen.getByLabelText('Verkaufen zu')).toHaveValue('105,26');
    fireEvent.change(screen.getByLabelText('Volumen je Seite in Prozent der Anteile'), { target: { value: '1.5' } });
    expect(screen.getByLabelText('Stück Kauf')).toHaveValue('150');
    expect(screen.getByLabelText('Stück Verkauf')).toHaveValue('150');
    // editing a price moves the spread control along
    fireEvent.change(screen.getByLabelText('Verkaufen zu'), { target: { value: '100' } });
    expect(screen.getByLabelText('Spread')).toHaveValue('5,27');
  });

  it('does not ask when a rule is broken or the quote is crossed', () => {
    render(<QuotePanel compact sponsorship={sponsorship} owner="acc-1" onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Verkaufen zu'), { target: { value: '97' } });
    fireEvent.change(screen.getByLabelText('Stück Verkauf'), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Quote stellen …' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText('Der Verkaufskurs muss über dem Kaufkurs liegen.')).toBeInTheDocument();
    expect(screen.getByText(/Höchstens 2.% der Anteile: 200 Stk\./)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Verkaufen zu'), { target: { value: '100' } });
    expect(screen.getByText(/Mindestens 5.% Spread – jetzt 2,57.%\./)).toBeInTheDocument();
  });
});
