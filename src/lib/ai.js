// OWNER: Arjun (AI lead).
// Front-end side of Ask JARVIS.
// 1. Retrieval: pick the investigation records most relevant to the question.
// 2. Compact them (drop empty fields) so the prompt stays small.
// 3. Send question + records to /api/ask. The API key NEVER lives here.
//
// Works with either dataset shape (fuel/fuels, safety_pillar/pillars, psi_link/source)
// so it keeps working while Hargun finalises the field names.

// Words people type, mapped to words that appear in the data.
const SYNONYMS = {
  fabric: ['textile', 'cotton', 'sibal', 'nomex', 'cloth'],
  fabrics: ['textile', 'cotton', 'sibal', 'nomex', 'cloth'],
  cloth: ['textile', 'cotton', 'sibal', 'nomex'],
  clothing: ['textile', 'cotton', 'nomex'],
  plastic: ['pmma', 'acrylic', 'ultem', 'teflon', 'kapton'],
  plastics: ['pmma', 'acrylic', 'ultem', 'teflon', 'kapton'],
  window: ['acrylic', 'pmma'],
  smoke: ['detection', 'aerosol', 'particle', 'detector', 'soot'],
  detector: ['detection', 'smoke', 'aerosol'],
  alarm: ['detection', 'smoke', 'detector'],
  detect: ['detection', 'smoke', 'detector'],
  extinguish: ['suppression', 'extinction', 'suppressant', 'co2', 'helium'],
  extinguisher: ['suppression', 'suppressant', 'co2', 'helium'],
  suppress: ['suppression', 'suppressant', 'extinction'],
  put: ['suppression', 'extinction', 'suppressant'],
  putting: ['suppression', 'extinction'],
  fight: ['suppression', 'suppressant'],
  oxygen: ['o2'],
  moon: ['o2', 'partial', 'lunar', 'electric'],
  lunar: ['o2', 'partial', 'electric'],
  mars: ['partial', 'o2'],
  gravity: ['partial', 'electric', 'microgravity'],
  liquid: ['droplet', 'fuel'],
  fuel: ['droplet', 'heptane', 'methanol'],
  dust: ['daft', 'particle', 'aerosol'],
  airflow: ['flow', 'ventilation', 'duct'],
  ventilation: ['flow', 'airflow'],
  wire: ['teflon', 'kapton', 'insulation'],
  material: ['flammability', 'solid'],
  materials: ['flammability', 'solid'],
};

const STOPWORDS = new Set([
  'the', 'and', 'for', 'what', 'which', 'how', 'does', 'did', 'are', 'was', 'were',
  'tell', 'about', 'with', 'from', 'that', 'this', 'there', 'any', 'can', 'should',
  'would', 'could', 'experiments', 'experiment', 'investigation', 'investigations',
  'data', 'show', 'give', 'into', 'our', 'you', 'they', 'its', 'have', 'has',
]);

// Read a field under either of its names.
function pick(inv, ...names) {
  for (const n of names) if (inv[n] !== undefined && inv[n] !== null) return inv[n];
  return null;
}

function asText(v) {
  if (v === null || v === undefined) return '';
  return Array.isArray(v) ? v.join(' ') : String(v);
}

function tokens(question) {
  const base = question.toLowerCase().split(/[^a-z0-9.%-]+/).filter((w) => w.length > 1 && !STOPWORDS.has(w));
  const expanded = new Set(base);
  base.forEach((w) => (SYNONYMS[w] || []).forEach((s) => expanded.add(s)));
  return [...expanded];
}

// Higher weight for matches in names and findings than in the long tail of the record.
function scoreRecord(inv, words, habitat) {
  const fields = [
    [asText(inv.id) + ' ' + asText(inv.name), 5],
    [asText(pick(inv, 'fuels', 'fuel')) + ' ' + asText(inv.fuel_state), 3],
    [asText(pick(inv, 'pillars', 'safety_pillar')), 3],
    [asText(inv.key_findings), 2],
    [JSON.stringify(inv), 1],
  ].map(([t, w]) => [t.toLowerCase(), w]);

  let score = 0;
  for (const w of words) {
    for (const [text, weight] of fields) if (text.includes(w)) score += weight;
  }

  // No topic match at all: let the fallback in pickContext handle it.
  if (score === 0) return 0;

  // Habitat boost: oxygen-rich habitats favour records tested at high O2.
  const habO2 = habitat ? pick(habitat, 'o2', 'o2_min') : null;
  const invO2 = pick(inv, 'o2_max');
  if (habO2 !== null && habO2 > 25 && invO2 !== null && invO2 >= habO2) score += 4;

  // Directly fire-safety relevant work ranks above indirect combustion science.
  if (inv.relevance === 'direct') score += 1;
  return score;
}

export function pickContext(question, investigations, habitat, limit = 8) {
  const words = tokens(question);
  const ranked = investigations
    .map((inv) => ({ inv, s: scoreRecord(inv, words, habitat) }))
    .sort((a, b) => b.s - a.s);
  const hits = ranked.filter((r) => r.s > 1);
  // If nothing matches, still send the most directly relevant records so JARVIS can say what we do have.
  const chosen = hits.length ? hits : ranked.filter((r) => r.inv.relevance === 'direct');
  return chosen.slice(0, limit).map((r) => r.inv);
}

// Remove empty values and bulky fields so each record costs fewer tokens.
export function compactRecord(inv) {
  const keep = {};
  for (const [k, v] of Object.entries(inv)) {
    if (v === null || v === undefined || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (k === 'people') continue;
    keep[k] = v;
  }
  return keep;
}

export async function askJarvis(question, investigations, habitat, history = []) {
  const context = pickContext(question, investigations, habitat).map(compactRecord);
  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      habitat,
      context,
      // Last 2 exchanges only, so follow-up questions like "what about pressure?" work.
      history: history.slice(-4),
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Ask failed (${res.status})`);
  // { answer, citations[], unverified[], model, contextIds[] }
  return { ...body, contextIds: context.map((c) => c.id) };
}

// Example questions shown as buttons, tuned to the selected habitat.
export function exampleQuestions(habitat) {
  const name = habitat?.name || 'a spacecraft';
  return [
    `Give me a fire safety briefing for ${name}.`,
    'Which experiments tested fabrics, and what did they find?',
    'What do we know about putting out fires in microgravity?',
    'How should smoke detectors be designed for long missions?',
    'What data exists above 30% oxygen?',
  ];
}
