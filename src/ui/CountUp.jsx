import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'motion/react'

// Animates a whole number from its previous value to `value`. Jumps straight there
// under prefers-reduced-motion. Screen readers always get the final number.
export function CountUp({ value, duration = 0.8, className }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(reduce ? value : 0)
  const from = useRef(reduce ? value : 0)

  useEffect(() => {
    if (reduce || typeof value !== 'number') {
      setShown(value)
      from.current = value
      return undefined
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    })
    from.current = value
    return () => controls.stop()
  }, [value, duration, reduce])

  return (
    <span className={className}>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{value}</span>
    </span>
  )
}
