import { UNKNOWN, show, rangeText, coversO2, coversPressure } from '../lib/format.js'
import { Chip, CoverChip, cn } from '../ui/index.js'

// Side-by-side table of up to four studies. Rendered inside the compare dialog.
export default function Compare({ investigations, habitat }) {
  const fields = [
    ['Family', (i) => show(i.family)],
    ['Hardware', (i) => show(i.hardware)],
    ['Fuel state', (i) => show(i.fuel_state)],
    ['Fuels', (i) => show(i.fuels)],
    ['Oxygen (%)', (i) => rangeText(i.o2_min, i.o2_max)],
    ['Pressure (atm)', (i) => rangeText(i.pressure_atm_min, i.pressure_atm_max)],
    ['Flow (cm/s)', (i) => rangeText(i.flow_min, i.flow_max)],
    ['Diluents', (i) => show(i.diluents)],
    ['What was varied', (i) => show(i.variables)],
    ['Pillars', (i) => show(i.pillars)],
    ['Relevance', (i) => show(i.relevance)],
  ]
  const cover = habitat
    ? [
        [`Oxygen vs ${habitat.name}`, (i) => coversO2(i, habitat)],
        [`Pressure vs ${habitat.name}`, (i) => coversPressure(i, habitat)],
      ]
    : []
  return (
    <div className="scroll-thin overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="bg-surface">
          <tr>
            <th scope="col" className="eyebrow w-40 px-4 py-3">Field</th>
            {investigations.map((i) => (
              <th key={i.id} scope="col" className="px-4 py-3 align-bottom">
                <span className="num block text-xs text-muted">{i.id}</span>
                <span className="font-semibold">{i.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cover.map(([label, fn]) => (
            <tr key={label} className="border-t border-line bg-cobalt-soft/40">
              <th scope="row" className="px-4 py-2.5 font-medium">{label}</th>
              {investigations.map((i) => (
                <td key={i.id} className="px-4 py-2.5"><CoverChip value={fn(i)} /></td>
              ))}
            </tr>
          ))}
          {fields.map(([label, fn]) => (
            <tr key={label} className="border-t border-line">
              <th scope="row" className="px-4 py-2.5 font-medium">{label}</th>
              {investigations.map((i) => {
                const v = fn(i)
                return (
                  <td key={i.id} className={cn('px-4 py-2.5 align-top', label.includes('(') && 'num')}>
                    {v === UNKNOWN ? <Chip tone="unknown" size="sm">unknown</Chip> : v}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
