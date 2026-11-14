import { show, rangeText, coversO2, coversPressure, coverLabel } from '../lib/format.js'

export default function Compare({ investigations, habitat, onClose }) {
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
    ...(habitat
      ? [
          [`Oxygen vs ${habitat.name}`, (i) => coverLabel(coversO2(i, habitat))],
          [`Pressure vs ${habitat.name}`, (i) => coverLabel(coversPressure(i, habitat))],
        ]
      : []),
  ]
  return (
    <section aria-label="Comparison" className="rounded border border-slate-300 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Side by side</h3>
        <button onClick={onClose} className="rounded border border-slate-400 px-2 py-1 text-sm">Close</button>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-3 py-2">Field</th>
              {investigations.map((i) => (
                <th key={i.id} className="px-3 py-2">{i.id}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map(([label, fn]) => (
              <tr key={label} className="border-t border-slate-200">
                <th scope="row" className="px-3 py-2 font-medium">{label}</th>
                {investigations.map((i) => {
                  const v = fn(i)
                  return (
                    <td key={i.id} className={`px-3 py-2 ${v === 'unknown' ? 'text-slate-600' : ''}`}>{v}</td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
