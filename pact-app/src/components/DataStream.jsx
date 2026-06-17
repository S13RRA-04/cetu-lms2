import { useEffect, useRef } from 'react';

const HEX = '0123456789ABCDEF';
const r = (n) => Math.floor(Math.random() * n);

export default function DataStream({ color = '#00b0ff', opacity = 0.055, fontSize = 11, speedScale = 1 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animId;
    let cols, positions, speeds, brightCol;

    const init = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      cols      = Math.floor(canvas.width / (fontSize * 1.5));
      positions = Array.from({ length: cols }, () => -r(canvas.height));
      speeds    = Array.from({ length: cols }, () => (r(3) + 1) * speedScale);
      brightCol = r(cols);
    };

    init();

    const draw = () => {
      ctx.fillStyle = 'rgba(7,10,13,0.18)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < cols; i++) {
        const x = i * fontSize * 1.5;
        const y = positions[i];
        const isBright = i === brightCol;

        for (let j = 0; j < 5; j++) {
          const ch = HEX[r(16)];
          const fade = 1 - j * 0.22;
          ctx.globalAlpha = opacity * fade * (isBright ? 2.2 : 1);
          ctx.fillStyle   = color;
          ctx.fillText(ch, x, y - j * (fontSize + 1));
        }

        positions[i] += speeds[i];
        if (positions[i] > canvas.height + 60) {
          positions[i] = -r(canvas.height / 2);
          if (r(4) === 0) brightCol = i;
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    const ro = new ResizeObserver(init);
    ro.observe(canvas);
    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, [color, opacity, fontSize, speedScale]);

  return (
    <canvas
      ref={ref}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
