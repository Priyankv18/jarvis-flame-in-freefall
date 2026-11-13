// OWNER: Priyank (scoring and visuals).
// Gap map: where experiments were tested (O2 vs pressure) against where crews will live.
// Empty space near the habitat dots = research gaps. Unknown values are listed, not guessed.
// TODO: draw each investigation as a box (min-max ranges) instead of a dot, add flow axis option.
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export default function GapMap({ investigations, habitats }) {
  const tested = investigations
    .filter((inv) => inv.o2_max != null && (inv.pressure_max ?? inv.pressure_min) != null)
    .map((inv) => ({ name: inv.id, o2: inv.o2_max, pressure: inv.pressure_max ?? inv.pressure_min }));

  const targets = habitats
    .filter((h) => h.o2_min != null && h.pressure_psi != null)
    .map((h) => ({ name: h.name, o2: h.o2_min, pressure: h.pressure_psi }));

  const unknown = investigations.filter((inv) => inv.o2_max == null || inv.pressure_max == null);

  return (
    <section>
      <h2>Gap map: tested conditions vs crew environments</h2>
      <div style={{ width: '100%', height: 380 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: 8 }}>
            <CartesianGrid stroke="#2a3042" />
            <XAxis type="number" dataKey="o2" name="Oxygen" unit="%" domain={[0, 100]} stroke="#9aa3b8" />
            <YAxis type="number" dataKey="pressure" name="Pressure" unit=" psi" domain={[0, 16]} stroke="#9aa3b8" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v, n) => [v, n]} labelFormatter={() => ''} />
            <Legend />
            <Scatter name="Tested (investigation)" data={tested} fill="#ff7a1a" />
            <Scatter name="Crew environment" data={targets} fill="#5cc8ff" shape="diamond" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="unknown">
        Not plotted yet (O2 or pressure unknown): {unknown.map((i) => i.id).join(', ') || 'none'}
      </p>
    </section>
  );
}
