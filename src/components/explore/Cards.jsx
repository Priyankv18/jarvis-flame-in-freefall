import { ArrowUpRight, Hourglass } from 'lucide-react'
import { Button, Card, CardHeader, Chip, CountUp, RingGauge, Tooltip } from '../../ui/index.js'
import { show } from '../../lib/format.js'
import MiniGapMap from '../MiniGapMap.jsx'
import { countBy } from './stats.js'

export function RingCard({ eyebrow, title, counts, total, note, className }) {
  return (
    <Card className={className}>
      <CardHeader eyebrow={eyebrow} title={title} />
      <RingGauge counts={counts} total={total} label={`${eyebrow} ${title}`} />
      <p className="mt-4 text-xs leading-relaxed text-muted">{note}</p>
    </Card>
  )
}

export function MiniMapCard({ investigations, habitat, onNavigate, className }) {
  return (
    <Card className={className}>
      <CardHeader
        eyebrow="Gap map preview"
        title="Tested vs habitat"
        action={
          <Button size="sm" onClick={() => onNavigate('gapmap')} aria-label="Open the full gap map" title="Open the full gap map">
            Open <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Button>
        }
      />
      <MiniGapMap investigations={investigations} habitat={habitat} />
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-sm border-[1.5px] border-cobalt bg-cobalt-soft" />
          Tested range (O2 % by psi)
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-sm border-[1.5px] border-dashed border-ink bg-lime" />
          {habitat?.name ?? 'Habitat'}
        </li>
      </ul>
    </Card>
  )
}

// Dataset at a glance: totals by family, with labelled mini bars.
export function DatasetCard({ investigations, className }) {
  const families = countBy(investigations, 'family')
  const relevance = countBy(investigations, 'relevance')
  const max = Math.max(1, ...families.map(([, n]) => n))
  const psiLinked = investigations.filter((i) => i.psi_id).length
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Dataset</p>
          <p className="display mt-1 text-6xl">
            <CountUp value={investigations.length} />
          </p>
          <p className="text-sm text-muted">investigations</p>
        </div>
        <div className="text-right">
          <p className="eyebrow">PSI linked</p>
          <p className="num mt-1 text-2xl font-semibold">
            {psiLinked}
            <span className="text-sm text-muted">/{investigations.length}</span>
          </p>
        </div>
      </div>
      <p className="eyebrow mt-5 mb-2">By family</p>
      <ul className="grid gap-1.5">
        {families.map(([name, n]) => (
          <li key={name} className="grid grid-cols-[5.5rem_1fr_1.5rem] items-center gap-2 text-xs">
            <span className="truncate font-medium">{show(name)}</span>
            <span className="h-2 rounded-pill bg-surface">
              <span className="block h-full rounded-pill bg-navy" style={{ width: `${(n / max) * 100}%` }} />
            </span>
            <span className="num text-right">{n}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {relevance.map(([name, n]) => (
          <Chip key={name} tone={name === 'direct' ? 'solid' : name === 'secondary' ? 'cobalt' : 'outline'}>
            {name} <span className="num">{n}</span>
          </Chip>
        ))}
      </div>
    </Card>
  )
}

const year = (d) => String(d ?? '').slice(0, 4) || 'unknown'

// Past incidents as a vertical timeline. Linked studies are buttons that open the study.
export function IncidentsCard({ incidents, nameOf, onOpenInvestigation, className }) {
  const sorted = [...incidents].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  return (
    <Card className={className}>
      <CardHeader eyebrow="Why it matters" title="Past spacecraft fire incidents" />
      <ol className="relative grid gap-6 border-l-2 border-line pl-6">
        {sorted.map((inc) => (
          <li key={inc.id} className="relative">
            <span aria-hidden="true" className="absolute top-1 -left-[2.0625rem] size-4 rounded-pill border-4 border-card bg-navy ring-2 ring-line" />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="display text-3xl text-cobalt">{year(inc.date)}</span>
              <h3 className="font-display text-xl font-semibold">{inc.name}</h3>
              <span className="num text-xs text-muted">{show(inc.date)}</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed">{show(inc.summary)}</p>
            {inc.lessons && (
              <p className="mt-2 rounded-xl bg-surface px-3 py-2 text-sm leading-relaxed">
                <span className="eyebrow mr-2 text-ink">Lesson</span>
                {inc.lessons}
              </p>
            )}
            {inc.linked?.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="eyebrow mr-1">Related studies</span>
                {inc.linked.map((id) => (
                  <Tooltip key={id} content={nameOf[id] ?? 'Not in the dataset'}>
                    <button
                      type="button"
                      onClick={() => onOpenInvestigation(id)}
                      aria-label={`${id}: open ${nameOf[id] ?? 'study'}`}
                      className="num inline-flex h-7 cursor-pointer items-center rounded-pill border border-cobalt bg-card px-2.5 text-xs font-semibold text-cobalt hover:bg-cobalt hover:text-white"
                    >
                      {id}
                    </button>
                  </Tooltip>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </Card>
  )
}

// data.future: experiments whose data is not in PSI yet.
export function MissingCard({ future, className }) {
  return (
    <Card tone="navy" className={className}>
      <div className="on-dark">
        <CardHeader onDark eyebrow="Not yet in PSI" title="What is still missing" />
        <p className="-mt-2 mb-4 text-sm text-white/85">
          Planned or newer experiments listed in the dataset whose results are not in PSI yet, including the first
          partial-gravity data.
        </p>
        <ul className="grid gap-3">
          {future.map((f) => (
            <li key={f.id} className="flex gap-3 rounded-2xl bg-white/8 p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lime text-ink">
                <Hourglass aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  <span className="num mr-2 text-lime">{f.id}</span>
                  {f.name}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-white/85">{show(f.note)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
