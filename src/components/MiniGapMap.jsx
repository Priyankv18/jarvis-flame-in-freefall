// OWNER: Priyank (scoring and visuals). Restyled for the light theme; maths unchanged.
// Small, non-interactive preview of the gap map for the Explore page: the selected habitat's
// zone and every investigation with known oxygen AND pressure.
// Same axes as the full gap map's crew view: 0 to 100% O2, 0 to 16 psi.
import { useId } from 'react';
import { getRange, habitatZone } from '../lib/scoring.js';

const W = 300;
const H = 190;
const M = { l: 28, r: 8, t: 8, b: 22 };
const PW = W - M.l - M.r;
const PH = H - M.t - M.b;
const Y_MAX = 16;

const sx = (v) => M.l + (Math.min(100, Math.max(0, v)) / 100) * PW;
const sy = (v) => M.t + PH - (Math.min(Y_MAX, Math.max(0, v)) / Y_MAX) * PH;

function rect(x, y, min = 5) {
  let x1 = sx(x.min);
  let x2 = sx(x.max);
  let y1 = sy(y.max);
  let y2 = sy(y.min);
  if (x2 - x1 < min) { const c = (x1 + x2) / 2; x1 = c - min / 2; x2 = c + min / 2; }
  if (y2 - y1 < min) { const c = (y1 + y2) / 2; y1 = c - min / 2; y2 = c + min / 2; }
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

const tick = { fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--color-muted)' };

export default function MiniGapMap({ investigations, habitat }) {
  const id = useId().replace(/:/g, '');
  const zone = habitatZone(habitat);
  const boxes = investigations
    .map((inv) => ({ inv, x: getRange(inv, 'o2'), y: getRange(inv, 'pressure') }))
    .filter((b) => b.x && b.y);
  const isPoint = zone?.pressure && zone.o2.min === zone.o2.max && zone.pressure.min === zone.pressure.max;

  return (
    <svg className="h-auto w-full" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Preview: ${boxes.length} investigations with known oxygen and pressure, against the ${habitat?.name ?? 'selected'} zone`}>
      <defs>
        <pattern id={`${id}-zone`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" style={{ fill: 'var(--color-lime)' }} fillOpacity="0.45" />
          <line x1="0" y1="0" x2="0" y2="6" style={{ stroke: 'var(--color-ink)' }} strokeOpacity="0.35" strokeWidth="1.2" />
        </pattern>
      </defs>
      <rect x={M.l} y={M.t} width={PW} height={PH} rx="6" style={{ fill: 'var(--color-surface)', stroke: 'var(--color-line)' }} />
      {[0, 25, 50, 75, 100].map((t) => (
        <g key={`x${t}`}>
          <line x1={sx(t)} x2={sx(t)} y1={M.t} y2={M.t + PH} style={{ stroke: 'var(--color-line)' }} />
          <text x={sx(t)} y={H - 8} textAnchor="middle" style={tick}>{t}</text>
        </g>
      ))}
      {[0, 8, 16].map((t) => (
        <g key={`y${t}`}>
          <line x1={M.l} x2={M.l + PW} y1={sy(t)} y2={sy(t)} style={{ stroke: 'var(--color-line)' }} />
          <text x={M.l - 5} y={sy(t) + 3} textAnchor="end" style={tick}>{t}</text>
        </g>
      ))}

      {zone?.pressure && !isPoint && (
        <rect {...rect(zone.o2, zone.pressure)} fill={`url(#${id}-zone)`} strokeWidth="1.5" strokeDasharray="4 3" style={{ stroke: 'var(--color-ink)' }} />
      )}
      {boxes.map(({ inv, x, y }) => (
        <rect key={inv.id} {...rect(x, y)} rx="1.5" fillOpacity="0.12" strokeWidth="1.3" style={{ fill: 'var(--color-cobalt)', stroke: 'var(--color-cobalt)' }} />
      ))}
      {isPoint && (
        <path
          d={`M${sx(zone.o2.min)} ${sy(zone.pressure.min) - 7} l7 7 l-7 7 l-7 -7 z`}
          strokeWidth="1.5"
          style={{ fill: 'var(--color-lime)', stroke: 'var(--color-ink)' }}
        />
      )}
    </svg>
  );
}
