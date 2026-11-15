import * as RP from '@radix-ui/react-popover'
import { cn } from './cn.js'

export const Popover = RP.Root
export const PopoverTrigger = RP.Trigger

export function PopoverContent({ children, className, align = 'end', label }) {
  return (
    <RP.Portal>
      <RP.Content
        align={align}
        sideOffset={8}
        collisionPadding={12}
        aria-label={label}
        className={cn(
          'anim-rise z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-card p-4 text-sm text-ink shadow-lift',
          className,
        )}
      >
        {children}
      </RP.Content>
    </RP.Portal>
  )
}
