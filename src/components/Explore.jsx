// Explore: mission overview for the selected habitat as a bento grid.
// Every number on this page is computed from data/investigations.json.
import { useMemo } from 'react'
import { m } from 'motion/react'
import { habitatCoverage } from '../lib/scoring.js'
import { HeroCard } from './explore/HeroCard.jsx'
import { CompletenessCard, ProfileCard } from './explore/Charts.jsx'
import { DatasetCard, IncidentsCard, MiniMapCard, MissingCard, RingCard } from './explore/Cards.jsx'
import { o2Cover, pressureCover } from './explore/stats.js'

const grid = { show: { transition: { staggerChildren: 0.05 } } }
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] } },
}

function Cell({ className, children }) {
  return (
    <m.div variants={item} className={`min-w-0 ${className}`}>
      {children}
    </m.div>
  )
}

export default function Explore({ investigations, habitat, incidents = [], future = [], onOpenInvestigation, onNavigate }) {
  const coverage = useMemo(() => habitatCoverage(investigations, habitat), [investigations, habitat])
  const o2 = useMemo(() => o2Cover(investigations, habitat), [investigations, habitat])
  const pressure = useMemo(() => pressureCover(investigations, habitat), [investigations, habitat])
  const nameOf = useMemo(() => Object.fromEntries(investigations.map((i) => [i.id, i.name])), [investigations])
  const total = investigations.length
  const full = 'h-full'

  return (
    <m.div variants={grid} initial="hidden" animate="show" className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-6 lg:grid-cols-12">
      <Cell className="md:col-span-6 lg:col-span-8">
        <HeroCard
          className={full}
          habitat={habitat}
          coverage={coverage}
          onNavigate={onNavigate}
          onOpenInvestigation={onOpenInvestigation}
        />
      </Cell>
      <Cell className="md:col-span-6 lg:col-span-4">
        <MiniMapCard className={full} investigations={investigations} habitat={habitat} onNavigate={onNavigate} />
      </Cell>

      <Cell className="md:col-span-3 lg:col-span-4">
        <RingCard
          className={full}
          eyebrow="Oxygen"
          title="Range includes this level"
          counts={o2}
          total={total}
          note="Covered: the stated range includes the habitat's oxygen. Unknown: the range is not fully stated and no stated end rules it out."
        />
      </Cell>
      <Cell className="md:col-span-3 lg:col-span-4">
        <RingCard
          className={full}
          eyebrow="Pressure"
          title="Range includes this level"
          counts={pressure}
          total={total}
          note="Checked separately from oxygen, so a study covered on both may not have tested them together."
        />
      </Cell>
      <Cell className="md:col-span-6 lg:col-span-4">
        <DatasetCard className={full} investigations={investigations} />
      </Cell>

      <Cell className="md:col-span-6 lg:col-span-7">
        <ProfileCard className={full} investigations={investigations} habitat={habitat} />
      </Cell>
      <Cell className="md:col-span-6 lg:col-span-5">
        <CompletenessCard className={full} investigations={investigations} />
      </Cell>

      <Cell className="md:col-span-6 lg:col-span-7">
        <IncidentsCard className={full} incidents={incidents} nameOf={nameOf} onOpenInvestigation={onOpenInvestigation} />
      </Cell>
      <Cell className="md:col-span-6 lg:col-span-5">
        <MissingCard className={full} future={future} />
      </Cell>
    </m.div>
  )
}
