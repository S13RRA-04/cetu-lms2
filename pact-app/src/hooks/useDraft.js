import { useCallback, useRef } from 'react';

const KEY = (id) => `pact_draft_${id}`;

export default function useDraft(assignmentId) {
  const timer = useRef(null);

  const save = useCallback((data) => {
    try {
      localStorage.setItem(KEY(assignmentId), JSON.stringify({ ...data, _ts: Date.now() }));
    } catch {}
  }, [assignmentId]);

  const saveDebounced = useCallback((data, delay = 700) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(data), delay);
  }, [save]);

  const load = useCallback(() => {
    try {
      const raw = localStorage.getItem(KEY(assignmentId));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [assignmentId]);

  const clear = useCallback(() => {
    clearTimeout(timer.current);
    try { localStorage.removeItem(KEY(assignmentId)); } catch {}
  }, [assignmentId]);

  return { save, saveDebounced, load, clear };
}

/* Load draft synchronously inside a useState initializer (no hook) */
export function loadDraftSync(assignmentId) {
  try {
    const raw = localStorage.getItem(KEY(assignmentId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearDraftSync(assignmentId) {
  try { localStorage.removeItem(KEY(assignmentId)); } catch {}
}
