export function activeLearnerCount(cohort) {
  if (Number.isFinite(Number(cohort?.active_learner_count))) return Number(cohort.active_learner_count);
  return (cohort?.members ?? []).filter((member) => (
    member.Enrollment?.status === 'active' && member.Enrollment?.role === 'student'
  )).length;
}

export function defaultReleaseCohortId(cohorts) {
  return cohorts.find((cohort) => activeLearnerCount(cohort) > 0)?.id ?? '';
}
