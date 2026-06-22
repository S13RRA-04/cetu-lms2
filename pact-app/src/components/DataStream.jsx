import { useEffect, useRef } from 'react';

const HEX = '0123456789ABCDEF';
const r = (n) => Math.floor(Math.random() * n);

const TRAIL = 10; // number of character steps in each column's tail

export default function DataStream({ color = '#00b0ff', opacity = 0.055, fontSize = 11, speedScale = 1 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animId;
    let cols, positions, speeds, brightCol, trails;

    const init = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      cols      = Math.floor(canvas.width / (fontSize * 1.5));
      positions = Array.from({ length: cols }, () => -r(canvas.height));
      speeds    = Array.from({ length: cols }, () => (r(3) + 1) * speedScale);
      brightCol = r(cols);
      trails    = Array.from({ length: cols }, () => []);
    };

    init();

    const draw = () => {
      // Clear to transparent — no dark fill, no column-stripe artifact
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < cols; i++) {
        const x        = i * fontSize * 1.5;
        const isBright = i === brightCol;

        // Push the current lead character + position into this column's trail
        trails[i].unshift({ char: HEX[r(16)], y: positions[i] });
        if (trails[i].length > TRAIL) trails[i].pop();

        // Draw each step in the trail with decreasing alpha
        for (let j = 0; j < trails[i].length; j++) {
          const fade = Math.pow(1 - j / TRAIL, 1.4); // slightly convex fade
          ctx.globalAlpha = opacity * fade * (isBright ? 2.2 : 1);
          ctx.fillStyle   = color;
          ctx.fillText(trails[i][j].char, x, trails[i][j].y);
        }

        positions[i] += speeds[i];
        if (positions[i] > canvas.height + 60) {
          positions[i] = -r(canvas.height / 2);
          trails[i]    = [];                    // clear trail on reset
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
      className="data-stream-canvas"
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
}
