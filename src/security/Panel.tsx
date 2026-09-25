import { DS } from '../ds';

/** A card that fills its grid cell; the content area stretches and scrolls inside. */
export function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DS.Card title={title} titleAs="h2" action={action} flush className={`panel ${className}`}>
      <div className="panel__fill">{children}</div>
    </DS.Card>
  );
}
