import { cn } from './cn.js'

// Shimmer placeholder. Respects reduced motion through the global rule in index.css.
export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn('skeleton rounded-2xl', className)} />
}

// Card-shaped skeleton grid shown while a lazy tab loads.
export function TabSkeleton({ label = 'Loading' }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-5 lg:grid-cols-12">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-56 lg:col-span-7" />
      <Skeleton className="h-56 lg:col-span-5" />
      <Skeleton className="h-40 lg:col-span-4" />
      <Skeleton className="h-40 lg:col-span-4" />
      <Skeleton className="h-40 lg:col-span-4" />
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children, action, className }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong px-6 py-10 text-center', className)}>
      {Icon && (
        <span className="hatch flex size-12 items-center justify-center rounded-pill">
          <Icon aria-hidden="true" className="size-5 rounded-sm bg-card/90 text-ink" />
        </span>
      )}
      <p className="font-display text-xl font-semibold">{title}</p>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
      {action}
    </div>
  )
}
