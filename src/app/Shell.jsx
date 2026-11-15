import { Database, Search, Sparkles } from 'lucide-react'
import {
  Button, Chip, Popover, PopoverContent, PopoverTrigger, Select, TabsList, TabsTrigger, Tooltip, cn,
} from '../ui/index.js'
import { SECTIONS } from './sections.js'
import { FlameMark, HabitatIcon } from './icons.jsx'
import { habitatHint, o2Readout, pressureReadout } from './habitat.js'

// Navy rail on tablet and desktop; the same tab list becomes a bottom bar on phones.
export function Rail({ orientation }) {
  const vertical = orientation === 'vertical'
  return (
    <aside
      className={cn(
        'on-dark no-print fixed z-30 bg-navy text-white',
        'inset-x-0 bottom-0 h-bar border-t border-white/10',
        'md:inset-x-auto md:inset-y-0 md:left-0 md:h-auto md:w-rail md:border-t-0',
      )}
    >
      <div className="hidden justify-center pt-5 pb-6 md:flex">
        <FlameMark className="size-11" />
      </div>
      <TabsList
        aria-label="Sections"
        className="grid h-full grid-cols-6 md:flex md:h-auto md:flex-col md:items-center md:gap-2 md:px-2"
      >
        {SECTIONS.map((s) => (
          <Tooltip key={s.id} content={s.blurb} side="right" disabled={!vertical}>
            <TabsTrigger
              value={s.id}
              className={cn(
                'group relative flex min-w-0 cursor-pointer flex-col items-center justify-center gap-1 text-[10px] font-medium text-rail-text transition-colors md:text-[11px]',
                'h-full w-full hover:text-white md:h-[4.25rem] md:rounded-2xl md:hover:bg-navy-hover',
                // aria-selected, not data-state: the tooltip trigger overwrites data-state.
                'aria-selected:text-white md:aria-selected:bg-navy-deep',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-10 items-center justify-center rounded-pill transition-colors md:w-12',
                  'group-aria-selected:bg-lime group-aria-selected:text-ink',
                )}
              >
                <s.icon aria-hidden="true" className="size-[18px]" />
              </span>
              <span className="group-aria-selected:font-semibold">{s.label}</span>
            </TabsTrigger>
          </Tooltip>
        ))}
      </TabsList>
    </aside>
  )
}

function DataChip({ meta, count }) {
  const notes = [meta?.generation_note, meta?.merge_note, meta?.merge_note_2].filter(Boolean)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-pill border border-line bg-card px-3.5 text-xs font-medium text-ink hover:border-line-strong"
        >
          <Database aria-hidden="true" className="size-4 text-cobalt" />
          <span className="num">
            v{meta?.version ?? 'unknown'} · {meta?.created ?? 'date unknown'}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent label="About the dataset">
        <p className="eyebrow">Dataset</p>
        <p className="mt-1 font-display text-xl font-semibold">{meta?.name ?? 'Dataset'}</p>
        <p className="num mt-1 text-xs text-muted">
          Version {meta?.version ?? 'unknown'} · created {meta?.created ?? 'unknown'} · {count} investigations
        </p>
        <ul className="mt-3 grid gap-2 text-sm leading-relaxed">
          {notes.map((n, i) => (
            <li key={`${i}-${n.slice(0, 12)}`} className="border-l-2 border-line pl-3 text-muted">
              {n}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

export function TopBar({ section, habitats, habitat, onHabitat, onSearch, onAsk, meta, count }) {
  const options = habitats.map((h) => ({
    value: h.id,
    label: h.name,
    hint: habitatHint(h),
    icon: (p) => <HabitatIcon id={h.id} {...p} />,
  }))
  return (
    <header className="no-print border-b border-line bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75 md:sticky md:top-0 md:z-20">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="md:hidden">
            <FlameMark className="size-9" />
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Fire Safety Explorer</p>
            <h1 className="display text-3xl text-balance sm:text-4xl">{section.title}</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={onSearch}
          aria-haspopup="dialog"
          className="order-last inline-flex h-10 w-full cursor-pointer items-center gap-2 rounded-pill border border-line bg-card px-3.5 text-sm whitespace-nowrap text-muted hover:border-line-strong sm:order-none sm:w-72"
        >
          <Search aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">Search studies, habitats</span>
          <kbd className="num rounded-md border border-line px-1.5 text-[11px]">Ctrl K</kbd>
        </button>

        <Button variant="primary" onClick={onAsk} className="hidden lg:inline-flex">
          <Sparkles aria-hidden="true" className="size-4" /> Ask JARVIS
        </Button>
      </div>

      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-4 pb-4 sm:px-6 lg:px-8">
        <span className="eyebrow mr-1" id="habitat-label">
          Habitat
        </span>
        <Select
          label="Crew habitat"
          value={habitat?.id ?? ''}
          onValueChange={onHabitat}
          options={options}
          className="w-full sm:w-auto sm:min-w-56"
          renderValue={(o) => (
            <>
              {o && <HabitatIcon id={o.value} className="size-5 text-cobalt" />}
              <span className="truncate font-semibold">{o?.label ?? 'Choose a habitat'}</span>
            </>
          )}
        />
        <Chip tone="navy" size="lg" className="num">
          O2 {o2Readout(habitat)}
        </Chip>
        <Chip tone="navy" size="lg" className="num">
          {pressureReadout(habitat)}
        </Chip>
        <span className="ml-auto">
          <DataChip meta={meta} count={count} />
        </span>
      </div>
    </header>
  )
}
