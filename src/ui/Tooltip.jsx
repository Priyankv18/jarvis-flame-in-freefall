import * as RT from '@radix-ui/react-tooltip'
import { cn } from './cn.js'

export const TooltipProvider = RT.Provider

// <Tooltip content="..."><button/></Tooltip>. The child must accept a ref.
export function Tooltip({ content, side = 'top', align = 'center', children, className, disabled }) {
  if (disabled || !content) return children
  return (
    <RT.Root>
      <RT.Trigger asChild>{children}</RT.Trigger>
      <RT.Portal>
        <RT.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={12}
          className={cn(
            'anim-rise z-50 max-w-xs rounded-xl bg-ink px-3 py-2 text-xs leading-relaxed text-white shadow-lift',
            className,
          )}
        >
          {content}
          <RT.Arrow className="fill-ink" />
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  )
}
