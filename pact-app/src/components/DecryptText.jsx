import { useState, useEffect, useRef } from 'react';

const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%<>[]{}|;:?/\\^~'.split('');
const randChar = () => POOL[Math.floor(Math.random() * POOL.length)];

function scramble(src, resolved) {
  return src.split('').map((ch, i) => {
    if (ch === ' ') return ' ';
    if (i < resolved) return ch;
    return randChar();
  }).join('');
}

export default function DecryptText({
  text,
  className,
  style,
  speed  = 32,  // ms per frame
  delay  = 0,   // ms before starting
  hold   = 6,   // frames each position stays scrambled before resolving
  onDone,
}) {
  const [display, setDisplay] = useState(() => scramble(text, 0));
  const timerRef  = useRef(null);
  const frameRef  = useRef(0);
  const resolvedRef = useRef(0);

  useEffect(() => {
    frameRef.current   = 0;
    resolvedRef.current = 0;
    setDisplay(scramble(text, 0));

    const tick = () => {
      frameRef.current++;
      if (frameRef.current % hold === 0) resolvedRef.current++;

      const r = resolvedRef.current;
      if (r >= text.length) {
        setDisplay(text);
        onDone?.();
        return;
      }
      setDisplay(scramble(text, r));
      timerRef.current = setTimeout(tick, speed);
    };

    const start = () => { timerRef.current = setTimeout(tick, speed); };
    const outer = delay > 0 ? setTimeout(start, delay) : (start(), null);

    return () => {
      clearTimeout(outer);
      clearTimeout(timerRef.current);
    };
  }, [text, speed, delay, hold]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className={className} style={{ fontFamily: 'inherit', ...style }}>
      {display}
    </span>
  );
}
