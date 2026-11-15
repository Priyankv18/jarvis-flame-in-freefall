// OWNER: Priyank (scoring and visuals). Restyled for the light mission-control theme;
// the range maths, grouping and label placement below are unchanged.
// Gap map: the range of conditions each investigation actually tested (a box from min to max)
// drawn against where crews will live (habitat zones, Moon Base highlighted).
// Empty space inside a zone = research gap. Unknown values are never guessed:
// one known axis -> dashed strip across the whole unknown axis; nothing known -> listed below.
// Tests with identical ranges are drawn once and labelled together, and labels are stacked
// so they never overlap. The pressure view defaults to the crew range (0 to 16 psi); boxes that
// go higher are marked with an arrow, and "Full range" shows everything.
import { useId, useMemo, useState } from 'react';
import { getRange, habitatZone } from '../lib/scoring.js';
import { Card, Chip, cn } from '../ui/index.js';

const W = 760;
const H = 440;
const M = { l: 58, r: 20, t: 20, b: 50 };
const PW = W - M.l - M.r;
const PH = H - M.t - M.b;
const MIN_BOX = 8; // px, so single-value tests are still visible
const CREW_MAX_PSI = 16; // just above ISS cabin pressure (14.7 psi)

// Colours are design tokens from index.css. Each pillar also has a letter so colour is never the only cue.
const PILLARS = {
  prevention: { color: 'var(--color-prevention)', letter: 'P' },
  detection: { color: 'var(--color-detection)', letter: 'D' },
  suppression: { color: 'var(--color-suppression)', letter: 'S' },
};
const OTHER_COLOR = 'var(--color-unknown)';
const INK = 'var(--color-ink)';
const MUTED = 'var(--color-muted)';
const GRID = 'var(--color-line)';
const MOON_IDS = ['moon-base', 'moon_base'];
const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, fill: MUTED };

const pillarOf = (inv) => {
  const raw = inv.pillars ?? inv.safety_pillar;
  const p = Array.isArray(raw) ? raw[0] : raw;
  return String(p ?? '').toLowerCase();
};
const pillarList = (inv) => {
  const raw = inv.pillars ?? inv.safety_pillar;
  return (Array.isArray(raw) ? raw.join(', ') : raw) || 'pillar not set';
};
const colorOf = (inv) => PILLARS[pillarOf(inv)]?.color ?? OTHER_COLOR;

const fmt = (r, unit) => {
  if (!r) return 'unknown';
  const lo = r.minUnknown ? '? ' : r.min;
  const hi = r.maxUnknown ? ' ?' : r.max;
  if (!r.minUnknown && !r.maxUnknown && r.min === r.max) return `${r.min}${unit}`;
  return `${lo} to ${hi}${unit}`;
};

const overlaps = (a, b) => a && b && a.min <= b.max && b.min <= a.max;

function niceMax(v) {
  const steps = [10, 16, 20, 25, 50, 100, 200, 250, 500, 1000];
  return steps.find((s) => s >= v) ?? Math.ceil(v / 1000) * 1000;
}

function ticksFor(max) {
  const step = max <= 16 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : max <= 100 ? 20 : max / 5;
  const out = [];
  for (let t = 0; t <= max + 1e-9; t += step) out.push(Math.round(t * 10) / 10);
  return out;
}

// Short label for a group of tests drawn as one shape.
function groupLabel(ids) {
  if (ids.length <= 3) return ids.join(', ');
  return `${ids.slice(0, 2).join(', ')} +${ids.length - 2} more`;
}

// Greedy label placement: try the preferred spot, then step down until it overlaps nothing.
function makePlacer() {
  const placed = [];
  const hit = (b) => placed.some((p) => b.x1 < p.x2 && b.x2 > p.x1 && b.y1 < p.y2 && b.y2 > p.y1);
  return {
    reserve(b) { placed.push(b); },
    place(text, x, y, { anchor = 'start', size = 11, step = 13, maxY = M.t + PH - 4 } = {}) {
      const w = text.length * size * 0.56 + 4;
      let lx = anchor === 'end' ? x - w : x;
      lx = Math.max(M.l + 2, Math.min(lx, M.l + PW - w - 2));
      let ly = y;
      for (let i = 0; i < 24; i += 1) {
        const b = { x1: lx, x2: lx + w, y1: ly - size, y2: ly + 3 };
        if (!hit(b) || ly + step > maxY) { placed.push(b); break; }
        ly += step;
      }
      return { x: lx, y: ly, anchor: 'start' };
    },
  };
}

// Pill-shaped toggle group with aria-pressed buttons.
function Toggle({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-pill border border-line bg-surface p-1">
      {options.map(([v, text]) => (
        <button
          key={String(v)}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            'h-8 cursor-pointer rounded-pill px-3.5 text-sm font-medium transition-colors',
            value === v ? 'bg-navy font-semibold text-white' : 'text-muted hover:text-ink',
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function Check({ checked, onChange, children }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 cursor-pointer accent-cobalt" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

export default function GapMap({ investigations, habitats, habitat }) {
  const uid = useId().replace(/:/g, '');
  const [yAxis, setYAxis] = useState('pressure');
  const [crewZoom, setCrewZoom] = useState(true);
  const [showPartial, setShowPartial] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null);
  const [hoverKey, setHoverKey] = useState(null);

  const rows = useMemo(
    () => investigations.map((inv) => ({ inv, x: getRange(inv, 'o2'), y: getRange(inv, yAxis) })),
    [investigations, yAxis],
  );
  const full = rows.filter((r) => r.x && r.y);
  const partial = rows.filter((r) => !!r.x !== !!r.y);
  const none = rows.filter((r) => !r.x && !r.y);

  const isPressure = yAxis === 'pressure';
  const yUnit = isPressure ? ' psi' : ' cm/s';
  const yLabel = isPressure ? 'Pressure (psi)' : 'Flow speed (cm/s)';
  const dataMax = Math.max(0, ...rows.filter((r) => r.y).map((r) => r.y.max));
  const yMax = isPressure && crewZoom
    ? CREW_MAX_PSI
    : niceMax(Math.max(isPressure ? CREW_MAX_PSI : 20, dataMax * 1.05));
  const hiddenAbove = isPressure && crewZoom && dataMax > CREW_MAX_PSI;

  const sx = (v) => M.l + (Math.min(100, Math.max(0, v)) / 100) * PW;
  const sy = (v) => M.t + PH - (Math.min(yMax, Math.max(0, v)) / yMax) * PH;
  const xTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const yTicks = ticksFor(yMax);

  // Habitat zones (pressure view only: the dataset has no habitat flow speeds).
  // Habitats with identical zones (Moon Base, rover, Mars base) are merged into one shape.
  const zones = useMemo(() => {
    if (yAxis !== 'pressure') return [];
    const byKey = new Map();
    for (const h of habitats ?? []) {
      const z = habitatZone(h);
      if (!z?.pressure) continue;
      const key = [z.o2.min, z.o2.max, z.pressure.min, z.pressure.max].join('|');
      if (!byKey.has(key)) byKey.set(key, { ...z, habitats: [] });
      byKey.get(key).habitats.push(h);
    }
    return [...byKey.values()].map((z) => ({
      ...z,
      isMoon: z.habitats.some((h) => MOON_IDS.includes(h.id)),
      isSelected: z.habitats.some((h) => h.id === habitat?.id),
      label: z.habitats.map((h) => h.name).join(' / '),
      isPoint: z.o2.min === z.o2.max && z.pressure.min === z.pressure.max,
    }));
  }, [habitats, habitat, yAxis]);

  const moonZone = zones.find((z) => z.isMoon);
  const inMoon = moonZone ? full.filter((r) => overlaps(r.x, moonZone.o2) && overlaps(r.y, moonZone.pressure)) : [];

  function boxRect(x, y) {
    let x1 = x ? sx(x.min) : sx(0);
    let x2 = x ? sx(x.max) : sx(100);
    let y1 = y ? sy(y.max) : sy(yMax);
    let y2 = y ? sy(y.min) : sy(0);
    if (x2 - x1 < MIN_BOX) { const c = (x1 + x2) / 2; x1 = c - MIN_BOX / 2; x2 = c + MIN_BOX / 2; }
    if (y2 - y1 < MIN_BOX) { const c = (y1 + y2) / 2; y1 = c - MIN_BOX / 2; y2 = c + MIN_BOX / 2; }
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }

  // Group tests that draw as exactly the same shape (for example three tests at 21% O2
  // with pressure unknown), so they are drawn and labelled once instead of stacked.
  const groups = useMemo(() => {
    const list = [...(showPartial ? partial : []), ...full];
    const byKey = new Map();
    for (const row of list) {
      const isFull = !!(row.x && row.y);
      const r = boxRect(row.x, row.y);
      const key = [isFull ? 'f' : 'p', ...[r.x, r.y, r.width, r.height].map((v) => Math.round(v))].join('|');
      if (!byKey.has(key)) byKey.set(key, { key, rect: r, isFull, x: row.x, y: row.y, rows: [] });
      byKey.get(key).rows.push(row);
    }
    // half-known strips first so full boxes draw on top
    return [...byKey.values()].sort((a, b) => Number(a.isFull) - Number(b.isFull));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, showPartial, yMax]);

  // Label positions, computed once per render so they can avoid each other.
  const placer = makePlacer();
  const zoneLabels = zones.map((z) => {
    if (z.isPoint) {
      const cx = sx(z.o2.min);
      const cy = sy(z.pressure.min);
      const right = cx > M.l + PW - 160;
      const w = z.label.length * 12 * 0.58;
      const x = right ? cx - 12 - w : cx + 12;
      placer.reserve({ x1: cx - 9, x2: cx + 9, y1: cy - 9, y2: cy + 9 });
      placer.reserve({ x1: x, x2: x + w, y1: cy - 8, y2: cy + 6 });
      return { z, cx, cy, x, y: cy + 4 };
    }
    const r = boxRect(z.o2, z.pressure);
    placer.reserve({ x1: r.x + 6, x2: r.x + 260, y1: r.y + 4, y2: r.y + 38 });
    return { z, r };
  });

  const labelled = showLabels
    ? [...groups].sort((a, b) => Number(b.isFull) - Number(a.isFull)).map((g) => {
        const ids = g.rows.map((r) => r.inv.id);
        const over = g.isFull && isPressure && g.y.max > yMax;
        let text = groupLabel(ids);
        let pos;
        if (g.isFull) {
          if (over) text += ` (up to ${g.y.max} psi)`;
          const inside = g.rect.width >= 60 && g.rect.height >= 22;
          pos = inside
            ? placer.place(text, g.rect.x + 5, g.rect.y + 14)
            : placer.place(text, g.rect.x, Math.max(M.t + 12, g.rect.y - 4));
        } else if (g.x) {
          text += ` (${isPressure ? 'pressure' : 'flow'} ?)`;
          const right = g.rect.x > M.l + PW - 120;
          pos = placer.place(text, right ? g.rect.x + g.rect.width : g.rect.x + g.rect.width + 3, M.t + 13, { anchor: right ? 'end' : 'start' });
        } else {
          text += isPressure && g.y.max > yMax ? ` (O2 ?, up to ${g.y.max} psi)` : ' (O2 ?)';
          pos = placer.place(text, M.l + 4, Math.min(g.rect.y + g.rect.height - 4, Math.max(M.t + 12, g.rect.y + 13)));
        }
        return { key: g.key, text, ...pos };
      })
    : [];

  const selected = groups.find((g) => g.key === selectedKey);
  const hovered = groups.find((g) => g.key === (hoverKey ?? selectedKey));
  const select = (key) => setSelectedKey((cur) => (cur === key ? null : key));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="eyebrow">Tested conditions vs crew environments</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">Gap map</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Each box spans the oxygen and {isPressure ? 'pressure' : 'flow'} range an investigation actually tested.
              Shaded bands are where crews will live; empty space inside a band is a research gap. There is no
              partial-gravity data in PSI yet, so every box here is microgravity.
            </p>
          </div>
          {isPressure && moonZone && (
            <div className="rounded-2xl bg-navy px-5 py-4 text-white">
              <p className="eyebrow text-white/80">Reach the Moon Base zone</p>
              {full.length === 0 ? (
                <p className="mt-1 max-w-xs text-sm">No investigation has both oxygen and pressure recorded yet.</p>
              ) : (
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="display text-5xl text-lime">{inMoon.length}</span>
                  <span className="text-sm text-white/85">
                    of {full.length} with known O2 and pressure
                  </span>
                </p>
              )}
              <p className="num mt-1 text-xs text-white/80">30% O2 or more at 10.2 psi or less</p>
            </div>
          )}
        </div>

        {isPressure && moonZone && full.length > 0 && (
          <p className="mt-4 text-sm">
            {inMoon.length > 0 ? <>Inside the zone: <span className="num font-semibold">{inMoon.map((r) => r.inv.id).join(', ')}</span>. </> : 'Nothing reaches the zone yet. '}
            <span className="text-muted">{investigations.length - full.length} of {investigations.length} have no full record yet.</span>
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Toggle label="Vertical axis" value={yAxis} onChange={setYAxis} options={[['pressure', 'Pressure'], ['flow', 'Flow speed']]} />
          {isPressure && (
            <Toggle label="Pressure range" value={crewZoom} onChange={setCrewZoom} options={[[true, 'Crew range (0 to 16 psi)'], [false, 'Full range']]} />
          )}
          <span className="flex flex-wrap gap-4 sm:ml-auto">
            <Check checked={showPartial} onChange={setShowPartial}>Show half-known tests</Check>
            <Check checked={showLabels} onChange={setShowLabels}>Labels</Check>
          </span>
        </div>

        <p className="mt-4 text-xs text-muted sm:hidden">Swipe sideways to see the whole chart.</p>
        <div className="scroll-thin mt-3 overflow-x-auto">
          <div className="relative mx-auto max-w-[980px] min-w-[640px]">
            <svg className="h-auto w-full" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${uid}-desc`}>
              <desc id={`${uid}-desc`}>
                Gap map of tested oxygen and {yAxis} ranges against crew habitat zones. {full.length} investigations have both
                values, {partial.length} have one, {none.length} have neither.
              </desc>
              <defs>
                <pattern id={`${uid}-moon`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="8" height="8" style={{ fill: 'var(--color-lime)' }} fillOpacity="0.45" />
                  <line x1="0" y1="0" x2="0" y2="8" style={{ stroke: INK }} strokeOpacity="0.25" strokeWidth="2" />
                </pattern>
                <clipPath id={`${uid}-clip`}><rect x={M.l} y={M.t} width={PW} height={PH} /></clipPath>
              </defs>

              {/* grid + axes */}
              <rect x={M.l} y={M.t} width={PW} height={PH} rx="8" style={{ fill: 'var(--color-surface)', stroke: GRID }} />
              {xTicks.map((t) => (
                <g key={`x${t}`}>
                  <line x1={sx(t)} x2={sx(t)} y1={M.t} y2={M.t + PH} style={{ stroke: GRID }} />
                  <text x={sx(t)} y={M.t + PH + 18} textAnchor="middle" style={mono}>{t}</text>
                </g>
              ))}
              {yTicks.map((t) => (
                <g key={`y${t}`}>
                  <line x1={M.l} x2={M.l + PW} y1={sy(t)} y2={sy(t)} style={{ stroke: GRID }} />
                  <text x={M.l - 8} y={sy(t) + 4} textAnchor="end" style={mono}>{t}</text>
                </g>
              ))}
              <text x={M.l + PW / 2} y={H - 8} textAnchor="middle" style={{ ...mono, fill: INK, fontWeight: 600 }}>Oxygen (% by volume)</text>
              <text transform={`translate(16 ${M.t + PH / 2}) rotate(-90)`} textAnchor="middle" style={{ ...mono, fill: INK, fontWeight: 600 }}>{yLabel}</text>

              <g clipPath={`url(#${uid}-clip)`}>
                {/* habitat zones as labelled translucent bands */}
                {zones.filter((z) => !z.isPoint).map((z) => (
                  <rect
                    key={z.label}
                    {...boxRect(z.o2, z.pressure)}
                    fill={z.isMoon ? `url(#${uid}-moon)` : undefined}
                    fillOpacity={z.isMoon ? 1 : 0.08}
                    strokeDasharray="6 4"
                    strokeWidth={z.isSelected ? 2.5 : 1.5}
                    style={{ stroke: INK, ...(z.isMoon ? {} : { fill: 'var(--color-cobalt)' }) }}
                  />
                ))}

                {/* investigation boxes (one shape per group of identical ranges) */}
                {groups.map((g) => {
                  const c = colorOf(g.rows[0].inv);
                  const on = g.key === selectedKey || g.key === hoverKey;
                  const over = isPressure && g.y && g.y.max > yMax;
                  const ids = g.rows.map((r) => r.inv.id).join(', ');
                  return (
                    <g
                      key={g.key}
                      className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[3.5]"
                      tabIndex={0}
                      role="button"
                      aria-pressed={g.key === selectedKey}
                      aria-label={`${ids}: oxygen ${fmt(g.x, '%')}, ${yAxis} ${fmt(g.y, yUnit)}`}
                      onClick={() => select(g.key)}
                      onMouseEnter={() => setHoverKey(g.key)}
                      onMouseLeave={() => setHoverKey(null)}
                      onFocus={() => setHoverKey(g.key)}
                      onBlur={() => setHoverKey(null)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(g.key); } }}
                    >
                      <rect
                        {...g.rect}
                        rx={3}
                        fillOpacity={g.isFull ? (on ? 0.3 : 0.1) : (on ? 0.12 : 0.03)}
                        strokeWidth={on ? 2.5 : 1.5}
                        strokeDasharray={g.isFull ? undefined : '5 4'}
                        style={{ fill: c, stroke: c }}
                      />
                      {over && (
                        <path
                          d={`M${g.rect.x + g.rect.width / 2 - 6} ${M.t + 10} L${g.rect.x + g.rect.width / 2} ${M.t + 2} L${g.rect.x + g.rect.width / 2 + 6} ${M.t + 10} Z`}
                          style={{ fill: c }}
                        />
                      )}
                    </g>
                  );
                })}
              </g>

              {/* labels drawn last so they stay readable */}
              {labelled.map((l) => (
                <text key={`l-${l.key}`} x={l.x} y={l.y} pointerEvents="none" paintOrder="stroke" strokeWidth="2.5" strokeLinejoin="round" style={{ fontSize: 11, fill: INK, stroke: 'var(--color-surface)', fontWeight: 600 }}>
                  {l.text}
                </text>
              ))}
              {zoneLabels.map(({ z, r, cx, cy, x, y }) => (z.isPoint ? (
                <g key={z.label} pointerEvents="none">
                  <path
                    d={`M${cx} ${cy - 8} L${cx + 8} ${cy} L${cx} ${cy + 8} L${cx - 8} ${cy} Z`}
                    strokeWidth={z.isSelected ? 2.5 : 1.5}
                    style={{ fill: z.isSelected ? 'var(--color-lime)' : 'var(--color-card)', stroke: INK }}
                  />
                  <text x={x} y={y} paintOrder="stroke" strokeWidth="2.5" strokeLinejoin="round" style={{ fontSize: 12, fontWeight: 600, fill: INK, stroke: 'var(--color-surface)' }}>{z.label}</text>
                </g>
              ) : (
                <g key={`${z.label}-label`} pointerEvents="none">
                  <text x={r.x + 8} y={r.y + 18} style={{ fontSize: 12, fontWeight: 700, fill: INK }}>{z.label}</text>
                  <text x={r.x + 8} y={r.y + 34} style={{ fontSize: 11, fill: INK }}>
                    {z.openO2 ? `≥${z.o2.min}% O2` : `${z.o2.min} to ${z.o2.max}% O2`}
                    {', '}
                    {z.openPressureBelow ? `≤${z.pressure.max} psi` : `${z.pressure.min} to ${z.pressure.max} psi`}
                  </text>
                </g>
              )))}
            </svg>

            {/* Hover / focus tooltip, positioned over the box in viewBox percentages. */}
            {hovered && (
              <div
                role="tooltip"
                className="pointer-events-none absolute z-10 w-64 -translate-x-1/2 -translate-y-full rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lift"
                style={{
                  left: `${Math.min(85, Math.max(15, ((hovered.rect.x + hovered.rect.width / 2) / W) * 100))}%`,
                  top: `calc(${(Math.max(hovered.rect.y, M.t + 40) / H) * 100}% - 6px)`,
                }}
              >
                {hovered.rows.slice(0, 4).map(({ inv, x, y }) => (
                  <div key={inv.id} className="py-0.5">
                    <p className="font-semibold"><span className="num">{inv.id}</span> {inv.name}</p>
                    <p className="num text-white/80">O2 {fmt(x, '%')} · {isPressure ? 'P' : 'Flow'} {fmt(y, yUnit)}</p>
                  </div>
                ))}
                {hovered.rows.length > 4 && <p className="text-white/80">+{hovered.rows.length - 4} more</p>}
              </div>
            )}
          </div>
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {Object.entries(PILLARS).map(([k, p]) => (
            <li key={k} className="flex items-center gap-2">
              <span aria-hidden="true" className="num flex size-4 items-center justify-center rounded text-[9px] font-bold text-white" style={{ background: p.color }}>{p.letter}</span>
              {k}
            </li>
          ))}
          <li className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-5 rounded border-[1.5px] border-dashed border-ink" />one axis unknown (spans the whole axis)</li>
          {isPressure && <li className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-5 rounded border-[1.5px] border-dashed border-ink bg-lime/60" />Moon / rover / Mars zone</li>}
          {isPressure && <li className="flex items-center gap-2"><span aria-hidden="true" className="size-2.5 rotate-45 border-[1.5px] border-ink bg-card" />crew environment (single value)</li>}
          {hiddenAbove && <li>▲ continues above 16 psi</li>}
        </ul>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card aria-live="polite">
          <p className="eyebrow">Selected</p>
          {selected ? (
            <ul className="mt-2 grid gap-3">
              {selected.rows.map(({ inv, x, y }) => (
                <li key={inv.id} className="rounded-2xl bg-surface p-3">
                  <p className="font-semibold"><span className="num mr-2 text-cobalt">{inv.id}</span>{inv.name}</p>
                  <p className="num mt-1 text-xs text-muted">
                    O2 {fmt(x, '%')} · {isPressure ? 'Pressure' : 'Flow'} {fmt(y, yUnit)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip size="sm">{inv.fuel_state ?? 'fuel unknown'}</Chip>
                    <Chip size="sm">{pillarList(inv)}</Chip>
                    {inv.hardware && <Chip size="sm" tone="outline">{inv.hardware}</Chip>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">Hover, focus or tap a box to see what was tested. Click or press Enter to pin it here.</p>
          )}
        </Card>
        <Card>
          <p className="eyebrow">Not plotted: oxygen and {yAxis} both unknown</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {none.length ? none.map((r) => <Chip key={r.inv.id} tone="unknown" size="sm" className="num">{r.inv.id}</Chip>) : <span className="text-sm text-muted">none</span>}
          </div>
          {!showPartial && partial.length > 0 && (
            <>
              <p className="eyebrow mt-4">Hidden half-known tests</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {partial.map((r) => <Chip key={r.inv.id} size="sm" tone="outline" className="num">{r.inv.id}</Chip>)}
              </div>
            </>
          )}
          {!isPressure && (
            <p className="mt-4 text-xs text-muted">
              Habitat zones are not shown on the flow view: the dataset has no cabin flow speeds for the crew environments.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
