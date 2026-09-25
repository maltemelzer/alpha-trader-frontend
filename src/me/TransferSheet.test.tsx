import { fireEvent, render, screen } from '@testing-library/react';

// No request leaves the test: the transfer goes to this spy, the recipient search is canned.
const mutate = vi.fn();
vi.mock('../api/queries', () => ({
  useBankTransfer: () => ({ mutate, reset: vi.fn(), isPending: false, isError: false, error: null }),
  useOtcCounterparties: (q: string) => ({
    isFetching: false,
    data:
      q.length >= 2
        ? [
            { id: 'sec-1', name: 'Esteban', clearingAccountId: 'bank-esteban', privateAccount: true },
            { id: 'sec-2', name: 'Alpha Telekom AG (STAP07SGND) | Esteban', clearingAccountId: 'bank-telekom', privateAccount: false },
          ]
        : [],
  }),
  useMe: () => ({ data: undefined }),
  useMyBankAccounts: () => ({ data: [] }),
  useMyCompanies: () => ({ data: [] }),
}));

const { TransferSheet } = await import('./TransferSheet');

const accounts = [
  { id: 'bank-private', name: 'Privatkonto', cash: 1_000 },
  { id: 'bank-company', name: 'Meine AG', cash: 50_000 },
];

beforeEach(() => mutate.mockReset());

describe('TransferSheet', () => {
  it('sends from a company account to another player only after confirming', async () => {
    render(<TransferSheet open onClose={vi.fn()} accounts={accounts} onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Von'), { target: { value: 'bank-company' } });
    fireEvent.change(screen.getByLabelText('An'), { target: { value: 'Este' } });
    fireEvent.click(await screen.findByRole('button', { name: /Alpha Telekom AG/ }));
    fireEvent.change(screen.getByLabelText('Betrag'), { target: { value: '12.345,67' } });
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByText('Meine AG danach')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Jetzt überweisen' }));
    expect(mutate.mock.calls[0][0]).toEqual({ senderBankAccountId: 'bank-company', receiverBankAccountId: 'bank-telekom', cashAmount: 12345.67 });
  });

  it('sends between own accounts and fills the maximum', () => {
    render(<TransferSheet open onClose={vi.fn()} accounts={accounts} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Eigenes Konto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Max.' }));
    expect(screen.getByLabelText('Betrag')).toHaveValue('1.000,00');
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Jetzt überweisen' }));
    expect(mutate.mock.calls[0][0]).toEqual({ senderBankAccountId: 'bank-private', receiverBankAccountId: 'bank-company', cashAmount: 1000 });
  });

  it('blocks more than the balance and a missing recipient', () => {
    render(<TransferSheet open onClose={vi.fn()} accounts={accounts} onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Betrag'), { target: { value: '5.000' } });
    expect(screen.getByText('Mehr als das verfügbare Bargeld.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Betrag'), { target: { value: '10' } });
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeDisabled();
  });

  it('works with the private account alone (no company): any player as recipient', async () => {
    render(<TransferSheet open onClose={vi.fn()} accounts={accounts.slice(0, 1)} onDone={vi.fn()} />);
    expect(screen.queryByRole('radio', { name: 'Eigenes Konto' })).toBeNull();
    fireEvent.change(screen.getByLabelText('An'), { target: { value: 'Este' } });
    fireEvent.click(await screen.findByRole('button', { name: /^Esteban/ }));
    fireEvent.change(screen.getByLabelText('Betrag'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Jetzt überweisen' }));
    expect(mutate.mock.calls[0][0]).toMatchObject({ senderBankAccountId: 'bank-private', receiverBankAccountId: 'bank-esteban' });
  });
});
