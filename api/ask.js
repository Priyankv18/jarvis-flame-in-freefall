// OWNER: Arjun (AI lead).
// Vercel serverless function: POST /api/ask
//   in:  { question, habitat, context[], history[] }
//   out: { answer, citations[], unverified[], model }
// Runs on the server, so the API key stays secret.
// Local testing needs `npx vercel dev` (plain `npm run dev` does not serve /api).
//
// Environment variables (.env.local locally, Project Settings > Environment Variables on Vercel):
//   LLM_API_KEY   required for live answers
//   LLM_PROVIDER  gemini (default) | anthropic | openai
//   LLM_MODEL     optional override of the default model for that provider
//
// Grounding, in three layers:
//   1. The model only sees the records sent in `context`.
//   2. The system prompt forbids outside knowledge and requires [ID] citations.
//   3. Every cited id is checked against the context on the server. Ids the model
//      invents are removed from `citations` and reported in `unverified`.

const DEFAULT_MODELS = {
  gemini: 'gemini-2.5-flash',
  anthropic: 'claude-haiku-5-5',
  openai: 'gpt-4.1-mini',
};

const MAX_QUESTION = 500;
const MAX_RECORDS = 10;
// Give up on the model after this long and fall back to the matching records,
// so the Ask tab never hangs during a demo.
const LLM_TIMEOUT_MS = 20000;

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`no reply within ${LLM_TIMEOUT_MS / 1000} s`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const SYSTEM_PROMPT = `You are JARVIS, a fire safety research assistant for crewed space habitats.
You answer questions using ONLY the NASA microgravity combustion investigation records provided in the user message. Each record has an "id".

Rules:
- Use only facts stated in the records. Do not use outside knowledge, even if you know it.
- After every factual claim, cite the record it came from using its id in square brackets, e.g. [BASS-II]. Use the id exactly as written.
- A null or missing value means NASA's sources we used do not state it. Say "not stated in our data". Never estimate or invent numbers.
- If the records do not answer the question, say clearly that our data does not cover it, then say what the closest records do cover.
- When the selected habitat has more oxygen or lower pressure than a record was tested at, point out that gap.
- PSI has no partial (Moon or Mars) gravity combustion data yet. Microgravity and Earth results only bound it. Mention this when gravity matters.
- Write for engineers and students: plain English, no filler, under 180 words. Use short bullet points when listing several investigations.`;

function habitatLine(h) {
  if (!h) return 'Selected habitat: none.';
  const o2 = h.o2 ?? h.o2_min ?? 'unknown';
  const p = h.pressure_atm ?? h.pressure_atm_max ?? (h.pressure_psi ? `${h.pressure_psi} psi` : 'unknown');
  return `Selected habitat: ${h.name} (oxygen about ${o2}%${h.o2_min ? ' or more' : ''}, pressure ${p}${typeof p === 'number' ? ' atm' : ''}, gravity ${h.gravity ?? 'unknown'}). ${h.note ?? h.notes ?? ''}`;
}

function buildUserMessage(question, habitat, context) {
  return `${habitatLine(habitat)}

Investigation records (JSON):
${JSON.stringify(context, null, 1)}

Question: ${question}`;
}

// Pull [ID] citations out of the answer and check each one against the records we sent.
export function checkCitations(answer, context) {
  const known = new Map(context.map((c) => [String(c.id).toUpperCase(), String(c.id)]));
  const found = new Set();
  for (const m of answer.matchAll(/\[([^\]\n]{1,40})\]/g)) {
    m[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean).forEach((id) => found.add(id));
  }
  const citations = [];
  const unverified = [];
  for (const id of found) {
    const match = known.get(id.toUpperCase());
    if (match) citations.push(match);
    else unverified.push(id);
  }
  return { citations: [...new Set(citations)], unverified };
}

// Offline answer used when no key is set: lists what the matching records say.
// Keeps the demo working if the API or the venue WiFi fails.
function offlineAnswer(question, context) {
  if (!context.length) {
    return 'Offline mode: no records matched that question. Try naming a material, a fuel, smoke, or suppression.';
  }
  const lines = context.slice(0, 5).map((c) => {
    const finding = Array.isArray(c.key_findings) ? c.key_findings[0] : c.key_findings;
    return `- ${c.name || c.id}: ${finding || 'no findings recorded yet'} [${c.id}]`;
  });
  return `Offline mode (no AI model connected). The most relevant records for "${question}" are:\n${lines.join('\n')}`;
}

async function callGemini(key, model, system, history, user) {
  const contents = [
    ...history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: user }] },
  ];
  const r = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || `Gemini error ${r.status}`);
  return j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
}

async function callAnthropic(key, model, system, history, user) {
  const r = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      system,
      max_tokens: 600,
      temperature: 0.2,
      messages: [...history.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: user }],
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || `Anthropic error ${r.status}`);
  return j.content?.filter((b) => b.type === 'text').map((b) => b.text).join('') ?? '';
}

async function callOpenAI(key, model, system, history, user) {
  const r = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 600,
      messages: [
        { role: 'system', content: system },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: user },
      ],
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || `OpenAI error ${r.status}`);
  return j.choices?.[0]?.message?.content ?? '';
}

const PROVIDERS = { gemini: callGemini, anthropic: callAnthropic, openai: callOpenAI };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
  const question = String(body.question ?? '').trim().slice(0, MAX_QUESTION);
  const context = Array.isArray(body.context) ? body.context.slice(0, MAX_RECORDS) : [];
  const habitat = body.habitat ?? null;
  // Only plain text turns, capped, so a client cannot stuff the prompt.
  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-4)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }));

  if (!question) {
    res.status(400).json({ error: 'Please type a question.' });
    return;
  }

  const key = process.env.LLM_API_KEY;
  if (!key) {
    const answer = offlineAnswer(question, context);
    res.status(200).json({ answer, ...checkCitations(answer, context), model: 'offline' });
    return;
  }

  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
  const call = PROVIDERS[provider];
  if (!call) {
    res.status(500).json({ error: `Unknown LLM_PROVIDER "${provider}". Use gemini, anthropic or openai.` });
    return;
  }
  const model = process.env.LLM_MODEL || DEFAULT_MODELS[provider];

  try {
    const answer = (await call(key, model, SYSTEM_PROMPT, history, buildUserMessage(question, habitat, context))).trim();
    if (!answer) throw new Error('The model returned an empty answer.');
    res.status(200).json({ answer, ...checkCitations(answer, context), model: `${provider}/${model}` });
  } catch (err) {
    // Fall back to the offline answer so the demo never shows a blank screen.
    const answer = offlineAnswer(question, context);
    res.status(200).json({
      answer,
      ...checkCitations(answer, context),
      model: 'offline',
      warning: `AI model unavailable (${err.message}). Showing matching records instead.`,
    });
  }
}
