import { useMemo, useState } from 'react'
import data from '../data/investigations.json'
import Catalogue from './components/Catalogue.jsx'
import GapMap from './components/GapMap.jsx'
import ScoreTable from './components/ScoreTable.jsx'
import AskPanel from './components/AskPanel.jsx'
import FlameSimulator from './components/FlameSimulator.jsx'
import MiniGapMap from './components/MiniGapMap.jsx'
import { coversO2, coversPressure, habitatText } from './lib/format.js'
import { habitatCoverage } from './lib/scoring.js'

const TABS = ['Explore', 'Catalogue', 'Gap map', 'Rank', 'Simulator', 'Ask']

// Short "O2 / pressure" readout for a habitat card, from the habitat's own fields.
function habitatReadout(h) {
  const o2 = h.o2 != null ? `${h.o2}%` : h.o2_min != null ? `≥${h.o2_min}%` : '?'
  const psi = h.pressure_psi ?? (h.pressure_atm != null ? Math.round(h.pressure_atm * 147) / 10 : null)
  const open = h.pressure_atm_max != null && h.pressure_atm == null
  return `O2 ${o2} · ${psi == null ? '? psi' : `${open ? '≤' : ''}${psi} psi`}`
}

// Simple line icons for each habitat (generic shapes, no logos).
function HabitatIcon({ id }) {
  const common = { width: 26, height: 26, viewBox: '0 0 32 32', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  switch (id) {
    case 'iss':
      return (
        <svg {...common}>
          <rect x="13" y="12" width="6" height="8" rx="1" />
          <path d="M16 12V8M16 20v4M13 16H8M19 16h5" />
          <rect x="3" y="11" width="5" height="10" rx="0.5" />
          <rect x="24" y="11" width="5" height="10" rx="0.5" />
        </svg>
      )
    case 'moon_base':
      return (
        <svg {...common}>
          <path d="M5 23a11 11 0 0 1 22 0" />
          <path d="M3 23h26M12 23v-4h8v4" />
          <circle cx="25" cy="7" r="3" />
        </svg>
      )
    case 'rover':
      return (
        <svg {...common}>
          <path d="M5 19v-6a3 3 0 0 1 3-3h12l5 5v4z" />
          <path d="M20 10v5h5" />
          <circle cx="10" cy="22" r="3" />
          <circle cx="22" cy="22" r="3" />
        </svg>
      )
    case 'mars_base':
      return (
        <svg {...common}>
          <path d="M6 24a7 7 0 0 1 14 0M18 24a5 5 0 0 1 10 0" />
          <path d="M3 24h26" />
          <circle cx="10" cy="8" r="4" />
          <path d="M7 9.5c2 .8 4 .8 6 0" />
        </svg>
      )
    case 'suit':
      return (
        <svg {...common}>
          <path d="M8 15a8 8 0 0 1 16 0v5a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4z" />
          <rect x="11" y="13" width="10" height="6" rx="3" />
          <path d="M10 28h12" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="9" />
        </svg>
      )
  }
}

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
  const coverage = habitatCoverage(investigations, habitat)

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

      <div className="mb-4">
        <span className="jv-label" id="habitat-label">Choose a crew habitat</span>
        <div className="jv-habitats" role="radiogroup" aria-labelledby="habitat-label">
          {habitats.map((h) => {
            const on = h.id === habitatId
            return (
              <button
                key={h.id}
                type="button"
                role="radio"
                aria-checked={on}
                className={`jv-habitat${on ? ' on' : ''}`}
                onClick={() => setHabitatId(h.id)}
              >
                <HabitatIcon id={h.id} />
                <span className="jv-habitat-name">{h.name}</span>
                <span className="jv-habitat-read">{habitatReadout(h)}</span>
              </button>
            )
          })}
        </div>
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
            <section className="jv-hero" aria-label="Mission briefing">
              <div className="jv-hero-text">
                <span className="jv-label">Mission briefing · {habitat?.name}</span>
                <p className="jv-hero-num">
                  <span className={coverage.reached.length === 0 ? 'zero' : ''}>{coverage.reached.length}</span>
                  <span className="of"> / {coverage.total}</span>
                </p>
                <p className="jv-hero-lead">
                  {coverage.reached.length === 0
                    ? <>No investigation in our data tested oxygen and pressure that reach <b>{habitat?.name}</b> conditions ({habitatReadout(habitat)}).</>
                    : <>investigations tested oxygen and pressure that reach <b>{habitat?.name}</b> conditions ({habitatReadout(habitat)}){': '}
                        {coverage.reached.map((i) => i.id).join(', ')}.</>}
                </p>
                <p className="jv-hero-sub">
                  {coverage.total - coverage.known.length} of {coverage.total} have no full oxygen and pressure record.
                  There is no partial-gravity data in PSI yet.
                </p>
                <button type="button" className="jv-hero-btn" onClick={() => setTab('Gap map')}>
                  Open the gap map →
                </button>
              </div>
              <button type="button" className="jv-hero-map" onClick={() => setTab('Gap map')} aria-label="Open the full gap map">
                <MiniGapMap investigations={investigations} habitat={habitat} />
                <span className="jv-hero-map-cap">O2 % vs pressure (psi) · cyan = tested · ember = {habitat?.name}</span>
              </button>
            </section>
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
        {tab === 'Simulator' && <FlameSimulator {...props} />}
        {tab === 'Ask' && <AskPanel {...props} />}
      </main>

      <footer className="jv-footer">
        Built with AI assistance (Claude). Data compiled from public NASA sources with AI help and reviewed by the team;
        unstated values are shown as unknown.
      </footer>
    </div>
  )
}
