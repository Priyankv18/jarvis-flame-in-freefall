// OWNER: Priyank (scoring and visuals).
// Gap map: the range of conditions each investigation actually tested (a box from min to max)
// drawn against where crews will live (habitat zones, Moon Base highlighted).
// Empty space inside a zone = research gap. Unknown values are never guessed:
// one known axis -> dashed strip across the whole unknown axis; nothing known -> listed below.
// Tests with identical ranges are drawn once and labelled together, and labels are stacked
// so they never overlap. The pressure view defaults to the crew range (0 to 16 psi); boxes that
// go higher are marked with an arrow, and "Full range" shows everything.
import { useMemo, useState } from 'react';
import { getRange, habitatZone } from '../lib/scoring.js';
import './viz.css';

const W = 760;
const H = 440;
const M = { l: 58, r: 20, t: 20, b: 50 };
const PW = W - M.l - M.r;
const PH = H - M.t - M.b;
const MIN_BOX = 8; // px, so single-value tests are still visible
const CREW_MAX_PSI = 16; // just above ISS cabin pressure (14.7 psi)

const PILLAR_COLORS = {
  prevention: '#ea580c',
  detection: '#ca8a04',
  suppression: '#0284c7',
};
const OTHER_COLOR = '#64748b';
const ZONE_COLOR = '#7c3aed';
const ZONE_TEXT = '#5b21b6';
const OTHER_ZONE = '#0369a1';
const TEXT = '#0f172a';
const MUTED = '#475569';
const GRID = '#e2e8f0';
const MOON_IDS = ['moon-base', 'moon_base'];

const pillarOf = (inv) => {
  const raw = inv.pillars ?? inv.safety_pillar;
  const p = Array.isArray(raw) ? raw[0] : raw;
  return String(p ?? '').toLowerCase();
};
const pillarList = (inv) => {
  const raw = inv.pillars ?? inv.safety_pillar;
  return (Array.isArray(raw) ? raw.join(', ') : raw) || 'pillar not set';
};
const colorOf = (inv) => PILLAR_COLORS[pillarOf(inv)] ?? OTHER_COLOR;

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

export default function GapMap({ investigations, habitats, habitat }) {
  const [yAxis, setYAxis] = useState('pressure');
  const [crewZoom, setCrewZoom] = useState(true);
  const [showPartial, setShowPartial] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null);

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
  const select = (key) => setSelectedKey((cur) => (cur === key ? null : key));

  return (
    <section className="viz">
      <h2>Gap map: tested conditions vs crew environments</h2>
      <p className="viz-intro">
        Each box spans the oxygen and {isPressure ? 'pressure' : 'flow'} range an investigation
        actually tested. Shaded zones are where crews will live. Empty space inside a zone is a
        research gap. There is no partial-gravity data in PSI yet, so every box here is microgravity.
      </p>

      {isPressure && moonZone && (
        <p className="gap-headline">
          {full.length === 0
            ? 'No investigation in the dataset has both oxygen and pressure recorded yet, so the Moon Base zone is empty by default.'
            : <>
                <strong>{inMoon.length} of {full.length}</strong> investigations with known oxygen and
                pressure reach the Moon Base zone (30% O2 or more at 10.2 psi or less)
                {inMoon.length > 0 && <>: {inMoon.map((r) => r.inv.id).join(', ')}</>}.
                {' '}{investigations.length - full.length} of {investigations.length} have no full record yet.
              </>}
        </p>
      )}

      <div className="gap-controls">
        <span>Vertical axis</span>
        <div className="segmented" role="group" aria-label="Vertical axis">
          <button type="button" className={isPressure ? 'on' : ''} aria-pressed={isPressure} onClick={() => setYAxis('pressure')}>Pressure</button>
          <button type="button" className={!isPressure ? 'on' : ''} aria-pressed={!isPressure} onClick={() => setYAxis('flow')}>Flow speed</button>
        </div>
        {isPressure && (
          <div className="segmented" role="group" aria-label="Pressure range">
            <button type="button" className={crewZoom ? 'on' : ''} aria-pressed={crewZoom} onClick={() => setCrewZoom(true)}>Crew range (0 to 16 psi)</button>
            <button type="button" className={!crewZoom ? 'on' : ''} aria-pressed={!crewZoom} onClick={() => setCrewZoom(false)}>Full range</button>
          </div>
        )}
        <label><input type="checkbox" checked={showPartial} onChange={(e) => setShowPartial(e.target.checked)} /> Show half-known tests</label>
        <label><input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} /> Labels</label>
      </div>

      <p className="gap-swipe muted">Swipe sideways to see the whole chart.</p>
      <div className="gap-scroll">
      <svg className="gap-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gap map of tested oxygen and pressure ranges against crew habitat zones">
        <defs>
          <pattern id="moon-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill={ZONE_COLOR} fillOpacity="0.06" />
            <line x1="0" y1="0" x2="0" y2="8" stroke={ZONE_COLOR} strokeOpacity="0.22" strokeWidth="2" />
          </pattern>
          <clipPath id="plot-clip"><rect x={M.l} y={M.t} width={PW} height={PH} /></clipPath>
        </defs>

        {/* grid + axes */}
        <rect x={M.l} y={M.t} width={PW} height={PH} fill="#fff" stroke="#cbd5e1" />
        {xTicks.map((t) => (
          <g key={`x${t}`}>
            <line x1={sx(t)} x2={sx(t)} y1={M.t} y2={M.t + PH} stroke={GRID} />
            <text x={sx(t)} y={M.t + PH + 18} textAnchor="middle">{t}</text>
          </g>
        ))}
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={M.l} x2={M.l + PW} y1={sy(t)} y2={sy(t)} stroke={GRID} />
            <text x={M.l - 8} y={sy(t) + 4} textAnchor="end">{t}</text>
          </g>
        ))}
        <text className="axis-title" x={M.l + PW / 2} y={H - 8} textAnchor="middle">Oxygen (% by volume)</text>
        <text className="axis-title" transform={`translate(16 ${M.t + PH / 2}) rotate(-90)`} textAnchor="middle">{yLabel}</text>

        <g clipPath="url(#plot-clip)">
          {/* habitat zones */}
          {zones.filter((z) => !z.isPoint).map((z) => (
            <rect
              key={z.label}
              {...boxRect(z.o2, z.pressure)}
              fill={z.isMoon ? 'url(#moon-hatch)' : 'rgba(2,132,199,0.06)'}
              stroke={z.isMoon ? ZONE_COLOR : OTHER_ZONE}
              strokeWidth={z.isSelected ? 2.5 : 1.5}
            />
          ))}

          {/* investigation boxes (one shape per group of identical ranges) */}
          {groups.map((g) => {
            const c = colorOf(g.rows[0].inv);
            const on = g.key === selectedKey;
            const over = isPressure && g.y && g.y.max > yMax;
            const ids = g.rows.map((r) => r.inv.id).join(', ');
            return (
              <g
                key={g.key}
                className="box"
                tabIndex={0}
                onClick={() => select(g.key)}
                onMouseEnter={() => setSelectedKey(g.key)}
                onFocus={() => setSelectedKey(g.key)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') select(g.key); }}
              >
                <title>{`${ids}: O2 ${fmt(g.x, '%')}, ${yAxis} ${fmt(g.y, yUnit)}`}</title>
                <rect
                  {...g.rect}
                  rx={2}
                  fill={c}
                  fillOpacity={g.isFull ? (on ? 0.35 : 0.18) : (on ? 0.14 : 0.04)}
                  stroke={c}
                  strokeWidth={on ? 2.5 : 1.5}
                  strokeDasharray={g.isFull ? undefined : '5 4'}
                />
                {over && (
                  <path
                    d={`M${g.rect.x + g.rect.width / 2 - 6} ${M.t + 10} L${g.rect.x + g.rect.width / 2} ${M.t + 2} L${g.rect.x + g.rect.width / 2 + 6} ${M.t + 10} Z`}
                    fill={c}
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* labels drawn last so they stay readable */}
        {labelled.map((l) => (
          <text key={`l-${l.key}`} className="box-label" x={l.x} y={l.y}>{l.text}</text>
        ))}
        {zoneLabels.map(({ z, r, cx, cy, x, y }) => (z.isPoint ? (
          <g key={z.label}>
            <path
              d={`M${cx} ${cy - 8} L${cx + 8} ${cy} L${cx} ${cy + 8} L${cx - 8} ${cy} Z`}
              fill="#fff"
              stroke={z.isSelected ? ZONE_COLOR : TEXT}
              strokeWidth={z.isSelected ? 2.5 : 1.5}
            />
            <text className="zone-label" x={x} y={y} style={{ fill: TEXT }}>{z.label}</text>
          </g>
        ) : (
          <g key={`${z.label}-label`}>
            <text className="zone-label" x={r.x + 8} y={r.y + 18} style={{ fill: z.isMoon ? ZONE_TEXT : OTHER_ZONE }}>
              {z.label}
            </text>
            <text x={r.x + 8} y={r.y + 34} style={{ fill: z.isMoon ? ZONE_TEXT : OTHER_ZONE, fontSize: 11 }}>
              {z.openO2 ? `≥${z.o2.min}% O2` : `${z.o2.min} to ${z.o2.max}% O2`}
              {', '}
              {z.openPressureBelow ? `≤${z.pressure.max} psi` : `${z.pressure.min} to ${z.pressure.max} psi`}
            </text>
          </g>
        )))}
      </svg>
      </div>

      <div className="gap-legend">
        {Object.entries(PILLAR_COLORS).map(([k, c]) => (
          <span key={k}><i className="swatch" style={{ background: c }} />{k}</span>
        ))}
        <span><i className="swatch dashed" />one axis unknown (spans whole axis)</span>
        {isPressure && <span><i className="swatch zone" />Moon / rover / Mars zone</span>}
        {isPressure && <span><i className="swatch diamond" />crew environment (single value)</span>}
        {hiddenAbove && <span>▲ continues above 16 psi</span>}
      </div>

      <div className="gap-detail" aria-live="polite">
        {selected ? (
          selected.rows.map(({ inv, x, y }) => (
            <div key={inv.id} className="gap-detail-row">
              <strong>{inv.id}</strong>{inv.name ? `: ${inv.name}` : ''}
              <div className="muted">
                O2 {fmt(x, '%')} · {isPressure ? 'Pressure' : 'Flow'} {fmt(y, yUnit)}
                {' · '}{inv.fuel_state ?? 'fuel unknown'}{' · '}{pillarList(inv)}
                {inv.hardware ? ` · ${inv.hardware}` : ''}
              </div>
            </div>
          ))
        ) : (
          <span className="muted">Hover or tap a box to see what was tested.</span>
        )}
      </div>

      {!isPressure && (
        <p className="muted gap-unknown">
          Habitat zones are not shown on the flow view: the dataset has no cabin flow speeds for the crew environments.
        </p>
      )}
      <p className="muted gap-unknown">
        Not plotted (oxygen and {yAxis} both unknown): {none.map((r) => r.inv.id).join(', ') || 'none'}
        {!showPartial && partial.length > 0 && <><br />Hidden half-known tests: {partial.map((r) => r.inv.id).join(', ')}</>}
      </p>
    </section>
  );
}
