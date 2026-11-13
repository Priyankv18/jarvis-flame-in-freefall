// OWNER: Arjun (AI lead).
// TODO: chat history, example questions as buttons, clickable citation chips.
import { useState } from 'react';
import { askJarvis } from '../lib/ai.js';

export default function AskPanel({ investigations, habitat }) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError('');
    try {
      setResult(await askJarvis(question, investigations, habitat));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2>Ask JARVIS</h2>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label htmlFor="q" style={{ width: '100%' }}>Question about {habitat?.name}</label>
        <input
          id="q"
          style={{ flex: '1 1 320px' }}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Which experiments tell me about fabric flammability at 34% oxygen?"
        />
        <button type="submit" disabled={loading}>{loading ? 'Thinking…' : 'Ask'}</button>
      </form>
      {error && <p className="unknown">{error}</p>}
      {result && (
        <div style={{ marginTop: 16 }}>
          <p style={{ whiteSpace: 'pre-wrap' }}>{result.answer}</p>
          {result.citations?.length > 0 && (
            <p className="unknown">Sources: {result.citations.join(', ')}</p>
          )}
        </div>
      )}
    </section>
  );
}
