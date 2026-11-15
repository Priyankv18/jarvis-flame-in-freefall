import { forwardRef } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from './cn.js'

const cardStyles = cva('relative rounded-card', {
  variants: {
    tone: {
      default: 'border border-line bg-card text-ink shadow-card',
      hero: 'overflow-hidden bg-cobalt text-white shadow-hero',
      navy: 'bg-navy text-white shadow-card',
      flat: 'border border-line bg-card text-ink',
    },
    pad: {
      none: '',
      md: 'p-5 sm:p-6',
      lg: 'p-6 sm:p-8',
    },
  },
  defaultVariants: { tone: 'default', pad: 'md' },
})

export const Card = forwardRef(function Card({ as: Tag = 'section', tone, pad, className, ...props }, ref) {
  return <Tag ref={ref} className={cn(cardStyles({ tone, pad }), className)} {...props} />
})

// Eyebrow label, title and an optional action on the right.
export function CardHeader({ eyebrow, title, action, id, className, titleAs: Title = 'h2', onDark = false }) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && <p className={cn('eyebrow', onDark && 'text-white/80')}>{eyebrow}</p>}
        {title && (
          <Title id={id} className="mt-1 font-display text-2xl leading-tight font-semibold tracking-tight">
            {title}
          </Title>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
