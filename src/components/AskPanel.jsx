// OWNER: Arjun (AI lead).
// Ask JARVIS: chat over the investigation dataset with server-checked citations.
// Styled with Tailwind to match the rest of the app.
import { useEffect, useRef, useState } from 'react';
import { askJarvis, exampleQuestions } from '../lib/ai.js';

const chipBase = 'rounded-full border px-3 py-1.5 text-sm';

function RecordCard({ record }) {
  if (!record) return null;
  const findings = Array.isArray(record.key_findings) ? record.key_findings : [record.key_findings].filter(Boolean);
  const link = record.psi_link || (String(record.source ?? '').startsWith('http') ? record.source : null);
  return (
    <div className="mt-2 rounded border border-slate-300 bg-slate-50 p-3 text-sm">
      <p className="font-medium">{record.name}</p>
      <p className="text-slate-700">{[record.hardware, record.fuel_state].filter(Boolean).join(' · ')}</p>
      {findings.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {findings.map((f) => <li key={f}>{f}</li>)}
        </ul>
      )}
      {link && (
        <a className="mt-1 inline-block text-blue-800 underline" href={link} target="_blank" rel="noreferrer">
          Source
        </a>
      )}
    </div>
  );
}

function Message({ msg, byId }) {
  const [openId, setOpenId] = useState(null);

  if (msg.role === 'user') {
    return (
      <div className="max-w-[80%] self-end rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
        {msg.content}
      </div>
    );
  }

  return (
    <div className="border-l-4 border-blue-800 pl-3 text-sm">
      {msg.warning && <p className="mb-1 text-amber-800">{msg.warning}</p>}
      <p className={`whitespace-pre-wrap ${msg.error ? 'text-red-800' : ''}`}>{msg.content}</p>

      {msg.citations?.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-slate-700">Sources (click to view):</span>
          {msg.citations.map((id) => (
            <button
              key={id}
              type="button"
              aria-expanded={openId === id}
              title={byId[id]?.name || id}
              onClick={() => setOpenId(openId === id ? null : id)}
              className={`${chipBase} border-blue-800 ${openId === id ? 'bg-blue-800 text-white' : 'bg-white text-blue-800'}`}
            >
              {id}
            </button>
          ))}
        </div>
      )}
      {openId && <RecordCard record={byId[openId]} />}

      {msg.unverified?.length > 0 && (
        <p className="mt-2 text-red-800">
          Removed {msg.unverified.length} citation(s) not found in our data: {msg.unverified.join(', ')}. Treat related
          claims with caution.
        </p>
      )}
      {!msg.error && msg.citations?.length === 0 && (
        <p className="mt-2 text-slate-700">No citations, so this answer is not backed by our dataset.</p>
      )}
      {!msg.error && (
        <p className="mt-2 text-xs text-slate-600">
          Looked at {msg.contextIds?.length ?? 0} record(s){msg.model ? ` · ${msg.model}` : ''} · AI-generated, check
          the cited sources.
        </p>
      )}
    </div>
  );
}

export default function AskPanel({ investigations = [], habitat }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const byId = Object.fromEntries(investigations.map((inv) => [inv.id, inv]));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, loading]);

  async function ask(text) {
    const q = text.trim();
    if (!q || loading) return;
    const history = messages.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setQuestion('');
    setLoading(true);
    try {
      const r = await askJarvis(q, investigations, habitat, history);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: r.answer,
          citations: r.citations,
          unverified: r.unverified,
          contextIds: r.contextIds,
          model: r.model,
          warning: r.warning,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          error: true,
          content: `Something went wrong: ${err.message}. When running locally, use "npx vercel dev" so /api/ask exists.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded border border-slate-300 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Ask JARVIS</h2>
        {messages.length > 0 && (
          <button type="button" className={`${chipBase} border-slate-400 bg-white`} onClick={() => setMessages([])}>
            Clear chat
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-700">
        Answers come only from our NASA investigation dataset, tailored to{' '}
        <strong>{habitat?.name ?? 'the selected habitat'}</strong>. Every claim cites the investigation it came from.
      </p>

      {messages.length === 0 && (
        <div className="my-3 flex flex-wrap gap-2">
          {exampleQuestions(habitat).map((q) => (
            <button
              key={q}
              type="button"
              className={`${chipBase} border-slate-400 bg-white text-slate-900 hover:border-blue-800`}
              onClick={() => ask(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="my-4 flex flex-col gap-4" aria-live="polite">
        {messages.map((m, i) => <Message key={i} msg={m} byId={byId} />)}
        {loading && <p className="text-sm text-slate-700">JARVIS is reading the records…</p>}
        <div ref={endRef} />
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <label htmlFor="jarvis-q" className="w-full text-sm font-medium text-slate-800">
          Your question
        </label>
        <input
          id="jarvis-q"
          className="min-w-0 flex-1 rounded border border-slate-400 bg-white px-2 py-1.5 text-sm"
          value={question}
          maxLength={500}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Which experiments tell me about fabric flammability at 34% oxygen?"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="rounded bg-blue-800 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </form>
    </section>
  );
}
