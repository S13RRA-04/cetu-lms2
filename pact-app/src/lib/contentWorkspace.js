// Pure list logic for Command's Content workspace — one list of every
// assignment (any type) and every course content item, replacing the
// separate Challenges / Modules / Assessments & Surveys / Intel Library tabs
// and the Course Content panel. Kept free of React and of the release
// context so it can be unit-tested; callers pass `statusOf(item)`.

// Display order of the type sections. Anything not listed (a type added
// later) still shows, after these, rather than silently disappearing — the
// old per-tab filters dropped capstones and the investigation desk entirely.
export const TYPE_ORDER = ['challenge', 'capstone', 'module', 'assessment', 'survey', 'investigation', 'library'];

export const TYPE_LABELS = {
  challenge:     'Challenges',
  capstone:      'Capstones',
  module:        'Modules',
  assessment:    'Assessments',
  survey:        'Surveys',
  investigation: 'Investigation',
  library:       'Library',
};

export const STATUS_FILTERS = [
  ['all', 'All'], ['live', 'Live'], ['partial', 'Partial'], ['locked', 'Locked'], ['draft', 'Draft'],
];

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

// `type` is the assignment's own type, or 'library' for every content item.
export function buildEntries(assignments = [], contentItems = []) {
  return [
    ...assignments.map((a) => ({ key: `a:${a.id}`, kind: 'assignment', type: a.type ?? 'module', item: a })),
    ...contentItems.map((c) => ({ key: `c:${c.id}`, kind: 'content', type: 'library', item: c })),
  ];
}

export function filterEntries(entries, { type = 'all', status = 'all', query = '', statusOf } = {}) {
  const needle = query.trim().toLowerCase();
  return entries.filter((e) =>
    (type === 'all' || e.type === type)
    && (!needle || (e.item.title ?? '').toLowerCase().includes(needle))
    && (status === 'all' || statusOf(e.item) === status));
}

export function countBy(entries, keyOf) {
  const counts = { all: entries.length };
  for (const e of entries) {
    const k = keyOf(e);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

function compareEntries(a, b) {
  if (a.kind === 'assignment' && b.kind === 'assignment') {
    const byOrder = (a.item.order_index ?? 0) - (b.item.order_index ?? 0);
    if (byOrder !== 0) return byOrder;
  }
  return collator.compare(a.item.title ?? '', b.item.title ?? '');
}

// Sections by type; challenges/capstones split by scenario (unassigned last),
// library items by content type. Each section always has ≥1 group; a group
// with label null renders without a sub-header.
export function groupEntries(entries, { scenarioLabel = (s) => s, contentTypeLabel = (t) => t } = {}) {
  const byType = new Map();
  for (const e of entries) {
    if (!byType.has(e.type)) byType.set(e.type, []);
    byType.get(e.type).push(e);
  }
  const rank = (t) => { const i = TYPE_ORDER.indexOf(t); return i === -1 ? TYPE_ORDER.length : i; };
  const types = [...byType.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

  return types.map((type) => {
    const sectionEntries = byType.get(type);
    let groupKeyOf = null;
    let groupLabelOf = null;
    if (type === 'challenge' || type === 'capstone') {
      groupKeyOf = (e) => e.item.scenario_name ?? '';
      groupLabelOf = (k) => (k ? scenarioLabel(k) : 'No scenario');
    } else if (type === 'library') {
      groupKeyOf = (e) => e.item.content_type || 'resource';
      groupLabelOf = (k) => contentTypeLabel(k);
    }

    let groups;
    if (!groupKeyOf) {
      groups = [{ key: `${type}::all`, label: null, entries: [...sectionEntries].sort(compareEntries) }];
    } else {
      const map = new Map();
      for (const e of sectionEntries) {
        const k = groupKeyOf(e);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(e);
      }
      groups = [...map.entries()]
        .map(([k, list]) => ({ key: `${type}::${k}`, groupKey: k, label: groupLabelOf(k), entries: list.sort(compareEntries) }))
        .sort((a, b) => {
          if (a.groupKey === '' && b.groupKey !== '') return 1;
          if (b.groupKey === '' && a.groupKey !== '') return -1;
          return collator.compare(a.label, b.label);
        })
        .map(({ groupKey, ...g }) => g);
    }
    return { key: type, type, label: TYPE_LABELS[type] ?? type, count: sectionEntries.length, groups };
  });
}
