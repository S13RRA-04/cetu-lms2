import { useCallback, useRef } from 'react';

// Namespaced by user, not just assignment: a cohort-wide assignment (one
// role's row shared by every squad, e.g. Drop 3/4's role assessments) has
// the SAME assignment id for every squad. On a shared/kiosk-style lab
// machine — the normal setup for an in-person course — an un-namespaced key
// let one student's unfinished draft get silently loaded into a completely
// different student's (different squad, same role) answer box the next time
// that assignment id was opened on the same browser, who would then submit
// it as their own without realizing. Exported so every direct-localStorage
// caller (ChallengeFlow.jsx, QuizFlow.jsx) builds the exact same key instead
// of re-deriving it and risking drift.
export function draftKey(assignmentId, userId) {
  return `pact_draft_${userId ?? 'anon'}_${assignmentId}`;
}

export default function useDraft(assignmentId, userId) {
  const timer = useRef(null);

  const save = useCallback((data) => {
    try {
      localStorage.setItem(draftKey(assignmentId, userId), JSON.stringify({ ...data, _ts: Date.now() }));
    } catch {}
  }, [assignmentId, userId]);

  const saveDebounced = useCallback((data, delay = 700) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(data), delay);
  }, [save]);

  const load = useCallback(() => {
    try {
      const raw = localStorage.getItem(draftKey(assignmentId, userId));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [assignmentId, userId]);

  const clear = useCallback(() => {
    clearTimeout(timer.current);
    try { localStorage.removeItem(draftKey(assignmentId, userId)); } catch {}
  }, [assignmentId, userId]);

  return { save, saveDebounced, load, clear };
}

/* Load draft synchronously inside a useState initializer (no hook) */
export function loadDraftSync(assignmentId, userId) {
  try {
    const raw = localStorage.getItem(draftKey(assignmentId, userId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearDraftSync(assignmentId, userId) {
  try { localStorage.removeItem(draftKey(assignmentId, userId)); } catch {}
}
