import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/*
  CaseFileGuide — an in-app rulebook overlay, reused for both the Player
  Guide (CaseFilePlayer.jsx) and the Instructor Guide (CaseFileFacilitator.jsx).
  `sections` is [{ heading, paragraphs: string[], list?: string[] }, ...].

  Rendered via a portal straight to document.body: AppLayout's route
  wrapper (.page-transition) runs a `transform`-animated entrance with
  `animation-fill-mode: forwards`, which leaves a non-`none` computed
  transform in place after the animation ends — per the CSS spec that
  makes it a containing block for any `position: fixed` descendant, so a
  fixed-position modal nested inside it gets sized/centered against that
  small wrapper box instead of the real viewport. A portal sidesteps the
  whole ancestor chain.
*/
export default function CaseFileGuide({ title, sections, onClose }) {
  const [openIndex, setOpenIndex] = useState(0);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="cf-guide-backdrop" onClick={onClose}>
      <div className="cf-guide-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cf-guide-header">
          <h2 className="cf-guide-title">{title}</h2>
          <button className="cf-guide-close" onClick={onClose} aria-label="Close guide">✕</button>
        </div>
        <div className="cf-guide-body">
          {sections.map((s, i) => (
            <div key={s.heading} className="cf-guide-section">
              <button
                className="cf-guide-section-toggle"
                onClick={() => setOpenIndex((prev) => (prev === i ? -1 : i))}
              >
                <span>{s.heading}</span>
                <span className={`course-day-chevron${openIndex === i ? ' open' : ''}`}>›</span>
              </button>
              {openIndex === i && (
                <div className="cf-guide-section-body">
                  {s.paragraphs.map((p, j) => <p key={j}>{p}</p>)}
                  {s.list && (
                    <ul>{s.list.map((item, j) => <li key={j}>{item}</li>)}</ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
