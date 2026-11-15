// OWNER: Arjun (AI lead). Restyled as a chat layout; request and citation logic unchanged.
// Ask JARVIS: chat over the investigation dataset with server-checked citations.
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Send, Sparkles, Trash2, TriangleAlert, WifiOff } from 'lucide-react';
import { askJarvis, exampleQuestions } from '../lib/ai.js';
import { Button, Card, Chip, buttonStyles, cn } from '../ui/index.js';
import { FlameMark } from '../app/icons.jsx';

function RecordCard({ record }) {
  if (!record) return null;
  const findings = Array.isArray(record.key_findings) ? record.key_findings : [record.key_findings].filter(Boolean);
  const link = record.psi_link || (String(record.source ?? '').startsWith('http') ? record.source : null);
  return (
    <div className="mt-3 rounded-2xl border border-line bg-card p-4 text-sm">
      <p className="num text-xs text-muted">{record.id}</p>
      <p className="font-semibold">{record.name}</p>
      <p className="mt-0.5 text-muted">{[record.hardware, record.fuel_state].filter(Boolean).join(' · ') || 'unknown'}</p>
      {findings.length > 0 && (
        <ul className="mt-2 grid gap-1.5">
          {findings.map((f) => (
            <li key={f} className="flex gap-2 leading-relaxed">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-pill bg-cobalt" />
              {f}
            </li>
          ))}
        </ul>
      )}
      {link && (
        <a className="mt-2 inline-flex items-center gap-1 font-semibold text-cobalt underline-offset-4 hover:underline" href={link} target="_blank" rel="noreferrer">
          Source <ExternalLink aria-hidden="true" className="size-3.5" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}
    </div>
  );
}

function Message({ msg, byId }) {
  const [openId, setOpenId] = useState(null);

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-3xl rounded-br-md bg-cobalt px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-white sm:max-w-[70%]">
          <span className="sr-only">You asked: </span>
          {msg.content}
        </p>
      </div>
    );
  }

  if (msg.error) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const Icon = offline ? WifiOff : TriangleAlert;
    return (
      <div className="flex gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-alert-soft text-alert">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div role="alert" className="max-w-[85%] rounded-3xl rounded-tl-md border border-alert/30 bg-alert-soft px-4 py-3 text-sm sm:max-w-[75%]">
          <p className="font-semibold text-alert">{offline ? 'You appear to be offline' : 'JARVIS could not answer'}</p>
          <p className="mt-1 leading-relaxed whitespace-pre-wrap text-ink">{msg.content}</p>
          <p className="mt-2 text-xs text-muted">Every other tab works offline from the bundled data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <span className="shrink-0">
        <FlameMark className="size-9" />
      </span>
      <div className="min-w-0 max-w-[90%] rounded-3xl rounded-tl-md border border-line bg-surface px-4 py-3 text-sm sm:max-w-[80%]">
        <span className="sr-only">JARVIS answered: </span>
        {msg.warning && (
          <p className="mb-2 flex gap-2 rounded-xl bg-lime/40 px-3 py-2 text-ink">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {msg.warning}
          </p>
        )}
        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

        {msg.citations?.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="eyebrow mr-1">Sources</span>
            {msg.citations.map((id) => (
              <button
                key={id}
                type="button"
                aria-expanded={openId === id}
                title={byId[id]?.name || id}
                onClick={() => setOpenId(openId === id ? null : id)}
                className={cn(
                  'num inline-flex h-7 cursor-pointer items-center rounded-pill border border-cobalt px-2.5 text-xs font-semibold',
                  openId === id ? 'bg-cobalt text-white' : 'bg-card text-cobalt hover:bg-cobalt-soft',
                )}
              >
                {id}
              </button>
            ))}
          </div>
        )}
        {openId && <RecordCard record={byId[openId]} />}

        {msg.unverified?.length > 0 && (
          <p className="mt-3 rounded-xl bg-alert-soft px-3 py-2 text-alert">
            Removed {msg.unverified.length} citation(s) not found in our data: {msg.unverified.join(', ')}. Treat related
            claims with caution.
          </p>
        )}
        {msg.citations?.length === 0 && (
          <p className="mt-3 text-muted">No citations, so this answer is not backed by our dataset.</p>
        )}
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <Sparkles aria-hidden="true" className="size-3.5" />
          AI generated · looked at <span className="num">{msg.contextIds?.length ?? 0}</span> record(s)
          {msg.model ? <> · <span className="num">{msg.model}</span></> : ''} · check the cited sources.
        </p>
      </div>
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

  const suggestions = exampleQuestions(habitat);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card pad="none" className="flex min-h-[32rem] flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <FlameMark className="size-10" />
            <div>
              <h2 className="font-display text-2xl leading-none font-semibold">Ask JARVIS</h2>
              <p className="mt-1 text-xs text-muted">Tailored to {habitat?.name ?? 'the selected habitat'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Chip tone="lime" size="lg" icon={Sparkles}>AI generated from project data</Chip>
            {messages.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setMessages([])}>
                <Trash2 aria-hidden="true" className="size-3.5" /> Clear chat
              </Button>
            )}
          </div>
        </div>

        <div
          className="scroll-thin flex max-h-[60vh] min-h-72 flex-1 flex-col gap-5 overflow-y-auto px-5 py-6 sm:px-6"
          aria-live="polite"
          aria-label="Conversation"
          role="log"
        >
          {messages.length === 0 && (
            <div className="my-auto text-center">
              <p className="display text-4xl">What do you want to know?</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Answers come only from our NASA investigation dataset. Every claim cites the investigation it came from,
                and citations are checked on the server.
              </p>
              <ul className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Suggested questions">
                {suggestions.map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      onClick={() => ask(q)}
                      className="cursor-pointer rounded-pill border border-line-strong bg-card px-4 py-2 text-left text-sm hover:border-cobalt hover:bg-cobalt-soft"
                    >
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {messages.map((m, i) => <Message key={i} msg={m} byId={byId} />)}
          {loading && (
            <div className="flex items-center gap-3" role="status">
              <FlameMark className="size-9" />
              <span className="inline-flex items-center gap-1.5 rounded-3xl rounded-tl-md border border-line bg-surface px-4 py-3 text-sm text-muted">
                <span className="dot-pulse size-1.5 rounded-pill bg-cobalt" />
                <span className="dot-pulse size-1.5 rounded-pill bg-cobalt [animation-delay:150ms]" />
                <span className="dot-pulse size-1.5 rounded-pill bg-cobalt [animation-delay:300ms]" />
                <span className="ml-1">JARVIS is reading the records</span>
              </span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="flex gap-2 border-t border-line bg-card p-3 sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
        >
          <label htmlFor="jarvis-q" className="sr-only">Your question</label>
          <input
            id="jarvis-q"
            className="h-12 min-w-0 flex-1 rounded-pill border border-line bg-surface px-5 text-sm text-ink placeholder:text-muted"
            value={question}
            maxLength={500}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Which experiments tell me about fabric flammability at 34% oxygen?"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className={buttonStyles({ variant: 'primary', size: 'lg' })}
            aria-label={loading ? 'Thinking' : 'Ask'}
          >
            <Send aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">{loading ? 'Thinking' : 'Ask'}</span>
          </button>
        </form>
      </Card>

      <Card tone="navy" className="h-fit">
        <div className="on-dark">
          <p className="eyebrow text-white/80">How answers work</p>
          <ol className="mt-3 grid gap-3 text-sm leading-relaxed text-white/90">
            <li><span className="num mr-2 text-lime">01</span>The app picks the investigation records most relevant to your question.</li>
            <li><span className="num mr-2 text-lime">02</span>Only those records go to a language model, which writes the answer.</li>
            <li><span className="num mr-2 text-lime">03</span>The server removes any citation that does not match a record it was sent.</li>
          </ol>
          <p className="mt-4 rounded-2xl bg-white/10 p-3 text-xs leading-relaxed text-white/85">
            Answers are AI generated and may be wrong. Open the source chips to read the records behind each claim.
          </p>
        </div>
      </Card>
    </div>
  );
}
