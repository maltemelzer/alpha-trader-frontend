import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { assignedVariant, tourOrder } from './assign';
import type { MyFeedback } from './api';
import type { Experiment } from './registry';

// Demo experiments instead of the (empty) registry; no request leaves the test.
const demo: Experiment = {
  id: 'demo',
  title: 'Demo-Seite',
  question: 'Wie gefällt dir diese Seite?',
  variants: [
    { id: 'rot', label: 'Rot', description: 'erste' },
    { id: 'blau', label: 'Blau', description: 'zweite' },
    { id: 'gelb', label: 'Gelb', description: 'dritte' },
  ],
  until: '2999-12-31',
  fallback: 'rot',
};
const demoAb: Experiment = { ...demo, id: 'demoab', mode: 'ab' };
vi.mock('./registry', () => ({ EXPERIMENTS: [demo, demoAb], experimentOf: (id: string) => [demo, demoAb].find((e) => e.id === id) }));
vi.mock('../api/queries', () => ({ useMe: () => ({ data: { username: 'Testspieler' } }) }));

// The feedback service as a little in-memory stand-in.
let mine: MyFeedback;
const sendUsage = vi.fn();
const saveRating = vi.fn();
vi.mock('./api', async (orig) => ({
  ...(await orig<typeof import('./api')>()),
  sendUsage: (b: unknown) => sendUsage(b),
  useMyFeedback: () => ({ isSuccess: true, isError: false, data: mine }),
  useSaveRating: () => ({
    mutate: (r: { variant: string; stars: number; comment: string }, o?: { onSuccess?: () => void }) => {
      saveRating(r);
      mine = { ...mine, ratings: [...mine.ratings, { ...r, updated: Date.now() }] };
      o?.onSuccess?.();
    },
    reset: () => {},
    isPending: false,
    error: null,
  }),
  useSaveFavorite: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

const { ExperimentHost } = await import('./ExperimentHost');

const pages = { rot: () => <p>Seite Rot</p>, blau: () => <p>Seite Blau</p>, gelb: () => <p>Seite Gelb</p> };
const label = (id: string) => demo.variants.find((v) => v.id === id)!.label;

function show(id = 'demo', url = '/demo') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[url]}>
        <ExperimentHost id={id} pages={pages} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  mine = { username: 'Testspieler', admin: false, ratings: [], favorite: null, favoriteNote: '' };
});

describe('ExperimentHost – tour (compare)', () => {
  it('starts with the first variant of the own order, marks it as a test and counts the visit', () => {
    const order = tourOrder(demo, 'Testspieler');
    const { unmount } = show();
    expect(screen.getByText(`Seite ${label(order[0])}`)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Demo-Seite im Test' })).toHaveTextContent(`${label(order[0])} · 1/3Bewerten`);
    unmount();
    expect(sendUsage).toHaveBeenCalledWith(expect.objectContaining({ experiment: 'demo', variant: order[0], visit: true }));
  });

  it('rates and moves on to the next variant, then asks for the decision after the last one', () => {
    const order = tourOrder(demo, 'Testspieler');
    const view = show();
    for (const [i, id] of order.entries()) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`Demo-Seite: ${label(id)}`) }));
      const sheet = screen.getByRole('dialog');
      fireEvent.click(within(sheet).getByLabelText(/^4 von 5/));
      fireEvent.click(within(sheet).getByRole('button', { name: i < 2 ? 'Bewerten und weiter' : 'Bewertung senden' }));
      expect(saveRating).toHaveBeenLastCalledWith(expect.objectContaining({ variant: id, stars: 4 }));
      view.rerender(
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter initialEntries={['/demo']}>
            <ExperimentHost id="demo" pages={pages} />
          </MemoryRouter>
        </QueryClientProvider>,
      );
      if (i < 2) expect(screen.getByText(`Seite ${label(order[i + 1])}`)).toBeInTheDocument();
    }
    expect(within(screen.getByRole('dialog')).getByRole('group', { name: 'Welche soll bleiben?' })).toBeInTheDocument();
  });
});

describe('ExperimentHost – ab', () => {
  it('shows the assigned variant; ?variante= switches and is remembered', () => {
    const { unmount } = show('demoab');
    expect(screen.getByText(`Seite ${label(assignedVariant(demoAb, 'Testspieler'))}`)).toBeInTheDocument();
    unmount();
    const other = demoAb.variants.find((v) => v.id !== assignedVariant(demoAb, 'Testspieler'))!.id;
    show('demoab', `/demo?variante=${other}`).unmount();
    show('demoab');
    expect(screen.getByText(`Seite ${label(other)}`)).toBeInTheDocument();
  });
});
