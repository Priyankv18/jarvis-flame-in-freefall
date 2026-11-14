// OWNER: Arjun (AI lead).
// Front-end helper: picks the records relevant to a question and sends them to /api/ask.
// The API key NEVER lives here; it is only read on the server in api/ask.js.

// TODO (Arjun): smarter retrieval (keyword match on fuel, pillar, findings), cap the context size.
export function pickContext(question, investigations, limit = 8) {
  const words = question.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const scored = investigations.map((inv) => {
    const text = JSON.stringify(inv).toLowerCase();
    const hits = words.filter((w) => text.includes(w)).length;
    return { inv, hits };
  });
  return scored.sort((a, b) => b.hits - a.hits).slice(0, limit).map((s) => s.inv);
}

export async function askJarvis(question, investigations, habitat) {
  const context = pickContext(question, investigations);
  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, habitat, context }),
  });
  if (!res.ok) throw new Error(`Ask failed (${res.status})`);
  return res.json(); // expected: { answer: string, citations: string[] }
}
