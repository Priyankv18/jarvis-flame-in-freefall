import { forwardRef } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from './cn.js'

export const chipStyles = cva(
  'inline-flex max-w-full items-center gap-1.5 rounded-pill font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'border border-line bg-surface text-ink',
        cobalt: 'bg-cobalt-soft text-cobalt-deep',
        solid: 'bg-cobalt text-white',
        navy: 'bg-navy text-white',
        lime: 'bg-lime text-ink',
        alert: 'bg-alert-soft text-alert',
        unknown: 'hatch border border-line-strong text-ink',
        outline: 'border border-line-strong bg-card text-ink',
        onDark: 'border border-white/25 bg-white/10 text-white',
      },
      size: {
        sm: 'h-6 px-2 text-xs',
        md: 'h-7 px-2.5 text-xs',
        lg: 'h-9 px-3.5 text-sm',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
)

export function Chip({ tone, size, icon: Icon, className, children, ...props }) {
  return (
    <span className={cn(chipStyles({ tone, size }), className)} {...props}>
      {Icon && <Icon aria-hidden="true" className="size-3.5 shrink-0" />}
      <span className={cn('truncate', tone === 'unknown' && 'rounded-sm bg-card/85 px-1')}>{children}</span>
    </span>
  )
}

// A chip that toggles a filter or opens something. The pressed state uses navy fill plus a
// lime ring and aria-pressed, so it never relies on colour alone.
export const ChipButton = forwardRef(function ChipButton(
  { tone = 'outline', size = 'lg', pressed, icon: Icon, count, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed}
      className={cn(
        chipStyles({ tone: pressed ? 'navy' : tone, size }),
        'cursor-pointer transition-colors hover:border-cobalt',
        pressed && 'ring-2 ring-lime ring-offset-1 ring-offset-card',
        className,
      )}
      {...props}
    >
      {Icon && <Icon aria-hidden="true" className="size-3.5 shrink-0" />}
      <span className="truncate">{children}</span>
      {count != null && (
        <span
          className={cn(
            'num rounded-pill px-1.5 text-[11px] leading-5',
            pressed ? 'bg-lime text-ink' : 'bg-surface text-muted',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
})
