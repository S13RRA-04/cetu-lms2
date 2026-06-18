import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import DataStream from '../components/DataStream.jsx';
import DecryptText from '../components/DecryptText.jsx';

const DEFAULT_PROMPT =
  'A signal has been embedded in this operations channel. Inspect the page source to intercept it.';

/* Injects the signal as an HTML comment in <head> and a styled console message */
function injectSignal(code) {
  const comment = document.createComment(
    ` ╔══════════════════════════════════════╗\n` +
    ` ║  INTERCEPTED TRANSMISSION            ║\n` +
    ` ║  SIGNAL CODE: ${code.toUpperCase().padEnd(22)} ║\n` +
    ` ╚══════════════════════════════════════╝ `
  );
  document.head.appendChild(comment);

  console.log(
    '%c\n  ENCRYPTED CHANNEL SIGNAL DETECTED\n' +
    `  CODE: ${code.toUpperCase()}\n` +
    '  Enter this code in the Signal Entry terminal to proceed.\n',
    'color: #00ff9d; font-family: monospace; font-size: 13px; font-weight: bold; ' +
    'background: #040608; padding: 8px 16px; border-left: 3px solid #00ff9d;'
  );
}

/* ── Frequency scanner pre-stage ──────────────────────────────────────────── */
// Values as 0–1 decimals for CSS scaleY
const BAR_HEIGHTS = [
  0.45,0.16,0.70,0.28,0.96,0.12,0.58,0.82,0.22,0.74,0.10,0.88,0.36,0.64,0.18,0.92,
  0.48,0.26,0.80,0.14,0.66,0.40,0.96,0.20,0.76,0.32,0.88,0.12,0.56,0.84,0.24,0.72,
  0.44,0.94,0.16,0.62,0.38,0.86,
];

function FreqScanner({ locked }) {
  return (
    <div className="se-scanner">
      <div className={`se-scan-label${locked ? ' se-scan-acquired' : ''}`}>
        {locked
          ? <DecryptText text="SIGNAL ACQUIRED · CH 14.235 MHz" speed={18} hold={3} />
          : 'SCANNING FREQUENCIES...'}
      </div>
      <div className={`se-freq-bars${locked ? ' se-freq-bars--lock' : ''}`}>
        {BAR_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className="se-freq-bar"
            style={{
              '--bar-h': h,
              animationDelay:    `${(i * 53) % 600}ms`,
              animationDuration: `${300 + (i * 41) % 350}ms`,
            }}
          />
        ))}
      </div>
      <div className="se-scan-meta">
        {locked
          ? '● SIGNAL LOCKED — DECRYPTION KEY REQUIRED'
          : '○ SWEEP IN PROGRESS — MONITORING ALL CHANNELS'}
      </div>
    </div>
  );
}

/* ── Animated signal wave ─────────────────────────────────────────────────── */
const WAVE_POINTS =
  '0,30 20,30 30,10 40,50 50,10 60,50 70,20 80,40 90,15 100,45 ' +
  '110,5 120,55 130,8 140,52 150,12 160,30 170,12 180,52 190,8 ' +
  '200,55 210,5 220,45 230,15 240,40 250,20 260,50 270,10 280,50 ' +
  '290,10 300,30 320,30';

function SignalWave() {
  return (
    <div className="se-wave">
      <svg viewBox="0 0 320 60" fill="none" className="se-wave-svg">
        <motion.polyline
          points={WAVE_POINTS}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1400"
          initial={{ strokeDashoffset: 1400, opacity: 0.3 }}
          animate={{ strokeDashoffset: 0, opacity: 1 }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function SignalEntry({ drop, onVerify }) {
  const [input,     setInput]     = useState('');
  const [status,    setStatus]    = useState('idle'); // idle | wrong | verified
  const [shakeKey,  setShakeKey]  = useState(0);
  const [attempts,  setAttempts]  = useState(0);
  // scan phase: 'scan' → 'lock' → 'ready'
  const [scanPhase, setScanPhase] = useState('scan');
  const injected = useRef(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!injected.current && drop.html_signal) {
      injectSignal(drop.html_signal);
      injected.current = true;
    }
    const t1 = setTimeout(() => setScanPhase('lock'), 1500);
    const t2 = setTimeout(() => setScanPhase('ready'), 2400);
    const t3 = setTimeout(() => inputRef.current?.focus(), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
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
  const isReady = scanPhase === 'ready';

  return (
    <div className="se-root">
      <DataStream color="#00ff9d" opacity={0.06} fontSize={11} speedScale={1.1} />
      <div className="vk-scanlines" />

      <div className="se-body">

        {/* Header — always visible */}
        <motion.div
          className="se-header"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
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
            DROP {String(drop.number).padStart(2, '0')} —{' '}
            <DecryptText text={drop.title?.toUpperCase()} speed={24} hold={4} />
          </div>
        </motion.div>

        {/* Scan phase — shows while scanning/locking */}
        <AnimatePresence mode="wait">
          {!isReady && (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.35 }}
            >
              <FreqScanner locked={scanPhase === 'lock'} />
            </motion.div>
          )}

          {/* Main content — appears after scan */}
          {isReady && (
            <motion.div
              key="content"
              className="se-content"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              {/* Animated wave */}
              <SignalWave />

              {/* Prompt */}
              <div className="se-prompt">{prompt}</div>

              {/* Hint callout */}
              <div className="se-hint">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Right-click the page and select <strong>View Page Source</strong>, or open DevTools and inspect
                the <code>&lt;head&gt;</code> element. The signal is encoded there.
              </div>

              {/* Terminal input */}
              <motion.div
                key={shakeKey}
                className="se-terminal"
                animate={
                  status === 'wrong'
                    ? { x: [0, -10, 10, -7, 7, -3, 3, 0] }
                    : { x: 0 }
                }
                transition={{ duration: 0.48 }}
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
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <div className="auth-class-bar">UNCLASSIFIED // TRAINING ENVIRONMENT</div>
    </div>
  );
}
