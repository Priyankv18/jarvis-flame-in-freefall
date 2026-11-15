import { ArrowRight, Library } from 'lucide-react'
import { Button, Card, CountUp } from '../../ui/index.js'
import { o2Readout, pressureReadout } from '../../app/habitat.js'

// Cobalt hero: how many studies reach the habitat, with the honest caveats right under it.
export function HeroCard({ habitat, coverage, onNavigate, onOpenInvestigation, className }) {
  const reached = coverage.reached
  const missing = coverage.total - coverage.known.length
  return (
    <Card tone="hero" pad="lg" className={className} aria-labelledby="hero-title">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-cobalt via-cobalt to-navy" aria-hidden="true" />
      <svg
        aria-hidden="true"
        viewBox="0 0 200 200"
        className="pointer-events-none absolute -top-16 -right-16 hidden size-80 sm:block sm:size-96"
      >
        {[30, 50, 70, 90].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} fill="none" strokeWidth="1" strokeOpacity="0.3" style={{ stroke: 'var(--color-card)' }} />
        ))}
        <circle cx="100" cy="100" r="14" fillOpacity="0.85" style={{ fill: 'var(--color-lime)' }} />
      </svg>

      <div className="relative">
        <p className="eyebrow text-white/85">Mission briefing · {habitat?.name ?? 'habitat'}</p>
        <h2 id="hero-title" className="sr-only">
          Studies that reach {habitat?.name}
        </h2>
        <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
          <p className="display text-[7rem] leading-[0.8] text-lime sm:text-[9rem]">
            <CountUp value={reached.length} />
          </p>
          <p className="max-w-sm pb-2 text-lg leading-snug font-medium">
            of {coverage.total} studies tested oxygen <em className="not-italic">and</em> pressure ranges that reach{' '}
            <span className="num rounded-md bg-white/15 px-1.5 py-0.5 text-base [box-decoration-break:clone]">
              O2 {o2Readout(habitat)}, {pressureReadout(habitat)}
            </span>
          </p>
        </div>

        {reached.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Studies that reach this habitat">
            {reached.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => onOpenInvestigation(i.id)}
                  aria-label={`${i.id}: open ${i.name}`}
                  className="num inline-flex h-8 cursor-pointer items-center rounded-pill border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20"
                >
                  {i.id}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 grid gap-2 border-t border-white/20 pt-4 text-sm text-white/90 sm:grid-cols-2">
          <p>
            <span className="num font-semibold text-white">{missing}</span> of {coverage.total} studies do not state both an
            oxygen and a pressure range, so they cannot be placed here.
          </p>
          <p>
            Oxygen and pressure are checked separately, and a study spanning a range did not necessarily test every value
            in it.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => onNavigate('gapmap')}>
            Open the gap map <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
          <Button variant="onDark" onClick={() => onNavigate('catalogue')}>
            <Library aria-hidden="true" className="size-4" /> Browse the catalogue
          </Button>
        </div>
      </div>
    </Card>
  )
}
