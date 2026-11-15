import * as RS from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from './cn.js'

// Accessible select. `options` is [{ value, label, hint?, icon? }].
export function Select({ value, onValueChange, options, label, className, triggerClassName, renderValue }) {
  const current = options.find((o) => String(o.value) === String(value))
  return (
    <RS.Root value={String(value)} onValueChange={onValueChange}>
      <RS.Trigger
        aria-label={label}
        className={cn(
          'inline-flex h-10 min-w-0 cursor-pointer items-center justify-between gap-2 rounded-pill border border-line bg-card px-3.5 text-sm font-medium text-ink hover:border-line-strong',
          triggerClassName,
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {renderValue ? renderValue(current) : <RS.Value />}
        </span>
        <RS.Icon>
          <ChevronDown aria-hidden="true" className="size-4 text-muted" />
        </RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className="anim-rise z-50 max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-line bg-card p-1 text-ink shadow-lift"
        >
          <RS.Viewport>
            {options.map((o) => {
              const Icon = o.icon
              return (
                <RS.Item
                  key={o.value}
                  value={String(o.value)}
                  className="relative flex cursor-pointer items-center gap-3 rounded-xl py-2 pr-9 pl-3 text-sm outline-none select-none data-[highlighted]:bg-cobalt-soft data-[state=checked]:font-semibold"
                >
                  {Icon && <Icon aria-hidden="true" className="size-5 shrink-0 text-cobalt" />}
                  <span className="min-w-0">
                    <RS.ItemText>{o.label}</RS.ItemText>
                    {o.hint && <span className="num block text-xs font-normal text-muted">{o.hint}</span>}
                  </span>
                  <RS.ItemIndicator className="absolute right-3">
                    <Check aria-hidden="true" className="size-4 text-cobalt" />
                  </RS.ItemIndicator>
                </RS.Item>
              )
            })}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  )
}
