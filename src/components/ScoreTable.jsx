// OWNER: Priyank (scoring and visuals).
// Ranking tab: pick weights, see every investigation's 0-100 score for the selected
// crew environment, a stacked breakdown bar (one colour per factor) and a plain-English reason.
// Unknown factors show as the hatched, empty part of the bar: they are never guessed.
import { useMemo, useState } from 'react';
import {
  DEFAULT_WEIGHTS, FACTORS, rankInvestigations, explainScore,
} from '../lib/scoring.js';
import './viz.css';

function WeightSliders({ weights, setWeights, unknownValue, setUnknownValue }) {
  const sum = FACTORS.reduce((s, f) => s + weights[f.key], 0) || 1;
  return (
    <div className="weights" role="group" aria-label="Score weights">
      <div className="weights-head">
        <h3>Weights: what matters to you?</h3>
        <div className="weights-actions">
          <label>
            Unknown data counts as{' '}
            <select value={unknownValue} onChange={(e) => setUnknownValue(Number(e.target.value))}>
              <option value={0}>0 (strict)</option>
              <option value={0.5}>0.5 (neutral)</option>
            </select>
          </label>
          <button type="button" onClick={() => { setWeights(DEFAULT_WEIGHTS); setUnknownValue(0); }}>
            Reset
          </button>
        </div>
      </div>
      {FACTORS.map((f) => (
        <label key={f.key} className="weight">
          <span className="weight-label">
            <span className="swatch" style={{ background: f.color }} />
            {f.label}
            <span className="share">{Math.round((weights[f.key] / sum) * 100)}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={weights[f.key]}
            onChange={(e) => setWeights({ ...weights, [f.key]: Number(e.target.value) })}
            style={{ accentColor: f.color }}
            aria-label={`${f.label} weight`}
          />
          <small>{f.help}</small>
        </label>
      ))}
    </div>
  );
}

function BreakdownBar({ result }) {
  const title = FACTORS.map((f) => {
    const p = result.parts[f.key];
    const pts = result.contributions[f.key].toFixed(1);
    return `${f.label}: ${p == null ? 'unknown' : p.toFixed(2)} × ${Math.round(result.shares[f.key] * 100)}% = ${pts} pts`;
  }).join('\n');
  return (
    <div className="breakdown" title={title}>
      <div className="bar" role="img" aria-label={title.replace(/\n/g, '; ')}>
        {FACTORS.map((f) => (
          <span
            key={f.key}
            style={{
              width: `${result.contributions[f.key]}%`,
              background: f.color,
              opacity: result.parts[f.key] == null ? 0.35 : 1,
            }}
          />
        ))}
      </div>
      <div className={result.known < 0.5 ? 'coverage low' : 'coverage'}>
        Based on {Math.round(result.known * 100)}% known data
      </div>
    </div>
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
    <section className="viz">
      <h2>Most relevant for: {habitat?.name}</h2>
      <p className="viz-intro">
        Each investigation gets a 0-100 score: a weighted sum of five factors. Move the sliders to
        change what matters. The hatched part of each bar is score that was not earned, either
        because the factor scored low or because the data is unknown (faded colour).
      </p>

      <WeightSliders
        weights={weights}
        setWeights={setWeights}
        unknownValue={unknownValue}
        setUnknownValue={setUnknownValue}
      />

      <div className="rank-table-wrap">
      <table className="rank-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Investigation</th>
            <th>Score</th>
            <th>Breakdown</th>
            <th>Why it ranks here</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((r, i) => (
            <tr key={r.inv.id}>
              <td className="num">{i + 1}</td>
              <td>
                <strong>{r.inv.id}</strong>
                {r.inv.name && <div className="inv-name">{r.inv.name}</div>}
              </td>
              <td className="num score">{r.total}</td>
              <td><BreakdownBar result={r} /></td>
              <td className="why">{explainScore(r, habitat)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </section>
  );
}
