// Which course day an assignment belongs to, for Command's Content workspace
// (organization only — student lists don't use it). Precedence:
//   1. the assignment's own course_day (an explicit override)
//   2. its drop's day from the drop schedule (scenario + drop number)
//   3. a "Day N" prefix on its title — most lecture/workshop/capstone items
//      are already named this way, so they need no setup
// Anything else is unscheduled.

export const MAX_COURSE_DAY = 10;

export const dropKey = (scenarioName, dropNumber) => `${scenarioName ?? ''}::${dropNumber}`;

export function buildDropDayMap(rows = []) {
  return new Map(rows.map((r) => [dropKey(r.scenario_name, r.drop_number), r.course_day]));
}

export function titleDay(title) {
  const m = /^day\s+(\d{1,2})\b/i.exec(title ?? '');
  return m ? Number(m[1]) : null;
}

export function effectiveDay(assignment, dropDayMap) {
  if (assignment.course_day != null) return { day: assignment.course_day, source: 'item' };
  if (assignment.drop_number != null) {
    const day = dropDayMap.get(dropKey(assignment.scenario_name, assignment.drop_number));
    if (day != null) return { day, source: 'drop' };
  }
  const fromTitle = titleDay(assignment.title);
  if (fromTitle != null) return { day: fromTitle, source: 'title' };
  return { day: null, source: null };
}

// Every (scenario, drop) pair that assignments actually use, with how many
// items each holds and its scheduled day — the rows of the drop schedule.
export function listDrops(assignments, dropDayMap) {
  const drops = new Map();
  for (const a of assignments) {
    if (a.drop_number == null || a.archived_at) continue;
    const key = dropKey(a.scenario_name, a.drop_number);
    if (!drops.has(key)) {
      drops.set(key, { key, scenario_name: a.scenario_name ?? '', drop_number: a.drop_number, count: 0, day: dropDayMap.get(key) ?? null });
    }
    drops.get(key).count += 1;
  }
  return [...drops.values()].sort((a, b) =>
    a.scenario_name.localeCompare(b.scenario_name) || a.drop_number - b.drop_number);
}
