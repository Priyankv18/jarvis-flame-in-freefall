// OWNER: Priyank (scoring and visuals).
// TODO: weight sliders, score-breakdown bars, short "why it ranks here" text.
import { rankInvestigations } from '../lib/scoring.js';

export default function ScoreTable({ investigations, habitat }) {
  const ranked = rankInvestigations(investigations, habitat);
  return (
    <section>
      <h2>Most relevant for: {habitat?.name}</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Investigation</th>
            <th>Score</th>
            <th>Oxygen</th>
            <th>Fuel</th>
            <th>Pillar</th>
            <th>Direct?</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map(({ inv, total, parts, oxygenUnknown }, i) => (
            <tr key={inv.id}>
              <td>{i + 1}</td>
              <td><strong>{inv.id}</strong></td>
              <td>{total}</td>
              <td>{oxygenUnknown ? <span className="unknown">unknown</span> : parts.oxygen.toFixed(2)}</td>
              <td>{parts.fuel.toFixed(2)}</td>
              <td>{parts.pillar.toFixed(2)}</td>
              <td>{parts.relevance.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
