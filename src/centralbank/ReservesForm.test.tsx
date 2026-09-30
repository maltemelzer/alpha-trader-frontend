import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { MyBank, MyNonBank } from '../api/queries';

// No request leaves the test: reads are canned, the write goes to a spy.
const increase = vi.fn();
let banks: MyBank[] = [];
let others: MyNonBank[] = [];

vi.mock('../api/queries', () => ({
  useMainInterestRate: () => ({ data: { value: 1, reserveInterestRate: 0.5 } }),
  useMyBanks: () => ({ banks, others, isLoading: false, companies: banks.length + others.length }),
  useBanking: () => ({ reserves: { data: { id: 'r1', cashHolding: 9_000_000, interestRateBoost: 0.1 } } }),
  useBankingActions: () => ({ reserves: { mutate: increase, reset: vi.fn(), isPending: false, error: null } }),
}));
vi.mock('../charts/Plot', () => ({ Plot: (p: { 'aria-label': string }) => <div role="img" aria-label={p['aria-label']} /> }));

const { ReservesCard } = await import('./ReservesForm');

const bank: MyBank = {
  id: 'c1',
  name: 'Testbank AG',
  securityIdentifier: 'STTEST0001',
  securitiesAccountId: 'acct-1',
  cash: 4_000_000,
  reserves: 8_000_000,
  maxCentralBankLoans: 800_000,
};

const renderCard = () =>
  render(
    <MemoryRouter initialEntries={['/zentralbank?ansicht=einlage']}>
      <ReservesCard />
    </MemoryRouter>,
  );

beforeEach(() => {
  increase.mockReset();
  banks = [];
  others = [];
});

describe('ReservesCard', () => {
  it('shows the effect of an amount and asks before sending it', () => {
    banks = [bank];
    renderCard();
    const submit = screen.getByRole('button', { name: /Einlage erhöhen/ });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /^25\s%$/ }));
    // 1 Mio. of 4 Mio. cash; the CEO's exact reserves (9 Mio.) win over the profile
    expect(screen.getByText(/bleibt 3\sMio\./)).toBeInTheDocument();
    expect(screen.getByText(/^10\sMio\.\s€$/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /1\sMio\.\s€ einlegen/ }));
    const dialog = screen.getByRole('alertdialog');
    expect(increase).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Verbindlich einlegen' }));
    expect(increase).toHaveBeenCalledWith(1_000_000, expect.anything());
  });

  it('refuses more than the cash', () => {
    banks = [bank];
    renderCard();
    fireEvent.change(screen.getByLabelText('Betrag'), { target: { value: '5 Mio.' } });
    expect(screen.getByText(/Nicht genug Bargeld/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Einlage erhöhen/ })).toBeDisabled();
  });

  it('explains the license to CEOs without a bank', () => {
    others = [{ id: 'c2', name: 'Kleinfirma', securityIdentifier: 'STKLEIN001', cash: 2_500_000 }];
    renderCard();
    expect(screen.getByText(/keins deiner Unternehmen hat eine Banklizenz/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kleinfirma' })).toHaveAttribute('href', '/wertpapier/STKLEIN001?ansicht=fuehren&aktion=bank');
  });
});
