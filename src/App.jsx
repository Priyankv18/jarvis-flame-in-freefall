import { useMemo, useState } from 'react'
import data from '../data/investigations.json'
import Catalogue from './components/Catalogue.jsx'
import GapMap from './components/GapMap.jsx'
import ScoreTable from './components/ScoreTable.jsx'
import AskPanel from './components/AskPanel.jsx'
import { coversO2, habitatText } from './lib/format.js'

const TABS = ['Explore', 'Catalogue', 'Gap map', 'Rank', 'Ask']

export default function App() {
  const [tab, setTab] = useState('Explore')
  const [habitatId, setHabitatId] = useState(data.habitats[0].id)

  const habitat = data.habitats.find((h) => h.id === habitatId) ?? null
  const investigations = data.investigations
  const nameOf = useMemo(() => Object.fromEntries(investigations.map((i) => [i.id, i.name])), [investigations])

  const covered = investigations.filter((i) => coversO2(i, habitat) === true).length
  const ruledOut = investigations.filter((i) => coversO2(i, habitat) === false).length
  const unknown = investigations.length - covered - ruledOut

  const props = { investigations, habitats: data.habitats, habitat, meta: data.meta }

  return (
    <div className="mx-auto max-w-6xl p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Fire Safety Explorer</h1>
        <p className="text-sm text-slate-700">
          What does microgravity combustion research tell us about fire safety in crewed habitats?
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <label className="flex flex-col text-sm font-medium text-slate-800">
          Habitat
          <select
            className="mt-1 rounded border border-slate-400 bg-white px-2 py-1.5 font-normal"
            value={habitatId}
            onChange={(e) => setHabitatId(e.target.value)}
          >
            {data.habitats.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </label>
        {habitat && <p className="text-sm text-slate-700">{habitatText(habitat)}. {habitat.note}</p>}
      </div>

      <nav aria-label="Sections" className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-current={tab === t ? 'page' : undefined}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              tab === t ? 'bg-blue-800 text-white' : 'border border-slate-400 bg-white text-slate-900'
            }`}
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
              <p className="mt-2 text-sm">
                Of {investigations.length} investigations, {covered} were tested at this oxygen level,
                {' '}{ruledOut} were not, and for {unknown} the oxygen range is not fully stated, so we cannot say.
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

      <footer className="mt-8 border-t border-slate-300 pt-3 text-xs text-slate-700">
        Built with AI assistance (Claude). Data compiled from public NASA sources with AI help and reviewed by the team;
        unstated values are shown as unknown.
      </footer>
    </div>
  )
}
