import { cn } from './cn.js'
import { CountUp } from './CountUp.jsx'

// Big condensed numeral with a tiny label above and a short note below.
export function Stat({ label, value, suffix, note, onDark = false, size = 'lg', className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className={cn('eyebrow', onDark && 'text-white/80')}>{label}</p>
      <p className={cn('display mt-1', size === 'xl' ? 'text-7xl sm:text-8xl' : 'text-5xl')}>
        {typeof value === 'number' ? <CountUp value={value} /> : value}
        {suffix && (
          <span className={cn('ml-1 text-2xl font-semibold', onDark ? 'text-white/80' : 'text-muted')}>{suffix}</span>
        )}
      </p>
      {note && <p className={cn('mt-1 text-sm', onDark ? 'text-white/85' : 'text-muted')}>{note}</p>}
    </div>
  )
}
