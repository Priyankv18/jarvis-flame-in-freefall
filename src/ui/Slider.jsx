import * as RSl from '@radix-ui/react-slider'
import { cn } from './cn.js'

// Single-thumb slider. `color` is a CSS colour (use a var(--color-*) token).
export function Slider({ value, onValueChange, min = 0, max = 10, step = 1, label, valueText, color, className }) {
  return (
    <RSl.Root
      value={[value]}
      onValueChange={([v]) => onValueChange(v)}
      min={min}
      max={max}
      step={step}
      className={cn('relative flex h-6 w-full touch-none items-center select-none', className)}
    >
      <RSl.Track className="relative h-2 grow overflow-hidden rounded-pill bg-line">
        <RSl.Range className="absolute h-full rounded-pill" style={{ background: color ?? 'var(--color-cobalt)' }} />
      </RSl.Track>
      <RSl.Thumb
        aria-label={label}
        aria-valuetext={valueText}
        className="block size-5 cursor-grab rounded-pill border-2 border-card bg-ink shadow-card focus-visible:outline-3 focus-visible:outline-cobalt"
      />
    </RSl.Root>
  )
}
