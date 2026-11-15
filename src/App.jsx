import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { LazyMotion, MotionConfig, domAnimation, m } from 'motion/react'
import data from '../data/investigations.json'
import { Card, EmptyState, TabSkeleton, Tabs, TabsContent, TooltipProvider } from './ui/index.js'
import { Rail, TopBar } from './app/Shell.jsx'
import { CommandPalette } from './app/CommandPalette.jsx'
import { SECTIONS, sectionById } from './app/sections.js'
import { useMediaQuery } from './app/useMediaQuery.js'
import { TriangleAlert } from 'lucide-react'

// Each tab is its own chunk so the chart libraries load only when needed.
const Explore = lazy(() => import('./components/Explore.jsx'))
const Catalogue = lazy(() => import('./components/Catalogue.jsx'))
const GapMap = lazy(() => import('./components/GapMap.jsx'))
const ScoreTable = lazy(() => import('./components/ScoreTable.jsx'))
const AskPanel = lazy(() => import('./components/AskPanel.jsx'))

// The active tab lives in the URL hash (#catalogue) so views can be linked and bookmarked.
const tabFromHash = () => {
  const id = typeof window === 'undefined' ? '' : window.location.hash.slice(1)
  return SECTIONS.some((s) => s.id === id) ? id : 'explore'
}

export default function App() {
  const [tab, setTabState] = useState(tabFromHash)
  const setTab = useCallback((id) => {
    setTabState(id)
    if (window.location.hash.slice(1) !== id) window.history.replaceState(null, '', `#${id}`)
  }, [])
  const habitats = data.habitats ?? []
  const [habitatId, setHabitatId] = useState(habitats[0]?.id ?? null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  // { id, n }: n changes on every request so the same study can be reopened.
  const [openStudy, setOpenStudy] = useState(null)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const habitat = habitats.find((h) => h.id === habitatId) ?? null
  const investigations = data.investigations ?? []
  const section = sectionById(tab)

  const openInvestigation = useCallback((id) => {
    setOpenStudy((cur) => ({ id, n: (cur?.n ?? 0) + 1 }))
    setTab('catalogue')
  }, [])

  // Ctrl+K / Cmd+K opens the command palette from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.title = `${section.label} | Fire Safety Explorer`
  }, [section])

  const props = useMemo(
    () => ({ investigations, habitats, habitat, meta: data.meta }),
    [investigations, habitats, habitat],
  )

  if (habitats.length === 0) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <EmptyState icon={TriangleAlert} title="No habitats in the data file">
          data/investigations.json has no habitats, so there is nothing to compare yet.
        </EmptyState>
      </main>
    )
  }

  const panels = {
    explore: (
      <Explore
        {...props}
        incidents={data.incidents ?? []}
        future={data.future ?? []}
        onOpenInvestigation={openInvestigation}
        onNavigate={setTab}
      />
    ),
    catalogue: <Catalogue {...props} openId={openStudy} />,
    gapmap: <GapMap {...props} />,
    rank: <ScoreTable {...props} />,
    ask: <AskPanel {...props} />,
  }

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <TooltipProvider delayDuration={250}>
          <a
            href="#main"
            className="sr-only z-50 rounded-pill bg-lime px-4 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            Skip to content
          </a>
          <Tabs value={tab} onValueChange={setTab} orientation={isDesktop ? 'vertical' : 'horizontal'} activationMode="manual">
            <Rail orientation={isDesktop ? 'vertical' : 'horizontal'} />
            <div className="min-h-dvh pb-[calc(var(--spacing-bar)+1rem)] md:pb-0 md:pl-rail">
              <TopBar
                section={section}
                habitats={habitats}
                habitat={habitat}
                onHabitat={setHabitatId}
                onSearch={() => setPaletteOpen(true)}
                onAsk={() => setTab('ask')}
                meta={data.meta}
                count={investigations.length}
              />
              <main id="main" tabIndex={-1} className="mx-auto max-w-[1400px] px-4 py-6 outline-none sm:px-6 lg:px-8">
                <p className="no-print mb-5 max-w-2xl text-sm text-muted">{section.blurb}</p>
                {SECTIONS.map((s) => (
                  <TabsContent key={s.id} value={s.id} className="outline-none" tabIndex={-1}>
                    <m.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                    >
                      <Suspense fallback={<TabSkeleton label={`Loading ${s.label}`} />}>{panels[s.id]}</Suspense>
                    </m.div>
                  </TabsContent>
                ))}
              </main>
              <footer className="mx-auto max-w-[1400px] px-4 pb-8 sm:px-6 lg:px-8">
                <Card tone="flat" pad="md" as="div" className="text-xs leading-relaxed text-muted">
                  <p>
                    <strong className="text-ink">Use of AI.</strong> Built with AI assistance (Claude by Anthropic) for code and
                    for drafting data records; Ask answers are AI generated from the project data. Unstated values are shown as
                    unknown, never guessed.
                  </p>
                  <p className="mt-1">Data from public NASA PSI records and fact sheets. Not endorsed by NASA.</p>
                </Card>
              </footer>
            </div>
          </Tabs>
          <CommandPalette
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            habitats={habitats}
            investigations={investigations}
            onSection={setTab}
            onHabitat={setHabitatId}
            onStudy={openInvestigation}
          />
        </TooltipProvider>
      </LazyMotion>
    </MotionConfig>
  )
}
