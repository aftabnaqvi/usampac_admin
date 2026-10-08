type Point = { day: string; value: number; guest?: number; candidate?: number; donate?: number };
type Bar = { label: string; value: number };

function formatDay(day: string): string {
  const [, m, d] = day.split('-');
  return `${Number(m)}/${Number(d)}`;
}

function maxOf(values: number[]): number {
  return Math.max(1, ...values);
}

export function LineChart({
  title,
  points,
  color = '#0a1f63',
  valueKey = 'value'
}: {
  title: string;
  points: Point[];
  color?: string;
  valueKey?: 'value' | 'donate';
}) {
  const w = 640;
  const h = 220;
  const pad = { l: 36, r: 12, t: 16, b: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const values = points.map((p) => (valueKey === 'donate' ? p.donate ?? 0 : p.value));
  const max = maxOf(values);
  const n = Math.max(points.length - 1, 1);
  const coords = points.map((p, i) => {
    const v = valueKey === 'donate' ? p.donate ?? 0 : p.value;
    const x = pad.l + (i / n) * innerW;
    const y = pad.t + innerH - (v / max) * innerH;
    return { x, y, v, day: p.day };
  });
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const ticks = points.filter((_, i) => i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 6) === 0);

  return (
    <figure className="chartCard">
      <figcaption>{title}</figcaption>
      {points.length === 0 ? (
        <p className="muted">No data in this range.</p>
      ) : (
        <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={title}>
          <line x1={pad.l} y1={pad.t + innerH} x2={pad.l + innerW} y2={pad.t + innerH} className="chartAxis" />
          <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + innerH} className="chartAxis" />
          <path d={path} fill="none" stroke={color} strokeWidth="2.5" />
          {coords.map((c) => (
            <circle key={c.day} cx={c.x} cy={c.y} r="3.2" fill={color}>
              <title>{`${c.day}: ${c.v}`}</title>
            </circle>
          ))}
          {ticks.map((p) => {
            const i = points.indexOf(p);
            const x = pad.l + (i / n) * innerW;
            return (
              <text key={p.day} x={x} y={h - 8} textAnchor="middle" className="chartTick">
                {formatDay(p.day)}
              </text>
            );
          })}
          <text x={8} y={pad.t + 4} className="chartTick">
            {max}
          </text>
        </svg>
      )}
    </figure>
  );
}

export function StackedLaunchChart({ title, points }: { title: string; points: Point[] }) {
  const w = 640;
  const h = 220;
  const pad = { l: 36, r: 12, t: 16, b: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const totals = points.map((p) => (p.guest ?? 0) + (p.candidate ?? 0));
  const max = maxOf(totals);
  const barW = points.length ? (innerW / points.length) * 0.7 : 8;
  const n = Math.max(points.length, 1);

  return (
    <figure className="chartCard">
      <figcaption>
        {title}
        <span className="chartLegend">
          <span className="swatch navy" /> Guest
          <span className="swatch red" /> Candidate
        </span>
      </figcaption>
      {points.length === 0 ? (
        <p className="muted">No data in this range.</p>
      ) : (
        <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={title}>
          <line x1={pad.l} y1={pad.t + innerH} x2={pad.l + innerW} y2={pad.t + innerH} className="chartAxis" />
          {points.map((p, i) => {
            const x = pad.l + ((i + 0.5) / n) * innerW - barW / 2;
            const guestH = ((p.guest ?? 0) / max) * innerH;
            const candH = ((p.candidate ?? 0) / max) * innerH;
            const guestY = pad.t + innerH - guestH;
            const candY = guestY - candH;
            return (
              <g key={p.day}>
                <rect x={x} y={guestY} width={barW} height={guestH} fill="#0a1f63">
                  <title>{`${p.day} guest ${p.guest ?? 0}`}</title>
                </rect>
                <rect x={x} y={candY} width={barW} height={candH} fill="#c41e3a">
                  <title>{`${p.day} candidate ${p.candidate ?? 0}`}</title>
                </rect>
              </g>
            );
          })}
        </svg>
      )}
    </figure>
  );
}

export function BarChart({ title, bars, color = '#0a1f63' }: { title: string; bars: Bar[]; color?: string }) {
  const max = maxOf(bars.map((b) => b.value));
  return (
    <figure className="chartCard">
      <figcaption>{title}</figcaption>
      {bars.length === 0 ? (
        <p className="muted">No data in this range.</p>
      ) : (
        <ul className="hbar">
          {bars.map((b) => (
            <li key={b.label}>
              <span className="hbarLabel">{b.label}</span>
              <span className="hbarTrack">
                <span className="hbarFill" style={{ width: `${(b.value / max) * 100}%`, background: color }} />
              </span>
              <span className="hbarValue">{b.value}</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
