import { LayoutDashboard, Library, ChartScatter, ListOrdered, MessagesSquare } from 'lucide-react'

// The five sections, in rail order. `title` and `blurb` feed the top bar.
export const SECTIONS = [
  {
    id: 'explore',
    label: 'Explore',
    icon: LayoutDashboard,
    title: 'Mission overview',
    blurb: 'What the research covers for the selected habitat, and what it does not.',
  },
  {
    id: 'catalogue',
    label: 'Catalogue',
    icon: Library,
    title: 'Study catalogue',
    blurb: 'Every investigation, its tested ranges and how it fits the habitat.',
  },
  {
    id: 'gapmap',
    label: 'Gap map',
    icon: ChartScatter,
    title: 'Gap map',
    blurb: 'Tested oxygen and pressure ranges against where crews will live.',
  },
  {
    id: 'rank',
    label: 'Rank',
    icon: ListOrdered,
    title: 'Relevance ranking',
    blurb: 'Weight what matters and see which studies speak to this habitat.',
  },
  {
    id: 'ask',
    label: 'Ask',
    icon: MessagesSquare,
    title: 'Ask JARVIS',
    blurb: 'Questions answered from the project data, with checked citations.',
  },
]

export const sectionById = (id) => SECTIONS.find((s) => s.id === id) ?? SECTIONS[0]
