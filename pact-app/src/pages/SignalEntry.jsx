import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import DataStream from '../components/DataStream.jsx';
import DecryptText from '../components/DecryptText.jsx';

const DEFAULT_PROMPT =
  'A signal has been embedded in this operations channel. Inspect the page source to intercept it.';

/* Injects the signal as an HTML comment in <head> and a styled console message */
function injectSignal(code) {
  // HTML comment — findable via View Page Source or Inspect → <head>
  const comment = document.createComment(
    ` ╔══════════════════════════════════════╗\n` +
    ` ║  INTERCEPTED TRANSMISSION            ║\n` +
    ` ║  SIGNAL CODE: ${code.toUpperCase().padEnd(22)} ║\n` +
    ` ╚══════════════════════════════════════╝ `
  );
  document.head.appendChild(comment);

  // Styled console message
  console.log(
    '%c\n  ENCRYPTED CHANNEL SIGNAL DETECTED\n' +
    `  CODE: ${code.toUpperCase()}\n` +
    '  Enter this code in the Signal Entry terminal to proceed.\n',
    'color: #00b0ff; font-family: monospace; font-size: 13px; font-weight: bold; ' +
    'background: #040608; padding: 8px 16px; border-left: 3px solid #00b0ff;'
  );
}

export default function SignalEntry({ drop, onVerify }) {
  const [input,    setInput]    = useState('');
  const [status,   setStatus]   = useState('idle'); // idle | wrong | verified
  const [shakeKey, setShakeKey] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const injected = useRef(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!injected.current && drop.html_signal) {
      injectSignal(drop.html_signal);
      injected.current = true;
    }
    // Auto-focus the input after a short delay (let the entry animation settle)
    const t = setTimeout(() => inputRef.current?.focus(), 900);
    return () => clearTimeout(t);
  }, [drop.html_signal]);

  const submit = useCallback(() => {
    if (!input.trim() || status === 'verified') return;
    const expected = (drop.html_signal ?? '').trim().toLowerCase();
    const entered  = input.trim().toLowerCase();
    if (entered === expected) {
      setStatus('verified');
      setTimeout(() => onVerify(), 1800);
    } else {
      setAttempts((n) => n + 1);
      setStatus('wrong');
      setShakeKey((k) => k + 1);
      setInput('');
      setTimeout(() => setStatus('idle'), 1400);
    }
  }, [input, status, drop.html_signal, onVerify]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Enter') submit(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [submit]);

  const prompt = drop.signal_prompt || DEFAULT_PROMPT;

  return (
    <div className="se-root">
      <DataStream color="#00ff9d" opacity={0.07} fontSize={11} speedScale={1.1} />
      <div className="vk-scanlines" />

      <div className="se-body">

        {/* Header */}
        <motion.div
          className="se-header"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="se-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 6s4-2 11-2 11 2 11 2v7s-4 3-11 3S1 13 1 13z"/>
              <path d="M1 13v5s4 2 11 2 11-2 11-2v-5"/>
              <circle cx="12" cy="9" r="1"/>
            </svg>
            ENCRYPTED SIGNAL INTERCEPTED
          </div>
          <div className="se-drop-id">
            DROP {String(drop.number).padStart(2, '0')} — <DecryptText text={drop.title?.toUpperCase()} speed={24} hold={4} />
          </div>
        </motion.div>

        {/* Signal wave graphic */}
        <motion.div
          className="se-wave"
          initial={{ opacity: 0, scaleX: 0.4 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
        >
          <svg viewBox="0 0 320 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="se-wave-svg">
            <polyline
              points="0,30 20,30 30,10 40,50 50,10 60,50 70,20 80,40 90,15 100,45 110,5 120,55 130,8 140,52 150,12 160,30 170,12 180,52 190,8 200,55 210,5 220,45 230,15 240,40 250,20 260,50 270,10 280,50 290,10 300,30 320,30"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </motion.div>

        {/* Prompt */}
        <motion.div
          className="se-prompt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          {prompt}
        </motion.div>

        {/* Hint callout */}
        <motion.div
          className="se-hint"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          Right-click the page and select <strong>View Page Source</strong>, or open DevTools and inspect the{' '}
          <code>&lt;head&gt;</code> element. The signal is encoded there.
        </motion.div>

        {/* Terminal input */}
        <motion.div
          key={shakeKey}
          className="se-terminal"
          initial={{ opacity: 0, y: 10 }}
          animate={
            status === 'wrong'
              ? { x: [0, -10, 10, -7, 7, -3, 3, 0], opacity: 1, y: 0 }
              : { x: 0, opacity: 1, y: 0 }
          }
          transition={{ duration: status === 'wrong' ? 0.48 : 0.5, delay: status === 'wrong' ? 0 : 0.75 }}
        >
          <span className="se-prompt-char">$</span>
          <input
            ref={inputRef}
            className="se-input"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="ENTER SIGNAL CODE"
            spellCheck={false}
            autoComplete="off"
            disabled={status === 'verified'}
          />
          <motion.button
            className="se-submit"
            onClick={submit}
            whileTap={{ scale: 0.9 }}
            disabled={!input.trim() || status === 'verified' || status === 'wrong'}
          >
            {status === 'verified' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : 'TRANSMIT'}
          </motion.button>
        </motion.div>

        {/* Status messages */}
        <AnimatePresence mode="wait">
          {status === 'wrong' && (
            <motion.div key="err" className="se-err"
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              SIGNAL NOT RECOGNIZED — CHECK YOUR INTERCEPT
              {attempts > 1 && <span className="se-attempts"> ({attempts} failed attempts)</span>}
            </motion.div>
          )}
          {status === 'verified' && (
            <motion.div key="ok" className="se-ok"
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              SIGNAL VERIFIED — DECRYPTING TRANSMISSION
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <div className="auth-class-bar">UNCLASSIFIED // TRAINING ENVIRONMENT</div>
    </div>
  );
}
