// OWNER: Priyank (scoring and visuals).
// Relevance score of one investigation for one crew environment, 0 to 100.
// Transparent by design: every factor is returned so the UI can show the breakdown,
// and unknown values stay unknown (null) instead of being guessed.

// ---------------------------------------------------------------------------
// Reading ranges from the dataset (tolerant of field-name changes)
// ---------------------------------------------------------------------------
// The current contract is `o2_min/o2_max`, `pressure_min/pressure_max`, `flow_min/flow_max`.
// The 21-record seed file may use single fields such as `pressure` or `flow_speed`,
// so we accept: x_min/x_max, a single number, [min, max], { min, max }, or "21-35".
const AXIS_KEYS = {
  o2: ['o2', 'oxygen', 'o2_percent'],
  pressure: ['pressure', 'pressure_psi'], // pressure_atm_* is handled in getRange
  flow: ['flow', 'flow_speed', 'flow_velocity'],
};

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function parseValue(v) {
  if (v == null) return null;
  if (typeof v === 'number') return num(v) == null ? null : { min: v, max: v };
  if (Array.isArray(v)) {
    const nums = v.map(Number).filter(Number.isFinite);
    return nums.length ? { min: Math.min(...nums), max: Math.max(...nums) } : null;
  }
  if (typeof v === 'object') return mkRange(num(v.min), num(v.max));
  if (typeof v === 'string') {
    const nums = (v.match(/\d+(\.\d+)?/g) || []).map(Number);
    return nums.length ? { min: Math.min(...nums), max: Math.max(...nums) } : null;
  }
  return null;
}

function mkRange(min, max) {
  if (min == null && max == null) return null;
  return {
    min: min ?? max,
    max: max ?? min,
    minUnknown: min == null,
    maxUnknown: max == null,
  };
}

const PSI_PER_ATM = 14.7;
const atmToPsi = (v) => (num(v) == null ? null : Math.round(v * PSI_PER_ATM * 10) / 10);

/** Tested range of an investigation on one axis ('o2' | 'pressure' | 'flow'), or null if unknown.
 *  Pressure is always returned in psi. The final dataset stores it in atm (pressure_atm_min/max). */
export function getRange(inv, axis) {
  for (const key of AXIS_KEYS[axis]) {
    const r = mkRange(num(inv?.[`${key}_min`]), num(inv?.[`${key}_max`]));
    if (r) return r;
    const single = parseValue(inv?.[key]);
    if (single) return single;
  }
  if (axis === 'pressure') {
    const r = mkRange(atmToPsi(inv?.pressure_atm_min), atmToPsi(inv?.pressure_atm_max));
    if (r) return r;
  }
  return null;
}

/**
 * Operating zone of a crew environment, in % O2 and psi.
 * Habitats come in two shapes in the final dataset:
 *   single values: { o2: 21, pressure_atm: 1.0 }          (ISS, spacesuit)
 *   open ranges:   { o2_min: 30, pressure_atm_max: 0.69 } (Moon Base, rover, Mars)
 * The brief gives the Moon Base as "30% O2 or more at 10.2 psi or less", so a missing
 * o2_max means "or more" (open to 100%) and the pressure is a ceiling ("or less").
 * pressure_psi, when present, wins over the atm conversion so labels match the brief exactly.
 */
export function habitatZone(h) {
  if (!h) return null;
  const o2Single = num(h.o2);
  const o2Min = num(h.o2_min) ?? o2Single;
  if (o2Min == null) return null;
  const o2Max = num(h.o2_max) ?? o2Single;
  const openO2 = o2Max == null;

  const psi = num(h.pressure_psi) ?? atmToPsi(h.pressure_atm);
  const ceiling = num(h.pressure_psi) ?? atmToPsi(h.pressure_atm_max);
  let pressure = null;
  let openPressureBelow = false;
  if (num(h.pressure_min) != null || num(h.pressure_max) != null) {
    pressure = mkRange(num(h.pressure_min), num(h.pressure_max));
  } else if (h.pressure_atm_max != null || (openO2 && psi != null)) {
    pressure = ceiling == null ? null : { min: 0, max: ceiling };
    openPressureBelow = pressure != null;
  } else if (psi != null) {
    pressure = { min: psi, max: psi };
  }

  return {
    o2: { min: o2Min, max: o2Max ?? 100 },
    pressure,
    openO2,
    openPressureBelow,
  };
}

/**
 * Coverage of one habitat by the dataset, using only investigations whose oxygen AND
 * pressure ranges are both known. `reached` = known tests whose box overlaps the habitat zone.
 */
export function habitatCoverage(investigations, habitat) {
  const zone = habitatZone(habitat);
  const known = investigations.filter((inv) => getRange(inv, 'o2') && getRange(inv, 'pressure'));
  const hits = (a, b) => a && b && a.min <= b.max && b.min <= a.max;
  const reached = zone?.pressure
    ? known.filter((inv) => hits(getRange(inv, 'o2'), zone.o2) && hits(getRange(inv, 'pressure'), zone.pressure))
    : [];
  return { zone, known, reached, total: investigations.length };
}

// ---------------------------------------------------------------------------
// Factors (each returns a number 0..1, or null when the data is unknown)
// ---------------------------------------------------------------------------
export const FACTORS = [
  { key: 'oxygen', label: 'Oxygen overlap', color: '#f97316',
    help: 'Does the tested O2 range reach the habitat O2 level? Partial credit within 25 points.' },
  { key: 'pressure', label: 'Pressure overlap', color: '#0ea5e9',
    help: 'Does the tested pressure range reach the habitat pressure? Partial credit within 5 psi.' },
  { key: 'fuel', label: 'Fuel type', color: '#eab308',
    help: 'Solids (fabrics, plastics) are the main cabin fire load; liquids and gases score lower.' },
  { key: 'pillar', label: 'Safety pillar', color: '#22c55e',
    help: 'Studies tied to prevention, detection or suppression score full marks.' },
  { key: 'relevance', label: 'Direct relevance', color: '#a855f7',
    help: 'Direct fire safety studies score 1, secondary 0.7, indirect fundamental combustion studies 0.4.' },
];

// Slider units (0-10). Shares are weight / sum of weights.
export const DEFAULT_WEIGHTS = { oxygen: 7, pressure: 3, fuel: 4, pillar: 3, relevance: 3 };

/** 1 if the ranges overlap, falling linearly to 0 at `falloff` units apart. */
function overlapScore(tested, target, falloff) {
  if (!tested || !target) return null;
  const gap = Math.max(0, target.min - tested.max, tested.min - target.max);
  return Math.max(0, 1 - gap / falloff);
}

function fuelScore(inv) {
  const s = String(inv.fuel_state ?? '').toLowerCase();
  if (!s) return null;
  // Judge by the leading word: "gas (emulating solids)" is a gas, not a solid.
  if (s.startsWith('solid')) return 1;
  if (s.startsWith('liquid') || s.startsWith('droplet')) return 0.6;
  if (s.startsWith('gas')) return 0.5;
  return 0.3;
}

function pillarScore(inv) {
  const raw = inv.pillars ?? inv.safety_pillar;
  const p = Array.isArray(raw) ? raw.join(' ') : raw;
  if (!p) return null;
  return /prevent|detect|suppress/i.test(p) ? 1 : 0.5;
}

function relevanceScore(inv) {
  if (!inv.relevance) return null;
  const r = String(inv.relevance).toLowerCase();
  if (r === 'direct') return 1;
  if (r === 'secondary') return 0.7;
  return 0.4;
}

export function factorParts(inv, habitat) {
  const zone = habitatZone(habitat);
  return {
    oxygen: overlapScore(getRange(inv, 'o2'), zone?.o2, 25),
    pressure: overlapScore(getRange(inv, 'pressure'), zone?.pressure, 5),
    fuel: fuelScore(inv),
    pillar: pillarScore(inv),
    relevance: relevanceScore(inv),
  };
}

// ---------------------------------------------------------------------------
// Total score
// ---------------------------------------------------------------------------
/**
 * @param unknownValue what an unknown factor counts as: 0 (strict, default) or 0.5 (neutral).
 * Returns total (0-100), parts (0..1 or null), contributions (points per factor),
 * shares (weight fractions) and `known` (share of the weight backed by real data).
 */
export function scoreInvestigation(inv, habitat, weights = DEFAULT_WEIGHTS, unknownValue = 0) {
  const parts = factorParts(inv, habitat);
  const sumW = FACTORS.reduce((s, f) => s + Math.max(0, weights[f.key] ?? 0), 0) || 1;
  const shares = {};
  const contributions = {};
  let total = 0;
  let known = 0;
  for (const { key } of FACTORS) {
    const share = Math.max(0, weights[key] ?? 0) / sumW;
    const value = parts[key] ?? unknownValue;
    shares[key] = share;
    contributions[key] = share * value * 100;
    total += contributions[key];
    if (parts[key] != null) known += share;
  }
  const unknown = FACTORS.filter((f) => parts[f.key] == null).map((f) => f.key);
  return { total: Math.round(total), parts, contributions, shares, known, unknown };
}

export function rankInvestigations(investigations, habitat, weights = DEFAULT_WEIGHTS, unknownValue = 0) {
  return investigations
    .map((inv) => ({ inv, ...scoreInvestigation(inv, habitat, weights, unknownValue) }))
    .sort((a, b) => b.total - a.total || b.known - a.known || String(a.inv.id).localeCompare(b.inv.id));
}

/** One-line plain-English reason for a rank, built only from the scored factors. */
export function explainScore(result, habitat) {
  const { parts, unknown } = result;
  const name = habitat?.name ?? 'this habitat';
  const bits = [];
  if (parts.oxygen === 1) bits.push(`tested O2 reaches ${name} levels`);
  else if (parts.oxygen > 0) bits.push(`tested O2 falls short of ${name}`);
  else if (parts.oxygen === 0) bits.push(`tested O2 is far from ${name}`);
  if (parts.pressure === 1) bits.push('pressure matches');
  else if (parts.pressure != null) bits.push('pressure differs');
  if (parts.fuel === 1) bits.push('solid fuel (cabin materials)');
  if (parts.relevance === 1) bits.push('direct fire safety study');
  else if (parts.relevance === 0.7) bits.push('secondary fire safety relevance');
  else if (parts.relevance != null) bits.push('indirect (fundamental) study');
  const pillar = result.inv?.pillars ?? result.inv?.safety_pillar;
  if (parts.pillar === 1 && pillar) bits.push(`${Array.isArray(pillar) ? pillar.join('/') : pillar} pillar`);
  let text = bits.length ? bits.join('; ') : 'little known data';
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (unknown.length) text += `. Unknown: ${unknown.join(', ')}`;
  return text + '.';
}
