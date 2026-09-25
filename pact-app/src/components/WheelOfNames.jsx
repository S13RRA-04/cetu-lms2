import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

/*
  Every spin picks one comedic "gimmick" at random and runs its own
  intermediate rotation stage(s) before handing off into the shared real
  spin (runFinal, below). Whatever a gimmick does with `rotation` along the
  way is purely a visual detour — the actual winner and its landing angle
  (finalRotation) are computed once, upfront, from the wheel's rotation at
  the moment spin() was called, and never change. Every gimmick's stages
  stay well under ~1,500° of net displacement, while the real spin
  (extraSpins alone) always covers ≥3,600° — so the handoff into runFinal
  is always a forward burst past wherever the gimmick left off, never a
  backward jump.

  'plain' — 1-in-5 — is deliberately a non-event: it skips straight to
  runFinal with no detour and no stage label. The point isn't the absence of
  a bit so much as nobody watching can ever be sure THIS spin won't have
  one — that uncertainty is itself the joke, and it'd evaporate if "plain"
  looked any different going in from a spin that's about to fake them out.
*/
const GIMMICKS = ['fakeout', 'doublestop', 'reverse', 'shuffle', 'plain'];

const FAKEOUT_DURATION_MS = 4500;
const FAKEOUT_EASE        = 'cubic-bezier(0.25, 0.7, 0.4, 1)'; // a believable, ordinary ease-out — sells the "it's stopping!" lie

const DOUBLESTOP_SPIN_MS  = 3200;
const DOUBLESTOP_PAUSE_MS = 900; // a genuine, dead-stop beat before it bursts back to life

const REVERSE_FWD_MS        = 2200;
const REVERSE_BACK_MS       = 1600;
const REVERSE_SNAP_PAUSE_MS = 500; // real, visible beat for "OKAY, FOR REAL—" before the real spin takes over

const SHUFFLE_SPIN_MS   = 2600; // window during which the wedge labels rapidly cycle through other names
const SHUFFLE_STEP_MS   = 130;

const EASE_INOUT = 'cubic-bezier(0.3, 0.7, 0.3, 1)';
const EASE_SNAP  = 'cubic-bezier(0.5, 0, 0.5, 1)';

const FINAL_DURATION_MS = 9500;
const SPIN_EASE          = 'cubic-bezier(0.05, 0.9, 0.01, 1)'; // fast wind-up, very slow, grinding final crawl
const TENSION_MS        = 2600; // last stretch of the real spin — glow/pointer quicken to build anticipation before it lands
const REVEAL_PAUSE_MS   = 2600; // beat of silence between the wheel stopping and the winner banner appearing

const TENSION_LINES = ['ALMOST…', 'SO CLOSE…', "DON'T BLINK…", 'HOLD ON…', 'HERE IT COMES…'];
const TENSION_LINE_MS = 600;

const SIZE   = 320;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 6;
const LABEL_R = RADIUS * 0.64;

const PALETTE = [
  '#00b0ff', '#ff4d5e', '#22c67a', '#f5a623',
  '#a855f7', '#14b8c4', '#ec4899', '#84cc16',
];

const CONFETTI_COUNT = 22;

function polarToCartesian(angleDeg, r = RADIUS) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}

function wedgePath(startAngle, endAngle) {
  const start    = polarToCartesian(startAngle);
  const end      = polarToCartesian(endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function segmentFontSize(count) {
  if (count <= 6)  return 12.5;
  if (count <= 10) return 10.5;
  if (count <= 14) return 9;
  return 7.5;
}

function truncate(name, max = 22) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

// One fresh burst of confetti geometry per winner reveal — angle/distance/
// color/rotation are all randomized once and then just animated out, not
// re-rolled every render.
function makeConfetti() {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const angle    = (i / CONFETTI_COUNT) * 360 + (Math.random() * 24 - 12);
    const distance = 70 + Math.random() * 90;
    const rad      = (angle * Math.PI) / 180;
    return {
      id: i,
      x: Math.cos(rad) * distance,
      y: Math.sin(rad) * distance,
      rotate: Math.random() * 540 - 270,
      color: PALETTE[i % PALETTE.length],
      delay: Math.random() * 0.12,
      shape: i % 3 === 0 ? '50%' : '2px', // mix of dots and little squares
      size: 6 + Math.random() * 5,
    };
  });
}

const btnBase = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  letterSpacing: '.08em',
  borderRadius: 5,
  padding: '9px 20px',
  cursor: 'pointer',
  transition: 'opacity .15s, transform .1s',
};

export default function WheelOfNames({ names = [], onWinner, disabled = false }) {
  const [rotation, setRotation] = useState(0);
  const [transitionCss, setTransitionCss] = useState('none');
  const [phase,    setPhase]    = useState('idle'); // 'idle' | 'spinning' | 'settling'
  const [tensing,  setTensing]  = useState(false);  // final stretch of the real spin, before it actually stops
  const [tensionLine,  setTensionLine]  = useState(0);
  const [stageLabel,   setStageLabel]   = useState(null); // gimmick-specific button text override, or null for the default
  const [labelOffset,  setLabelOffset]  = useState(0);    // cosmetic wedge-label cycling for the 'shuffle' gimmick only
  const [winner,   setWinner]   = useState(null);
  const [confetti, setConfetti] = useState([]);

  const gimmickTimeoutRef = useRef(null);
  const spinTimeoutRef    = useRef(null);
  const tensionTimeoutRef = useRef(null);
  const revealTimeoutRef  = useRef(null);
  const tensionLineRef    = useRef(null);
  const shuffleIntervalRef = useRef(null);

  const spinning = phase === 'spinning';
  const settling = phase === 'settling';
  const canSpin  = !disabled && phase === 'idle' && names.length >= 2;
  const segAngle = names.length > 0 ? 360 / names.length : 0;
  const fontSize = segmentFontSize(names.length);

  // Cycle the comedic one-liners while tensing.
  useEffect(() => {
    if (!tensing) { setTensionLine(0); return undefined; }
    tensionLineRef.current = setInterval(() => {
      setTensionLine((i) => (i + 1) % TENSION_LINES.length);
    }, TENSION_LINE_MS);
    return () => clearInterval(tensionLineRef.current);
  }, [tensing]);

  useEffect(() => () => {
    clearTimeout(gimmickTimeoutRef.current);
    clearTimeout(spinTimeoutRef.current);
    clearTimeout(tensionTimeoutRef.current);
    clearTimeout(revealTimeoutRef.current);
    clearInterval(tensionLineRef.current);
    clearInterval(shuffleIntervalRef.current);
  }, []);

  const spin = () => {
    if (!canSpin) return;
    setWinner(null);
    setConfetti([]);
    setLabelOffset(0);

    const winnerIdx      = Math.floor(Math.random() * names.length);
    const winnerMidAngle = winnerIdx * segAngle + segAngle / 2;
    const startRotation  = rotation;
    const currentMod     = ((startRotation % 360) + 360) % 360;
    const targetMod      = ((360 - winnerMidAngle) % 360 + 360) % 360;
    let delta             = targetMod - currentMod;
    if (delta < 0) delta += 360;
    const extraSpins    = 360 * (10 + Math.floor(Math.random() * 4));
    const finalRotation = startRotation + delta + extraSpins;

    clearTimeout(gimmickTimeoutRef.current);
    clearTimeout(spinTimeoutRef.current);
    clearTimeout(tensionTimeoutRef.current);
    clearTimeout(revealTimeoutRef.current);
    clearInterval(shuffleIntervalRef.current);

    setPhase('spinning');
    setTensing(false);
    setStageLabel(null);

    // The shared tail every gimmick eventually calls into — the real,
    // deterministic spin onto the true winner, followed by the tension
    // build, the settle, and the reveal.
    const runFinal = () => {
      setStageLabel(null);
      setLabelOffset(0);
      setTransitionCss(`transform ${FINAL_DURATION_MS}ms ${SPIN_EASE}`);
      setRotation(finalRotation);

      tensionTimeoutRef.current = setTimeout(() => {
        setTensing(true);
      }, Math.max(0, FINAL_DURATION_MS - TENSION_MS));

      spinTimeoutRef.current = setTimeout(() => {
        setTensing(false);
        setPhase('settling');
        revealTimeoutRef.current = setTimeout(() => {
          setPhase('idle');
          setWinner(names[winnerIdx]);
          setConfetti(makeConfetti());
          onWinner?.(names[winnerIdx]);
        }, REVEAL_PAUSE_MS);
      }, FINAL_DURATION_MS);
    };

    const gimmick = GIMMICKS[Math.floor(Math.random() * GIMMICKS.length)];

    if (gimmick === 'fakeout') {
      // Spins hard, appears to coast down toward a stop that is NOT the
      // winner — picked 100–260° away (wrapped across a couple of extra
      // turns) so it can't visually double as landing on the real answer —
      // then bursts back into the real spin.
      const fakeArc    = 100 + Math.random() * 160;
      const fakeOffset = 360 * (2 + Math.floor(Math.random() * 2)) + fakeArc;
      setTransitionCss(`transform ${FAKEOUT_DURATION_MS}ms ${FAKEOUT_EASE}`);
      setRotation(startRotation + fakeOffset);
      gimmickTimeoutRef.current = setTimeout(runFinal, FAKEOUT_DURATION_MS);

    } else if (gimmick === 'doublestop') {
      // Spins, comes to a genuine, complete stop (not just a coast) — then
      // a beat of stillness before it bursts back into the real spin.
      const stopArc    = 100 + Math.random() * 160;
      const stopOffset = 360 * (2 + Math.floor(Math.random() * 2)) + stopArc;
      setTransitionCss(`transform ${DOUBLESTOP_SPIN_MS}ms ${EASE_INOUT}`);
      setRotation(startRotation + stopOffset);
      gimmickTimeoutRef.current = setTimeout(() => {
        setStageLabel('WAIT, ONE MORE…');
        gimmickTimeoutRef.current = setTimeout(runFinal, DOUBLESTOP_PAUSE_MS);
      }, DOUBLESTOP_SPIN_MS);

    } else if (gimmick === 'reverse') {
      // Spins forward, "changes its mind," spins backward a stretch, then
      // changes its mind again and bursts forward into the real spin.
      const fwdRotation = startRotation + 500 + Math.random() * 300;
      setTransitionCss(`transform ${REVERSE_FWD_MS}ms ${EASE_INOUT}`);
      setRotation(fwdRotation);
      gimmickTimeoutRef.current = setTimeout(() => {
        setStageLabel('WAIT, NO—');
        const backRotation = fwdRotation - (300 + Math.random() * 250);
        setTransitionCss(`transform ${REVERSE_BACK_MS}ms ${EASE_SNAP}`);
        setRotation(backRotation);
        gimmickTimeoutRef.current = setTimeout(() => {
          // A real pause here, not just a same-tick label swap — setStageLabel(null)
          // inside runFinal() would otherwise batch with this into one render and
          // this line would never actually be visible on screen.
          setStageLabel('OKAY, FOR REAL—');
          gimmickTimeoutRef.current = setTimeout(runFinal, REVERSE_SNAP_PAUSE_MS);
        }, REVERSE_BACK_MS);
      }, REVERSE_FWD_MS);

    } else {
      // 'shuffle' — the wheel itself just spins normally, but the NAME
      // TEXT drawn in each wedge rapidly cycles through other candidates
      // (a decorative index offset only — wedge geometry/color never
      // moves), like a slot machine reconsidering its options, before
      // snapping back to the true labels well before the real spin lands.
      const shuffleTarget = startRotation + 360 * (3 + Math.floor(Math.random() * 2));
      setTransitionCss(`transform ${SHUFFLE_SPIN_MS}ms ${EASE_INOUT}`);
      setRotation(shuffleTarget);
      setStageLabel('SHUFFLING…');
      shuffleIntervalRef.current = setInterval(() => {
        setLabelOffset((o) => (o + 1 + Math.floor(Math.random() * Math.max(1, names.length - 1))) % names.length);
      }, SHUFFLE_STEP_MS);
      gimmickTimeoutRef.current = setTimeout(() => {
        clearInterval(shuffleIntervalRef.current);
        setLabelOffset(0);
        runFinal();
      }, SHUFFLE_SPIN_MS);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <motion.div
        style={{ position: 'relative', width: SIZE, height: SIZE + 14 }}
        animate={tensing ? { scale: [1, 1.03, 1] } : spinning ? { scale: [1, 1.015, 1] } : { scale: 1 }}
        transition={
          tensing
            ? { duration: 0.22, repeat: Infinity, ease: 'easeInOut' } // heartbeat quickens as it nears the stop
            : spinning
              ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.3 }
        }
      >
        {/* pointer — trembles while the wheel is in motion, shudders harder as it nears the stop */}
        <motion.svg
          width={28} height={30}
          style={{ position: 'absolute', top: 0, left: '50%', zIndex: 2, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.5))' }}
          initial={{ x: '-50%' }}
          animate={
            tensing
              ? { x: '-50%', rotate: [-12, 12, -12] }
              : spinning
                ? { x: '-50%', rotate: [-7, 7, -7] }
                : { x: '-50%', rotate: 0 }
          }
          transition={
            tensing
              ? { duration: 0.09, repeat: Infinity, ease: 'linear' }
              : spinning
                ? { duration: 0.14, repeat: Infinity, ease: 'linear' }
                : { duration: 0.2 }
          }
        >
          <path d="M 14 26 L 2 6 Q 0 0 8 0 L 20 0 Q 28 0 26 6 Z" fill="var(--primary)" stroke="var(--bg)" strokeWidth={1.5} />
        </motion.svg>

        {/* glow ring — builds tension while spinning, quickens/brightens in the final
            stretch, then a multi-beat flare through the reveal pause before settling */}
        <motion.div
          style={{
            position: 'absolute', top: 14, left: 0, width: SIZE, height: SIZE,
            borderRadius: '50%', pointerEvents: 'none', zIndex: 1,
            boxShadow: '0 0 0 0 var(--primary)',
          }}
          animate={
            settling
              ? {
                  boxShadow: [
                    '0 0 6px 0px var(--primary)',
                    '0 0 24px 5px var(--primary)',
                    '0 0 10px 2px var(--primary)',
                    '0 0 110px 32px var(--primary)',
                    '0 0 60px 16px var(--primary)',
                  ],
                }
              : tensing
                ? { boxShadow: ['0 0 10px 1px var(--primary)', '0 0 30px 8px var(--primary)', '0 0 10px 1px var(--primary)'] }
                : spinning
                  ? { boxShadow: ['0 0 6px 0px var(--primary)', '0 0 16px 3px var(--primary)', '0 0 6px 0px var(--primary)'] }
                  : { boxShadow: '0 0 0 0 var(--primary)' }
          }
          transition={
            settling
              ? { duration: REVEAL_PAUSE_MS / 1000, times: [0, 0.2, 0.35, 0.7, 1], ease: 'easeOut' }
              : tensing
                ? { duration: 0.35, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.7, repeat: spinning ? Infinity : 0, ease: 'easeInOut' }
          }
        />

        <div style={{ position: 'absolute', top: 14, left: 0 }}>
          {names.length === 0 ? (
            <div
              style={{
                width: SIZE, height: SIZE, borderRadius: '50%',
                border: '2px dashed var(--border)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24,
                background: 'var(--surface)',
              }}
            >
              <span style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--mono)' }}>No names on the wheel yet.</span>
            </div>
          ) : (
            <svg
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              style={{
                borderRadius: '50%',
                display: 'block',
                transform: `rotate(${rotation}deg)`,
                transition: transitionCss,
                filter: 'drop-shadow(0 6px 18px rgba(0,0,0,.55))',
              }}
            >
              <circle cx={CENTER} cy={CENTER} r={RADIUS + 2} fill="none" stroke="var(--bright, #c8d8e8)" strokeWidth={2} />
              {names.map((_, i) => {
                // Wedge position/color always stay keyed to the real index i
                // — only the TEXT drawn here shifts during the 'shuffle'
                // gimmick's cosmetic window (labelOffset resets to 0 well
                // before the wheel actually lands).
                const shownName  = names[(i + labelOffset) % names.length];
                const startAngle = i * segAngle;
                const endAngle   = startAngle + segAngle;
                const midAngle   = startAngle + segAngle / 2;
                const labelPos   = polarToCartesian(midAngle, LABEL_R);
                const flip       = midAngle > 90 && midAngle < 270;
                const textAngle  = flip ? midAngle + 180 : midAngle;

                const maxWidth      = LABEL_R * (segAngle * Math.PI / 180) * 0.88;
                const naturalWidth  = shownName.length * fontSize * 0.6;
                const needsClamp    = naturalWidth > maxWidth;

                return (
                  <g key={`slot-${i}`}>
                    <path d={wedgePath(startAngle, endAngle)} fill={PALETTE[i % PALETTE.length]} stroke="var(--bg)" strokeWidth={1.5} />
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      fill="#fff"
                      fontSize={fontSize}
                      fontFamily="var(--mono)"
                      fontWeight={600}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,.5)' }}
                      transform={`rotate(${textAngle}, ${labelPos.x}, ${labelPos.y})`}
                      {...(needsClamp ? { textLength: maxWidth, lengthAdjust: 'spacingAndGlyphs' } : {})}
                    >
                      {truncate(shownName)}
                    </text>
                  </g>
                );
              })}
              <circle cx={CENTER} cy={CENTER} r={10} fill="var(--surface)" stroke="var(--bright, #c8d8e8)" strokeWidth={2} />
            </svg>
          )}
        </div>
      </motion.div>

      <button
        onClick={spin}
        disabled={!canSpin}
        style={{
          ...btnBase,
          minWidth: 160,
          border: 'none',
          background: canSpin ? 'var(--primary)' : 'var(--surface-2, var(--surface))',
          color: canSpin ? 'var(--bg)' : 'var(--muted)',
          fontWeight: 700,
          opacity: canSpin ? 1 : 0.6,
          cursor: canSpin ? 'pointer' : 'not-allowed',
        }}
      >
        {stageLabel ?? (settling ? '🥁 ● ● ●' : tensing ? TENSION_LINES[tensionLine] : spinning ? 'SPINNING…' : '◉ SPIN')}
      </button>

      {names.length === 1 && phase === 'idle' && (
        <span style={{ color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)' }}>Add at least one more name to spin.</span>
      )}

      <div style={{ position: 'relative' }}>
        <AnimatePresence>
          {winner && phase === 'idle' && (
            <motion.div
              key={winner}
              initial={{ opacity: 0, scale: 0.55, y: -10 }}
              animate={{ opacity: 1, scale: [0.55, 1.22, 0.96, 1], y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'relative',
                fontFamily: 'var(--mono)', fontSize: 15, letterSpacing: '.06em', fontWeight: 700,
                color: 'var(--primary)', border: '1px solid var(--primary)',
                background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                boxShadow: '0 0 24px color-mix(in srgb, var(--primary) 45%, transparent)',
                borderRadius: 6, padding: '10px 22px', textAlign: 'center',
              }}
            >
              ◉ WINNER: {winner}
              {/* confetti burst — fires once per reveal, particles fade/fall away and never replay */}
              {confetti.map((c) => (
                <motion.span
                  key={c.id}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                  animate={{ x: c.x, y: c.y + 40, opacity: 0, rotate: c.rotate }}
                  transition={{ duration: 1.1, delay: c.delay, ease: 'easeOut' }}
                  style={{
                    position: 'absolute', top: '50%', left: '50%', zIndex: 3,
                    width: c.size, height: c.size, background: c.color,
                    borderRadius: c.shape, pointerEvents: 'none',
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
