import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

const data = JSON.parse(fs.readFileSync(new URL('../data/investigations.json', import.meta.url), 'utf8'))
const investigations = data.investigations ?? []

const REQUIRED = ['id', 'name', 'family', 'fuel_state', 'pillars', 'relevance']
const RELEVANCE = ['direct', 'secondary', 'indirect']
const RANGES = [
  ['o2_min', 'o2_max'],
  ['pressure_atm_min', 'pressure_atm_max'],
  ['flow_min', 'flow_max'],
]

describe('data/investigations.json', () => {
  it('has investigations', () => {
    expect(investigations.length).toBeGreaterThan(0)
  })

  it('has unique ids', () => {
    const ids = investigations.map((i) => i.id)
    const dupes = ids.filter((id, n) => ids.indexOf(id) !== n)
    expect(dupes).toEqual([])
  })

  it('has every required field on every investigation', () => {
    const missing = investigations.flatMap((i) =>
      REQUIRED.filter((f) => i[f] === undefined || i[f] === null || i[f] === '').map((f) => `${i.id ?? '?'}.${f}`),
    )
    expect(missing).toEqual([])
  })

  it('uses only direct, secondary or indirect for relevance', () => {
    const bad = investigations.filter((i) => !RELEVANCE.includes(i.relevance)).map((i) => `${i.id}: ${i.relevance}`)
    expect(bad).toEqual([])
  })

  it('never has a min greater than its max', () => {
    const bad = investigations.flatMap((i) =>
      RANGES.filter(([lo, hi]) => i[lo] != null && i[hi] != null && i[lo] > i[hi]).map(
        ([lo, hi]) => `${i.id}: ${lo} ${i[lo]} > ${hi} ${i[hi]}`,
      ),
    )
    expect(bad).toEqual([])
  })

  it('links incidents only to existing investigation ids', () => {
    const ids = new Set(investigations.map((i) => i.id))
    const bad = (data.incidents ?? []).flatMap((inc) =>
      (inc.linked ?? []).filter((id) => !ids.has(id)).map((id) => `${inc.id} -> ${id}`),
    )
    expect(bad).toEqual([])
  })
})
