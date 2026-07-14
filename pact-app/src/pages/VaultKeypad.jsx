import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { verifyVaultPin } from '../api/pact.js';
import DecryptText from '../components/DecryptText.jsx';

const MAX_ATTEMPTS = 5;
const MAX_CODE_LEN = 64;

/* ── Animated vault door ────────────────────────────────────────────────────── */
function VaultDoor({ open, accent }) {
  const spokes = [0, 72, 144, 216, 288];
  const bolts  = [0, 45, 90, 135, 180, 225, 270, 315];
  const ticks  = Array.from({ length: 48 }, (_, i) => i);

  return (
    <motion.div
      className="vk-door-wrap"
      animate={open ? { rotateY: -90, opacity: 0 } : { rotateY: 0, opacity: 1 }}
      transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
      style={{ transformPerspective: 1400, transformOrigin: 'left center' }}
    >
      <svg className="vk-door-svg" viewBox="0 0 280 280" fill="none">
        <circle cx="140" cy="140" r="136" stroke={accent} strokeWidth="1" opacity="0.15" />
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '140px 140px' }}
        >
          <circle cx="140" cy="140" r="124" stroke={accent} strokeWidth="1" opacity="0.2" strokeDasharray="3 9" />
          {bolts.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            return (
              <g key={angle}>
                <circle cx={140 + Math.cos(rad) * 124} cy={140 + Math.sin(rad) * 124} r="6" stroke={accent} strokeWidth="1.5" opacity="0.6" fill="rgba(0,0,0,0.6)" />
                <circle cx={140 + Math.cos(rad) * 124} cy={140 + Math.sin(rad) * 124} r="2.5" fill={accent} opacity="0.7" />
              </g>
            );
          })}
        </motion.g>
        <circle cx="140" cy="140" r="106" fill="rgba(3,6,10,0.75)" stroke={accent} strokeWidth="2.5" opacity="0.8" />
        <circle cx="140" cy="140" r="100" stroke={accent} strokeWidth="0.5" opacity="0.15" />
        <motion.g
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '140px 140px' }}
        >
          <circle cx="140" cy="140" r="88" stroke={accent} strokeWidth="1" opacity="0.3" />
          {ticks.map((i) => {
            const rad = (i / 48) * Math.PI * 2;
            const r1 = 84, r2 = i % 8 === 0 ? 90 : i % 4 === 0 ? 88 : 86;
            return (
              <line key={i}
                x1={140 + Math.cos(rad) * r1} y1={140 + Math.sin(rad) * r1}
                x2={140 + Math.cos(rad) * r2} y2={140 + Math.sin(rad) * r2}
                stroke={accent} strokeWidth={i % 8 === 0 ? 1.5 : 1} opacity={i % 8 === 0 ? 0.6 : 0.3}
              />
            );
          })}
        </motion.g>
        {spokes.map((angle) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <g key={angle}>
              <line
                x1={140 + Math.cos(rad) * 22} y1={140 + Math.sin(rad) * 22}
                x2={140 + Math.cos(rad) * 80} y2={140 + Math.sin(rad) * 80}
                stroke={accent} strokeWidth="3" opacity="0.85" strokeLinecap="round"
              />
              <circle cx={140 + Math.cos(rad) * 80} cy={140 + Math.sin(rad) * 80} r="4" fill={accent} opacity="0.7" />
            </g>
          );
        })}
        <circle cx="140" cy="140" r="22" stroke={accent} strokeWidth="2.5" opacity="0.9" fill="rgba(0,176,255,0.05)" />
        <circle cx="140" cy="140" r="14" stroke={accent} strokeWidth="1.5" opacity="0.5" />
        <circle cx="140" cy="140" r="7" fill={accent} opacity="0.95" />
        <rect x="137" y="148" width="6" height="10" rx="1" fill={accent} opacity="0.6" />
      </svg>
    </motion.div>
  );
}

/* ── Scanner sweep ──────────────────────────────────────────────────────────── */
function Scanner() {
  return (
    <motion.div
      className="vk-scanner"
      initial={{ y: 0, opacity: 0.6 }}
      animate={{ y: '100vh', opacity: 0 }}
      transition={{ duration: 4, repeat: Infinity, repeatDelay: 6, ease: 'linear' }}
    />
  );
}

/* ── Keyboard key ───────────────────────────────────────────────────────────── */
function Key({ label, onClick, wide = false, danger = false, disabled = false, className = '' }) {
  return (
    <motion.button
      className={`vk-key${wide ? ' vk-key-wide' : ''}${danger ? ' vk-key-danger' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? {} : { scale: 0.88, y: 1 }}
      transition={{ duration: 0.07 }}
    >
      {label}
    </motion.button>
  );
}

/* ── Backspace icon ─────────────────────────────────────────────────────────── */
function BkspIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/>
      <line x1="18" y1="9" x2="13" y2="14"/>
      <line x1="13" y1="9" x2="18" y2="14"/>
    </svg>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */
export default function VaultKeypad({ drop, onUnlock, verifyPin = null }) {
  const accent = '#00b0ff';

  const [code,     setCode]     = useState('');
  const [status,   setStatus]   = useState('idle');
  const [attempts, setAttempts] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [wrongMsg, setWrongMsg] = useState('');
  const [keyFlash, setKeyFlash] = useState(false);
  const flashTimer = useRef(null);

  const press = useCallback((char) => {
    if (status !== 'idle') return;
    setCode((c) => c.length < MAX_CODE_LEN ? c + char : c);
    clearTimeout(flashTimer.current);
    setKeyFlash(true);
    flashTimer.current = setTimeout(() => setKeyFlash(false), 80);
  }, [status]);

  const backspace = useCallback(() => {
    if (status !== 'idle') return;
    setCode((c) => c.slice(0, -1));
  }, [status]);

  const submit = useCallback(async () => {
    if (status !== 'idle' || !code.trim()) return;
    setStatus('checking');
    try {
      const { valid } = verifyPin
        ? await verifyPin(code)
        : await verifyVaultPin(drop.id, code);
      if (valid) {
        setStatus('open');
        setTimeout(() => onUnlock(), 1600);
      } else {
        const next = attempts + 1;
        setAttempts(next);
        setCode('');
        if (next >= MAX_ATTEMPTS) {
          setStatus('locked');
          setWrongMsg('VAULT LOCKED — MAXIMUM ATTEMPTS EXCEEDED');
        } else {
          setStatus('wrong');
          setShakeKey((k) => k + 1);
          setWrongMsg(`INCORRECT — ${MAX_ATTEMPTS - next} ATTEMPT${MAX_ATTEMPTS - next === 1 ? '' : 'S'} REMAINING`);
          setTimeout(() => setStatus('idle'), 1400);
        }
      }
    } catch {
      setStatus('idle');
    }
  }, [status, code, attempts, drop.id, onUnlock, verifyPin]);

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length === 1)           { e.preventDefault(); press(e.key); }
      else if (e.key === 'Backspace')   { e.preventDefault(); backspace(); }
      else if (e.key === 'Enter')       { e.preventDefault(); submit(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [press, backspace, submit]); // eslint-disable-line react-hooks/exhaustive-deps

  const isBlocked = status !== 'idle';

  return (
    <div className="vk-root">
      <div className="vk-scanlines" />
      <Scanner />

      <div className="vk-body">

        {/* ── Header ── */}
        <motion.div
          className="vk-header"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="vk-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            <DecryptText text="ENCRYPTED EVIDENCE VAULT" speed={26} hold={4} />
          </div>
          <div className="vk-drop-id">
            DROP {String(drop.number).padStart(2, '0')} &mdash; {drop.title?.toUpperCase()}
          </div>
        </motion.div>

        {/* ── Two-column layout: vault door + right panel ── */}
        <div className="vk-main-grid">

          {/* Left: vault door */}
          <motion.div
            className="vk-door-section"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.12, ease: 'easeOut' }}
          >
            <AnimatePresence>
              {status === 'open' && (
                <motion.div className="vk-door-glow"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1.5 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              )}
            </AnimatePresence>
            <VaultDoor open={status === 'open'} accent={accent} />
          </motion.div>

          {/* Right: cipher challenge */}
          {drop.vault_hint && (
            <motion.div
              className="vk-challenge"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.3 }}
            >
              <div className="vk-challenge-label">CIPHER CHALLENGE</div>
              <div className="vk-challenge-text">{drop.vault_hint}</div>
            </motion.div>
          )}
        </div>

        {/* ── Code input display ── */}
        <motion.div
          key={shakeKey}
          className={`vk-code-display${status === 'wrong' ? ' vk-code-wrong' : ''}${status === 'open' ? ' vk-code-open' : ''}${keyFlash ? ' vk-code-flash' : ''}`}
          animate={status === 'wrong' ? { x: [0, -10, 10, -7, 7, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.48 }}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <span className="vk-code-label">ACCESS CODE</span>
          <div className="vk-code-value">
            <span className="vk-code-text">{code || ''}</span>
            {status === 'idle' && (
              <motion.span
                className="vk-code-cursor"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.85, repeat: Infinity }}
              />
            )}
          </div>
        </motion.div>

        {/* ── Status row ── */}
        <div className="vk-status-row">
          <AnimatePresence mode="wait">
            {(status === 'wrong' || status === 'locked') && (
              <motion.div key="err"
                className={`vk-err-msg${status === 'locked' ? ' vk-err-locked' : ''}`}
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                {wrongMsg}
              </motion.div>
            )}
            {status === 'checking' && (
              <motion.div key="chk" className="vk-checking-msg"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                VERIFYING...
              </motion.div>
            )}
            {status === 'open' && (
              <motion.div key="ok" className="vk-ok-msg"
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: 0.2 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                VAULT UNLOCKED — ACCESSING EVIDENCE
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Full QWERTY keyboard ── */}
        {status !== 'locked' && status !== 'open' && (
          <motion.div
            className="vk-keyboard"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.5 }}
          >
            {/* Row 1 — numbers */}
            <div className="vk-kb-row vk-kb-r1">
              {'`1234567890-='.split('').map((k) => (
                <Key key={k} label={k} onClick={() => press(k)} disabled={isBlocked} />
              ))}
              <Key label={<BkspIcon />} onClick={backspace} danger disabled={isBlocked} className="vk-key-bksp" />
            </div>

            {/* Row 2 — QWERTY */}
            <div className="vk-kb-row vk-kb-r2">
              {'QWERTYUIOP[]\\'.split('').map((k) => (
                <Key key={k} label={k === '\\' ? '\\' : k} onClick={() => press(k)} disabled={isBlocked} />
              ))}
            </div>

            {/* Row 3 — home row */}
            <div className="vk-kb-row vk-kb-r3">
              {"ASDFGHJKL;'".split('').map((k) => (
                <Key key={k} label={k} onClick={() => press(k)} disabled={isBlocked} />
              ))}
              <Key
                label={status === 'checking' ? '···' : 'ENTER'}
                onClick={submit}
                wide
                disabled={isBlocked || !code.trim()}
                className="vk-key-enter"
              />
            </div>

            {/* Row 4 — bottom letters */}
            <div className="vk-kb-row vk-kb-r4">
              {'ZXCVBNM,./'.split('').map((k) => (
                <Key key={k} label={k} onClick={() => press(k)} disabled={isBlocked} />
              ))}
            </div>

            {/* Row 5 — space */}
            <div className="vk-kb-row vk-kb-r5">
              <Key label="SPACE" onClick={() => press(' ')} disabled={isBlocked} className="vk-key-space" />
            </div>
          </motion.div>
        )}

        {status === 'locked' && (
          <motion.div className="vk-locked-msg"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
          >
            Contact your instructor to reset vault access.
          </motion.div>
        )}

      </div>

      <div className="auth-class-bar">UNCLASSIFIED // TRAINING ENVIRONMENT</div>
    </div>
  );
}
