// Display helpers for the team schema. Nulls always render as "unknown", never as a guess.

export const UNKNOWN = 'unknown'

export function show(value) {
  if (value === null || value === undefined || value === '') return UNKNOWN
  if (Array.isArray(value)) return value.length ? value.join(', ') : UNKNOWN
  return String(value)
}

export function rangeText(min, max, unit = '') {
  const u = unit ? ` ${unit}` : ''
  if (min == null && max == null) return UNKNOWN
  if (min != null && max != null) return min === max ? `${min}${u}` : `${min} to ${max}${u}`
  if (min != null) return `from ${min}${u}`
  return `up to ${max}${u}`
}

export function habitatText(h) {
  if (!h) return ''
  const o2 = h.o2 != null ? `${h.o2}%` : h.o2_min != null ? `${h.o2_min}% or more` : 'oxygen unknown'
  const p =
    h.pressure_atm != null
      ? `${h.pressure_atm} atm`
      : h.pressure_atm_max != null
        ? `${h.pressure_atm_max} atm or less`
        : 'pressure unknown'
  return `${o2} oxygen, ${p}`
}

// A habitat is either a single value (o2, pressure_atm) or an open range (o2_min, pressure_atm_max).
function habitatBounds(h, kind) {
  if (!h) return null
  if (kind === 'o2') {
    if (h.o2 != null) return [h.o2, h.o2]
    if (h.o2_min != null) return [h.o2_min, Infinity]
    return null
  }
  if (h.pressure_atm != null) return [h.pressure_atm, h.pressure_atm]
  if (h.pressure_atm_max != null) return [0, h.pressure_atm_max]
  return null
}

// true: tested range overlaps the habitat. false: known bounds rule it out.
// null: cannot tell because the tested range is not fully stated.
function overlap(min, max, bounds) {
  if (!bounds) return null
  const [lo, hi] = bounds
  if (min != null && min > hi) return false
  if (max != null && max < lo) return false
  if (min == null || max == null) return null
  return min <= hi && max >= lo
}

export const coversO2 = (inv, h) => overlap(inv.o2_min, inv.o2_max, habitatBounds(h, 'o2'))
export const coversPressure = (inv, h) =>
  overlap(inv.pressure_atm_min, inv.pressure_atm_max, habitatBounds(h, 'pressure'))

export function coverLabel(v) {
  if (v === true) return 'covered'
  if (v === false) return 'not covered'
  return UNKNOWN
}

export function uniqueValues(list, key) {
  const set = new Set()
  list.forEach((i) => {
    const v = i[key]
    if (Array.isArray(v)) v.forEach((x) => set.add(x))
    else if (v != null && v !== '') set.add(v)
  })
  return [...set].sort()
}

// Resolve the "source" key (for example "bass_sheet") to a URL, or return null.
export function sourceUrl(inv, meta) {
  if (inv.psi_link) return inv.psi_link
  const s = meta?.sources?.[inv.source]
  return typeof s === 'string' ? s : null
}
