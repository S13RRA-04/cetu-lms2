import Die3D from './Die3D.jsx';
import { CATEGORY_META, CATEGORIES } from '../data/caseFileTheme.js';

/*
  Die20 / Die6 — shared dice widgets used by both the facilitator board
  (CaseFileFacilitator.jsx) and the player board (CaseFilePlayer.jsx, once a
  player is the active roller for the round). Split out so both can render
  an identical roll experience without duplicating the pip/face markup.
*/

export function Die20({ value, rolling, idle, color, onClick }) {
  return (
    <div
      className={`cf-die20${idle ? ' cf-die20-idle' : ''}`}
      style={{ '--cat-color': color ?? 'var(--primary)' }}
      onClick={idle ? undefined : onClick}
      role="button"
      tabIndex={idle ? -1 : 0}
    >
      <Die3D variant="d20" rolling={rolling} color={color} />
      <span className="cf-die-face-num">{idle ? '?' : (value ?? '20')}</span>
    </div>
  );
}

const DIE6_PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
// Face N corresponds to CATEGORIES[N-1] — the same mapping the coordinator
// uses server-side to pick the Category Die card's category from the roll
// (a bonus on top of the armed category for Critical Success, but the only
// card — replacing the armed category entirely — for Partial Success).
export function Die6({ value, rolling, onClick }) {
  const on = new Set(DIE6_PIPS[value] ?? []);
  const category = value ? CATEGORIES[value - 1] : null;
  const color = category ? CATEGORY_META[category].color : undefined;
  return (
    <div className="cf-die6" style={{ '--cat-color': color ?? 'var(--primary)' }} onClick={onClick} role="button" tabIndex={0}>
      <Die3D variant="d6" rolling={rolling} color={color} />
      <div className="cf-die6-pips">
        {Array.from({ length: 9 }, (_, i) => <span key={i} className={`cf-die6-pip${on.has(i) ? ' on' : ''}`} />)}
      </div>
    </div>
  );
}
