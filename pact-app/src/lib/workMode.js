// Whether a tasking is done alone or as a squad. Driven by grading_mode, not
// type: it's what actually decides who submits (squad = one shared
// submission for the whole squad; individual = every student submits their
// own). Type isn't a safe proxy — most challenges are squad work, but the
// per-role taskings and role assessments are challenges graded individually.

export const WORK_MODES = {
  individual: {
    label:   'Individual',
    heading: 'Individual work',
    hint:    'Complete these on your own — each person submits their own.',
  },
  squad: {
    label:   'Squad',
    heading: 'Squad work',
    hint:    'Work these together — your squad submits once, for everyone.',
  },
};

export function workModeOf(assignment) {
  return assignment?.grading_mode === 'squad' ? 'squad' : 'individual';
}

// Individual first, then squad; empty groups are dropped. Order within each
// group is preserved.
export function splitByWorkMode(items = []) {
  return ['individual', 'squad']
    .map((mode) => ({ mode, items: items.filter((a) => workModeOf(a) === mode) }))
    .filter((g) => g.items.length > 0);
}
