import { useId } from 'react'
import { Check, CircleHelp, X } from 'lucide-react'
import { coverLabel } from '../lib/format.js'
import { Chip } from './Chip.jsx'
import { cn } from './cn.js'

// The three coverage states. Each has a word, an icon and a fill, never colour alone.
export const COVER = {
  covered: { label: 'covered', icon: Check, tone: 'cobalt' },
  not: { label: 'not covered', icon: X, tone: 'alert' },
  unknown: { label: 'unknown', icon: CircleHelp, tone: 'unknown' },
}
export const coverKey = (v) => (v === true ? 'covered' : v === false ? 'not' : 'unknown')

// Status chip for a coverage result from coversO2 / coversPressure.
export function CoverChip({ value, prefix, size = 'sm', className }) {
  const c = COVER[coverKey(value)]
  return (
    <Chip tone={c.tone} size={size} icon={c.icon} className={className}>
      {prefix ? `${prefix} ${coverLabel(value)}` : coverLabel(value)}
    </Chip>
  )
}

// SVG hatch pattern for unknown data. Give each SVG its own id.
export function HatchDef({ id, size = 6 }) {
  return (
    <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width={size} height={size} style={{ fill: 'var(--color-unknown-soft)' }} />
      <line x1="0" y1="0" x2="0" y2={size} style={{ stroke: 'var(--color-unknown)' }} strokeWidth="2" />
    </pattern>
  )
}

// Ring gauge split into covered, not covered and unknown. Unknown is hatched.
export function RingGauge({ counts, total, label, size = 148 }) {
  const id = useId().replace(/:/g, '')
  const r = 52
  const c = 2 * Math.PI * r
  const parts = [
    { key: 'covered', n: counts.yes, style: { stroke: 'var(--color-cobalt)' } },
    { key: 'not', n: counts.no, style: { stroke: 'var(--color-alert)' } },
    { key: 'unknown', n: counts.unknown, style: { stroke: `url(#${id}-hatch)` } },
  ]
  let offset = 0
  const summary = `${label}: ${counts.yes} covered, ${counts.no} not covered, ${counts.unknown} unknown, of ${total}`
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <svg width={size} height={size} viewBox="0 0 128 128" role="img" aria-label={summary} className="shrink-0">
        <defs>
          <HatchDef id={`${id}-hatch`} size={5} />
        </defs>
        <circle cx="64" cy="64" r={r} fill="none" strokeWidth="14" style={{ stroke: 'var(--color-surface)' }} />
        <g transform="rotate(-90 64 64)">
          {parts.map((p) => {
            const len = total ? (p.n / total) * c : 0
            const el = len > 0 && (
              <circle
                key={p.key}
                cx="64"
                cy="64"
                r={r}
                fill="none"
                strokeWidth="14"
                strokeDasharray={`${Math.max(0, len - 1.5)} ${c}`}
                strokeDashoffset={-offset}
                style={p.style}
              />
            )
            offset += len
            return el
          })}
        </g>
        <text x="64" y="66" textAnchor="middle" dominantBaseline="middle" className="display" style={{ fontSize: 40, fill: 'var(--color-ink)' }}>
          {counts.yes}
        </text>
        <text x="64" y="90" textAnchor="middle" className="num" style={{ fontSize: 10, fill: 'var(--color-muted)' }}>
          of {total}
        </text>
      </svg>
      <ul className="grid w-full gap-1.5 text-sm">
        {parts.map((p) => {
          const meta = COVER[p.key]
          const Icon = meta.icon
          return (
            <li key={p.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-5 items-center justify-center rounded-md',
                    p.key === 'covered' && 'bg-cobalt text-white',
                    p.key === 'not' && 'bg-alert text-white',
                    p.key === 'unknown' && 'hatch text-ink',
                  )}
                >
                  <Icon className={cn('size-3.5', p.key === 'unknown' && 'rounded-sm bg-card/90')} />
                </span>
                {meta.label}
              </span>
              <span className="num font-semibold">{p.n}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Horizontal track showing a tested range against the habitat value or band.
// Open ends (one bound unknown) and fully unknown ranges are hatched, never hidden.
export function RangeMeter({ min, max, scaleMax, habitat, unit, label, className }) {
  const pct = (v) => `${Math.max(0, Math.min(100, (v / scaleMax) * 100))}%`
  const known = min != null && max != null
  const none = min == null && max == null
  let seg = null
  if (known) {
    seg = { left: pct(min), width: `max(4px, calc(${pct(max)} - ${pct(min)}))`, hatch: false }
  } else if (min != null) {
    seg = { left: pct(min), width: `calc(100% - ${pct(min)})`, hatch: true }
  } else if (max != null) {
    seg = { left: '0%', width: pct(max), hatch: true }
  }
  return (
    <div className={cn('relative h-2.5 w-full min-w-20 rounded-pill bg-surface ring-1 ring-line', className)} role="img" aria-label={label}>
      {none && <span className="hatch absolute inset-0 rounded-pill" />}
      {habitat?.band && (
        <span
          className="absolute inset-y-[-3px] rounded-sm border border-dashed border-ink/60"
          style={{ left: pct(habitat.band[0]), width: `calc(${pct(Math.min(habitat.band[1], scaleMax))} - ${pct(habitat.band[0])})` }}
        />
      )}
      {seg && (
        <span
          className={cn('absolute inset-y-0 rounded-pill', seg.hatch ? 'hatch ring-1 ring-cobalt' : 'bg-cobalt')}
          style={{ left: seg.left, width: seg.width }}
        />
      )}
      {habitat?.point != null && (
        <span className="absolute inset-y-[-4px] w-0.5 rounded bg-ink" style={{ left: pct(habitat.point) }} />
      )}
      <span className="sr-only">{unit}</span>
    </div>
  )
}
