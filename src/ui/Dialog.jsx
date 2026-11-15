import * as RD from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from './cn.js'

export const Dialog = RD.Root
export const DialogTrigger = RD.Trigger
export const DialogClose = RD.Close

function Overlay() {
  return <RD.Overlay className="anim-overlay fixed inset-0 z-40 bg-ink/45 backdrop-blur-[2px]" />
}

function CloseButton({ label = 'Close' }) {
  return (
    <RD.Close
      aria-label={label}
      className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-pill border border-line bg-card text-ink hover:bg-surface"
    >
      <X aria-hidden="true" className="size-4" />
    </RD.Close>
  )
}

// Title row shared by the centred dialog and the drawer. Radix needs a Title and a Description.
function Head({ eyebrow, title, description, hideDescription }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <RD.Title className="mt-1 font-display text-2xl leading-tight font-semibold">{title}</RD.Title>
        <RD.Description className={cn('mt-1 text-sm text-muted', hideDescription && 'sr-only')}>
          {description}
        </RD.Description>
      </div>
      <CloseButton />
    </div>
  )
}

// Centred modal, used for the compare view and the command palette.
export function DialogContent({ eyebrow, title, description, hideDescription, children, className, bare = false }) {
  return (
    <RD.Portal>
      <Overlay />
      <RD.Content
        className={cn(
          'anim-pop fixed top-1/2 left-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-card bg-card text-ink shadow-lift',
          className,
        )}
      >
        {bare ? (
          <>
            <RD.Title className="sr-only">{title}</RD.Title>
            <RD.Description className="sr-only">{description}</RD.Description>
            {children}
          </>
        ) : (
          <>
            <Head eyebrow={eyebrow} title={title} description={description} hideDescription={hideDescription} />
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          </>
        )}
      </RD.Content>
    </RD.Portal>
  )
}

// Right-side slide-over panel, used for study details.
export function DrawerContent({ eyebrow, title, description, hideDescription, children, footer, className }) {
  return (
    <RD.Portal>
      <Overlay />
      <RD.Content
        className={cn(
          'anim-drawer fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-card text-ink shadow-lift sm:rounded-l-card',
          className,
        )}
      >
        <Head eyebrow={eyebrow} title={title} description={description} hideDescription={hideDescription} />
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="border-t border-line px-5 py-4 sm:px-6">{footer}</div>}
      </RD.Content>
    </RD.Portal>
  )
}
