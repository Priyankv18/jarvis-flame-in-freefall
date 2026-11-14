// OWNER: Priyank (scoring and visuals).
// Small, non-interactive preview of the gap map for the Explore page: the selected habitat's
// zone (ember) and every investigation with known oxygen AND pressure (cyan boxes).
// Same axes as the full gap map's crew view: 0 to 100% O2, 0 to 16 psi.
import { getRange, habitatZone } from '../lib/scoring.js';

const W = 300;
const H = 190;
const M = { l: 26, r: 8, t: 8, b: 22 };
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

export default function MiniGapMap({ investigations, habitat }) {
  const zone = habitatZone(habitat);
  const boxes = investigations
    .map((inv) => ({ inv, x: getRange(inv, 'o2'), y: getRange(inv, 'pressure') }))
    .filter((b) => b.x && b.y);
  const isPoint = zone?.pressure && zone.o2.min === zone.o2.max && zone.pressure.min === zone.pressure.max;

  return (
    <svg className="jv-mini-map" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Preview: ${boxes.length} investigations with known oxygen and pressure, against the ${habitat?.name ?? 'selected'} zone`}>
      <defs>
        <pattern id="mini-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#ff7a2f" fillOpacity="0.1" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#ff7a2f" strokeOpacity="0.4" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect x={M.l} y={M.t} width={PW} height={PH} fill="rgba(5,8,15,0.6)" stroke="rgba(56,189,248,0.25)" />
      {[0, 25, 50, 75, 100].map((t) => (
        <g key={`x${t}`}>
          <line x1={sx(t)} x2={sx(t)} y1={M.t} y2={M.t + PH} stroke="rgba(56,189,248,0.08)" />
          <text x={sx(t)} y={H - 8} textAnchor="middle">{t}</text>
        </g>
      ))}
      {[0, 8, 16].map((t) => (
        <g key={`y${t}`}>
          <line x1={M.l} x2={M.l + PW} y1={sy(t)} y2={sy(t)} stroke="rgba(56,189,248,0.08)" />
          <text x={M.l - 5} y={sy(t) + 3} textAnchor="end">{t}</text>
        </g>
      ))}

      {zone?.pressure && !isPoint && (
        <rect {...rect(zone.o2, zone.pressure)} fill="url(#mini-hatch)" stroke="#ff7a2f" strokeWidth="1.5" className="jv-mini-zone" />
      )}
      {boxes.map(({ inv, x, y }) => (
        <rect key={inv.id} {...rect(x, y)} rx="1.5" fill="#22d3ee" fillOpacity="0.16" stroke="#22d3ee" strokeWidth="1.2" />
      ))}
      {isPoint && (
        <path
          d={`M${sx(zone.o2.min)} ${sy(zone.pressure.min) - 6} l6 6 l-6 6 l-6 -6 z`}
          fill="#ff7a2f"
          stroke="#05080f"
          className="jv-mini-zone"
        />
      )}
    </svg>
  );
}
