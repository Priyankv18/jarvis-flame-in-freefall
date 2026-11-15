import { useMemo, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ReferenceArea, ReferenceLine, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { Card, CardHeader, SegmentedList, SegmentedTrigger, Tabs, TabsContent, cn } from '../../ui/index.js'
import { tokens } from '../../ui/tokens.js'
import { completeness, profile } from './stats.js'

const axisTick = (t) => ({ fontFamily: 'var(--font-mono)', fontSize: 11, fill: t.muted })

// Visually hidden table so screen readers get the same numbers as the chart.
// The wrapper div carries sr-only because tables ignore width: 1px and would widen the page.
function SrTable({ caption, head, rows }) {
  return (
    <div className="sr-only">
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r[0]}>{r.map((c, i) => (i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}>{c}</td>))}</tr>
        ))}
      </tbody>
    </table>
    </div>
  )
}

function ProfileTip({ active, payload, unit, t }) {
  if (!active || !payload?.length) return null
  const { v, n } = payload[0].payload
  return (
    <div className="rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lift">
      <p className="num font-semibold">
        {v}
        {unit}
      </p>
      <p>
        {n} {n === 1 ? 'study range includes' : 'study ranges include'} this value
      </p>
    </div>
  )
}

// Area chart: how many fully stated ranges include each oxygen or pressure value,
// with the habitat's own level or band marked.
export function ProfileCard({ investigations, habitat, className }) {
  const [axis, setAxis] = useState('o2')
  const t = useMemo(() => tokens('cobalt', 'cobalt-soft', 'ink', 'muted', 'line', 'lime', 'card', 'navy'), [])
  const maxAtm = Math.max(1, ...investigations.map((i) => i.pressure_atm_max ?? 0))
  const o2Data = useMemo(() => profile(investigations, 'o2', Array.from({ length: 101 }, (_, i) => i)), [investigations])
  const pData = useMemo(() => {
    const steps = Array.from({ length: Math.round(maxAtm / 0.05) + 1 }, (_, i) => Math.round(i * 5) / 100)
    return profile(investigations, 'pressure', steps)
  }, [investigations, maxAtm])

  const knownO2 = investigations.filter((i) => i.o2_min != null && i.o2_max != null).length
  const knownP = investigations.filter((i) => i.pressure_atm_min != null && i.pressure_atm_max != null).length

  const habitatMark = (kind) => {
    if (!habitat) return null
    if (kind === 'o2') {
      if (habitat.o2 != null) return <ReferenceLine x={habitat.o2} stroke={t.ink} strokeWidth={2} strokeDasharray="4 3" label={{ value: habitat.name, position: 'insideTopRight', fill: t.ink, fontSize: 11 }} />
      if (habitat.o2_min != null) return <ReferenceArea x1={habitat.o2_min} x2={100} fill={t.lime} fillOpacity={0.35} stroke={t.ink} strokeDasharray="4 3" label={{ value: `${habitat.name}: ${habitat.o2_min}% or more`, position: 'insideTop', fill: t.ink, fontSize: 11 }} />
      return null
    }
    if (habitat.pressure_atm != null) return <ReferenceLine x={habitat.pressure_atm} stroke={t.ink} strokeWidth={2} strokeDasharray="4 3" label={{ value: habitat.name, position: 'insideTopRight', fill: t.ink, fontSize: 11 }} />
    if (habitat.pressure_atm_max != null) return <ReferenceArea x1={0} x2={habitat.pressure_atm_max} fill={t.lime} fillOpacity={0.35} stroke={t.ink} strokeDasharray="4 3" label={{ value: `${habitat.name}: ${habitat.pressure_atm_max} atm or less`, position: 'insideTop', fill: t.ink, fontSize: 11 }} />
    return null
  }

  const chart = (data, kind, unit, ticks) => (
    <div className="h-56 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 22, right: 8, bottom: 4, left: -18 }}>
          <defs>
            <linearGradient id={`prof-${kind}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={t.cobalt} stopOpacity={0.45} />
              <stop offset="1" stopColor={t.cobalt} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={t.line} />
          {habitatMark(kind)}
          <XAxis dataKey="v" type="number" domain={[0, ticks[ticks.length - 1]]} ticks={ticks} tick={axisTick(t)} tickLine={false} axisLine={{ stroke: t.line }} unit={unit} />
          <YAxis allowDecimals={false} tick={axisTick(t)} tickLine={false} axisLine={false} width={44} />
          <RTooltip content={<ProfileTip unit={unit} t={t} />} cursor={{ stroke: t.navy, strokeDasharray: '3 3' }} />
          <Area type="stepAfter" dataKey="n" stroke={t.cobalt} strokeWidth={2} fill={`url(#prof-${kind})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )

  const pTicks = Array.from({ length: Math.floor(maxAtm) + 1 }, (_, i) => i)
  return (
    <Card className={className}>
      <Tabs value={axis} onValueChange={setAxis}>
        <CardHeader
          eyebrow="Coverage profile"
          title="Where the tested ranges sit"
          action={
            <SegmentedList aria-label="Profile axis">
              <SegmentedTrigger value="o2">Oxygen</SegmentedTrigger>
              <SegmentedTrigger value="pressure">Pressure</SegmentedTrigger>
            </SegmentedList>
          }
        />
        <TabsContent value="o2">
          {chart(o2Data, 'o2', '%', [0, 20, 40, 60, 80, 100])}
          <SrTable caption="Studies whose stated oxygen range includes each 10% step" head={['Oxygen %', 'Studies']} rows={o2Data.filter((d) => d.v % 10 === 0).map((d) => [d.v, d.n])} />
          <p className="mt-3 text-xs text-muted">
            Based on the <span className="num">{knownO2}</span> of {investigations.length} studies that state both ends of
            their oxygen range. The lime band or dashed line is the selected habitat.
          </p>
        </TabsContent>
        <TabsContent value="pressure">
          {chart(pData, 'pressure', '', pTicks)}
          <SrTable caption="Studies whose stated pressure range includes each 0.5 atm step" head={['Pressure atm', 'Studies']} rows={pData.filter((d) => Math.round(d.v * 100) % 50 === 0).map((d) => [d.v, d.n])} />
          <p className="mt-3 text-xs text-muted">
            Pressure in atm. Based on the <span className="num">{knownP}</span> of {investigations.length} studies that
            state both ends of their pressure range.
          </p>
        </TabsContent>
      </Tabs>
    </Card>
  )
}

const SEGMENTS = [
  { key: 'full', label: 'Both ends stated', swatch: 'bg-cobalt' },
  { key: 'partial', label: 'One end only', swatch: 'border-2 border-cobalt bg-cobalt-soft' },
  { key: 'none', label: 'Not stated', swatch: 'hatch' },
]

// Stacked bars: how complete the oxygen, pressure and flow ranges are across the dataset.
export function CompletenessCard({ investigations, className }) {
  const data = useMemo(() => completeness(investigations), [investigations])
  const t = useMemo(() => tokens('cobalt', 'cobalt-soft', 'ink', 'muted', 'card', 'unknown', 'unknown-soft'), [])
  // Count in a small pill so it stays readable on solid, outlined and hatched segments.
  const label = (fill) => ({
    content: ({ x, y, width, height, value }) => {
      if (!value) return null
      const cx = x + width / 2
      const cy = y + height / 2
      return (
        <g>
          {fill !== t.card && <rect x={cx - 13} y={cy - 10} width={26} height={20} rx={10} fill={t.card} />}
          <text x={cx} y={cy + 4} textAnchor="middle" fill={fill} fontSize={12} fontWeight={600} fontFamily="var(--font-mono)">
            {value}
          </text>
        </g>
      )
    },
  })
  return (
    <Card className={className}>
      <CardHeader eyebrow="Data completeness" title="Known vs unknown fields" />
      <div className="h-44 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barCategoryGap={10}>
            <defs>
              <pattern id="comp-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill={t['unknown-soft']} />
                <line x1="0" y1="0" x2="0" y2="6" stroke={t.unknown} strokeWidth="2" />
              </pattern>
            </defs>
            <XAxis type="number" hide domain={[0, investigations.length]} />
            <YAxis type="category" dataKey="axis" width={72} tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: t.ink, fontWeight: 600 }} />
            <Bar dataKey="full" stackId="a" fill={t.cobalt} radius={[8, 0, 0, 8]} isAnimationActive={false}>
              <LabelList dataKey="full" {...label(t.card)} />
            </Bar>
            <Bar dataKey="partial" stackId="a" fill={t['cobalt-soft']} stroke={t.cobalt} strokeWidth={1.5} isAnimationActive={false}>
              <LabelList dataKey="partial" {...label(t.ink)} />
            </Bar>
            <Bar dataKey="none" stackId="a" fill="url(#comp-hatch)" radius={[0, 8, 8, 0]} isAnimationActive={false}>
              <LabelList dataKey="none" {...label(t.ink)} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SrTable
        caption={`How completely ${investigations.length} studies state each range`}
        head={['Field', 'Both ends stated', 'One end only', 'Not stated']}
        rows={data.map((d) => [d.axis, d.full, d.partial, d.none])}
      />
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink">
        {SEGMENTS.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span aria-hidden="true" className={cn('size-3.5 rounded', s.swatch)} />
            {s.label}
          </li>
        ))}
      </ul>
    </Card>
  )
}
