// The hall clock: a station-style face (12 bars, 48 ticks), hands from the current time; the second hand
// in brass. Purely decorative – the time is spelled out next to it.

const R = 46;

export function HallClock({ now, size = 72 }: { now: number; size?: number }) {
  const d = new Date(now);
  const s = d.getSeconds();
  const m = d.getMinutes() + s / 60;
  const h = (d.getHours() % 12) + m / 60;
  const hand = (deg: number, len: number, back: number, cls: string, w: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return (
      <line
        className={cls}
        x1={-Math.cos(a) * back}
        y1={-Math.sin(a) * back}
        x2={Math.cos(a) * len}
        y2={Math.sin(a) * len}
        strokeWidth={w}
        strokeLinecap="butt"
      />
    );
  };
  return (
    <svg className="saal-clock" width={size} height={size} viewBox="-50 -50 100 100" aria-hidden="true">
      <circle className="saal-clock__face" r={R} />
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i * 6 * Math.PI) / 180;
        const big = i % 5 === 0;
        const r1 = big ? R - 11 : R - 5;
        return (
          <line
            key={i}
            className={big ? 'saal-clock__bar' : 'saal-clock__tick'}
            x1={Math.sin(a) * r1}
            y1={-Math.cos(a) * r1}
            x2={Math.sin(a) * (R - 2)}
            y2={-Math.cos(a) * (R - 2)}
            strokeWidth={big ? 4 : 1.2}
          />
        );
      })}
      {hand(h * 30, 25, 6, 'saal-clock__hand', 6)}
      {hand(m * 6, 37, 6, 'saal-clock__hand', 4.5)}
      {hand(s * 6, 30, 10, 'saal-clock__sec', 1.6)}
      <circle className="saal-clock__dot" cx={Math.sin((s * 6 * Math.PI) / 180) * 30} cy={-Math.cos((s * 6 * Math.PI) / 180) * 30} r={4.5} />
    </svg>
  );
}
