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
  it('prefills a quote inside the market and sends it only after confirming', () => {
    render(<QuotePanel compact sponsorship={sponsorship} owner="acc-1" onDone={vi.fn()} />);
    // middle 100, market 20 % wide → 1 % around the middle; a tenth of cash (100 → 10) and free shares (1.000 → 100)
    expect(screen.getByLabelText('Kaufen zu')).toHaveValue('99,5');
    expect(screen.getByLabelText('Verkaufen zu')).toHaveValue('100,5');
    expect(screen.getByLabelText('Stück Kauf')).toHaveValue('10');
    expect(screen.getByText(/enger als der Markt/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quote stellen …' }));
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Quote stellen' }));
    expect(mutate.mock.calls[0][0]).toEqual({ owner: 'acc-1', securityIdentifier: 'STX', buyPrice: 99.5, sellPrice: 100.5, buyShares: 10, sellShares: 10 });
  });

  it('does not ask when the quote is crossed or too large', () => {
    render(<QuotePanel compact sponsorship={sponsorship} owner="acc-1" onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Verkaufen zu'), { target: { value: '99' } });
    fireEvent.change(screen.getByLabelText('Stück Verkauf'), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Quote stellen …' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText('Der Verkaufskurs muss über dem Kaufkurs liegen.')).toBeInTheDocument();
    expect(screen.getByText('Mehr, als das Unternehmen frei hält.')).toBeInTheDocument();
  });
});
