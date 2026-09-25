import { fireEvent, render, screen, within } from '@testing-library/react';

// No request leaves the test: deleting goes to this spy, reads are canned.
const mutate = vi.fn();
vi.mock('../api/queries', () => ({
  useMyIndexes: () => ({
    isLoading: false,
    isError: false,
    data: [{ id: 'i1', name: 'Rebellen', membersCount: 12, listing: { name: 'Rebellen', securityIdentifier: 'IDREBEL001' } }],
  }),
  useMyFunds: () => ({ data: [{ name: 'Rebellen ETF', baseIndexAsin: 'IDREBEL001', listing: { securityIdentifier: 'EFREBEL001' } }] }),
  usePriceSpreads: () => ({ IDREBEL001: { lastPrice: { value: 2_460_000 } } }),
  useDailyHistories: () => ({ IDREBEL001: [{ closePrice: 1000 }, { closePrice: 2_400_000 }, { closePrice: 2_460_000 }] }),
  useWarrantsOn: () => ({ isLoading: false, data: { totalElements: 2, content: [] } }),
  useDeleteIndex: () => ({ mutate, isPending: false, isError: false, error: null }),
}));

const { MyIndexes } = await import('./MyIndexes');

describe('MyIndexes', () => {
  it('lists own indexes and deletes one only after confirming, naming the consequences', () => {
    render(<MyIndexes />);
    expect(screen.getByText('Rebellen')).toBeInTheDocument();
    expect(screen.getByText(/12 Mitglieder · 1 ETF von dir/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Rebellen/ })).toHaveAttribute('href', '/wertpapier/IDREBEL001');

    fireEvent.click(screen.getByRole('button', { name: 'Rebellen löschen' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByRole('link', { name: 'Rebellen ETF' })).toHaveAttribute('href', '/wertpapier/EFREBEL001');
    expect(within(dialog).getByText('2 Optionsscheine beziehen sich auf diesen Index.')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Index löschen' }));
    expect(mutate.mock.calls[0][0]).toBe('IDREBEL001');
  });
});
