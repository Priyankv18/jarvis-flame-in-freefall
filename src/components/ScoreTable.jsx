// OWNER: Priyank (scoring and visuals). Restyled as a leaderboard; scoring is unchanged.
// Ranking tab: pick weights, see every investigation's 0-100 score for the selected
// crew environment, a breakdown bar (one colour per factor) and a plain-English reason.
// Unknown factors show as a hatched part of the bar: they are never guessed or hidden.
import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  DEFAULT_WEIGHTS, FACTORS, rankInvestigations, explainScore,
} from '../lib/scoring.js';
import { Button, Card, Chip, CountUp, Select, Slider, cn } from '../ui/index.js';

// Factor colours come from design tokens, not from scoring.js, so the theme stays in one place.
const factorColor = (key) => `var(--color-f-${key})`;

function WeightSliders({ weights, setWeights, unknownValue, setUnknownValue }) {
  const sum = FACTORS.reduce((s, f) => s + weights[f.key], 0) || 1;
  return (
    <Card className="lg:sticky lg:top-44" aria-labelledby="weights-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Weights</p>
          <h2 id="weights-title" className="mt-1 font-display text-2xl font-semibold">What matters to you?</h2>
        </div>
        <Button size="sm" onClick={() => { setWeights(DEFAULT_WEIGHTS); setUnknownValue(0); }}>
          <RotateCcw aria-hidden="true" className="size-3.5" /> Reset
        </Button>
      </div>
      <div role="group" aria-label="Score weights">
      <ul className="mt-5 grid gap-5">
        {FACTORS.map((f) => (
          <li key={f.key}>
            <div className="mb-2 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-semibold">
                <span aria-hidden="true" className="size-3 rounded" style={{ background: factorColor(f.key) }} />
                {f.label}
              </span>
              <span className="num text-xs text-muted">
                {weights[f.key]}/10 · <span className="font-semibold text-ink">{Math.round((weights[f.key] / sum) * 100)}%</span>
              </span>
            </div>
            <Slider
              value={weights[f.key]}
              onValueChange={(v) => setWeights({ ...weights, [f.key]: v })}
              label={`${f.label} weight`}
              valueText={`${weights[f.key]} of 10, ${Math.round((weights[f.key] / sum) * 100)} percent of the score`}
              color={factorColor(f.key)}
            />
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{f.help}</p>
          </li>
        ))}
      </ul>
      </div>
      <div className="mt-6 border-t border-line pt-4">
        <p className="eyebrow mb-2">Unknown data counts as</p>
        <Select
          label="Unknown data counts as"
          value={unknownValue}
          onValueChange={(v) => setUnknownValue(Number(v))}
          options={[
            { value: 0, label: '0 (strict)', hint: 'Unknown earns nothing' },
            { value: 0.5, label: '0.5 (neutral)', hint: 'Unknown earns half' },
          ]}
          className="w-full"
        />
      </div>
    </Card>
  );
}

// Earned points first (solid, per factor), then unknown factors (hatched), then empty track.
function BreakdownBar({ result, size = 'md' }) {
  const title = FACTORS.map((f) => {
    const p = result.parts[f.key];
    const pts = result.contributions[f.key].toFixed(1);
    return `${f.label}: ${p == null ? 'unknown' : p.toFixed(2)} × ${Math.round(result.shares[f.key] * 100)}% = ${pts} pts`;
  }).join('\n');
  const known = FACTORS.filter((f) => result.parts[f.key] != null);
  const unknown = FACTORS.filter((f) => result.parts[f.key] == null);
  return (
    <div className="min-w-0">
      <div
        className={cn('flex w-full overflow-hidden rounded-pill bg-surface ring-1 ring-line', size === 'lg' ? 'h-3.5' : 'h-2.5')}
        role="img"
        aria-label={title.replace(/\n/g, '; ')}
        title={title}
      >
        {known.map((f) => (
          <span key={f.key} className="h-full" style={{ width: `${result.contributions[f.key]}%`, background: factorColor(f.key) }} />
        ))}
        {unknown.map((f) => (
          <span key={f.key} className="hatch relative h-full" style={{ width: `${result.shares[f.key] * 100}%` }}>
            {result.contributions[f.key] > 0 && (
              <span
                className="absolute inset-y-0 left-0 opacity-40"
                style={{ width: `${(result.contributions[f.key] / (result.shares[f.key] * 100)) * 100}%`, background: factorColor(f.key) }}
              />
            )}
          </span>
        ))}
      </div>
      <p className={cn('mt-1 text-[11px]', result.known < 0.5 ? 'font-semibold text-alert' : 'text-muted')}>
        Based on <span className="num">{Math.round(result.known * 100)}%</span> known data
        {unknown.length > 0 && <> · unknown: {unknown.map((f) => f.label.toLowerCase()).join(', ')}</>}
      </p>
    </div>
  );
}

function Podium({ ranked, habitat }) {
  return (
    <ol className="grid gap-4 md:grid-cols-3" aria-label="Top three investigations">
      {ranked.slice(0, 3).map((r, i) => {
        const first = i === 0;
        const pillars = r.inv.pillars ?? (r.inv.safety_pillar ? [r.inv.safety_pillar] : []);
        return (
          <li key={r.inv.id} className="min-w-0">
            <Card tone={first ? 'navy' : 'default'} className="h-full">
              <div className={cn(first && 'on-dark')}>
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      'display flex size-12 items-center justify-center rounded-2xl text-3xl',
                      first ? 'bg-lime text-ink' : 'bg-surface text-ink',
                    )}
                  >
                    <span className="sr-only">Rank </span>{i + 1}
                  </span>
                  <p className="text-right">
                    <span className={cn('display text-6xl', first && 'text-lime')}><CountUp value={r.total} /></span>
                    <span className={cn('block text-xs', first ? 'text-white/80' : 'text-muted')}>score / 100</span>
                  </p>
                </div>
                <h3 className="num mt-4 text-sm font-semibold">{r.inv.id}</h3>
                {r.inv.name && <p className="font-display text-xl leading-tight font-semibold">{r.inv.name}</p>}
                <div className={cn('mt-4 rounded-xl p-2', first && 'bg-white')}>
                  <BreakdownBar result={r} size="lg" />
                </div>
                <p className={cn('mt-3 text-sm leading-relaxed', first ? 'text-white/90' : 'text-muted')}>{explainScore(r, habitat)}</p>
                {pillars.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {pillars.map((p) => <Chip key={p} size="sm" tone={first ? 'onDark' : 'neutral'}>{p}</Chip>)}
                  </div>
                )}
              </div>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}

export default function ScoreTable({ investigations, habitat }) {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [unknownValue, setUnknownValue] = useState(0);

  const ranked = useMemo(
    () => rankInvestigations(investigations, habitat, weights, unknownValue),
    [investigations, habitat, weights, unknownValue],
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Most relevant for</p>
          <h2 className="display text-4xl">{habitat?.name ?? 'unknown habitat'}</h2>
        </div>
        <p className="max-w-xl text-sm text-muted">
          Each investigation gets a 0 to 100 score: a weighted sum of five factors. The solid part of each bar is earned
          score; the hatched part is weight whose data is unknown.
        </p>
      </div>

      <Podium ranked={ranked} habitat={habitat} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card pad="none" className="order-2 overflow-hidden lg:order-1">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4 sm:px-6">
            <h2 className="font-display text-2xl font-semibold">Leaderboard</h2>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Factor colours">
              {FACTORS.map((f) => (
                <li key={f.key} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: factorColor(f.key) }} />
                  {f.label}
                </li>
              ))}
              <li className="flex items-center gap-1.5"><span aria-hidden="true" className="hatch size-2.5 rounded-sm" />unknown</li>
            </ul>
          </div>
          <ol aria-label="All investigations ranked">
            {ranked.map((r, i) => (
              <li key={r.inv.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)_3.5rem] items-start gap-x-3 gap-y-2 border-t border-line px-5 py-4 first:border-t-0 sm:px-6 md:grid-cols-[2.5rem_minmax(0,14rem)_minmax(0,1fr)_3.5rem]">
                <span className="num pt-0.5 text-sm font-semibold text-muted"><span className="sr-only">Rank </span>{i + 1}</span>
                <div className="min-w-0">
                  <p className="num text-xs text-muted">{r.inv.id}</p>
                  <p className="text-sm leading-snug font-semibold">{r.inv.name}</p>
                </div>
                <div className="col-span-3 col-start-1 min-w-0 md:col-span-1 md:col-start-auto">
                  <BreakdownBar result={r} />
                  <p className="mt-1.5 text-xs leading-relaxed text-ink">{explainScore(r, habitat)}</p>
                </div>
                <p className="display col-start-3 row-start-1 text-right text-4xl md:col-start-4">
                  {r.total}
                </p>
              </li>
            ))}
          </ol>
        </Card>
        <div className="order-1 lg:order-2">
          <WeightSliders
            weights={weights}
            setWeights={setWeights}
            unknownValue={unknownValue}
            setUnknownValue={setUnknownValue}
          />
        </div>
      </div>
    </div>
  );
}
