// OWNER: Priyank (scoring and visuals).
// Saffire-style flame simulator. Pick a material that Saffire or BASS really burned, set
// oxygen, pressure, airflow and gravity, and watch an illustrative flame spread across a sheet.
// Next to it, an evidence check lists which real investigations in our dataset tested those
// conditions, so the simulator always points back to the data (and to the gaps).
// The physics is a simple trend model (src/lib/flameModel.js), labelled as such in the UI.
import { useEffect, useMemo, useRef, useState } from 'react';
import { GRAVITY, MATERIALS, conditionsFor, simulate } from '../lib/flameModel.js';
import { getRange } from '../lib/scoring.js';
import './sim.css';

const DEFAULTS = { o2: 21, psi: 14.7, flow: 15, gravity: 'micro', material: 'sibal' };

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
      bg.addColorStop(0, '#060b16');
      bg.addColorStop(1, '#0a1222');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(56,189,248,0.07)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // airflow streaks (left to right), speed follows the forced flow
      const flowPx = 8 + p.flow * 4;
      ctx.strokeStyle = 'rgba(125,211,252,0.28)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 14; i += 1) {
        const y = H * 0.12 + ((i * 37) % Math.max(1, H * 0.78));
        const off = ((s.t * flowPx + i * 61) % (W + 60)) - 60;
        if (p.flow > 0) { ctx.beginPath(); ctx.moveTo(off, y); ctx.lineTo(off + 26, y); ctx.stroke(); }
      }

      // sample: unburned part, char behind the front
      ctx.fillStyle = '#d6c7a1';
      ctx.globalAlpha = 0.85;
      ctx.fillRect(sx, sy, sw, sh);
      ctx.globalAlpha = 1;
      const charW = Math.max(0, fx - sx);
      const char = ctx.createLinearGradient(sx, 0, fx, 0);
      char.addColorStop(0, '#0d0d0f');
      char.addColorStop(Math.max(0, 1 - 30 / Math.max(charW, 31)), '#1c1512');
      char.addColorStop(1, r.burns ? '#ff7a2f' : '#3a2a20');
      ctx.fillStyle = char;
      ctx.fillRect(sx, sy, charW, sh);
      ctx.strokeStyle = 'rgba(148,163,184,0.5)';
      ctx.strokeRect(sx, sy, sw, sh);

      // igniter wire
      ctx.strokeStyle = '#fca5a5';
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
        // outer glow: blue when weak (microgravity), orange when strong or in gravity
        const outer = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.6);
        const warm = Math.min(1, hot * 0.8 + g * 0.6);
        const oc = warm > 0.5 ? `rgba(255,${Math.round(150 - 60 * warm)},47,` : 'rgba(56,189,248,';
        outer.addColorStop(0, `${oc}${0.55 * alive})`);
        outer.addColorStop(1, `${oc}0)`);
        ctx.fillStyle = outer;
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.6, 0, Math.PI * 2);
        ctx.fill();
        // core
        const core = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        core.addColorStop(0, `rgba(255,255,255,${0.9 * alive * (0.4 + hot * 0.6)})`);
        core.addColorStop(0.35, warm > 0.5 ? `rgba(255,200,90,${0.8 * alive})` : `rgba(125,211,252,${0.8 * alive})`);
        core.addColorStop(1, 'rgba(14,165,233,0)');
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
        ctx.fillStyle = `rgba(148,163,184,${0.25 * q.life})`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 2 + (1 - q.life) * 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // labels
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(142,162,189,0.9)';
      ctx.fillText(p.flow > 0 ? `airflow ${p.flow} cm/s  ->` : 'no forced airflow', 12, 18);
      ctx.fillText(GRAVITY.find((x) => x.id === p.gravity)?.label ?? '', 12, H - 12);
      if (!r.burns && s.out >= 1) {
        ctx.fillStyle = 'rgba(251,113,133,0.95)';
        ctx.font = '600 14px "Space Grotesk", sans-serif';
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

function Slider({ label, unit, min, max, step, value, onChange, hint }) {
  return (
    <label className="sim-slider">
      <span className="sim-slider-top">
        <span>{label}</span>
        <span className="sim-val">{value}{unit}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export default function FlameSimulator({ investigations = [], habitat }) {
  const [p, setP] = useState(() => ({ ...DEFAULTS, ...conditionsFor(habitat) }));
  const [runId, setRunId] = useState(0);
  const canvasRef = useRef(null);
  const set = (patch) => setP((cur) => ({ ...cur, ...patch }));

  // follow the habitat cards: oxygen, pressure and gravity come from the selected habitat
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

  return (
    <section className="viz sim">
      <div className="sim-head">
        <div>
          <h2>Saffire-style flame simulator</h2>
          <p className="viz-intro">
            Saffire burned large sheets of real spacecraft materials inside an empty cargo vehicle after it
            left the ISS. Recreate that kind of test here: choose a material, change the air, and watch how the
            flame behaves. Then check which real investigations back it up.
          </p>
        </div>
        <span className="sim-badge" title="Trend model, not NASA measurements">Illustrative model</span>
      </div>

      <div className="sim-grid">
        <div className="sim-stage">
          <canvas ref={canvasRef} className="sim-canvas" aria-label={`Animated flame on ${material.short}: ${result.burns ? 'burning' : 'goes out'}`} role="img" />
          <div className={`sim-readout${result.burns ? '' : ' out'}`}>
            <div className="sim-status">
              <span className="sim-dot" />
              {result.burns ? 'Burns' : 'Self-extinguishes'}
            </div>
            <div className="sim-metrics">
              <div><span className="sim-big">{result.index}</span><span className="sim-unit">/100 spread index</span></div>
              {ratioText && <div className="sim-ratio">{ratioText}</div>}
            </div>
            <p className="sim-reason">{result.reason}</p>
          </div>
          <button type="button" className="sim-reignite" onClick={() => setRunId((n) => n + 1)}>Re-ignite</button>
        </div>

        <div className="sim-controls">
          <label className="sim-field">
            <span className="sim-label">Material (burned in Saffire / BASS)</span>
            <select value={p.material} onChange={(e) => { set({ material: e.target.value }); setRunId((n) => n + 1); }}>
              {MATERIALS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <small>{material.note}</small>
          </label>
          <Slider label="Oxygen" unit="%" min={15} max={100} step={1} value={p.o2} onChange={(v) => set({ o2: v })}
            hint="Earth air is 21%. Moon base plans: 30% or more." />
          <Slider label="Pressure" unit=" psi" min={3} max={15} step={0.1} value={p.psi} onChange={(v) => set({ psi: v })}
            hint="Sea level is 14.7 psi. Moon base plans: 10.2 psi or less." />
          <Slider label="Airflow (ventilation)" unit=" cm/s" min={0} max={60} step={1} value={p.flow} onChange={(v) => set({ flow: v })}
            hint="BASS tested 5 to 50 cm/s. 0 = still air." />
          <div className="sim-field">
            <span className="sim-label">Gravity</span>
            <div className="segmented sim-seg" role="group" aria-label="Gravity">
              {GRAVITY.map((g) => (
                <button key={g.id} type="button" className={p.gravity === g.id ? 'on' : ''} aria-pressed={p.gravity === g.id}
                  onClick={() => { set({ gravity: g.id }); setRunId((n) => n + 1); }}>
                  {g.label.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="sim-evidence">
        <div className={`sim-card${evidence.both.length ? '' : ' gap'}`}>
          <h3>Evidence check</h3>
          {evidence.both.length > 0 ? (
            <>
              <p>Tested at {p.o2}% O2 and about {p.psi} psi in our dataset:</p>
              <div className="sim-chips">{evidence.both.map((i) => <span key={i.id} className="sim-chip" title={i.name}>{i.id}</span>)}</div>
            </>
          ) : (
            <p><b>Research gap.</b> No investigation in our dataset tested both {p.o2}% oxygen and {p.psi} psi.</p>
          )}
          {evidence.o2Only.length > 0 && (
            <p className="sim-muted">
              Same oxygen, pressure not stated: {evidence.o2Only.map((i) => i.id).join(', ')}.
            </p>
          )}
          {p.gravity === 'lunar' || p.gravity === 'mars' ? (
            <p className="sim-muted">No partial-gravity combustion data exists in PSI yet, so Moon and Mars behaviour here is extrapolated.</p>
          ) : null}
        </div>

        <div className="sim-card">
          <h3>What the real Saffire flights did</h3>
          <ul className="sim-list">
            {saffire.map((i) => (
              <li key={i.id}>
                <b>{i.id}</b>{i.tests ? ` (${i.tests})` : ''}: {Array.isArray(i.key_findings) ? i.key_findings[0] : i.key_findings}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="sim-foot">
        Illustrative trend model, not NASA measurements: more oxygen spreads flames faster; in microgravity, still
        air can starve a flame while gentle ventilation keeps it alive; very strong airflow blows it out. Material
        limits are rounded oxygen-index values from Earth tests. Effective limit now: {result.limit}% O2 at an
        effective airflow of {result.vEff} cm/s.
      </p>
    </section>
  );
}
