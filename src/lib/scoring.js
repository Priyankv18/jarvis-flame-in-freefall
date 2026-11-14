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
  pressure: ['pressure', 'pressure_psi'],
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

/** Tested range of an investigation on one axis ('o2' | 'pressure' | 'flow'), or null if unknown. */
export function getRange(inv, axis) {
  for (const key of AXIS_KEYS[axis]) {
    const r = mkRange(num(inv?.[`${key}_min`]), num(inv?.[`${key}_max`]));
    if (r) return r;
    const single = parseValue(inv?.[key]);
    if (single) return single;
  }
  return null;
}

/**
 * Operating zone of a crew environment.
 * The brief gives the Moon Base / rover atmosphere as "30% O2 or more at 10.2 psi or less",
 * which the data encodes as o2_max = null. So: o2_max null means "or more" (open to 100%),
 * and in that case pressure_psi is read as a ceiling ("or less"). Explicit
 * pressure_min / pressure_max on a habitat always win.
 */
export function habitatZone(h) {
  if (!h || h.o2_min == null) return null;
  const openO2 = h.o2_max == null;
  const p = num(h.pressure_psi);
  const pMin = num(h.pressure_min) ?? (openO2 ? 0 : p);
  const pMax = num(h.pressure_max) ?? p;
  return {
    o2: { min: h.o2_min, max: h.o2_max ?? 100 },
    pressure: pMax == null ? null : { min: pMin ?? pMax, max: pMax },
    openO2,
    openPressureBelow: openO2 && h.pressure_min == null,
  };
}

// ---------------------------------------------------------------------------
// Factors (each returns a number 0..1, or null when the data is unknown)
// ---------------------------------------------------------------------------
export const FACTORS = [
  { key: 'oxygen', label: 'Oxygen overlap', color: '#ff7a1a',
    help: 'Does the tested O2 range reach the habitat O2 level? Partial credit within 25 points.' },
  { key: 'pressure', label: 'Pressure overlap', color: '#5cc8ff',
    help: 'Does the tested pressure range reach the habitat pressure? Partial credit within 5 psi.' },
  { key: 'fuel', label: 'Fuel type', color: '#f2c14e',
    help: 'Solids (fabrics, plastics) are the main cabin fire load; liquids and gases score lower.' },
  { key: 'pillar', label: 'Safety pillar', color: '#8fd694',
    help: 'Studies tied to prevention, detection or suppression score full marks.' },
  { key: 'relevance', label: 'Direct relevance', color: '#c39bff',
    help: '"Direct" fire safety studies beat "indirect" fundamental combustion studies.' },
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
  if (s.includes('solid')) return 1;
  if (s.includes('liquid') || s.includes('droplet')) return 0.6;
  if (s.includes('gas')) return 0.5;
  return 0.3;
}

function pillarScore(inv) {
  const p = Array.isArray(inv.safety_pillar) ? inv.safety_pillar.join(' ') : inv.safety_pillar;
  if (!p) return null;
  return /prevent|detect|suppress/i.test(p) ? 1 : 0.5;
}

function relevanceScore(inv) {
  if (!inv.relevance) return null;
  return /direct/i.test(inv.relevance) && !/indirect/i.test(inv.relevance) ? 1 : 0.4;
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
  else if (parts.relevance != null) bits.push('indirect (fundamental) study');
  const pillar = result.inv?.safety_pillar;
  if (parts.pillar === 1 && pillar) bits.push(`${Array.isArray(pillar) ? pillar.join('/') : pillar} pillar`);
  let text = bits.length ? bits.join('; ') : 'little known data';
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (unknown.length) text += `. Unknown: ${unknown.join(', ')}`;
  return text + '.';
}
