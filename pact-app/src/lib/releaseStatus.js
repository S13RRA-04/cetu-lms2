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

// Active cohort first, then the rest in their original order — the gating
// panel only expands the active one by default.
export function splitActiveCohort(cohorts) {
  const active = cohorts.find((c) => c.is_active) ?? null;
  return { active, others: cohorts.filter((c) => c !== active) };
}
