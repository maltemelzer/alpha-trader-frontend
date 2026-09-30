// Split-flap characters: each cell shows one character; when it changes, the upper leaf falls and the
// next character's lower leaf comes down – forward along the drum, a few steps (flapSequence).
// Animated imperatively (Web Animations API) so a board of a thousand cells does not re-render per step.
import { memo, useLayoutEffect, useRef } from 'react';
import { flapSequence } from './derive';

/** one leaf; a turn is two leaves, a tile at most two turns – ≤ 200 ms */
const STEP_MS = 50;

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const canAnimate = () => typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';

const Cell = memo(function Cell({ char, delay, tone, turns }: { char: string; delay: number; tone?: string; turns: number }) {
  const root = useRef<HTMLSpanElement>(null);
  const shown = useRef(char);
  const run = useRef(0);

  useLayoutEffect(() => {
    const el = root.current;
    const from = shown.current;
    if (!el || from === char) return;
    const [top, bottom, leafTop, leafBottom] = Array.from(el.children).map((c) => c.firstElementChild as HTMLElement);
    const id = ++run.current;
    const setAll = (c: string) => {
      top.textContent = c;
      bottom.textContent = c;
      el.classList.remove('saal-c--flip');
    };
    if (reduced() || !canAnimate()) {
      shown.current = char;
      setAll(char);
      return;
    }
    const steps = flapSequence(from, char, turns);
    let current = from;
    // React wrote the new character into both halves already – show the old one until the leaves turned.
    top.textContent = from;
    bottom.textContent = from;
    const step = (i: number) => {
      if (id !== run.current) return;
      if (i >= steps.length) {
        shown.current = char;
        setAll(char);
        return;
      }
      const next = steps[i];
      top.textContent = next;
      bottom.textContent = current;
      leafTop.textContent = current;
      leafBottom.textContent = next;
      const lt = leafTop.parentElement!;
      const lb = leafBottom.parentElement!;
      lt.style.transform = 'rotateX(0deg)';
      lb.style.transform = 'rotateX(90deg)';
      el.classList.add('saal-c--flip');
      const a = lt.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }], { duration: STEP_MS, easing: 'ease-in' });
      a.onfinish = () => {
        lt.style.transform = 'rotateX(-90deg)';
        if (id !== run.current) return;
        const b = lb.animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }], { duration: STEP_MS, easing: 'ease-out' });
        b.onfinish = () => {
          lb.style.transform = 'rotateX(0deg)';
          if (id !== run.current) return;
          current = next;
          bottom.textContent = next;
          step(i + 1);
        };
      };
    };
    const t = window.setTimeout(() => step(0), delay);
    return () => {
      window.clearTimeout(t);
      // an interrupted turn ends on the character it was heading for; the next run starts from there
      shown.current = char;
      setAll(char);
    };
  }, [char, delay, turns]);

  return (
    <span ref={root} className={`saal-c${tone ? ` ${tone}` : ''}`}>
      <span className="saal-c__t">
        <b>{char}</b>
      </span>
      <span className="saal-c__b">
        <b>{char}</b>
      </span>
      <span className="saal-c__lt">
        <b />
      </span>
      <span className="saal-c__lb">
        <b />
      </span>
    </span>
  );
});

/**
 * A fixed-width run of flap cells (`text` already padded, see `cells`). Decorative: the reading text is
 * `label` (default: the trimmed text) for screen readers. `delay` staggers the turn (ms), per cell +`stagger`.
 */
export function Flap({
  text,
  className,
  delay = 0,
  stagger = 6,
  tone,
  label,
  steps = 2,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  /** class per character (e.g. ▲ green) */
  tone?: (ch: string) => string | undefined;
  label?: string | null;
  /** turns per change: 2 = one calm character on the way, 1 = straight to the new one (clocks) */
  steps?: number;
}) {
  const chars = Array.from(text);
  return (
    <span className={`saal-flap${className ? ` ${className}` : ''}`}>
      <span className="saal-flap__cells" aria-hidden="true">
        {chars.map((c, i) => (
          <Cell key={i} char={c === ' ' ? ' ' : c} delay={delay + i * stagger} tone={tone?.(c)} turns={steps} />
        ))}
      </span>
      {label !== null && <span className="bnk-sr">{label ?? text.trim()}</span>}
    </span>
  );
}
