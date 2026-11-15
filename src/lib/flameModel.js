// OWNER: Priyank (scoring and visuals).
// Illustrative flame-spread model for the Saffire-style simulator.
//
// This is NOT a NASA model and NOT measured data. It encodes three well-known trends from
// combustion research so the simulator moves in the right direction:
//   1. More oxygen makes materials easier to ignite and makes flames spread faster.
//   2. In microgravity there is no buoyant airflow. With no ventilation a flame can starve
//      of oxygen and go out; a gentle airflow can let it burn at lower oxygen than on Earth
//      (the question BASS-II measured). Very strong flow blows the flame off.
//   3. Lower total pressure slightly reduces flammability at the same oxygen percentage.
// Material thresholds are approximate "limiting oxygen" values from Earth tests, rounded.
// Outputs are relative (a 0-100 spread index and a ratio to Earth), never absolute speeds.

export const MATERIALS = [
  {
    id: 'sibal',
    name: 'Cotton-fiberglass fabric (SIBAL)',
    short: 'SIBAL fabric',
    limitO2: 19,
    speed: 1,
    note: 'The fabric Saffire-I and Saffire-III burned as a large sheet.',
  },
  {
    id: 'pmma',
    name: 'Acrylic (PMMA), spacecraft window material',
    short: 'Acrylic (PMMA)',
    limitO2: 17.5,
    speed: 0.55,
    note: 'Burned in Saffire-II and studied in detail in BASS-II.',
  },
  {
    id: 'nomex',
    name: 'Nomex (flame-resistant fabric)',
    short: 'Nomex',
    limitO2: 28,
    speed: 0.75,
    note: 'Flame-resistant fabric burned in Saffire-II and BASS.',
  },
];

export const GRAVITY = [
  { id: 'micro', label: 'Microgravity', g: 0 },
  { id: 'lunar', label: 'Moon (0.17 g)', g: 0.166 },
  { id: 'mars', label: 'Mars (0.38 g)', g: 0.38 },
  { id: 'earth', label: 'Earth (1 g)', g: 1 },
];

const EARTH = { o2: 21, psi: 14.7, flow: 0, gravity: 'earth' };

const gOf = (id) => GRAVITY.find((x) => x.id === id)?.g ?? 0;

// Buoyant flow induced by a flame scales roughly with the square root of gravity.
// About 30 cm/s on Earth is used as a round reference value.
export function effectiveFlow(flow, gravity) {
  const buoyant = 30 * Math.sqrt(gOf(gravity));
  return Math.sqrt(flow * flow + buoyant * buoyant);
}

// How much the oxygen limit moves with the effective airflow (percentage points).
// Starvation at very low flow, a small "easier to burn" window at gentle flow, blow-off at high flow.
function limitShift(vEff) {
  const starvation = 8 * Math.exp(-vEff / 2.5);
  const gentle = -1.5 * Math.exp(-(((vEff - 15) / 12) ** 2));
  const blowoff = Math.max(0, (vEff - 80) / 40) * 3;
  return starvation + gentle + blowoff;
}

/**
 * @param {{o2:number, psi:number, flow:number, gravity:string, material:string}} p
 * @returns {{burns:boolean, index:number, ratio:number|null, limit:number, vEff:number, reason:string, earthIndex:number}}
 */
export function simulate(p) {
  const mat = MATERIALS.find((m) => m.id === p.material) ?? MATERIALS[0];
  const vEff = effectiveFlow(p.flow, p.gravity);
  const limit = mat.limitO2 + limitShift(vEff);
  const raw = (o2, psi, lim) =>
    o2 <= lim ? 0 : ((o2 - lim) / (100 - lim)) ** 0.6 * (Math.max(psi, 0.5) / 14.7) ** 0.25 * mat.speed;

  const value = raw(p.o2, p.psi, limit);
  const earth = raw(EARTH.o2, EARTH.psi, mat.limitO2 + limitShift(effectiveFlow(EARTH.flow, EARTH.gravity)));
  const index = Math.round(Math.min(100, value * 100));
  const earthIndex = Math.round(Math.min(100, earth * 100));

  let reason;
  if (value === 0) {
    reason = vEff < 3
      ? 'Too little airflow: with no buoyancy the flame uses up the oxygen around it and goes out.'
      : vEff > 90
        ? 'Airflow is strong enough to blow the flame off the sample.'
        : 'Oxygen is below the level this material needs to keep burning.';
  } else if (vEff < 3) {
    reason = 'Burns slowly as a dim, rounded flame: oxygen only reaches it by diffusion.';
  } else if (p.o2 >= 30) {
    reason = 'Oxygen-enriched air: the flame is hotter, brighter and spreads much faster.';
  } else {
    reason = 'Burns steadily: enough oxygen and enough airflow to feed the flame.';
  }

  return {
    burns: value > 0,
    index,
    earthIndex,
    ratio: earth > 0 && value > 0 ? value / earth : null,
    limit: Math.round(limit * 10) / 10,
    vEff: Math.round(vEff * 10) / 10,
    reason,
  };
}

/** Starting conditions for a habitat card (oxygen, pressure, gravity), from the habitat's own fields. */
export function conditionsFor(habitat) {
  if (!habitat) return null;
  const o2 = habitat.o2 ?? habitat.o2_min ?? 21;
  const psi = habitat.pressure_psi ?? (habitat.pressure_atm != null ? habitat.pressure_atm * 14.7 : habitat.pressure_atm_max != null ? habitat.pressure_atm_max * 14.7 : 14.7);
  const gravity = { iss: 'micro', suit: 'micro', moon_base: 'lunar', rover: 'lunar', mars_base: 'mars' }[habitat.id] ?? 'micro';
  return { o2: Math.round(o2), psi: Math.round(psi * 10) / 10, gravity };
}
