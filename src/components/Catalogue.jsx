import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, GitCompareArrows, Printer, Search, SearchX, X } from 'lucide-react'
import { show, rangeText, coversO2, coversPressure, uniqueValues } from '../lib/format.js'
import {
  Button, Card, Chip, ChipButton, CoverChip, Dialog, DialogContent, EmptyState, RangeMeter, cn,
} from '../ui/index.js'
import Compare from './Compare.jsx'
import { PsiTag, StudyDrawer } from './catalogue/Detail.jsx'

const RELEVANCE_ORDER = { direct: 0, secondary: 1, indirect: 2 }
const FIT_ORDER = (v) => (v === true ? 0 : v == null ? 1 : 2)
const relevanceTone = (r) => (r === 'direct' ? 'solid' : r === 'secondary' ? 'cobalt' : 'outline')

// Habitat marker for the range meters: a single value is a line, an open range is a band.
const o2Mark = (h) => (h?.o2 != null ? { point: h.o2 } : h?.o2_min != null ? { band: [h.o2_min, 100] } : null)
const pMark = (h) =>
  h?.pressure_atm != null ? { point: h.pressure_atm } : h?.pressure_atm_max != null ? { band: [0, h.pressure_atm_max] } : null

function SortHeader({ label, k, sort, onSort, className }) {
  const active = sort.key === k
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('sticky top-0 z-10 bg-surface px-3 py-3 text-left', className)}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className="eyebrow inline-flex cursor-pointer items-center gap-1 rounded hover:text-ink"
      >
        {label}
        <Icon aria-hidden="true" className={cn('size-3.5', active ? 'text-cobalt' : 'text-muted')} />
      </button>
    </th>
  )
}

function FilterGroup({ label, values, value, onChange, countFor }) {
  return (
    <div role="group" aria-label={`${label} filter`} className="flex flex-wrap items-center gap-2">
      <span className="eyebrow w-20 shrink-0">{label}</span>
      {values.map((v) => (
        <ChipButton
          key={v}
          size="md"
          pressed={value === v}
          count={countFor(v)}
          onClick={() => onChange(value === v ? '' : v)}
        >
          {v}
        </ChipButton>
      ))}
    </div>
  )
}

export default function Catalogue({ investigations, habitat, meta, openId }) {
  const [family, setFamily] = useState('')
  const [pillar, setPillar] = useState('')
  const [relevance, setRelevance] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [compare, setCompare] = useState([])
  const [showCompare, setShowCompare] = useState(false)
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })

  // Open the detail drawer when another view asks for a study (incidents, Ctrl+K).
  useEffect(() => {
    if (openId?.id) setSelected(openId.id)
  }, [openId])

  const matches = (i, skip) => {
    const q = query.trim().toLowerCase()
    if (skip !== 'family' && family && i.family !== family) return false
    if (skip !== 'pillar' && pillar && !(i.pillars ?? []).includes(pillar)) return false
    if (skip !== 'relevance' && relevance && i.relevance !== relevance) return false
    if (q && !`${i.id} ${i.name} ${i.psi_id ?? ''} ${(i.fuels ?? []).join(' ')}`.toLowerCase().includes(q)) return false
    return true
  }

  const rows = useMemo(() => {
    const list = investigations.filter((i) => matches(i))
    const dir = sort.dir === 'asc' ? 1 : -1
    const key = {
      name: (i) => i.name ?? '',
      family: (i) => i.family ?? '',
      o2: (i) => i.o2_min ?? i.o2_max,
      pressure: (i) => i.pressure_atm_min ?? i.pressure_atm_max,
      relevance: (i) => RELEVANCE_ORDER[i.relevance] ?? 9,
      fit: (i) => FIT_ORDER(coversO2(i, habitat)) * 3 + FIT_ORDER(coversPressure(i, habitat)),
    }[sort.key]
    return [...list].sort((a, b) => {
      const x = key(a)
      const y = key(b)
      if (x == null && y == null) return 0
      if (x == null) return 1 // unknowns always last
      if (y == null) return -1
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investigations, family, pillar, relevance, query, sort, habitat])

  const facetCount = (skip, test) => investigations.filter((i) => matches(i, skip) && test(i)).length
  const onSort = (k) => setSort((s) => (s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' }))

  const toggleCompare = (id) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 4 ? [...c, id] : c))

  const selectedInv = investigations.find((i) => i.id === selected)
  const compareInvs = compare.map((id) => investigations.find((i) => i.id === id)).filter(Boolean)
  const filtersOn = family || pillar || relevance || query
  const pScale = Math.ceil(
    Math.max(1, ...investigations.map((i) => i.pressure_atm_max ?? i.pressure_atm_min ?? 0), habitat?.pressure_atm ?? 0),
  )
  const clear = () => {
    setFamily('')
    setPillar('')
    setRelevance('')
    setQuery('')
  }

  const meters = (i) => (
    <>
      <div className="flex items-center gap-2">
        <RangeMeter
          min={i.o2_min}
          max={i.o2_max}
          scaleMax={100}
          habitat={o2Mark(habitat)}
          unit="percent oxygen"
          label={`Oxygen ${rangeText(i.o2_min, i.o2_max, '%')} on a 0 to 100% scale`}
        />
        <span className="num w-24 shrink-0 text-xs">{rangeText(i.o2_min, i.o2_max, '%')}</span>
      </div>
    </>
  )
  const pMeter = (i) => (
    <div className="flex items-center gap-2">
      <RangeMeter
        min={i.pressure_atm_min}
        max={i.pressure_atm_max}
        scaleMax={pScale}
        habitat={pMark(habitat)}
        unit="atm"
        label={`Pressure ${rangeText(i.pressure_atm_min, i.pressure_atm_max, 'atm')} on a 0 to ${pScale} atm scale`}
      />
      <span className="num w-24 shrink-0 text-xs">{rangeText(i.pressure_atm_min, i.pressure_atm_max, 'atm')}</span>
    </div>
  )

  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)] gap-5', compare.length > 0 && 'pb-28')}>
      <p className="print-only hidden text-sm">
        Fire Safety Explorer study catalogue for {habitat?.name}. Data from public NASA PSI records and fact sheets. Not
        endorsed by NASA.
      </p>

      <Card className="no-print" aria-label="Filters">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1 basis-64">
            <span className="sr-only">Search the catalogue</span>
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
            <input
              className="h-11 w-full rounded-pill border border-line bg-surface pr-4 pl-10 text-sm text-ink placeholder:text-muted"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, id, PSI id or fuel"
            />
          </label>
          {filtersOn && (
            <Button variant="ghost" size="md" onClick={clear}>
              <X aria-hidden="true" className="size-4" /> Clear filters
            </Button>
          )}
          <Button onClick={() => window.print()}>
            <Printer aria-hidden="true" className="size-4" /> Print
          </Button>
        </div>
        <div className="mt-4 grid gap-3">
          <FilterGroup
            label="Family"
            values={uniqueValues(investigations, 'family')}
            value={family}
            onChange={setFamily}
            countFor={(v) => facetCount('family', (i) => i.family === v)}
          />
          <FilterGroup
            label="Pillar"
            values={uniqueValues(investigations, 'pillars')}
            value={pillar}
            onChange={setPillar}
            countFor={(v) => facetCount('pillar', (i) => (i.pillars ?? []).includes(v))}
          />
          <FilterGroup
            label="Relevance"
            values={uniqueValues(investigations, 'relevance')}
            value={relevance}
            onChange={setRelevance}
            countFor={(v) => facetCount('relevance', (i) => i.relevance === v)}
          />
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted" aria-live="polite">
          Showing <span className="num font-semibold text-ink">{rows.length}</span> of {investigations.length} investigations
          {habitat && <> · fit shown for <strong className="text-ink">{habitat.name}</strong></>}
        </p>
        <p className="no-print flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-5 rounded-pill bg-cobalt" />stated range</span>
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="hatch h-2 w-5 rounded-pill ring-1 ring-cobalt" />open or unknown</span>
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-0.5 rounded bg-ink" />habitat</span>
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={SearchX} title="No studies match" action={<Button onClick={clear}>Clear filters</Button>}>
          Try a different search or remove a filter.
        </EmptyState>
      ) : (
        <>
          {/* Tablet and desktop: dense table with a sticky header. */}
          <Card pad="none" className="print-plain hidden overflow-hidden md:block print:block">
            <div className="print-plain scroll-thin max-h-[72vh] overflow-auto">
              <table className="print-table w-full text-left text-sm">
                <caption className="sr-only">Investigations, sortable by column</caption>
                <thead>
                  <tr>
                    <th scope="col" className="no-print sticky top-0 z-10 w-12 bg-surface px-3 py-3">
                      <span className="sr-only">Compare</span>
                    </th>
                    <SortHeader label="Study" k="name" sort={sort} onSort={onSort} className="min-w-56" />
                    <SortHeader label="Family" k="family" sort={sort} onSort={onSort} />
                    <SortHeader label="Oxygen" k="o2" sort={sort} onSort={onSort} className="min-w-52" />
                    <SortHeader label="Pressure" k="pressure" sort={sort} onSort={onSort} className="min-w-52" />
                    <th scope="col" className="eyebrow sticky top-0 z-10 bg-surface px-3 py-3">Pillars</th>
                    <SortHeader label="Relevance" k="relevance" sort={sort} onSort={onSort} />
                    <SortHeader label="Fit" k="fit" sort={sort} onSort={onSort} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((i) => (
                    <tr key={i.id} className="border-t border-line align-middle hover:bg-surface/70">
                      <td className="no-print px-3 py-3">
                        <input
                          type="checkbox"
                          className="size-4 cursor-pointer accent-cobalt"
                          aria-label={`Compare ${i.name}`}
                          checked={compare.includes(i.id)}
                          disabled={!compare.includes(i.id) && compare.length >= 4}
                          onChange={() => toggleCompare(i.id)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          className="cursor-pointer text-left font-semibold text-ink underline-offset-4 hover:text-cobalt hover:underline"
                          onClick={() => setSelected(i.id)}
                        >
                          {i.name}
                        </button>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                          <span className="num">{i.id}</span>
                          {i.psi_filled?.length > 0 && <PsiTag />}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{show(i.family)}</td>
                      <td className="px-3 py-3">{meters(i)}</td>
                      <td className="px-3 py-3">{pMeter(i)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(i.pillars ?? []).length ? i.pillars.map((p) => <Chip key={p} size="sm">{p}</Chip>) : <Chip tone="unknown" size="sm">unknown</Chip>}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Chip size="sm" tone={relevanceTone(i.relevance)}>{show(i.relevance)}</Chip>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <CoverChip prefix="O2" value={coversO2(i, habitat)} />
                          <CoverChip prefix="P" value={coversPressure(i, habitat)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Phones: stacked cards. */}
          <ul className="no-print grid gap-3 md:hidden" aria-label="Investigations">
            {rows.map((i) => (
              <li key={i.id}>
                <Card pad="none" as="article" className="p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-5 cursor-pointer accent-cobalt"
                      aria-label={`Compare ${i.name}`}
                      checked={compare.includes(i.id)}
                      disabled={!compare.includes(i.id) && compare.length >= 4}
                      onChange={() => toggleCompare(i.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <button type="button" className="cursor-pointer text-left font-semibold" onClick={() => setSelected(i.id)}>
                        {i.name}
                      </button>
                      <p className="num mt-0.5 text-xs text-muted">
                        {i.id} · {show(i.family)}
                      </p>
                    </div>
                    <Chip size="sm" tone={relevanceTone(i.relevance)}>{show(i.relevance)}</Chip>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <div><p className="eyebrow mb-1">Oxygen</p>{meters(i)}</div>
                    <div><p className="eyebrow mb-1">Pressure</p>{pMeter(i)}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <CoverChip prefix="O2" value={coversO2(i, habitat)} />
                    <CoverChip prefix="P" value={coversPressure(i, habitat)} />
                    {(i.pillars ?? []).map((p) => <Chip key={p} size="sm">{p}</Chip>)}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Compare tray, pinned to the bottom of the screen. */}
      {compare.length > 0 && (
        <div
          role="region"
          aria-label="Compare tray"
          className="no-print fixed inset-x-3 bottom-[calc(var(--spacing-bar)+0.75rem)] z-20 md:right-8 md:bottom-6 md:left-[calc(var(--spacing-rail)+2rem)]"
        >
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 rounded-card bg-ink p-3 pl-4 text-white shadow-lift">
            <span className="eyebrow text-white/80">Compare <span className="num">{compare.length}/4</span></span>
            <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {compareInvs.map((i) => (
                <li key={i.id}>
                  <span className="inline-flex h-8 items-center gap-1 rounded-pill bg-white/10 pr-1 pl-3 text-xs font-semibold">
                    <span className="num">{i.id}</span>
                    <button
                      type="button"
                      onClick={() => toggleCompare(i.id)}
                      aria-label={`Remove ${i.name} from compare`}
                      className="inline-flex size-6 cursor-pointer items-center justify-center rounded-pill hover:bg-white/20"
                    >
                      <X aria-hidden="true" className="size-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="on-dark flex gap-2">
              <Button variant="onDark" size="md" onClick={() => setCompare([])}>Clear</Button>
              <Button variant="primary" size="md" disabled={compare.length < 2} onClick={() => setShowCompare(true)}>
                <GitCompareArrows aria-hidden="true" className="size-4" />
                {compare.length < 2 ? 'Pick one more' : `Compare ${compare.length}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!selectedInv} onOpenChange={(o) => !o && setSelected(null)}>
        {selectedInv && (
          <StudyDrawer
            inv={selectedInv}
            habitat={habitat}
            meta={meta}
            inCompare={compare.includes(selectedInv.id)}
            canAdd={compare.length < 4}
            onToggleCompare={() => toggleCompare(selectedInv.id)}
          />
        )}
      </Dialog>

      <Dialog open={showCompare && compareInvs.length > 1} onOpenChange={setShowCompare}>
        <DialogContent
          eyebrow={habitat ? `Fit for ${habitat.name}` : 'Comparison'}
          title="Side by side"
          description={`Comparing ${compareInvs.map((i) => i.id).join(', ')}.`}
          className="max-w-6xl"
        >
          <Compare investigations={compareInvs} habitat={habitat} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
