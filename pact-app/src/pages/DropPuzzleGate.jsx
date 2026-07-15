import { useMemo, useState } from 'react';
import { verifyDropPuzzle } from '../api/pact.js';

const LABELS = {
  cipher_wheel: ['CIPHER WHEEL', 'ROTATION ANALYSIS'],
  log_grep: ['LOG GREP', 'EVENT STREAM ANALYSIS'],
  hash_match: ['HASH MATCH', 'INTEGRITY VERIFICATION'],
};

function rotate(text, shift) {
  return text.replace(/[a-z]/gi, (char) => {
    const base = char <= 'Z' ? 65 : 97;
    return String.fromCharCode(base + (char.charCodeAt(0) - base - shift + 26) % 26);
  });
}

export default function DropPuzzleGate({ puzzle, onComplete, verifyAnswer = null }) {
  const [answer, setAnswer] = useState('');
  const [shift, setShift] = useState(puzzle.config?.method === 'rot13' ? 13 : puzzle.config?.shift ?? 1);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [title, subtitle] = LABELS[puzzle.puzzle_type] ?? ['DECRYPTION GATE', 'ANALYSIS REQUIRED'];

  // Caesar puzzles intentionally provide a rotation workbench. Fixed-method
  // ROT13/Atbash puzzles must not render plaintext automatically because that
  // would disclose the expected answer before the learner submits it.
  const decoded = useMemo(() => {
    if (puzzle.config?.method !== 'caesar') return null;
    return rotate(puzzle.config?.cipherText ?? '', shift);
  }, [puzzle.config, shift]);

  const logLines = useMemo(() => {
    const lines = puzzle.config?.logLines ?? [];
    if (!filter.trim()) return lines;
    const query = filter.toLowerCase();
    return lines.filter((line) => line.toLowerCase().includes(query));
  }, [puzzle.config, filter]);

  const submit = async (event) => {
    event.preventDefault();
    if (!answer.trim() || status === 'checking') return;
    setStatus('checking');
    setMessage('');
    try {
      const result = verifyAnswer
        ? await verifyAnswer(answer)
        : await verifyDropPuzzle(puzzle.drop_id, puzzle.id, answer);
      if (!result.valid) {
        setStatus('wrong');
        setMessage('ANSWER REJECTED - RECHECK THE EVIDENCE');
        return;
      }
      setStatus('complete');
      setMessage('VERIFIED - DECRYPTION LAYER CLEARED');
      setTimeout(onComplete, 700);
    } catch {
      setStatus('error');
      setMessage('VERIFICATION SERVICE UNAVAILABLE - TRY AGAIN');
    }
  };

  return (
    <div className={`dpg-root dpg-${puzzle.puzzle_type}`}>
      <div className="dpg-grid" />
      <main className="dpg-panel">
        <header className="dpg-header">
          <span className="dpg-kicker">PACT // DROP DECRYPTION</span>
          <h1>{title}</h1>
          <span>{subtitle}</span>
        </header>

        <section className="dpg-task">
          <div className="dpg-label">OPERATOR TASKING</div>
          <p>{puzzle.prompt || (puzzle.puzzle_type === 'hash_match' ? 'Compute the requested digest for the evidence text.' : 'Analyze the evidence and submit the extracted value.')}</p>
        </section>

        {puzzle.puzzle_type === 'cipher_wheel' && (
          <section className="dpg-workspace">
            <div className="dpg-label">INTERCEPTED CIPHERTEXT</div>
            <pre className="dpg-evidence">{puzzle.config?.cipherText}</pre>
            {puzzle.config?.method === 'caesar' && (
              <label className="dpg-range">ROTATION {String(shift).padStart(2, '0')}
                <input type="range" min="1" max="25" value={shift} onChange={(e) => setShift(Number(e.target.value))} />
              </label>
            )}
            {decoded != null && <>
              <div className="dpg-label">WORKBENCH OUTPUT</div>
              <pre className="dpg-output">{decoded}</pre>
            </>}
          </section>
        )}

        {puzzle.puzzle_type === 'log_grep' && (
          <section className="dpg-workspace">
            <label className="dpg-label" htmlFor="dpg-filter">LOCAL FILTER (OPTIONAL)</label>
            <input id="dpg-filter" className="dpg-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter visible lines..." />
            <pre className="dpg-logs">{logLines.length ? logLines.join('\n') : 'NO MATCHING EVENTS'}</pre>
          </section>
        )}

        {puzzle.puzzle_type === 'hash_match' && (
          <section className="dpg-workspace">
            <div className="dpg-hash-meta">ALGORITHM <strong>{puzzle.config?.algorithm?.toUpperCase()}</strong></div>
            <div className="dpg-label">EVIDENCE TEXT (HASH EXACTLY AS SHOWN)</div>
            <pre className="dpg-evidence">{puzzle.config?.inputText}</pre>
            <button type="button" className="dpg-help" onClick={() => setShowHelp((value) => !value)}>WHY HASH THIS?</button>
            {showHelp && <p className="dpg-helptext">A cryptographic digest provides a repeatable integrity fingerprint. Use an approved external hashing tool and submit the hexadecimal digest.</p>}
          </section>
        )}

        <form className="dpg-submit" onSubmit={submit}>
          <label htmlFor="dpg-answer">DERIVED ANSWER</label>
          <div><input id="dpg-answer" value={answer} onChange={(e) => { setAnswer(e.target.value); setStatus('idle'); setMessage(''); }} autoComplete="off" spellCheck="false" /><button disabled={!answer.trim() || status === 'checking'}>{status === 'checking' ? 'VERIFYING...' : 'VERIFY'}</button></div>
          {message && <p className={`dpg-status ${status}`}>{message}</p>}
        </form>
      </main>
    </div>
  );
}
