import { ExternalLink, GitCompareArrows, Info, Minus } from 'lucide-react'
import { UNKNOWN, show, rangeText, coversO2, coversPressure, sourceUrl } from '../../lib/format.js'
import { Button, Chip, CoverChip, DrawerContent, buttonStyles, cn } from '../../ui/index.js'

export function PsiTag() {
  return (
    <Chip tone="navy" size="sm" title="Some values filled from the PSI record">
      PSI
    </Chip>
  )
}

export function Value({ v, mono = false }) {
  if (v === UNKNOWN) return <Chip tone="unknown" size="sm">unknown</Chip>
  return <span className={cn(mono && 'num')}>{v}</span>
}

// Slide-over body for one study. Opened from the table, the incidents timeline or Ctrl+K.
export function StudyDrawer({ inv, habitat, meta, inCompare, canAdd, onToggleCompare }) {
  const ranges = [
    ['Oxygen', rangeText(inv.o2_min, inv.o2_max, '%')],
    ['Pressure', rangeText(inv.pressure_atm_min, inv.pressure_atm_max, 'atm')],
    ['Flow', rangeText(inv.flow_min, inv.flow_max, 'cm/s')],
  ]
  const rows = [
    ['Family', show(inv.family)],
    ['Hardware', show(inv.hardware)],
    ['Fuel state', show(inv.fuel_state)],
    ['Fuels', show(inv.fuels)],
    ['Geometry', show(inv.geometry)],
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
    <DrawerContent
      eyebrow={`${inv.id}${inv.psi_id ? ` · ${inv.psi_id}` : ''}`}
      title={inv.name}
      description={`Tested ranges, findings and sources for ${inv.name}.`}
      hideDescription
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant={inCompare ? 'secondary' : 'cobalt'} onClick={onToggleCompare} disabled={!inCompare && !canAdd}>
            {inCompare ? <Minus aria-hidden="true" className="size-4" /> : <GitCompareArrows aria-hidden="true" className="size-4" />}
            {inCompare ? 'Remove from compare' : canAdd ? 'Add to compare' : 'Compare is full (4)'}
          </Button>
          {url && (
            <a className={buttonStyles({ variant: 'secondary' })} href={url} target="_blank" rel="noreferrer">
              Open the source <ExternalLink aria-hidden="true" className="size-4" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </div>
      }
    >
      {habitat && (
        <div className="mb-5 rounded-2xl bg-surface p-4">
          <p className="eyebrow">Fit for {habitat.name}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <CoverChip size="md" prefix="Oxygen" value={coversO2(inv, habitat)} />
            <CoverChip size="md" prefix="Pressure" value={coversPressure(inv, habitat)} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {ranges.map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-line p-3">
            <p className="eyebrow">{k}</p>
            <div className="mt-1 text-sm font-semibold">
              <Value v={v} mono />
            </div>
          </div>
        ))}
      </div>

      {inv.psi_filled?.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <PsiTag /> Filled from the PSI record: <span className="num">{inv.psi_filled.join(', ')}</span>
        </p>
      )}
      {inv.hargun_filled?.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          Filled in the v0.3 merge (sources in the notes below): <span className="num">{inv.hargun_filled.join(', ')}</span>
        </p>
      )}

      <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="eyebrow">{k}</dt>
            <dd className="mt-0.5 break-words">
              <Value v={v} />
            </dd>
          </div>
        ))}
      </dl>

      {inv.key_findings?.length > 0 && (
        <section className="mt-6">
          <h3 className="font-display text-xl font-semibold">Key findings</h3>
          <ul className="mt-2 grid gap-2 text-sm leading-relaxed">
            {inv.key_findings.map((f, n) => (
              <li key={`${n}-${f}`} className="flex gap-3">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-pill bg-cobalt" />
                {f}
              </li>
            ))}
          </ul>
        </section>
      )}

      {notes.length > 0 && (
        <section className="mt-6 grid gap-2">
          {notes.map((n, idx) => (
            <p key={`${idx}-${n}`} className="flex gap-2 rounded-2xl border border-line bg-surface p-3 text-sm leading-relaxed">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-cobalt" />
              <span>
                <span className="sr-only">Note: </span>
                {n}
              </span>
            </p>
          ))}
        </section>
      )}
    </DrawerContent>
  )
}
