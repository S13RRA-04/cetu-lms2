import { useRef, useState } from 'react';

const SPIN_DURATION_MS = 4200;
const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 4;

const PALETTE = [
  '#2563eb', '#dc2626', '#059669', '#d97706',
  '#7c3aed', '#0891b2', '#db2777', '#65a30d',
];

function polarToCartesian(angleDeg, r = RADIUS) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}

function wedgePath(startAngle, endAngle) {
  const start     = polarToCartesian(startAngle);
  const end       = polarToCartesian(endAngle);
  const largeArc  = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export default function WheelOfNames({ names = [], onWinner, disabled = false }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner,   setWinner]   = useState(null);
  const timeoutRef = useRef(null);

  const canSpin = !disabled && !spinning && names.length >= 2;
  const segAngle = names.length > 0 ? 360 / names.length : 0;

  const spin = () => {
    if (!canSpin) return;
    setWinner(null);

    const winnerIdx     = Math.floor(Math.random() * names.length);
    const winnerMidAngle = winnerIdx * segAngle + segAngle / 2;
    const currentMod    = ((rotation % 360) + 360) % 360;
    const targetMod      = ((360 - winnerMidAngle) % 360 + 360) % 360;
    let delta            = targetMod - currentMod;
    if (delta < 0) delta += 360;
    const extraSpins = 360 * (6 + Math.floor(Math.random() * 3));
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
        {/* pointer */}
        <div
          style={{
            position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0, zIndex: 2,
            borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
            borderTop: '18px solid var(--bright, #1e293b)',
          }}
        />
        {names.length === 0 ? (
          <div
            style={{
              width: SIZE, height: SIZE, borderRadius: '50%',
              border: '2px dashed var(--border)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24,
            }}
          >
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>No names on the wheel yet.</span>
          </div>
        ) : (
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={{
              borderRadius: '50%',
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)` : 'none',
              boxShadow: '0 0 0 3px var(--border)',
            }}
          >
            {names.map((name, i) => {
              const startAngle = i * segAngle;
              const endAngle   = startAngle + segAngle;
              const midAngle   = startAngle + segAngle / 2;
              const labelPos   = polarToCartesian(midAngle, RADIUS * 0.62);
              return (
                <g key={`${name}-${i}`}>
                  <path d={wedgePath(startAngle, endAngle)} fill={PALETTE[i % PALETTE.length]} stroke="#fff" strokeWidth={1} />
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    fill="#fff"
                    fontSize={names.length > 12 ? 8 : 11}
                    fontFamily="var(--mono)"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${midAngle}, ${labelPos.x}, ${labelPos.y})`}
                  >
                    {name.length > 16 ? `${name.slice(0, 15)}…` : name}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <button
        className="btn-primary"
        onClick={spin}
        disabled={!canSpin}
        style={{ minWidth: 140 }}
      >
        {spinning ? 'SPINNING…' : 'SPIN'}
      </button>

      {names.length === 1 && !spinning && (
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>Add at least one more name to spin.</span>
      )}

      {winner && !spinning && (
        <div
          style={{
            fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '.06em',
            color: 'var(--primary)', border: '1px solid var(--primary)',
            borderRadius: 6, padding: '8px 16px', textAlign: 'center',
          }}
        >
          ◉ WINNER: {winner}
        </div>
      )}
    </div>
  );
}
