// OWNER: Priyank (scoring and visuals). Restyled with the design tokens and src/ui kit;
// the model calls, evidence check, state and animation maths are unchanged.
// Saffire-style flame simulator. Pick a material that Saffire or BASS really burned, set
// oxygen, pressure, airflow and gravity, and watch an illustrative flame spread across a sheet.
// Next to it, an evidence check lists which real investigations in our dataset tested those
// conditions, so the simulator always points back to the data (and to the gaps).
// The physics is a simple trend model (src/lib/flameModel.js), labelled as such in the UI.
import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleOff, Flame, FlaskConical, RotateCcw } from 'lucide-react';
import { GRAVITY, MATERIALS, conditionsFor, simulate } from '../lib/flameModel.js';
import { getRange } from '../lib/scoring.js';
import { Button, Card, Chip, Select, Slider, Tooltip, cn } from '../ui/index.js';
import { tokens } from '../ui/tokens.js';

const DEFAULTS = { o2: 21, psi: 14.7, flow: 15, gravity: 'micro', material: 'sibal' };

// Scene colours come from index.css tokens; rgba() adds alpha to a token's hex value.
const SCENE = [
  'duct-top', 'duct-bottom', 'duct-grid', 'airflow', 'sample', 'char', 'char-edge', 'ember', 'ember-dim',
  'igniter', 'smoke', 'flame-blue', 'flame-blue-deep', 'flame-gold', 'flame-core', 'scene-text', 'flame-out',
];
function rgba(hex, a) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  if (Number.isNaN(n)) return `rgba(0,0,0,${a})`;
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------------------------------------------------------------------------
// Canvas animation
// ---------------------------------------------------------------------------
function useFlameCanvas(canvasRef, params, result, runId) {
  const state = useRef({ front: 0, particles: [], out: 0, t: 0 });
  const live = useRef({ params, result });
  live.current = { params, result };

  // restart the burn when asked
  useEffect(() => {
    state.current = { front: 0, particles: [], out: 0, t: 0 };
  }, [runId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const c = tokens(...SCENE);
    let raf = 0;
    let last = performance.now();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { params: p, result: r } = live.current;
      const s = state.current;
      s.t += dt;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      const g = GRAVITY.find((x) => x.id === p.gravity)?.g ?? 0;

      // sample sheet geometry
      const sx = W * 0.08;
      const sw = W * 0.84;
      const sy = H * 0.56;
      const sh = Math.max(10, H * 0.07);

      // advance the flame front
      const speed = r.burns ? (0.025 + (r.index / 100) * 0.22) : 0;
      if (r.burns && s.front < 1) s.front = Math.min(1, s.front + speed * dt * (reduce ? 3 : 1));
      if (!r.burns) s.out = Math.min(1, s.out + dt * 0.9);
      else s.out = 0;
      if (s.front >= 1) {
        s.done = (s.done ?? 0) + dt;
        if (s.done > 2.2) { s.front = 0; s.done = 0; s.particles = []; }
      }
      const fx = sx + sw * Math.max(0.015, s.front);

      // background duct
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, c['duct-top']);
      bg.addColorStop(1, c['duct-bottom']);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = rgba(c['duct-grid'], 0.35);
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // airflow streaks (left to right), speed follows the forced flow
      const flowPx = 8 + p.flow * 4;
      ctx.strokeStyle = rgba(c.airflow, 0.32);
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 14; i += 1) {
        const y = H * 0.12 + ((i * 37) % Math.max(1, H * 0.78));
        const off = ((s.t * flowPx + i * 61) % (W + 60)) - 60;
        if (p.flow > 0) { ctx.beginPath(); ctx.moveTo(off, y); ctx.lineTo(off + 26, y); ctx.stroke(); }
      }

      // sample: unburned part, char behind the front
      ctx.fillStyle = c.sample;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(sx, sy, sw, sh);
      ctx.globalAlpha = 1;
      const charW = Math.max(0, fx - sx);
      const char = ctx.createLinearGradient(sx, 0, fx, 0);
      char.addColorStop(0, c.char);
      char.addColorStop(Math.max(0, 1 - 30 / Math.max(charW, 31)), c['char-edge']);
      char.addColorStop(1, r.burns ? c.ember : c['ember-dim']);
      ctx.fillStyle = char;
      ctx.fillRect(sx, sy, charW, sh);
      ctx.strokeStyle = rgba(c.smoke, 0.5);
      ctx.strokeRect(sx, sy, sw, sh);

      // igniter wire
      ctx.strokeStyle = c.igniter;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - 6, sy - 4);
      ctx.lineTo(sx - 6, sy + sh + 4);
      ctx.stroke();

      // flame
      const alive = r.burns ? 1 : 1 - s.out;
      if (alive > 0.02 && s.front < 1) {
        const hot = Math.min(1, r.index / 70);
        const size = (16 + r.index * 0.55) * (r.burns ? 1 : 0.6 + 0.4 * alive);
        const tall = 1 + g * 1.6; // gravity stretches the flame upward
        const flick = reduce ? 1 : 1 + 0.06 * Math.sin(s.t * 13) + 0.04 * Math.sin(s.t * 29);
        const cx = fx + 2;
        const cy = sy + sh / 2 - (size * (tall - 1)) * 0.45;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, tall * flick);
        // outer glow: blue when weak (microgravity), orange when strong or in gravity.
        // The orange shifts with `warm` (a model output), so it is computed rather than a token.
        const outer = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.6);
        const warm = Math.min(1, hot * 0.8 + g * 0.6);
        const glow = (a) => (warm > 0.5 ? `rgba(255,${Math.round(150 - 60 * warm)},47,${a})` : rgba(c['flame-blue'], a));
        outer.addColorStop(0, glow(0.55 * alive));
        outer.addColorStop(1, glow(0));
        ctx.fillStyle = outer;
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.6, 0, Math.PI * 2);
        ctx.fill();
        // core
        const core = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        core.addColorStop(0, rgba(c['flame-core'], 0.9 * alive * (0.4 + hot * 0.6)));
        core.addColorStop(0.35, warm > 0.5 ? rgba(c['flame-gold'], 0.8 * alive) : rgba(c['flame-blue'], 0.8 * alive));
        core.addColorStop(1, rgba(c['flame-blue-deep'], 0));
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // smoke / soot particles: rise with gravity, drift with the airflow
        if (!reduce && r.burns && Math.random() < 0.6) {
          s.particles.push({ x: cx, y: cy, vx: p.flow * 1.4 + (Math.random() - 0.5) * 10, vy: -g * 40 - Math.random() * 6, life: 1 });
        }
      }
      s.particles = s.particles.filter((q) => q.life > 0).slice(-140);
      for (const q of s.particles) {
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.life -= dt * 0.45;
        ctx.fillStyle = rgba(c.smoke, 0.25 * q.life);
        ctx.beginPath();
        ctx.arc(q.x, q.y, 2 + (1 - q.life) * 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // labels
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillStyle = c['scene-text'];
      ctx.fillText(p.flow > 0 ? `airflow ${p.flow} cm/s  ->` : 'no forced airflow', 12, 18);
      ctx.fillText(GRAVITY.find((x) => x.id === p.gravity)?.label ?? '', 12, H - 12);
      if (!r.burns && s.out >= 1) {
        ctx.fillStyle = c['flame-out'];
        ctx.font = '700 18px "Barlow Condensed", sans-serif';
        ctx.fillText('Flame out', sx, sy - 18);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [canvasRef]);
}

// ---------------------------------------------------------------------------
// Evidence: which real investigations tested these conditions?
// ---------------------------------------------------------------------------
function evidenceFor(investigations, p) {
  const inRange = (r, v) => r && v >= r.min && v <= r.max;
  const both = [];
  const o2Only = [];
  for (const inv of investigations) {
    const o2 = getRange(inv, 'o2');
    if (!inRange(o2, p.o2)) continue;
    const pr = getRange(inv, 'pressure');
    if (pr && inRange({ min: pr.min - 0.3, max: pr.max + 0.3 }, p.psi)) both.push(inv);
    else if (!pr) o2Only.push(inv);
  }
  return { both, o2Only };
}

function Control({ label, unit, min, max, step, value, onChange, hint }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold">{label}</span>
        <span className="num rounded-pill bg-cobalt-soft px-2 py-0.5 text-xs font-semibold text-cobalt-deep">
          {value}{unit}
        </span>
      </div>
      <Slider
        value={value}
        onValueChange={onChange}
        min={min}
        max={max}
        step={step}
        label={label}
        valueText={`${value}${unit}`}
      />
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

export default function FlameSimulator({ investigations = [], habitat }) {
  const [p, setP] = useState(() => ({ ...DEFAULTS, ...conditionsFor(habitat) }));
  const [runId, setRunId] = useState(0);
  const canvasRef = useRef(null);
  const set = (patch) => setP((cur) => ({ ...cur, ...patch }));

  // follow the habitat selector: oxygen, pressure and gravity come from the selected habitat
  useEffect(() => {
    const c = conditionsFor(habitat);
    if (c) { setP((cur) => ({ ...cur, ...c })); setRunId((n) => n + 1); }
  }, [habitat?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const result = useMemo(() => simulate(p), [p]);
  const material = MATERIALS.find((m) => m.id === p.material);
  const evidence = useMemo(() => evidenceFor(investigations, p), [investigations, p]);
  const saffire = investigations.filter((i) => /^SAFFIRE/i.test(i.id));
  useFlameCanvas(canvasRef, p, result, runId);

  const ratioText = result.ratio == null
    ? (result.burns ? 'Does not burn on Earth in normal air' : '')
    : `${result.ratio.toFixed(1)}x the same material on Earth`;
  const partialG = p.gravity === 'lunar' || p.gravity === 'mars';

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="eyebrow">Saffire-style flame simulator</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Saffire burned large sheets of real spacecraft materials inside an empty cargo vehicle after it left the
            ISS. Recreate that kind of test here: choose a material, change the air, and watch how the flame behaves.
            Then check which real investigations back it up.
          </p>
        </div>
        <Tooltip content="Trend model, not NASA measurements">
          <span tabIndex={0} className="rounded-pill">
            <Chip tone="lime" size="lg" icon={FlaskConical}>Illustrative model</Chip>
          </span>
        </Tooltip>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Stage: canvas plus live readout */}
        <Card pad="none" className="overflow-hidden">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="block h-56 w-full sm:h-72"
              role="img"
              aria-label={`Animated flame on ${material.short}: ${result.burns ? 'burning' : 'goes out'}`}
            />
            <div className="on-dark absolute top-3 right-3">
              <Button variant="onDark" size="sm" onClick={() => setRunId((n) => n + 1)}>
                <RotateCcw aria-hidden="true" className="size-3.5" /> Re-ignite
              </Button>
            </div>
          </div>
          <div className="grid gap-3 border-t border-line p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-x-6" aria-live="polite">
            <p
              className={cn(
                'inline-flex items-center gap-2 font-display text-2xl font-semibold',
                result.burns ? 'text-ink' : 'text-alert',
              )}
            >
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-2xl',
                  result.burns ? 'bg-lime text-ink' : 'bg-alert-soft text-alert',
                )}
              >
                {result.burns ? <Flame aria-hidden="true" className="size-5" /> : <CircleOff aria-hidden="true" className="size-5" />}
              </span>
              {result.burns ? 'Burns' : 'Self-extinguishes'}
            </p>
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 sm:justify-end">
              <p>
                <span className={cn('display text-5xl', result.burns ? 'text-cobalt' : 'text-muted')}>{result.index}</span>
                <span className="ml-1 text-xs text-muted">/100 spread index</span>
              </p>
              {ratioText && <p className="num text-sm font-semibold text-navy">{ratioText}</p>}
            </div>
            <p className="text-sm leading-relaxed text-muted sm:col-span-2">{result.reason}</p>
          </div>
        </Card>

        {/* Controls */}
        <Card>
          <p className="eyebrow">Conditions</p>
          <div className="mt-3">
            <p className="mb-2 text-sm font-semibold" id="sim-material">Material (burned in Saffire / BASS)</p>
            <Select
              label="Material (burned in Saffire / BASS)"
              value={p.material}
              onValueChange={(v) => { set({ material: v }); setRunId((n) => n + 1); }}
              options={MATERIALS.map((m) => ({ value: m.id, label: m.name }))}
              className="w-full"
            />
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{material.note}</p>
          </div>
          <div className="mt-5 grid gap-5">
            <Control label="Oxygen" unit="%" min={15} max={100} step={1} value={p.o2} onChange={(v) => set({ o2: v })}
              hint="Earth air is 21%. Moon base plans: 30% or more." />
            <Control label="Pressure" unit=" psi" min={3} max={15} step={0.1} value={p.psi} onChange={(v) => set({ psi: v })}
              hint="Sea level is 14.7 psi. Moon base plans: 10.2 psi or less." />
            <Control label="Airflow (ventilation)" unit=" cm/s" min={0} max={60} step={1} value={p.flow} onChange={(v) => set({ flow: v })}
              hint="BASS tested 5 to 50 cm/s. 0 = still air." />
            <div>
              <p className="mb-2 text-sm font-semibold">Gravity</p>
              <div role="group" aria-label="Gravity" className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-1 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {GRAVITY.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={p.gravity === g.id}
                    onClick={() => { set({ gravity: g.id }); setRunId((n) => n + 1); }}
                    className={cn(
                      'h-9 cursor-pointer rounded-xl px-2 text-sm font-medium transition-colors',
                      p.gravity === g.id ? 'bg-navy font-semibold text-white' : 'text-muted hover:text-ink',
                    )}
                  >
                    {g.label.split(' (')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className={cn(!evidence.both.length && 'overflow-hidden')}>
          {!evidence.both.length && <span aria-hidden="true" className="hatch absolute inset-y-0 left-0 w-2" />}
          <p className="eyebrow">Evidence check</p>
          <h3 className="mt-1 font-display text-2xl font-semibold">Which studies back this up?</h3>
          {evidence.both.length > 0 ? (
            <>
              <p className="mt-3 text-sm">Tested at <span className="num">{p.o2}%</span> O2 and about <span className="num">{p.psi} psi</span> in our dataset:</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {evidence.both.map((i) => (
                  <Chip key={i.id} tone="cobalt" title={i.name} className="num">{i.id}</Chip>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <Chip tone="unknown" size="md">Research gap</Chip>
              <span>No investigation in our dataset tested both <span className="num">{p.o2}%</span> oxygen and <span className="num">{p.psi} psi</span>.</span>
            </div>
          )}
          {evidence.o2Only.length > 0 && (
            <p className="mt-3 text-sm text-muted">
              Same oxygen, pressure not stated: <span className="num">{evidence.o2Only.map((i) => i.id).join(', ')}</span>.
            </p>
          )}
          {partialG && (
            <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-sm text-muted">
              No partial-gravity combustion data exists in PSI yet, so Moon and Mars behaviour here is extrapolated.
            </p>
          )}
        </Card>

        <Card>
          <p className="eyebrow">From the dataset</p>
          <h3 className="mt-1 font-display text-2xl font-semibold">What the real Saffire flights did</h3>
          <ul className="mt-3 grid gap-2.5 text-sm leading-relaxed">
            {saffire.map((i) => (
              <li key={i.id} className="flex gap-3">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-pill bg-cobalt" />
                <span>
                  <span className="num font-semibold">{i.id}</span>
                  {i.tests ? <span className="text-muted"> ({i.tests})</span> : ''}:{' '}
                  {Array.isArray(i.key_findings) ? i.key_findings[0] : i.key_findings}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        Illustrative trend model, not NASA measurements: more oxygen spreads flames faster; in microgravity, still air
        can starve a flame while gentle ventilation keeps it alive; very strong airflow blows it out. Material limits are
        rounded oxygen-index values from Earth tests. Effective limit now: <span className="num">{result.limit}%</span> O2
        at an effective airflow of <span className="num">{result.vEff} cm/s</span>.
      </p>
    </div>
  );
}
