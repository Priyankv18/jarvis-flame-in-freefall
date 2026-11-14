import { useMemo, useState } from 'react'
import { UNKNOWN, show, rangeText, coversO2, coversPressure, coverLabel, uniqueValues, sourceUrl } from '../lib/format.js'
import Compare from './Compare.jsx'

const badge = (v) =>
  v === true
    ? 'bg-emerald-100 text-emerald-900'
    : v === false
      ? 'bg-rose-100 text-rose-900'
      : 'bg-slate-200 text-slate-800'

// Marks records with values filled from the PSI record (listed in psi_filled).
function PsiTag() {
  return (
    <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-900" title="Some values filled from the PSI record">
      PSI
    </span>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col text-sm font-medium text-slate-800">
      {label}
      <select
        className="mt-1 rounded border border-slate-400 bg-white px-2 py-1.5 font-normal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  )
}

function Detail({ inv, habitat, meta, onClose }) {
  const rows = [
    ['Family', show(inv.family)],
    ['Hardware', show(inv.hardware)],
    ['Fuel state', show(inv.fuel_state)],
    ['Fuels', show(inv.fuels)],
    ['Geometry', show(inv.geometry)],
    ['Oxygen (%)', rangeText(inv.o2_min, inv.o2_max)],
    ['Pressure (atm)', rangeText(inv.pressure_atm_min, inv.pressure_atm_max)],
    ['Flow (cm/s)', rangeText(inv.flow_min, inv.flow_max)],
    ['Diluents', show(inv.diluents)],
    ['What was varied', show(inv.variables)],
    ['Measurements', show(inv.measurements)],
    ['Tests', show(inv.tests)],
    ['Pillars', show(inv.pillars)],
    ['Relevance', show(inv.relevance)],
    ['People', show(inv.people)],
  ]
  const notes = [inv.o2_note, inv.flow_note, inv.psi_note, inv.todo].filter(Boolean)
  const url = sourceUrl(inv, meta)
  return (
    <section aria-label={`Details for ${inv.name}`} className="rounded border border-slate-300 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{inv.name}</h3>
          <p className="text-sm text-slate-700">{inv.id}{inv.psi_id ? ` (${inv.psi_id})` : ''}</p>
          {inv.psi_filled?.length > 0 && (
            <p className="text-xs text-slate-700">
              <PsiTag /> Filled from the PSI record: {inv.psi_filled.join(', ')}
            </p>
          )}
        </div>
        <button onClick={onClose} className="rounded border border-slate-400 px-2 py-1 text-sm">Close</button>
      </div>
      {habitat && (
        <p className="mt-2 text-sm">
          For {habitat.name}: oxygen {coverLabel(coversO2(inv, habitat))}, pressure {coverLabel(coversPressure(inv, habitat))}.
        </p>
      )}
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="font-medium">{k}:</dt>
            <dd className={v === UNKNOWN ? 'text-slate-600' : ''}>{v}</dd>
          </div>
        ))}
      </dl>
      {inv.key_findings?.length > 0 && (
        <div className="mt-3 text-sm">
          <h4 className="font-medium">Key findings</h4>
          <ul className="list-disc pl-5">
            {inv.key_findings.map((f, n) => <li key={`${n}-${f}`}>{f}</li>)}
          </ul>
        </div>
      )}
      {notes.map((n, idx) => (
        <p key={`${idx}-${n}`} className="mt-2 text-sm text-slate-700">Note: {n}</p>
      ))}
      {url && (
        <a className="mt-3 inline-block text-sm text-blue-800 underline" href={url} target="_blank" rel="noreferrer">
          Open the source
        </a>
      )}
    </section>
  )
}

export default function Catalogue({ investigations, habitat, meta }) {
  const [family, setFamily] = useState('')
  const [pillar, setPillar] = useState('')
  const [relevance, setRelevance] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [compare, setCompare] = useState([])
  const [showCompare, setShowCompare] = useState(false)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return investigations.filter((i) => {
      if (family && i.family !== family) return false
      if (pillar && !(i.pillars ?? []).includes(pillar)) return false
      if (relevance && i.relevance !== relevance) return false
      if (q && !`${i.id} ${i.name} ${i.psi_id ?? ''} ${(i.fuels ?? []).join(' ')}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [investigations, family, pillar, relevance, query])

  const toggleCompare = (id) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 4 ? [...c, id] : c))

  const selectedInv = investigations.find((i) => i.id === selected)
  const compareInvs = compare.map((id) => investigations.find((i) => i.id === id)).filter(Boolean)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <label className="flex flex-col text-sm font-medium text-slate-800">
          Search
          <input
            className="mt-1 rounded border border-slate-400 bg-white px-2 py-1.5 font-normal"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, id, fuel"
          />
        </label>
        <Select label="Family" value={family} onChange={setFamily} options={uniqueValues(investigations, 'family')} />
        <Select label="Pillar" value={pillar} onChange={setPillar} options={uniqueValues(investigations, 'pillars')} />
        <Select label="Relevance" value={relevance} onChange={setRelevance} options={uniqueValues(investigations, 'relevance')} />
        <div className="flex items-end">
          <button
            disabled={compare.length < 2}
            onClick={() => setShowCompare(true)}
            className="w-full rounded bg-blue-800 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
          >
            Compare ({compare.length})
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-700" aria-live="polite">
        Showing {rows.length} of {investigations.length} investigations.
      </p>

      <div className="overflow-x-auto rounded border border-slate-300 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2">Compare</th>
              <th className="px-3 py-2">Investigation</th>
              <th className="px-3 py-2">Family</th>
              <th className="px-3 py-2">Oxygen %</th>
              <th className="px-3 py-2">Pressure atm</th>
              <th className="px-3 py-2">Pillars</th>
              <th className="px-3 py-2">Relevance</th>
              <th className="px-3 py-2">{habitat ? `Fit: ${habitat.name}` : 'Habitat fit'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              const o2 = coversO2(i, habitat)
              return (
                <tr key={i.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Compare ${i.name}`}
                      checked={compare.includes(i.id)}
                      onChange={() => toggleCompare(i.id)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button className="text-left font-medium text-blue-800 underline" onClick={() => setSelected(i.id)}>
                      {i.name}
                    </button>
                    <div className="text-xs text-slate-600">
                      {i.id} {i.psi_filled?.length > 0 && <PsiTag />}
                    </div>
                  </td>
                  <td className="px-3 py-2">{show(i.family)}</td>
                  <td className="px-3 py-2">{rangeText(i.o2_min, i.o2_max)}</td>
                  <td className="px-3 py-2">{rangeText(i.pressure_atm_min, i.pressure_atm_max)}</td>
                  <td className="px-3 py-2">{show(i.pillars)}</td>
                  <td className="px-3 py-2">{show(i.relevance)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge(o2)}`}>O2 {coverLabel(o2)}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selectedInv && <Detail inv={selectedInv} habitat={habitat} meta={meta} onClose={() => setSelected(null)} />}
      {showCompare && <Compare investigations={compareInvs} habitat={habitat} onClose={() => setShowCompare(false)} />}
    </div>
  )
}
