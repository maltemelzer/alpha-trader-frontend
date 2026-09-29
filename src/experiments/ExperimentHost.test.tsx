import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { assignedVariant } from './assign';

// A demo experiment instead of the (empty) registry; no request leaves the test.
const demo = {
  id: 'demo',
  title: 'Demo-Seite',
  question: 'Wie gefällt dir diese Seite?',
  variants: [
    { id: 'rot', label: 'Rot', description: 'erste' },
    { id: 'blau', label: 'Blau', description: 'zweite' },
  ],
  until: '2999-12-31',
  fallback: 'rot',
};
vi.mock('./registry', () => ({ EXPERIMENTS: [demo], experimentOf: (id: string) => (id === 'demo' ? demo : undefined) }));
vi.mock('../api/queries', () => ({ useMe: () => ({ data: { username: 'Testspieler' } }) }));
const sendUsage = vi.fn();
vi.mock('./api', async (orig) => ({
  ...(await orig<typeof import('./api')>()),
  sendUsage: (b: unknown) => sendUsage(b),
  useMyFeedback: () => ({ isSuccess: true, data: { username: 'Testspieler', admin: false, ratings: [], favorite: null } }),
}));

const { ExperimentHost } = await import('./ExperimentHost');

const pages = { rot: () => <p>Seite Rot</p>, blau: () => <p>Seite Blau</p> };

function show(url = '/demo') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[url]}>
        <ExperimentHost id="demo" pages={pages} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => localStorage.clear());

describe('ExperimentHost', () => {
  it('shows the assigned variant with the test bar and counts the visit', () => {
    const assigned = assignedVariant(demo, 'Testspieler');
    const { unmount } = show();
    expect(screen.getByText(assigned === 'rot' ? 'Seite Rot' : 'Seite Blau')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Demo-Seite im Test' })).toHaveTextContent('Bewerten');
    unmount();
    expect(sendUsage).toHaveBeenCalledWith(expect.objectContaining({ experiment: 'demo', variant: assigned, visit: true }));
  });

  it('switches through ?variante= and the sheet, and remembers the choice', () => {
    const { unmount } = show('/demo?variante=blau');
    expect(screen.getByText('Seite Blau')).toBeInTheDocument();
    unmount();
    show();
    expect(screen.getByText('Seite Blau')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Demo-Seite: Blau/ }));
    const sheet = screen.getByRole('dialog');
    fireEvent.click(within(sheet).getByLabelText(/^Rot/));
    expect(screen.getByText('Seite Rot')).toBeInTheDocument();
  });
});
