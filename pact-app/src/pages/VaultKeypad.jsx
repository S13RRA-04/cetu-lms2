import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { verifyVaultPin } from '../api/pact.js';
import DataStream from '../components/DataStream.jsx';
import DecryptText from '../components/DecryptText.jsx';

const MAX_ATTEMPTS = 5;

/* ── Vault door SVG ────────────────────────────────────────────────────────── */
function VaultDoor({ open, accent }) {
  return (
    <motion.div
      className="vk-door-wrap"
      animate={open ? { rotateY: -90, opacity: 0 } : { rotateY: 0, opacity: 1 }}
      transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
      style={{ transformPerspective: 800, transformOrigin: 'left center' }}
    >
      <svg className="vk-door-svg" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer ring */}
        <circle cx="100" cy="100" r="96" stroke={accent} strokeWidth="3" opacity="0.9" />
        {/* Middle ring */}
        <circle cx="100" cy="100" r="80" stroke={accent} strokeWidth="1.5" opacity="0.5" />
        {/* Inner plate */}
        <circle cx="100" cy="100" r="64" stroke={accent} strokeWidth="2" opacity="0.7" />
        {/* Handle */}
        <circle cx="100" cy="100" r="14" stroke={accent} strokeWidth="2.5" opacity="1" />
        <circle cx="100" cy="100" r="5" fill={accent} opacity="0.9" />
        {/* Spoke arms */}
        {[0, 72, 144, 216, 288].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 100 + Math.cos(rad) * 14;
          const y1 = 100 + Math.sin(rad) * 14;
          const x2 = 100 + Math.cos(rad) * 60;
          const y2 = 100 + Math.sin(rad) * 60;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={accent} strokeWidth="2" opacity="0.7" />;
        })}
        {/* Bolt pins around outer edge */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const cx  = 100 + Math.cos(rad) * 88;
          const cy  = 100 + Math.sin(rad) * 88;
          return <circle key={i} cx={cx} cy={cy} r="4" fill={accent} opacity="0.6" />;
        })}
        {/* Combination ring tick marks */}
        {Array.from({ length: 40 }, (_, i) => {
          const rad  = (i / 40) * Math.PI * 2;
          const r1   = 72, r2 = i % 5 === 0 ? 76 : 74;
          return (
            <line key={i}
              x1={100 + Math.cos(rad) * r1} y1={100 + Math.sin(rad) * r1}
              x2={100 + Math.cos(rad) * r2} y2={100 + Math.sin(rad) * r2}
              stroke={accent} strokeWidth="1" opacity="0.4"
            />
          );
        })}
      </svg>
    </motion.div>
  );
}

/* ── Hex keypad button ─────────────────────────────────────────────────────── */
function Key({ label, onClick, wide = false, danger = false, accent }) {
  return (
    <motion.button
      className={`vk-key${wide ? ' vk-key-wide' : ''}${danger ? ' vk-key-danger' : ''}`}
      style={{ '--vk-accent': accent }}
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      transition={{ duration: 0.08 }}
    >
      {label}
    </motion.button>
  );
}

/* ── Main component ────────────────────────────────────────────────────────── */
export default function VaultKeypad({ drop, onUnlock }) {
  const accent       = '#00b0ff';
  const pinLength    = drop.vault_pin_length ?? 4;
  const [pin,        setPin]        = useState('');
  const [status,     setStatus]     = useState('idle'); // idle | checking | wrong | locked | open
  const [attempts,   setAttempts]   = useState(0);
  const [shakeKey,   setShakeKey]   = useState(0);
  const [wrongMsg,   setWrongMsg]   = useState('');

  const press = useCallback((char) => {
    if (status === 'locked' || status === 'open' || status === 'checking') return;
    setPin((p) => p.length < pinLength ? p + char : p);
  }, [status, pinLength]);

  const backspace = useCallback(() => {
    if (status === 'locked' || status === 'open' || status === 'checking') return;
    setPin((p) => p.slice(0, -1));
  }, [status]);

  const submit = useCallback(async () => {
    if (status !== 'idle' || pin.length === 0) return;
    setStatus('checking');

    try {
      const { valid } = await verifyVaultPin(drop.id, pin);
      if (valid) {
        setStatus('open');
        // Wait for vault animation to finish before calling onUnlock
        setTimeout(() => onUnlock(), 1600);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin('');
        if (newAttempts >= MAX_ATTEMPTS) {
          setStatus('locked');
          setWrongMsg('VAULT LOCKED — MAXIMUM ATTEMPTS EXCEEDED');
        } else {
          setStatus('wrong');
          setShakeKey((k) => k + 1);
          setWrongMsg(`ACCESS DENIED — ${MAX_ATTEMPTS - newAttempts} ATTEMPT${MAX_ATTEMPTS - newAttempts === 1 ? '' : 'S'} REMAINING`);
          setTimeout(() => setStatus('idle'), 1200);
        }
      }
    } catch {
      setStatus('idle');
    }
  }, [status, pin, attempts, drop.id, onUnlock]);

  // Keyboard support
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

  return (
    <div className="vk-root">
      <DataStream color={accent} opacity={0.08} fontSize={11} speedScale={1.4} />
      <div className="vk-scanlines" />

      <div className="vk-body">

        {/* Header */}
        <div className="vk-header">
          <div className="vk-stamp">
            <DecryptText text="ENCRYPTED EVIDENCE VAULT" speed={28} hold={3} />
          </div>
          <div className="vk-drop-id">
            DROP {String(drop.number).padStart(2, '0')} &mdash; {drop.title?.toUpperCase()}
          </div>
          <div className="vk-clearance">SECURITY LEVEL: CLASSIFIED</div>
        </div>

        {/* Vault door */}
        <div className="vk-door-section">
          <AnimatePresence>
            {status === 'open' && (
              <motion.div
                className="vk-door-glow"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1.4 }}
                transition={{ duration: 0.9, delay: 0.4 }}
              />
            )}
          </AnimatePresence>
          <VaultDoor open={status === 'open'} accent={accent} />
        </div>

        {/* Cipher challenge */}
        {drop.vault_hint && (
          <div className="vk-challenge">
            <div className="vk-challenge-label">CIPHER CHALLENGE</div>
            <div className="vk-challenge-text">{drop.vault_hint}</div>
          </div>
        )}

        {/* PIN display */}
        <motion.div
          key={shakeKey}
          className="vk-pin-display"
          animate={status === 'wrong' ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.44, ease: 'easeInOut' }}
        >
          {Array.from({ length: pinLength }, (_, i) => (
            <div
              key={i}
              className={`vk-pin-cell${i < pin.length ? ' vk-pin-filled' : ''}${status === 'wrong' ? ' vk-pin-wrong' : ''}${status === 'open' ? ' vk-pin-open' : ''}`}
              style={i < pin.length ? { borderColor: accent } : {}}
            >
              {i < pin.length ? (
                <span className="vk-pin-char" style={{ color: accent }}>{pin[i]}</span>
              ) : (
                <span className="vk-pin-placeholder">_</span>
              )}
            </div>
          ))}
        </motion.div>

        {/* Status message */}
        <AnimatePresence mode="wait">
          {(status === 'wrong' || status === 'locked') && (
            <motion.div
              key="err"
              className={`vk-err-msg${status === 'locked' ? ' vk-err-locked' : ''}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              {wrongMsg}
            </motion.div>
          )}
          {status === 'open' && (
            <motion.div
              key="ok"
              className="vk-ok-msg"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              VAULT UNLOCKED — ACCESSING EVIDENCE
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hex keypad */}
        {status !== 'locked' && status !== 'open' && (
          <div className="vk-keypad">
            <div className="vk-hex-grid">
              {hexKeys.map((k) => (
                <Key key={k} label={k} onClick={() => press(k)} accent={accent} />
              ))}
            </div>
            <div className="vk-control-row">
              <Key label="⌫" onClick={backspace} accent={accent} />
              <Key
                label={status === 'checking' ? '...' : 'ENTER'}
                onClick={submit}
                wide
                accent={accent}
              />
            </div>
          </div>
        )}

        {status === 'locked' && (
          <div className="vk-locked-msg">
            Contact your instructor to reset vault access.
          </div>
        )}

      </div>

      <div className="auth-class-bar">UNCLASSIFIED // TRAINING ENVIRONMENT</div>
    </div>
  );
}
