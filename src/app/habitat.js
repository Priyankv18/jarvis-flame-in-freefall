// Short readouts for a habitat, built only from its own fields (no conversions).
export function o2Readout(h) {
  if (!h) return 'unknown'
  if (h.o2 != null) return `${h.o2}%`
  if (h.o2_min != null) return `≥${h.o2_min}%`
  return 'unknown'
}

export function pressureReadout(h) {
  if (!h) return 'unknown'
  const open = h.pressure_atm == null && h.pressure_atm_max != null
  const atm = h.pressure_atm ?? h.pressure_atm_max
  const parts = []
  if (atm != null) parts.push(`${open ? '≤' : ''}${atm} atm`)
  if (h.pressure_psi != null) parts.push(`${open ? '≤' : ''}${h.pressure_psi} psi`)
  return parts.length ? parts.join(' · ') : 'unknown'
}

export const habitatHint = (h) => `O2 ${o2Readout(h)} · ${pressureReadout(h)}`
