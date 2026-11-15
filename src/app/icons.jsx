import { useId } from 'react'

// Brand mark: a round microgravity flame (flames burn as spheres in orbit). Our own glyph.
export function FlameMark({ className = 'size-10' }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-g`} cx="50%" cy="56%" r="50%">
          <stop offset="0" style={{ stopColor: 'var(--color-card)' }} />
          <stop offset="0.35" style={{ stopColor: 'var(--color-lime)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-cobalt)' }} />
        </radialGradient>
      </defs>
      <rect width="40" height="40" rx="12" style={{ fill: 'var(--color-navy-deep)' }} />
      <circle cx="20" cy="20" r="11" fill={`url(#${id}-g)`} />
      <circle cx="20" cy="20" r="14.5" fill="none" strokeWidth="1.2" style={{ stroke: 'var(--color-lime)' }} strokeOpacity="0.6" />
    </svg>
  )
}

// Simple line icons for each habitat (generic shapes, no logos or patches).
export function HabitatIcon({ id, className = 'size-5' }) {
  const common = {
    viewBox: '0 0 32 32',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    className,
  }
  switch (id) {
    case 'iss':
      return (
        <svg {...common}>
          <rect x="13" y="12" width="6" height="8" rx="1" />
          <path d="M16 12V8M16 20v4M13 16H8M19 16h5" />
          <rect x="3" y="11" width="5" height="10" rx="0.5" />
          <rect x="24" y="11" width="5" height="10" rx="0.5" />
        </svg>
      )
    case 'moon_base':
      return (
        <svg {...common}>
          <path d="M5 23a11 11 0 0 1 22 0" />
          <path d="M3 23h26M12 23v-4h8v4" />
          <circle cx="25" cy="7" r="3" />
        </svg>
      )
    case 'rover':
      return (
        <svg {...common}>
          <path d="M5 19v-6a3 3 0 0 1 3-3h12l5 5v4z" />
          <path d="M20 10v5h5" />
          <circle cx="10" cy="22" r="3" />
          <circle cx="22" cy="22" r="3" />
        </svg>
      )
    case 'mars_base':
      return (
        <svg {...common}>
          <path d="M6 24a7 7 0 0 1 14 0M18 24a5 5 0 0 1 10 0" />
          <path d="M3 24h26" />
          <circle cx="10" cy="8" r="4" />
        </svg>
      )
    case 'suit':
      return (
        <svg {...common}>
          <path d="M8 15a8 8 0 0 1 16 0v5a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4z" />
          <rect x="11" y="13" width="10" height="6" rx="3" />
          <path d="M10 28h12" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="9" />
        </svg>
      )
  }
}
