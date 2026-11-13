// OWNER: Priyank (scoring and visuals).
// Relevance score of one investigation for one crew environment, 0 to 100.
// Keep it transparent: every part is returned so the UI can show the breakdown.
// TODO (Priyank): tune the rules and weights, add pressure and flow once Hargun fills them.

export const DEFAULT_WEIGHTS = {
  oxygen: 0.4,   // does the tested O2 range reach the habitat's O2 level?
  fuel: 0.25,    // solids (fabrics, plastics) matter most in a cabin
  pillar: 0.2,   // prevention / detection / suppression all count
  relevance: 0.15, // "direct" fire safety studies beat "indirect" ones
};

function oxygenScore(inv, habitat) {
  if (inv.o2_max == null || habitat?.o2_min == null) return { value: 0, unknown: true };
  if (inv.o2_max >= habitat.o2_min) return { value: 1, unknown: false };
  // partial credit the closer the tested max gets to the habitat level
  return { value: Math.max(0, inv.o2_max / habitat.o2_min), unknown: false };
}

const FUEL_POINTS = { solid: 1, 'liquid droplet': 0.6, gas: 0.5 };

export function scoreInvestigation(inv, habitat, weights = DEFAULT_WEIGHTS) {
  const oxygen = oxygenScore(inv, habitat);
  const parts = {
    oxygen: oxygen.value,
    fuel: FUEL_POINTS[inv.fuel_state] ?? 0.3,
    pillar: inv.safety_pillar ? 1 : 0,
    relevance: inv.relevance === 'direct' ? 1 : 0.4,
  };
  const total = Object.entries(weights).reduce((sum, [k, w]) => sum + w * parts[k], 0);
  return { total: Math.round(total * 100), parts, oxygenUnknown: oxygen.unknown };
}

export function rankInvestigations(investigations, habitat, weights) {
  return investigations
    .map((inv) => ({ inv, ...scoreInvestigation(inv, habitat, weights) }))
    .sort((a, b) => b.total - a.total);
}
