import { Command } from 'cmdk'
import { CornerDownLeft, FileText } from 'lucide-react'
import { Dialog, DialogContent } from '../ui/index.js'
import { SECTIONS } from './sections.js'
import { HabitatIcon } from './icons.jsx'
import { habitatHint } from './habitat.js'

const group =
  'px-2 pt-3 pb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:uppercase'
const item =
  'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink aria-selected:bg-cobalt-soft data-[selected=true]:bg-cobalt-soft'

// Ctrl+K palette: jump to a section, switch habitat or open a study.
export function CommandPalette({ open, onOpenChange, habitats, investigations, onSection, onHabitat, onStudy }) {
  const run = (fn) => () => {
    onOpenChange(false)
    fn()
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent bare title="Command palette" description="Search sections, habitats and studies" className="max-w-xl">
        <Command label="Command palette" loop className="flex max-h-[70vh] flex-col">
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Command.Input
              autoFocus
              placeholder="Jump to a habitat, a study or a section"
              className="h-14 w-full bg-transparent text-base text-ink outline-none placeholder:text-muted"
            />
            <kbd className="num hidden rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted sm:block">Esc</kbd>
          </div>
          <Command.List className="scroll-thin overflow-y-auto pb-2">
            <Command.Empty className="px-4 py-8 text-center text-sm text-muted">No match in the dataset.</Command.Empty>
            <Command.Group heading="Sections" className={group}>
              {SECTIONS.map((s) => (
                <Command.Item key={s.id} value={`section ${s.label}`} onSelect={run(() => onSection(s.id))} className={item}>
                  <s.icon aria-hidden="true" className="size-4 text-cobalt" />
                  <span className="flex-1">{s.label}</span>
                  <span className="text-xs text-muted">{s.title}</span>
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="Habitats" className={group}>
              {habitats.map((h) => (
                <Command.Item key={h.id} value={`habitat ${h.name} ${h.id}`} onSelect={run(() => onHabitat(h.id))} className={item}>
                  <HabitatIcon id={h.id} className="size-4 text-cobalt" />
                  <span className="flex-1">{h.name}</span>
                  <span className="num text-xs text-muted">{habitatHint(h)}</span>
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="Studies" className={group}>
              {investigations.map((i) => (
                <Command.Item
                  key={i.id}
                  value={`study ${i.id} ${i.name} ${i.family ?? ''}`}
                  onSelect={run(() => onStudy(i.id))}
                  className={item}
                >
                  <FileText aria-hidden="true" className="size-4 text-cobalt" />
                  <span className="min-w-0 flex-1 truncate">{i.name}</span>
                  <span className="num text-xs text-muted">{i.id}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
          <div className="flex items-center gap-2 border-t border-line px-4 py-2 text-xs text-muted">
            <CornerDownLeft aria-hidden="true" className="size-3.5" /> to open, arrow keys to move
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
