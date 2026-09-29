// Renders the variant of an experiment this player sees, counts its usage and shows the „Test“ bar.
// Usage on a route:  <ExperimentHost id="start" pages={{ puls: lazy(…), titelseite: lazy(…) }} />
// Every variant is a whole page (its own `.page`); with React.lazy only the shown one is loaded.
import { Suspense, useRef, type ComponentType } from 'react';
import { DS } from '../ds';
import { ExperimentBar } from './ExperimentBar';
import { useExperiment, useExperimentUsage } from './useExperiment';
import './ExperimentBar.css';

function Waiting() {
  return (
    <div className="page exphost__wait">
      <DS.Loading label="Seite lädt" />
    </div>
  );
}

export function ExperimentHost({ id, pages }: { id: string; pages: Record<string, ComponentType> }) {
  const x = useExperiment(id);
  const ref = useRef<HTMLDivElement>(null);
  useExperimentUsage(x, ref);
  const Page = x.choice ? pages[x.choice.variant] : undefined;
  return (
    // display: contents – the variant's .page stays the direct grid child of main; the host only listens for clicks
    <div ref={ref} className="exphost">
      <Suspense fallback={<Waiting />}>{Page ? <Page /> : <Waiting />}</Suspense>
      <ExperimentBar x={x} />
    </div>
  );
}
