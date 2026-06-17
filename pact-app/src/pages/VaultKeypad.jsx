import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { verifyVaultPin } from '../api/pact.js';
import DecryptText from '../components/DecryptText.jsx';

const MAX_ATTEMPTS = 5;

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
        {/* Outermost static frame */}
        <circle cx="140" cy="140" r="136" stroke={accent} strokeWidth="1" opacity="0.15" />

        {/* Slow-rotating outer ring with bolt pins */}
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

        {/* Main door plate — static */}
        <circle cx="140" cy="140" r="106" fill="rgba(3,6,10,0.75)" stroke={accent} strokeWidth="2.5" opacity="0.8" />
        {/* Door plate inner shadow ring */}
        <circle cx="140" cy="140" r="100" stroke={accent} strokeWidth="0.5" opacity="0.15" />

        {/* Counter-rotating combination ring */}
        <motion.g
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '140px 140px' }}
        >
          <circle cx="140" cy="140" r="88" stroke={accent} strokeWidth="1" opacity="0.3" />
          {ticks.map((i) => {
            const rad = (i / 48) * Math.PI * 2;
            const r1  = 84;
            const r2  = i % 8 === 0 ? 90 : i % 4 === 0 ? 88 : 86;
            return (
              <line
                key={i}
                x1={140 + Math.cos(rad) * r1} y1={140 + Math.sin(rad) * r1}
                x2={140 + Math.cos(rad) * r2} y2={140 + Math.sin(rad) * r2}
                stroke={accent} strokeWidth={i % 8 === 0 ? 1.5 : 1} opacity={i % 8 === 0 ? 0.6 : 0.3}
              />
            );
          })}
        </motion.g>

        {/* Spoke arms */}
        {spokes.map((angle) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <line
              key={angle}
              x1={140 + Math.cos(rad) * 22} y1={140 + Math.sin(rad) * 22}
              x2={140 + Math.cos(rad) * 80} y2={140 + Math.sin(rad) * 80}
              stroke={accent} strokeWidth="3" opacity="0.85"
              strokeLinecap="round"
            />
          );
        })}
        {/* Spoke end caps */}
        {spokes.map((angle) => {
          const rad = (angle * Math.PI) / 180;
          return <circle key={angle} cx={140 + Math.cos(rad) * 80} cy={140 + Math.sin(rad) * 80} r="4" fill={accent} opacity="0.7" />;
        })}

        {/* Center hub */}
        <circle cx="140" cy="140" r="22" stroke={accent} strokeWidth="2.5" opacity="0.9" fill="rgba(0,176,255,0.05)" />
        <circle cx="140" cy="140" r="14" stroke={accent} strokeWidth="1.5" opacity="0.5" />
        <circle cx="140" cy="140" r="7"  fill={accent} opacity="0.95" />

        {/* Keyhole slot below center */}
        <rect x="137" y="148" width="6" height="10" rx="1" fill={accent} opacity="0.6" />
      </svg>
    </motion.div>
  );
}

/* ── Scanner sweep line ─────────────────────────────────────────────────────── */
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

/* ── Hex keypad button ──────────────────────────────────────────────────────── */
function Key({ label, onClick, wide = false, danger = false, accent, disabled = false }) {
  return (
    <motion.button
      className={`vk-key${wide ? ' vk-key-wide' : ''}${danger ? ' vk-key-danger' : ''}`}
      style={{ '--vk-accent': accent }}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.9, backgroundColor: `${accent}22` }}
      transition={{ duration: 0.07 }}
    >
      {label}
    </motion.button>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */
export default function VaultKeypad({ drop, onUnlock }) {
  const accent    = '#00b0ff';
  const pinLength = drop.vault_pin_length ?? 4;

  const [pin,      setPin]      = useState('');
  const [status,   setStatus]   = useState('idle'); // idle | checking | wrong | locked | open
  const [attempts, setAttempts] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [wrongMsg, setWrongMsg] = useState('');

  const press = useCallback((char) => {
    if (status !== 'idle') return;
    setPin((p) => p.length < pinLength ? p + char : p);
  }, [status, pinLength]);

  const backspace = useCallback(() => {
    if (status !== 'idle') return;
    setPin((p) => p.slice(0, -1));
  }, [status]);

  const submit = useCallback(async () => {
    if (status !== 'idle' || pin.length === 0) return;
    setStatus('checking');
    try {
      const { valid } = await verifyVaultPin(drop.id, pin);
      if (valid) {
        setStatus('open');
        setTimeout(() => onUnlock(), 1600);
      } else {
        const next = attempts + 1;
        setAttempts(next);
        setPin('');
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
  }, [status, pin, attempts, drop.id, onUnlock]);

  useEffect(() => {
    const handler = (e) => {
      if (/^[0-9a-fA-F]$/.test(e.key)) press(e.key.toUpperCase());
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Enter') submit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [press, backspace, submit]);

  const hexKeys = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];
  const isBlocked = status === 'locked' || status === 'open' || status === 'checking';

  return (
    <div className="vk-root">
      {/* Scanlines overlay */}
      <div className="vk-scanlines" />
      {/* Scanner sweep */}
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            <DecryptText text="ENCRYPTED EVIDENCE VAULT" speed={26} hold={4} />
          </div>
          <div className="vk-drop-id">
            DROP {String(drop.number).padStart(2, '0')} &mdash; {drop.title?.toUpperCase()}
          </div>
        </motion.div>

        {/* ── Vault door ── */}
        <motion.div
          className="vk-door-section"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
        >
          <AnimatePresence>
            {status === 'open' && (
              <motion.div
                className="vk-door-glow"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
            )}
          </AnimatePresence>
          <VaultDoor open={status === 'open'} accent={accent} />
        </motion.div>

        {/* ── Cipher challenge ── */}
        {drop.vault_hint && (
          <motion.div
            className="vk-challenge"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.35 }}
          >
            <div className="vk-challenge-label">CIPHER CHALLENGE</div>
            <div className="vk-challenge-text">{drop.vault_hint}</div>
          </motion.div>
        )}

        {/* ── PIN display ── */}
        <motion.div
          key={shakeKey}
          className="vk-pin-display"
          animate={
            status === 'wrong'
              ? { x: [0, -10, 10, -7, 7, -4, 4, 0] }
              : { x: 0 }
          }
          transition={{ duration: 0.48 }}
          initial={{ opacity: 0 }}
          style={{ opacity: 1 }}
        >
          {Array.from({ length: pinLength }, (_, i) => {
            const filled = i < pin.length;
            const active = i === pin.length && status === 'idle';
            return (
              <div
                key={i}
                className={[
                  'vk-pin-cell',
                  filled  ? 'vk-pin-filled'  : '',
                  active  ? 'vk-pin-active'  : '',
                  status === 'wrong' ? 'vk-pin-wrong' : '',
                  status === 'open'  ? 'vk-pin-open'  : '',
                ].join(' ')}
              >
                {filled ? (
                  <span className="vk-pin-char">{pin[i]}</span>
                ) : active ? (
                  <motion.span
                    className="vk-pin-cursor"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                  />
                ) : (
                  <span className="vk-pin-placeholder" />
                )}
              </div>
            );
          })}
        </motion.div>

        {/* ── Status message ── */}
        <div className="vk-status-row">
          <AnimatePresence mode="wait">
            {(status === 'wrong' || status === 'locked') && (
              <motion.div
                key="err"
                className={`vk-err-msg${status === 'locked' ? ' vk-err-locked' : ''}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
              <motion.div
                key="ok"
                className="vk-ok-msg"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: 0.2 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                VAULT UNLOCKED — ACCESSING EVIDENCE
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Keypad ── */}
        {status !== 'locked' && status !== 'open' && (
          <motion.div
            className="vk-keypad"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.5 }}
          >
            <div className="vk-hex-grid">
              {hexKeys.map((k) => (
                <Key key={k} label={k} onClick={() => press(k)} accent={accent} disabled={isBlocked} />
              ))}
            </div>
            <div className="vk-control-row">
              <Key label={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 6H3l6 6-6 6h18V6z"/>
                </svg>
              } onClick={backspace} accent={accent} disabled={isBlocked} danger />
              <Key
                label={status === 'checking' ? '··· VERIFYING' : 'ENTER'}
                onClick={submit}
                wide
                accent={accent}
                disabled={isBlocked || pin.length === 0}
              />
            </div>
          </motion.div>
        )}

        {status === 'locked' && (
          <motion.div
            className="vk-locked-msg"
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
