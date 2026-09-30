// One board (a wall panel of the hall): as many lines as its height holds (or a fixed number), turned
// page by page. Every line keeps its place, so a new page turns only the flaps whose character changes.
// The name (or headline) column takes the width the fixed columns leave, in whole cells.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Flap } from './Flap';
import {
  arrowOf,
  cells,
  cellsIn,
  COLS,
  fitPrice,
  flipDelay,
  linesFor,
  nameCells,
  NEWS_COLS,
  paginate,
  type BoardLine,
  type BoardRow,
  type BoardSection,
} from './derive';

const PAGE_MS = 14_000;

const BLANK: BoardRow = { asin: '', name: '', price: '', priceShort: '', dir: null, change: '', volume: '', mine: false };

const dirTone = (r: BoardRow) => (r.dir === 'up' ? 'saal-c--up' : r.dir === 'down' ? 'saal-c--down' : undefined);

function rowLabel(r: BoardRow, s: BoardSection) {
  if (s.id === 'meldungen') return `${r.change}, ${r.price}: ${r.name}`;
  const arrow = r.dir === 'up' ? '▲ ' : r.dir === 'down' ? '▼ ' : '';
  const parts = [r.suffix ? `${r.name} (${r.suffix})` : r.name, `${s.heads[0]} ${r.price}`, `${s.heads[1]} ${arrow}${r.change}`];
  if (r.volume) parts.push(`${s.heads[2]} ${r.volume}`);
  if (r.mine && s.id !== 'depot') parts.push('in deinem Depot');
  return parts.join(', ');
}

interface Layout {
  phone: boolean;
  /** cells of the name column (quotes) */
  name: number;
  /** cells of the headline column (news) */
  headline: number;
}

function QuoteRow({ row, line, layout }: { row: BoardRow; line: number; layout: Layout }) {
  const tone = dirTone(row);
  const d = (cell: number) => flipDelay(line, cell);
  const n = layout.name;
  return (
    <>
      <Flap className="saal-col saal-col--name" text={nameCells(row.name, row.suffix ?? '', n)} delay={d(0)} label={null} />
      <Flap className="saal-col saal-col--price" text={cells(fitPrice(row, COLS.price), COLS.price, 'right')} delay={d(n)} label={null} />
      <span className="saal-col saal-col--chg">
        <Flap text={arrowOf(row.dir)} delay={d(n + COLS.price)} tone={() => tone} label={null} />
        <Flap text={cells(row.change, COLS.change, 'right')} delay={d(n + COLS.price + 1)} tone={() => tone} label={null} />
      </span>
      {!layout.phone && <Flap className="saal-col saal-col--vol" text={cells(row.volume, COLS.volume, 'right')} delay={d(n + 17)} label={null} />}
    </>
  );
}

function NewsRow({ row, line, layout }: { row: BoardRow; line: number; layout: Layout }) {
  const d = (cell: number) => flipDelay(line, cell);
  return (
    <>
      <Flap className="saal-col saal-col--time" text={cells(row.price, NEWS_COLS.time)} delay={d(0)} label={null} />
      {!layout.phone && <Flap className="saal-col saal-col--kind" text={cells(row.change, NEWS_COLS.kind)} delay={d(NEWS_COLS.time)} label={null} />}
      <Flap className="saal-col saal-col--name" text={cells(row.name, layout.headline)} delay={d(NEWS_COLS.time + NEWS_COLS.kind)} label={null} />
    </>
  );
}

function Row({ row, section, line, layout }: { row: BoardRow; section?: BoardSection; line: number; layout: Layout }) {
  const blank = !row.asin && !row.href;
  const news = section?.id === 'meldungen';
  const href = row.href ?? (row.asin ? `/wertpapier/${row.asin}` : undefined);
  return (
    <a
      className={`saal-line saal-row${news ? ' saal-row--news' : ''}${row.mine ? ' saal-row--mine' : ''}${blank ? ' saal-row--blank' : ''}`}
      href={blank ? undefined : href}
      aria-label={blank || !section ? undefined : rowLabel(row, section)}
      aria-hidden={blank || undefined}
    >
      {row.flash && <span key={row.flash.id} className={`saal-row__flash saal-row__flash--${row.flash.dir ?? 'flat'}`} aria-hidden="true" />}
      {news ? <NewsRow row={row} line={line} layout={layout} /> : <QuoteRow row={row} line={line} layout={layout} />}
    </a>
  );
}

function Head({ line, layout }: { line: Extract<BoardLine, { kind: 'head' }>; layout: Layout }) {
  const { section, cont } = line;
  const title = layout.phone ? section.title.split(' · ')[0] : section.title;
  if (section.id === 'meldungen')
    return (
      <div className="saal-line saal-head">
        <span className="saal-col saal-col--name saal-head__title">
          {title}
          {!layout.phone && <span className="saal-head__cont"> · {section.heads.join(', ')}</span>}
        </span>
      </div>
    );
  return (
    <div className="saal-line saal-head">
      <span className="saal-col saal-col--name saal-head__title">
        {title}
        {cont && <span className="saal-head__cont"> · Forts.</span>}
      </span>
      <span className="saal-col saal-col--price">{section.heads[0]}</span>
      <span className="saal-col saal-col--chg">{layout.phone ? section.heads[1].replace('Zum ', '') : section.heads[1]}</span>
      {!layout.phone && <span className="saal-col saal-col--vol">{section.heads[2]}</span>}
    </div>
  );
}

export function Board({
  sections,
  phone = false,
  label,
  lines,
  className,
}: {
  sections: BoardSection[];
  phone?: boolean;
  /** name of the board for screen readers */
  label: string;
  /** a fixed number of lines (the board then takes their height) instead of as many as fit */
  lines?: number;
  className?: string;
}) {
  const body = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ lines: 0, width: 0, pitch: 0, gap: 0 });
  const [page, setPage] = useState(0);
  const [hold, setHold] = useState(false);

  useLayoutEffect(() => {
    const el = body.current;
    const p = probe.current;
    if (!el || !p) return;
    const measure = () => {
      const rowGap = parseFloat(getComputedStyle(el).rowGap) || 0;
      const colGap = parseFloat(getComputedStyle(p).columnGap) || 0;
      const cell = p.querySelector('.saal-c')?.getBoundingClientRect().width ?? 0;
      const cg = parseFloat(getComputedStyle(p.querySelector('.saal-flap__cells') ?? p).columnGap) || 0;
      setFit({
        lines: linesFor(el.clientHeight + rowGap, p.getBoundingClientRect().height + rowGap),
        width: el.clientWidth,
        pitch: cell + cg,
        gap: colGap,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(p);
    return () => ro.disconnect();
  }, []);

  // fixed columns in cells and the gaps between the columns; 6 px for the brass mark at the left
  const free = (fixed: number, gaps: number, min: number) =>
    fit.pitch ? cellsIn(fit.width - 6 - gaps * fit.gap - fixed * fit.pitch + 4, fit.pitch, min) : min;
  const layout: Layout = {
    phone,
    name: free(COLS.price + 1 + COLS.change + (phone ? 0 : COLS.volume), phone ? 2 : 3, COLS.minName),
    headline: free(NEWS_COLS.time + (phone ? 0 : NEWS_COLS.kind), phone ? 1 : 2, 12),
  };

  const perPage = lines ?? fit.lines;
  const pages = useMemo(() => (perPage ? paginate(sections, perPage) : [[]]), [sections, perPage]);
  const shown = page % pages.length;
  const current = pages[shown] ?? [];

  useEffect(() => {
    if (pages.length < 2 || hold) return;
    const t = window.setInterval(() => setPage((p) => (p + 1) % pages.length), PAGE_MS);
    return () => window.clearInterval(t);
  }, [pages.length, hold]);

  const fill = Math.max(0, perPage - current.length);

  return (
    <section
      className={`saal-board${phone ? ' saal-board--phone' : ''}${lines ? ' saal-board--fixed' : ''}${className ? ` ${className}` : ''}`}
      aria-label={label}
      style={lines ? ({ '--lines': lines } as React.CSSProperties) : undefined}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
    >
      <div ref={body} className="saal-board__body">
        <div ref={probe} className="saal-line saal-row saal-probe" aria-hidden="true">
          <Flap text="0" label={null} />
        </div>
        {current.map((l, i) =>
          l.kind === 'head' ? (
            <Head key={`${i}-head-${l.section.id}`} line={l} layout={layout} />
          ) : l.kind === 'note' ? (
            <p key={`${i}-note`} className="saal-line saal-note">
              {l.section.empty}
            </p>
          ) : (
            <Row key={`${i}-row`} row={l.row} section={l.section} line={i} layout={layout} />
          ),
        )}
        {Array.from({ length: fill }, (_, i) => (
          <Row key={`${current.length + i}-row`} row={BLANK} section={sections.length === 1 ? sections[0] : undefined} line={current.length + i} layout={layout} />
        ))}
      </div>
      {/* a board of fixed height keeps the row of dots from the start, so nothing below it moves */}
      {(pages.length > 1 || !!lines) && (
        <div className="saal-board__pages" role="group" aria-label={`Seite ${shown + 1} von ${pages.length}`}>
          {pages.length > 1 && pages.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`saal-board__dot${i === shown ? ' is-on' : ''}`}
              aria-label={`Seite ${i + 1}`}
              aria-pressed={i === shown}
              onClick={() => setPage(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
