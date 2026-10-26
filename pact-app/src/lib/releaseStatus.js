// Release state of one assignment/content item for the active cohort, from
// its unlock rows ({ cohort_id, squad_id }). A cohort-wide row (squad_id null)
// or every squad unlocked individually both count as fully live; some squads
// is partial. Matches what students in the active cohort actually see.
export function activeReleaseStatus(unlocks, activeCohortId, squadCount) {
  if (!activeCohortId) return { state: 'no-cohort', unlockedSquads: 0, squadCount: 0 };
  const rows = (unlocks ?? []).filter((u) => u.cohort_id === activeCohortId);
  if (rows.some((u) => !u.squad_id)) return { state: 'live', unlockedSquads: squadCount, squadCount, cohortWide: true };
  const unlockedSquads = new Set(rows.map((u) => u.squad_id)).size;
  if (unlockedSquads === 0) return { state: 'locked', unlockedSquads, squadCount };
  if (squadCount > 0 && unlockedSquads >= squadCount) return { state: 'live', unlockedSquads, squadCount };
  return { state: 'partial', unlockedSquads, squadCount };
}

// What students in the active cohort actually get for one assignment/content
// item: an unlock alone isn't enough — student lists also require
// is_published, so an unpublished item is a draft no matter how many squads
// are unlocked. `hiddenUnlocks` flags exactly that trap (unlocked, yet
// invisible). `release` keeps the underlying unlock state for callers that
// still need it. Items without an is_published field (undefined) are never
// treated as drafts.
export function contentStatus(item, activeCohortId, squadCount) {
  const release = activeReleaseStatus(item?.unlocks, activeCohortId, squadCount);
  // Archived wins over everything: it is always unpublished, and it's the
  // one state the workspace hides unless asked for.
  if (item?.archived_at) return { ...release, state: 'archived', release: release.state, hiddenUnlocks: false };
  if (item?.is_published !== false) return { ...release, release: release.state, hiddenUnlocks: false };
  const hasUnlocks = release.state === 'live' || release.state === 'partial';
  return { ...release, state: 'draft', release: release.state, hiddenUnlocks: hasUnlocks };
}

// Active cohort first, then the rest in their original order — the gating
// panel only expands the active one by default.
export function splitActiveCohort(cohorts) {
  const active = cohorts.find((c) => c.is_active) ?? null;
  return { active, others: cohorts.filter((c) => c !== active) };
}
