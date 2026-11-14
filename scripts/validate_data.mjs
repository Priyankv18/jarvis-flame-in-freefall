// Checks data/investigations.json against the team schema. Read only: it never edits the file.
// Errors make the script exit with code 1. Warnings are printed for the team to review.
import fs from 'node:fs'

const path = 'data/investigations.json'
const data = JSON.parse(fs.readFileSync(path, 'utf8'))
const investigations = data.investigations ?? []
const habitats = data.habitats ?? []
const incidents = data.incidents ?? []

const errors = []
const warnings = []
const err = (where, msg) => errors.push(`${where}: ${msg}`)
const warn = (where, msg) => warnings.push(`${where}: ${msg}`)

const REQUIRED = ['id', 'name', 'family', 'fuel_state', 'pillars', 'relevance']
const RELEVANCE = ['direct', 'secondary', 'indirect']
const PILLARS = ['prevention', 'detection', 'suppression']
const RANGES = [
  ['o2_min', 'o2_max'],
  ['pressure_atm_min', 'pressure_atm_max'],
  ['flow_min', 'flow_max'],
]
const NUMBER_FIELDS = RANGES.flat()
const HABITAT_NUMBER_FIELDS = ['o2', 'o2_min', 'pressure_atm', 'pressure_atm_max', 'pressure_psi']

const isMissing = (v) => v === undefined || v === null || v === ''
const isKnown = (v) => typeof v === 'number' && Number.isFinite(v)

// Shared number checks for investigations and habitats.
function checkNumbers(where, rec, fields) {
  for (const f of fields) {
    const v = rec[f]
    if (v === undefined || v === null) continue
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      err(where, `${f} should be a number or null, found ${JSON.stringify(v)}`)
      continue
    }
    if (f.startsWith('o2') && (v < 0 || v > 100)) err(where, `${f} = ${v} is outside 0 to 100`)
    if (f.startsWith('pressure_atm') && v > 10) err(where, `${f} = ${v} is above 10 atm (psi entered by mistake?)`)
  }
}

// Investigations
const seen = new Map()
investigations.forEach((inv, n) => {
  const where = `investigations[${n}]${inv.id ? ` ${inv.id}` : ''}`

  for (const f of REQUIRED) if (isMissing(inv[f])) err(where, `missing required field ${f}`)

  if (!isMissing(inv.id)) {
    if (seen.has(inv.id)) err(where, `duplicate id ${inv.id} (also at investigations[${seen.get(inv.id)}])`)
    else seen.set(inv.id, n)
  }

  if (!isMissing(inv.relevance) && !RELEVANCE.includes(inv.relevance)) {
    err(where, `relevance "${inv.relevance}" is not one of ${RELEVANCE.join(', ')}`)
  }

  if (!isMissing(inv.pillars)) {
    if (!Array.isArray(inv.pillars)) err(where, 'pillars should be an array')
    else inv.pillars.filter((p) => !PILLARS.includes(p)).forEach((p) =>
      err(where, `pillar "${p}" is not one of ${PILLARS.join(', ')}`))
  }

  checkNumbers(where, inv, NUMBER_FIELDS)
  for (const [lo, hi] of RANGES) {
    if (isKnown(inv[lo]) && isKnown(inv[hi]) && inv[lo] > inv[hi]) {
      err(where, `${lo} (${inv[lo]}) is greater than ${hi} (${inv[hi]})`)
    }
  }

  if (NUMBER_FIELDS.every((f) => isMissing(inv[f]))) warn(where, 'oxygen, pressure and flow are all null')
  for (const f of ['o2_note', 'flow_note', 'todo']) {
    if (!isMissing(inv[f])) warn(where, `${f}: ${inv[f]}`)
  }
  if (!isMissing(inv.psi_id) && isMissing(inv.psi_link)) warn(where, `has psi_id ${inv.psi_id} but no psi_link`)
})

// Habitats
habitats.forEach((h, n) => {
  const where = `habitats[${n}]${h.id ? ` ${h.id}` : ''}`
  if (isMissing(h.o2) && isMissing(h.o2_min)) err(where, 'has neither o2 nor o2_min')
  if (isMissing(h.pressure_atm) && isMissing(h.pressure_atm_max)) err(where, 'has neither pressure_atm nor pressure_atm_max')
  checkNumbers(where, h, HABITAT_NUMBER_FIELDS)
})

// Incidents
incidents.forEach((inc, n) => {
  const where = `incidents[${n}]${inc.id ? ` ${inc.id}` : ''}`
  for (const id of inc.linked ?? []) {
    if (!seen.has(id)) err(where, `linked id "${id}" is not an investigation id`)
  }
})

// Report
if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`)
  warnings.forEach((w) => console.log(`  WARN  ${w}`))
  console.log('')
}
if (errors.length) {
  console.log(`Errors (${errors.length}):`)
  errors.forEach((e) => console.log(`  ERROR ${e}`))
  console.log('')
}

const known = (lo, hi) => investigations.filter((i) => isKnown(i[lo]) && isKnown(i[hi])).length
console.log(
  `Summary: ${investigations.length} records, ${known('o2_min', 'o2_max')} with known oxygen range, ` +
    `${known('pressure_atm_min', 'pressure_atm_max')} with known pressure range, ` +
    `${known('flow_min', 'flow_max')} with known flow range. ` +
    `${errors.length} errors, ${warnings.length} warnings.`,
)

process.exit(errors.length ? 1 : 0)
