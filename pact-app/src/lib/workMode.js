// Who a tasking is done by. Driven by grading_mode (plus role_filters), not
// type — it's what actually decides who submits:
//   individual — every student submits their own
//   role       — squad-graded but aimed at specific roles: the squad's
//                members in that role (e.g. its Special Agents) share one
//                submission (backend utils/roleTeam.js)
//   squad      — the whole squad shares one submission
// Type isn't a safe proxy: challenges can be any of the three.

export const WORK_MODES = {
  individual: {
    label:   'Individual',
    heading: 'Individual work',
    hint:    'Complete these on your own — each person submits their own.',
  },
  role: {
    label:   'Role team',
    heading: 'Role team work',
    hint:    'Work these with the others in your role on your squad — your role team submits once, for all of you.',
  },
  squad: {
    label:   'Squad',
    heading: 'Squad work',
    hint:    'Work these together — your squad submits once, for everyone.',
  },
};

const MODE_ORDER = ['individual', 'role', 'squad'];

export function workModeOf(assignment) {
  if (assignment?.grading_mode !== 'squad') return 'individual';
  return Array.isArray(assignment.role_filters) && assignment.role_filters.length > 0 ? 'role' : 'squad';
}

// Individual, then role team, then squad; empty groups are dropped. Order
// within each group is preserved.
export function splitByWorkMode(items = []) {
  return MODE_ORDER
    .map((mode) => ({ mode, items: items.filter((a) => workModeOf(a) === mode) }))
    .filter((g) => g.items.length > 0);
}
