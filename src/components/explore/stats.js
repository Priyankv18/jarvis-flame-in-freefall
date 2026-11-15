// Counts behind the Explore cards. Everything here is computed from data/investigations.json.
import { coversO2, coversPressure } from '../../lib/format.js'

export function countCover(list, check, habitat) {
  const yes = list.filter((i) => check(i, habitat) === true).length
  const no = list.filter((i) => check(i, habitat) === false).length
  return { yes, no, unknown: list.length - yes - no }
}

export const o2Cover = (list, h) => countCover(list, coversO2, h)
export const pressureCover = (list, h) => countCover(list, coversPressure, h)

export const AXES = [
  { key: 'o2', label: 'Oxygen', min: 'o2_min', max: 'o2_max', unit: '%' },
  { key: 'pressure', label: 'Pressure', min: 'pressure_atm_min', max: 'pressure_atm_max', unit: 'atm' },
  { key: 'flow', label: 'Flow', min: 'flow_min', max: 'flow_max', unit: 'cm/s' },
]

// How completely each range is stated: both bounds, one bound, or neither.
export function completeness(list) {
  return AXES.map((a) => {
    let full = 0
    let partial = 0
    for (const i of list) {
      const n = (i[a.min] != null) + (i[a.max] != null)
      if (n === 2) full += 1
      else if (n === 1) partial += 1
    }
    return { axis: a.label, full, partial, none: list.length - full - partial }
  })
}

// For each value on the axis, how many fully stated ranges include it.
// A range that includes a value does not mean that exact value was tested.
export function profile(list, axis, steps) {
  const a = AXES.find((x) => x.key === axis)
  const known = list.filter((i) => i[a.min] != null && i[a.max] != null)
  return steps.map((v) => ({
    v,
    n: known.filter((i) => i[a.min] <= v + 1e-9 && i[a.max] >= v - 1e-9).length,
  }))
}

export function countBy(list, key) {
  const m = new Map()
  for (const i of list) {
    const vals = Array.isArray(i[key]) ? i[key] : [i[key]]
    for (const v of vals) m.set(v ?? 'unknown', (m.get(v ?? 'unknown') ?? 0) + 1)
  }
  return [...m.entries()].sort((x, y) => y[1] - x[1])
}
