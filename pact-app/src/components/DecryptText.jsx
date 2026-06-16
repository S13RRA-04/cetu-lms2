import { useState, useEffect, useRef } from 'react';

const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%<>[]{}|;:?/\\^~'.split('');
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default function DecryptText({
  text,
  className,
  style,
  speed    = 32,   // ms per frame
  delay    = 0,    // ms before starting
  hold     = 6,    // frames each position stays scrambled before resolving
  onDone,
}) {
  const [display, setDisplay] = useState(() => scramble(text));
  const timerRef = useRef(null);

  useEffect(() => {
    let resolved = 0;
    let frame = 0;

    function scramble(src, resolvedCount) {
      return src.split('').map((ch, i) => {
        if (ch === ' ') return ' ';
        if (i < resolvedCount) return ch;
        return rand(POOL);
      }).join('');
    }

    const tick = () => {
      frame++;
      if (frame % hold === 0) resolved++;
      setDisplay(scramble(text, resolved));
      if (resolved >= text.length) {
        setDisplay(text);
        onDone?.();
        return;
      }
      timerRef.current = setTimeout(tick, speed);
    };

    const start = () => { timerRef.current = setTimeout(tick, speed); };

    const delayTimer = setTimeout(start, delay);
    return () => {
      clearTimeout(delayTimer);
      clearTimeout(timerRef.current);
    };
  }, [text, speed, delay, hold]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className={className} style={{ fontFamily: 'inherit', ...style }}>
      {display}
    </span>
  );
}
