// Shared "what puzzle stage comes next for this drop" resolver — used by both
// AppShell.jsx (the real student gate) and DropSequencePreview (the admin
// preview), replacing what used to be two hand-duplicated if/else chains.
//
// Legacy drops may still carry fixed Signal/Vault fields. New Signal Hunt and
// Vault Lock games live in the ordered puzzles array, so they can be layered
// anywhere alongside the other game types before the terminal Transmission.

/**
 * @param {object} drop - a campaign-drop object as returned by GET .../campaign/drops
 *   (includes signal_enabled/html_signal/vault_enabled/vault_hint and a `puzzles` array)
 * @param {{ signal: boolean, vault: boolean, puzzleIds: Set<string> }} completed
 * @returns {Array<{ kind: 'signal' | 'vault' | 'puzzle' | 'transmission', puzzle?: object }>}
 */
export function resolveDropStages(drop, completed) {
  const stages = [];

  const needsSignal = drop.signal_enabled !== false && !!drop.html_signal && !completed.signal;
  if (needsSignal) stages.push({ kind: 'signal' });

  const needsVault = drop.vault_enabled !== false && !!drop.vault_hint && !completed.vault;
  if (needsVault) stages.push({ kind: 'vault' });

  const puzzles = [...(Array.isArray(drop.puzzles) ? drop.puzzles : [])]
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  for (const puzzle of puzzles) {
    if (puzzle.enabled === false) continue;
    if (completed.puzzleIds.has(puzzle.id)) continue;
    stages.push({ kind: 'puzzle', puzzle });
  }

  stages.push({ kind: 'transmission' });
  return stages;
}

export function getNextStage(drop, completed) {
  return resolveDropStages(drop, completed)[0];
}

export function puzzleCompletionKey(userId, dropId) {
  return `pact_puzzles_v1_${userId}_${dropId}`;
}

export function getCompletedPuzzleIds(userId, dropId) {
  try {
    const raw = localStorage.getItem(puzzleCompletionKey(userId, dropId));
    const ids = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

export function markPuzzleCompleted(userId, dropId, puzzleId) {
  const ids = getCompletedPuzzleIds(userId, dropId);
  ids.add(puzzleId);
  localStorage.setItem(puzzleCompletionKey(userId, dropId), JSON.stringify([...ids]));
}
