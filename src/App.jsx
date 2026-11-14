import { useMemo, useState } from 'react'
import data from '../data/investigations.json'
import Catalogue from './components/Catalogue.jsx'
import GapMap from './components/GapMap.jsx'
import ScoreTable from './components/ScoreTable.jsx'
import AskPanel from './components/AskPanel.jsx'
import { coversO2, coversPressure, habitatText } from './lib/format.js'

const TABS = ['Explore', 'Catalogue', 'Gap map', 'Rank', 'Ask']

export default function App() {
  const [tab, setTab] = useState('Explore')
  const habitats = data.habitats ?? []
  const [habitatId, setHabitatId] = useState(habitats[0]?.id ?? null)

  const habitat = habitats.find((h) => h.id === habitatId) ?? null
  const investigations = data.investigations
  const nameOf = useMemo(() => Object.fromEntries(investigations.map((i) => [i.id, i.name])), [investigations])

  // Three-way count for one check: true (range includes the level), false (ruled out), null (not fully stated).
  const countBy = (check) => {
    const yes = investigations.filter((i) => check(i, habitat) === true).length
    const no = investigations.filter((i) => check(i, habitat) === false).length
    return { yes, no, unknown: investigations.length - yes - no }
  }
  const o2Counts = countBy(coversO2)
  const pressureCounts = countBy(coversPressure)

  const props = { investigations, habitats, habitat, meta: data.meta }

  if (habitats.length === 0) {
    return (
      <div className="mx-auto max-w-6xl p-4">
        <h1 className="text-2xl font-bold">Fire Safety Explorer</h1>
        <p className="mt-2 text-sm text-slate-700">No habitats found in the data file, so there is nothing to show yet.</p>
      </div>
    )
  }

  return (
    <div className="jarvis mx-auto max-w-6xl p-4">
      <header className="jv-header">
        <div className="jv-brand">
          <span className="jv-flame" aria-hidden="true" />
          <div>
            <h1 className="jv-wordmark">JARVIS</h1>
            <p className="jv-sub">
              <strong>Fire Safety Explorer</strong> · what microgravity combustion research tells us about fire in crewed habitats
            </p>
          </div>
        </div>
        <div className="jv-status" aria-label="Dataset status">
          <span className="jv-chip"><span className="jv-dot" />{investigations.length} investigations</span>
          <span className="jv-chip"><span className="jv-dot ember" />{habitats.length} habitats</span>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-800">
          <span className="jv-label">Habitat</span>
          <select
            className="mt-1 rounded border border-slate-400 bg-white px-3 py-2 font-normal"
            value={habitatId}
            onChange={(e) => setHabitatId(e.target.value)}
          >
            {habitats.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </label>
        {habitat && <p className="jv-habitat-note"><b>{habitatText(habitat)}.</b> {habitat.note}</p>}
      </div>

      <nav aria-label="Sections" className="jv-tabs mb-5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-current={tab === t ? 'page' : undefined}
            className="jv-tab"
          >
            {t}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'Explore' && (
          <div className="space-y-4">
            <section className="rounded border border-slate-300 bg-white p-4">
              <h2 className="text-lg font-semibold">{habitat?.name}</h2>
              <div className="jv-stats">
                <div className="jv-stat">
                  <div className="jv-stat-num">{investigations.length}</div>
                  <div className="jv-stat-label">investigations in the dataset</div>
                </div>
                <div className="jv-stat">
                  <div className="jv-stat-num cyan">{o2Counts.yes}</div>
                  <div className="jv-stat-label">tested at this oxygen level</div>
                </div>
                <div className="jv-stat">
                  <div className="jv-stat-num cyan">{pressureCounts.yes}</div>
                  <div className="jv-stat-label">tested at this pressure</div>
                </div>
                <div className="jv-stat">
                  <div className="jv-stat-num ember">{o2Counts.unknown}</div>
                  <div className="jv-stat-label">oxygen range not stated</div>
                </div>
              </div>
              <p className="mt-3 text-sm">
                Oxygen: of {investigations.length} investigations, {o2Counts.yes} tested a range that includes this
                oxygen level, {o2Counts.no} did not, and for {o2Counts.unknown} the range is not fully stated.
              </p>
              <p className="mt-2 text-sm">
                Pressure: {pressureCounts.yes} tested a range that includes this pressure, {pressureCounts.no} did not,
                and for {pressureCounts.unknown} the range is not fully stated.
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Oxygen and pressure are checked separately, so this does not prove a study tested both together.
              </p>
            </section>
            <section className="rounded border border-slate-300 bg-white p-4">
              <h2 className="text-lg font-semibold">Why it matters: past incidents</h2>
              <ul className="mt-2 space-y-3 text-sm">
                {(data.incidents ?? []).map((inc) => (
                  <li key={inc.id}>
                    <p className="font-medium">{inc.name} ({inc.date})</p>
                    <p>{inc.summary}</p>
                    {inc.linked?.length > 0 && (
                      <p className="text-slate-700">
                        Related research: {inc.linked.map((id) => nameOf[id] ?? id).join(', ')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
        {tab === 'Catalogue' && <Catalogue {...props} />}
        {tab === 'Gap map' && <GapMap {...props} />}
        {tab === 'Rank' && <ScoreTable {...props} />}
        {tab === 'Ask' && <AskPanel {...props} />}
      </main>

      <footer className="jv-footer">
        Built with AI assistance (Claude). Data compiled from public NASA sources with AI help and reviewed by the team;
        unstated values are shown as unknown.
      </footer>
    </div>
  )
}
