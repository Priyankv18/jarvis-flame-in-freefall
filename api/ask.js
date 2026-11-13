// OWNER: Arjun (AI lead).
// Vercel serverless function: POST /api/ask  { question, habitat, context[] }
// Returns { answer, citations[] }. Runs on the server, so the key stays secret.
// Local testing needs `npx vercel dev` (plain `npm run dev` does not serve /api).
//
// TODO (Arjun):
// 1. Read the key: process.env.LLM_API_KEY (set in .env.local and in Vercel settings).
// 2. Build a prompt: answer ONLY from `context`, cite investigation ids, say
//    "the data does not cover this" when nothing matches.
// 3. Call the LLM API, return the answer plus the ids it cited.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return;
  }
  const { question, context = [] } = req.body ?? {};

  if (!process.env.LLM_API_KEY) {
    res.status(200).json({
      answer: `(Stub) JARVIS is not connected to an LLM yet. You asked: "${question}". ` +
        `It would answer from ${context.length} matching investigation records.`,
      citations: context.map((c) => c.id),
    });
    return;
  }

  res.status(501).json({ error: 'LLM call not implemented yet (Arjun)' });
}
