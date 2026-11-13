// OWNER: Pranav (frontend lead).
// TODO: filters (fuel state, safety pillar, hardware) and a side-by-side compare view.
const fmtRange = (min, max, unit) => {
  if (min == null && max == null) return <span className="unknown">unknown</span>;
  if (min === max || min == null || max == null) return `${min ?? max}${unit}`;
  return `${min}–${max}${unit}`;
};

export default function Catalogue({ investigations }) {
  return (
    <section>
      <h2>Investigation catalogue</h2>
      <table>
        <thead>
          <tr>
            <th>Investigation</th>
            <th>Fuel</th>
            <th>O2</th>
            <th>Hardware</th>
            <th>Safety pillar</th>
          </tr>
        </thead>
        <tbody>
          {investigations.map((inv) => (
            <tr key={inv.id}>
              <td><strong>{inv.id}</strong><br />{inv.name}</td>
              <td>{inv.fuel_state}</td>
              <td>{fmtRange(inv.o2_min, inv.o2_max, '%')}</td>
              <td>{inv.hardware}</td>
              <td>{inv.safety_pillar}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
