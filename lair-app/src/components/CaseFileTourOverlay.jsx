import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/*
  CaseFileTourOverlay — the "Learn to Play" spotlight. Portals to
  document.body for the same reason CaseFileGuide.jsx does (a transformed
  route-transition ancestor breaks position:fixed centering).

  Renders one element sized to the current beat's target getBoundingClientRect,
  using an oversized box-shadow as a single-element "hole punch" so everything
  outside the target dims — pointer-events:none on that element lets clicks
  fall through to the real board control underneath for 'action' beats.
*/
export default function CaseFileTourOverlay({ tour }) {
  const [rect, setRect] = useState(null);
  const step = tour.step;

  useLayoutEffect(() => {
    if (!step) return undefined;
    let raf = 0;
    function measure() {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (!el) { setRect(null); return; }
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      raf = requestAnimationFrame(() => setRect(el.getBoundingClientRect()));
    }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    const poll = setInterval(measure, 400); // catches board layout shifts (card flips, deals) between explicit events
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(poll);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, tour.state]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') tour.end();
      if (e.key === 'ArrowRight') tour.next();
      if (e.key === 'ArrowLeft') tour.back();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [tour]);

  if (!step) return null;

  const pad = 8;
  const holeStyle = rect ? {
    left: rect.left - pad, top: rect.top - pad,
    width: rect.width + pad * 2, height: rect.height + pad * 2,
  } : { left: '50%', top: '50%', width: 0, height: 0 };

  // Place the callout below the hole if there's room, otherwise above; clamp horizontally on-screen.
  const calloutWidth = 340;
  const spaceBelow = rect ? window.innerHeight - (rect.bottom + pad) : 0;
  const placeAbove = rect && spaceBelow < 200 && rect.top > 200;
  const calloutTop = rect
    ? (placeAbove ? Math.max(12, rect.top - pad - 12) : rect.bottom + pad + 12)
    : window.innerHeight / 2 - 80;
  const calloutLeft = rect
    ? Math.min(Math.max(12, rect.left + rect.width / 2 - calloutWidth / 2), window.innerWidth - calloutWidth - 12)
    : window.innerWidth / 2 - calloutWidth / 2;

  return createPortal(
    <div className="cf-tour-layer">
      <div className="cf-tour-hole" style={holeStyle} />
      <div
        className="cf-tour-callout"
        style={{
          width: calloutWidth,
          left: calloutLeft,
          top: placeAbove ? undefined : calloutTop,
          bottom: placeAbove ? window.innerHeight - calloutTop : undefined,
        }}
      >
        <div className="cf-tour-progress">Step {tour.stepIndex + 1} of {tour.steps.length}</div>
        <div className="cf-tour-callout-title">{step.title}</div>
        <div className="cf-tour-callout-body">{step.body}</div>
        {step.type === 'action' && (
          <div className="cf-tour-hint">Try the highlighted control above, or click Next to continue.</div>
        )}
        <div className="cf-tour-btn-row">
          <button className="btn-secondary" onClick={tour.end}>Skip Tour</button>
          <div style={{ flex: 1 }} />
          <button className="btn-secondary" disabled={tour.isFirst} onClick={tour.back}>Back</button>
          <button className="btn-primary" onClick={tour.isLast ? tour.end : tour.next}>
            {tour.isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
