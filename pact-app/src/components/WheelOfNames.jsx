import { useRef, useState } from 'react';

const SPIN_DURATION_MS = 4200;
const SIZE   = 320;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 6;
const LABEL_R = RADIUS * 0.64;

const PALETTE = [
  '#00b0ff', '#ff4d5e', '#22c67a', '#f5a623',
  '#a855f7', '#14b8c4', '#ec4899', '#84cc16',
];

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
  const [spinning, setSpinning] = useState(false);
  const [winner,   setWinner]   = useState(null);
  const timeoutRef = useRef(null);

  const canSpin  = !disabled && !spinning && names.length >= 2;
  const segAngle = names.length > 0 ? 360 / names.length : 0;
  const fontSize = segmentFontSize(names.length);

  const spin = () => {
    if (!canSpin) return;
    setWinner(null);

    const winnerIdx      = Math.floor(Math.random() * names.length);
    const winnerMidAngle = winnerIdx * segAngle + segAngle / 2;
    const currentMod     = ((rotation % 360) + 360) % 360;
    const targetMod      = ((360 - winnerMidAngle) % 360 + 360) % 360;
    let delta             = targetMod - currentMod;
    if (delta < 0) delta += 360;
    const extraSpins  = 360 * (6 + Math.floor(Math.random() * 3));
    const newRotation = rotation + delta + extraSpins;

    setSpinning(true);
    setRotation(newRotation);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setSpinning(false);
      setWinner(names[winnerIdx]);
      onWinner?.(names[winnerIdx]);
    }, SPIN_DURATION_MS);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <div style={{ position: 'relative', width: SIZE, height: SIZE + 14 }}>
        {/* pointer */}
        <svg
          width={28} height={30}
          style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 2, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.5))' }}
        >
          <path d="M 14 26 L 2 6 Q 0 0 8 0 L 20 0 Q 28 0 26 6 Z" fill="var(--primary)" stroke="var(--bg)" strokeWidth={1.5} />
        </svg>

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
                transition: spinning ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)` : 'none',
                filter: 'drop-shadow(0 6px 18px rgba(0,0,0,.55))',
              }}
            >
              <circle cx={CENTER} cy={CENTER} r={RADIUS + 2} fill="none" stroke="var(--bright, #c8d8e8)" strokeWidth={2} />
              {names.map((name, i) => {
                const startAngle = i * segAngle;
                const endAngle   = startAngle + segAngle;
                const midAngle   = startAngle + segAngle / 2;
                const labelPos   = polarToCartesian(midAngle, LABEL_R);
                const flip       = midAngle > 90 && midAngle < 270;
                const textAngle  = flip ? midAngle + 180 : midAngle;

                const maxWidth      = LABEL_R * (segAngle * Math.PI / 180) * 0.88;
                const naturalWidth  = name.length * fontSize * 0.6;
                const needsClamp    = naturalWidth > maxWidth;

                return (
                  <g key={`${name}-${i}`}>
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
                      {truncate(name)}
                    </text>
                  </g>
                );
              })}
              <circle cx={CENTER} cy={CENTER} r={10} fill="var(--surface)" stroke="var(--bright, #c8d8e8)" strokeWidth={2} />
            </svg>
          )}
        </div>
      </div>

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
        {spinning ? 'SPINNING…' : '◉ SPIN'}
      </button>

      {names.length === 1 && !spinning && (
        <span style={{ color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)' }}>Add at least one more name to spin.</span>
      )}

      {winner && !spinning && (
        <div
          style={{
            fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '.06em',
            color: 'var(--primary)', border: '1px solid var(--primary)',
            background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
            borderRadius: 6, padding: '8px 18px', textAlign: 'center',
          }}
        >
          ◉ WINNER: {winner}
        </div>
      )}
    </div>
  );
}
