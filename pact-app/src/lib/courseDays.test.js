import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDropDayMap, titleDay, effectiveDay, listDrops } from './courseDays.js';

const map = buildDropDayMap([
  { scenario_name: 'packet-heist-v2', drop_number: 2, course_day: 2 },
  { scenario_name: '', drop_number: 9, course_day: 4 },
]);

test('titleDay reads a leading "Day N" only', () => {
  assert.equal(titleDay('Day 1 Workshop — ATT&CK Mapping'), 1);
  assert.equal(titleDay('day 12: something'), 12);
  assert.equal(titleDay('Day 5 Capstone'), 5);
  assert.equal(titleDay('PACKET HEIST — Drop 2'), null);
  assert.equal(titleDay('Mid-course Day 3 review'), null);
  assert.equal(titleDay('Daylight'), null);
  assert.equal(titleDay(null), null);
});

test('an explicit course_day beats the drop schedule, which beats the title', () => {
  const a = { title: 'Day 1 Drop Quiz', scenario_name: 'packet-heist-v2', drop_number: 2 };
  assert.deepEqual(effectiveDay(a, map), { day: 2, source: 'drop' });
  assert.deepEqual(effectiveDay({ ...a, course_day: 3 }, map), { day: 3, source: 'item' });
  assert.deepEqual(effectiveDay({ ...a, drop_number: 3 }, map), { day: 1, source: 'title' });
});

test('a null scenario matches the drop schedule\'s \'\' scenario', () => {
  assert.deepEqual(effectiveDay({ title: 'x', scenario_name: null, drop_number: 9 }, map), { day: 4, source: 'drop' });
});

test('no override, no scheduled drop, no title prefix → unscheduled', () => {
  assert.deepEqual(effectiveDay({ title: 'Anyproxy Botnet', scenario_name: 'brokered-exit', drop_number: 1 }, map), { day: null, source: null });
});

test('listDrops counts each scenario+drop pair once, skips archived items, and carries the scheduled day', () => {
  const drops = listDrops([
    { scenario_name: 'packet-heist-v2', drop_number: 2 },
    { scenario_name: 'packet-heist-v2', drop_number: 2 },
    { scenario_name: 'packet-heist-v2', drop_number: 2, archived_at: '2026-01-01' },
    { scenario_name: 'brokered-exit', drop_number: 1 },
    { scenario_name: 'packet-heist-v2', drop_number: null },
  ], map);
  assert.deepEqual(drops.map((d) => [d.scenario_name, d.drop_number, d.count, d.day]), [
    ['brokered-exit', 1, 1, null],
    ['packet-heist-v2', 2, 2, 2],
  ]);
});
