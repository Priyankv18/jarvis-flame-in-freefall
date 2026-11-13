// OWNER: Pranav (frontend lead). Others: ask Pranav before editing this file.
// App shell: loads the dataset, holds the selected habitat, switches tabs.
// Every component receives the same props: investigations, habitats, habitat.
import { useState } from 'react';
import data from './data/investigations.json';
import Catalogue from './components/Catalogue.jsx';
import ScoreTable from './components/ScoreTable.jsx';
import GapMap from './components/GapMap.jsx';
import AskPanel from './components/AskPanel.jsx';

const TABS = [
  { id: 'catalogue', label: 'Catalogue', Component: Catalogue },
  { id: 'ranking', label: 'Ranking', Component: ScoreTable },
  { id: 'gapmap', label: 'Gap map', Component: GapMap },
  { id: 'ask', label: 'Ask JARVIS', Component: AskPanel },
];

export default function App() {
  const { investigations, habitats } = data;
  const [habitatId, setHabitatId] = useState(habitats[0]?.id);
  const [tab, setTab] = useState('catalogue');

  const habitat = habitats.find((h) => h.id === habitatId);
  const Active = TABS.find((t) => t.id === tab).Component;

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>JARVIS</h1>
          <p className="tagline">Fire safety insights from NASA microgravity combustion data</p>
        </div>
        <label className="habitat-picker">
          Crew environment
          <select value={habitatId} onChange={(e) => setHabitatId(e.target.value)}>
            {habitats.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </label>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === tab ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="panel">
        <Active investigations={investigations} habitats={habitats} habitat={habitat} />
      </main>

      <footer className="footer">
        Team JARVIS, NASA Space Apps 2026. Data: NASA Physical Sciences Informatics (PSI).
        Built with SI (AI) assistance.
      </footer>
    </div>
  );
}
