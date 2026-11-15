import { forwardRef } from 'react'
import * as RTabs from '@radix-ui/react-tabs'
import { cn } from './cn.js'

export const Tabs = RTabs.Root
export const TabsContent = RTabs.Content

// Pill-shaped segmented tabs for switching a view inside a card.
export function SegmentedList({ className, ...props }) {
  return (
    <RTabs.List
      className={cn('inline-flex flex-wrap gap-1 rounded-pill border border-line bg-surface p-1', className)}
      {...props}
    />
  )
}

export const SegmentedTrigger = forwardRef(function SegmentedTrigger({ className, ...props }, ref) {
  return (
    <RTabs.Trigger
      ref={ref}
      className={cn(
        'h-8 cursor-pointer rounded-pill px-3.5 text-sm font-medium text-muted transition-colors hover:text-ink',
        'data-[state=active]:bg-navy data-[state=active]:font-semibold data-[state=active]:text-white',
        className,
      )}
      {...props}
    />
  )
})

export const TabsList = RTabs.List
export const TabsTrigger = RTabs.Trigger
