// Read a colour token from index.css at runtime, for libraries (Recharts) that set
// SVG attributes directly. Keeps raw colour values out of component code.
export function token(name) {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim()
}

export function tokens(...names) {
  return Object.fromEntries(names.map((n) => [n, token(n)]))
}
