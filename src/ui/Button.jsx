import { forwardRef } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from './cn.js'

export const buttonStyles = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-pill font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-lime text-ink hover:bg-lime-deep',
        cobalt: 'bg-cobalt text-white hover:bg-cobalt-deep',
        secondary: 'border border-line bg-card text-ink hover:border-line-strong hover:bg-surface',
        ghost: 'text-ink hover:bg-ink/5',
        onDark: 'border border-white/30 bg-white/10 text-white hover:bg-white/20',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-5 text-base',
        icon: 'size-10',
        iconSm: 'size-8',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export const Button = forwardRef(function Button({ className, variant, size, type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} className={cn(buttonStyles({ variant, size }), className)} {...props} />
})
