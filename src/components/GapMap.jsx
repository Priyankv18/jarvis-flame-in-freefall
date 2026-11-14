// OWNER: Priyank (scoring and visuals).
// Gap map: the range of conditions each investigation actually tested (a box from min to max)
// drawn against where crews will live (habitat zones, Moon Base highlighted).
// Empty space inside a zone = research gap. Unknown values are never guessed:
// one known axis -> dashed strip across the whole unknown axis; nothing known -> listed below.
import { useMemo, useState } from 'react';
import { getRange, habitatZone } from '../lib/scoring.js';
import './viz.css';

const W = 760;
const H = 440;
const M = { l: 58, r: 20, t: 20, b: 50 };
const PW = W - M.l - M.r;
const PH = H - M.t - M.b;
const MIN_BOX = 8; // px, so single-value tests are still visible

const PILLAR_COLORS = {
  prevention: '#ff7a1a',
  detection: '#f2c14e',
  suppression: '#5cc8ff',
};
const OTHER_COLOR = '#9aa3b8';
const ZONE_COLOR = '#c39bff';
const POINT_COLOR = '#eef1f7'; // single-value crew environments (ISS, spacesuit)
const MOON_IDS = ['moon-base'];

const pillarOf = (inv) => {
  const p = Array.isArray(inv.safety_pillar) ? inv.safety_pillar[0] : inv.safety_pillar;
  return String(p ?? '').toLowerCase();
};
const colorOf = (inv) => PILLAR_COLORS[pillarOf(inv)] ?? OTHER_COLOR;

const fmt = (r, unit) => {
  if (!r) return 'unknown';
  const lo = r.minUnknown ? '? ' : r.min;
  const hi = r.maxUnknown ? ' ?' : r.max;
  if (!r.minUnknown && !r.maxUnknown && r.min === r.max) return `${r.min}${unit}`;
  return `${lo}–${hi}${unit}`;
};

const overlaps = (a, b) => a && b && a.min <= b.max && b.min <= a.max;

function niceMax(v) {
  const steps = [10, 20, 25, 50, 100, 200, 250, 500, 1000];
  return steps.find((s) => s >= v) ?? Math.ceil(v / 1000) * 1000;
}

export default function GapMap({ investigations, habitats, habitat }) {
  const [yAxis, setYAxis] = useState('pressure');
  const [showPartial, setShowPartial] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const rows = useMemo(
    () => investigations.map((inv) => ({ inv, x: getRange(inv, 'o2'), y: getRange(inv, yAxis) })),
    [investigations, yAxis],
  );
  const full = rows.filter((r) => r.x && r.y);
  const partial = rows.filter((r) => !!r.x !== !!r.y);
  const none = rows.filter((r) => !r.x && !r.y);

  const yUnit = yAxis === 'pressure' ? ' psi' : ' cm/s';
  const yLabel = yAxis === 'pressure' ? 'Pressure (psi)' : 'Flow speed (cm/s)';
  const yMax = yAxis === 'pressure'
    ? 16
    : niceMax(Math.max(20, ...rows.filter((r) => r.y).map((r) => r.y.max)) * 1.1);

  const sx = (v) => M.l + (Math.min(100, Math.max(0, v)) / 100) * PW;
  const sy = (v) => M.t + PH - (Math.min(yMax, Math.max(0, v)) / yMax) * PH;
  const xTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((yMax / 4) * i * 10) / 10);
  if (yAxis === 'pressure') yTicks.splice(0, yTicks.length, 0, 2, 4, 6, 8, 10, 12, 14, 16);

  // Habitat zones (pressure view only: the dataset has no habitat flow speeds).
  // Habitats with identical zones (Moon Base and rover) are merged into one shape.
  const zones = useMemo(() => {
    if (yAxis !== 'pressure') return [];
    const byKey = new Map();
    for (const h of habitats) {
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

  const selected = rows.find((r) => r.inv.id === selectedId);
  const select = (id) => setSelectedId((cur) => (cur === id ? null : id));

  const drawn = [...(showPartial ? partial : []), ...full]; // full boxes on top

  return (
    <section>
      <h2>Gap map: tested conditions vs crew environments</h2>
      <p className="viz-intro">
        Each box spans the oxygen and {yAxis === 'pressure' ? 'pressure' : 'flow'} range an investigation
        actually tested. Shaded zones are where crews will live. Empty space inside a zone is a
        research gap. There is no partial-gravity data in PSI yet, so every box here is microgravity.
      </p>

      {yAxis === 'pressure' && moonZone && (
        <p className="gap-headline">
          {full.length === 0
            ? 'No investigation in the dataset has both oxygen and pressure recorded yet, so the Moon Base zone is empty by default.'
            : <>
                <strong>{inMoon.length} of {full.length}</strong> investigations with known oxygen and
                pressure reach the Moon Base zone (30% O2 or more at 10.2 psi or less)
                {inMoon.length > 0 && <>: {inMoon.map((r) => r.inv.id).join(', ')}</>}.
              </>}
        </p>
      )}

      <div className="gap-controls">
        <span>Vertical axis</span>
        <div className="segmented" role="group" aria-label="Vertical axis">
          <button type="button" className={yAxis === 'pressure' ? 'on' : ''} onClick={() => setYAxis('pressure')}>Pressure</button>
          <button type="button" className={yAxis === 'flow' ? 'on' : ''} onClick={() => setYAxis('flow')}>Flow speed</button>
        </div>
        <label><input type="checkbox" checked={showPartial} onChange={(e) => setShowPartial(e.target.checked)} /> Show half-known tests</label>
        <label><input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} /> Labels</label>
      </div>

      <svg className="gap-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gap map of tested oxygen and pressure ranges against crew habitat zones">
        <defs>
          <pattern id="moon-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill={ZONE_COLOR} fillOpacity="0.12" />
            <line x1="0" y1="0" x2="0" y2="8" stroke={ZONE_COLOR} strokeOpacity="0.35" strokeWidth="2" />
          </pattern>
          <clipPath id="plot-clip"><rect x={M.l} y={M.t} width={PW} height={PH} /></clipPath>
        </defs>

        {/* grid + axes */}
        {xTicks.map((t) => (
          <g key={`x${t}`}>
            <line x1={sx(t)} x2={sx(t)} y1={M.t} y2={M.t + PH} stroke="#2a3042" />
            <text x={sx(t)} y={M.t + PH + 18} textAnchor="middle">{t}</text>
          </g>
        ))}
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={M.l} x2={M.l + PW} y1={sy(t)} y2={sy(t)} stroke="#2a3042" />
            <text x={M.l - 8} y={sy(t) + 4} textAnchor="end">{t}</text>
          </g>
        ))}
        <text className="axis-title" x={M.l + PW / 2} y={H - 8} textAnchor="middle">Oxygen (% by volume)</text>
        <text className="axis-title" transform={`translate(16 ${M.t + PH / 2}) rotate(-90)`} textAnchor="middle">{yLabel}</text>

        <g clipPath="url(#plot-clip)">
          {/* habitat zones */}
          {zones.filter((z) => !z.isPoint).map((z) => {
            const r = boxRect(z.o2, z.pressure);
            return (
              <g key={z.label}>
                <rect
                  {...r}
                  fill={z.isMoon ? 'url(#moon-hatch)' : 'rgba(92,200,255,0.08)'}
                  stroke={z.isMoon ? ZONE_COLOR : '#5cc8ff'}
                  strokeWidth={z.isSelected ? 2.5 : 1.5}
                />
              </g>
            );
          })}

          {/* investigation boxes */}
          {drawn.map(({ inv, x, y }) => {
            const isFull = x && y;
            const r = boxRect(x, y);
            const c = colorOf(inv);
            const on = inv.id === selectedId;
            // big boxes get their label inside the top-left corner, small ones just above
            const inside = isFull && r.width >= 56 && r.height >= 22;
            const labelY = !isFull ? M.t + 14 : inside ? r.y + 15 : Math.max(M.t + 12, r.y - 4);
            return (
              <g
                key={inv.id}
                className="box"
                tabIndex={0}
                onClick={() => select(inv.id)}
                onMouseEnter={() => setSelectedId(inv.id)}
                onFocus={() => setSelectedId(inv.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') select(inv.id); }}
              >
                <title>{`${inv.id}: O2 ${fmt(x, '%')}, ${yAxis} ${fmt(y, yUnit)}`}</title>
                <rect
                  {...r}
                  rx={2}
                  fill={c}
                  fillOpacity={isFull ? (on ? 0.45 : 0.25) : (on ? 0.2 : 0.07)}
                  stroke={c}
                  strokeWidth={on ? 2.5 : 1.5}
                  strokeDasharray={isFull ? undefined : '5 4'}
                />
                {showLabels && (
                  <text
                    className="box-label"
                    x={Math.min(r.x + (inside ? 6 : 3), M.l + PW - 4)}
                    y={labelY}
                    textAnchor={r.x + 3 > M.l + PW - 60 ? 'end' : 'start'}
                  >
                    {inv.id}{isFull ? '' : ' (?)'}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* zone labels and point habitats drawn last so they stay readable */}
        {zones.map((z) => {
          if (z.isPoint) {
            const cx = sx(z.o2.min);
            const cy = sy(z.pressure.min);
            const right = cx > M.l + PW - 140;
            return (
              <g key={z.label}>
                <path
                  d={`M${cx} ${cy - 8} L${cx + 8} ${cy} L${cx} ${cy + 8} L${cx - 8} ${cy} Z`}
                  fill={POINT_COLOR}
                  stroke={z.isSelected ? '#ff7a1a' : '#0b0d14'}
                  strokeWidth={z.isSelected ? 2 : 1}
                />
                <text className="zone-label" x={right ? cx - 12 : cx + 12} y={cy + 4} textAnchor={right ? 'end' : 'start'} style={{ fill: POINT_COLOR }}>
                  {z.label}
                </text>
              </g>
            );
          }
          const r = boxRect(z.o2, z.pressure);
          return (
            <g key={`${z.label}-label`}>
              <text className="zone-label" x={r.x + 8} y={r.y + 18} style={{ fill: z.isMoon ? ZONE_COLOR : '#5cc8ff' }}>
                {z.label}
              </text>
              <text x={r.x + 8} y={r.y + 34} style={{ fill: z.isMoon ? ZONE_COLOR : '#5cc8ff', fontSize: 11 }}>
                {z.openO2 ? `≥${z.o2.min}% O2` : `${z.o2.min}–${z.o2.max}% O2`}
                {', '}
                {z.openPressureBelow ? `≤${z.pressure.max} psi` : `${z.pressure.min}–${z.pressure.max} psi`}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="gap-legend">
        {Object.entries(PILLAR_COLORS).map(([k, c]) => (
          <span key={k}><i className="swatch" style={{ background: c }} />{k}</span>
        ))}
        <span><i className="swatch" style={{ background: OTHER_COLOR }} />pillar not set</span>
        <span><i className="swatch dashed" />one axis unknown (spans whole axis)</span>
        {yAxis === 'pressure' && <span><i className="swatch zone" />Moon Base / rover zone</span>}
        {yAxis === 'pressure' && <span><i className="swatch" style={{ background: POINT_COLOR, transform: 'rotate(45deg)' }} />crew environment (single value)</span>}
      </div>

      <div className="gap-detail" aria-live="polite">
        {selected ? (
          <>
            <h4>{selected.inv.id}{selected.inv.name ? `: ${selected.inv.name}` : ''}</h4>
            O2 {fmt(selected.x, '%')} · {yAxis === 'pressure' ? 'Pressure' : 'Flow'} {fmt(selected.y, yUnit)}
            {' · '}{selected.inv.fuel_state ?? 'fuel unknown'}{' · '}{pillarOf(selected.inv) || 'pillar not set'}
            {selected.inv.hardware ? ` · ${selected.inv.hardware}` : ''}
          </>
        ) : (
          <span className="unknown">Hover or tap a box to see what was tested.</span>
        )}
      </div>

      {yAxis === 'flow' && (
        <p className="unknown gap-unknown">
          Habitat zones are not shown on the flow view: the dataset has no cabin flow speeds for the crew environments.
        </p>
      )}
      <p className="unknown gap-unknown">
        Not plotted (oxygen and {yAxis} both unknown): {none.map((r) => r.inv.id).join(', ') || 'none'}
        {!showPartial && partial.length > 0 && <><br />Hidden half-known tests: {partial.map((r) => r.inv.id).join(', ')}</>}
      </p>
    </section>
  );
}
