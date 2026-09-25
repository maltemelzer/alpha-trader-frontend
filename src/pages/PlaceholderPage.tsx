import { DS } from '../ds';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ padding: 'var(--space-6) var(--space-4)' }}>
      <DS.EmptyState title={title}>Dieser Bereich wird als Nächstes gebaut.</DS.EmptyState>
    </div>
  );
}
