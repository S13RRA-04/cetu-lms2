'use strict';
const { Op } = require('sequelize');
const { Assignment, AssignmentUnlock, Squad } = require('../models');
const { ValidationError } = require('../utils/errors');
const { codeToName } = require('../constants/victims');
const { TITLE_PREFIX, SEARCH_SETS, searchTitle } = require('../constants/day5GrandJury');
const assignmentService = require('./assignment.service');

/* One-click release for the PACKET HEIST v2 Day 5 grand jury prep: each
   squad gets its own victim's set plus the search-testimony set for the
   scene it searched on Day 3. Victim sets follow squad.victim_code; the
   search scene isn't recorded anywhere, so the instructor picks it per squad
   and the current unlocks are read back as the saved answer. */

async function loadSets(courseId) {
  const rows = await Assignment.findAll({
    where: { course_id: courseId, title: { [Op.startsWith]: TITLE_PREFIX }, archived_at: null },
    attributes: ['id', 'title', 'victim_name', 'is_published'],
  });
  const searchSets = Object.keys(SEARCH_SETS).map((code) => ({
    code,
    name: SEARCH_SETS[code].name,
    assignment: rows.find((r) => r.title === searchTitle(code)) ?? null,
  }));
  const victimSets = rows.filter((r) => r.victim_name);
  return { rows, searchSets, victimSets };
}

// Which search-set unlocks to add and remove so each squad holds exactly the
// set for its chosen scene (or none). Pure — kept apart for testing.
function planSearchUnlocks(squadIds, searchSets, searchBySquad, existing) {
  const has = new Set(existing.map((u) => `${u.assignment_id}:${u.squad_id}`));
  const toUnlock = [];
  const toLock = [];
  for (const squadId of squadIds) {
    for (const set of searchSets) {
      if (!set.assignment) continue;
      const key = `${set.assignment.id}:${squadId}`;
      const wanted = searchBySquad[squadId] === set.code;
      if (wanted && !has.has(key)) toUnlock.push({ assignmentId: set.assignment.id, squadId });
      if (!wanted && has.has(key)) toLock.push({ assignmentId: set.assignment.id, squadId });
    }
  }
  return { toUnlock, toLock };
}

async function getStatus(courseId, cohortId) {
  const { rows, searchSets, victimSets } = await loadSets(courseId);
  const [squads, unlocks] = await Promise.all([
    Squad.findAll({ where: { cohort_id: cohortId }, attributes: ['id', 'number', 'name', 'victim_code'], order: [['number', 'ASC']] }),
    AssignmentUnlock.findAll({ where: { cohort_id: cohortId, assignment_id: rows.map((r) => r.id) } }),
  ]);
  const unlocked = (assignmentId, squadId) => unlocks.some((u) => u.assignment_id === assignmentId && u.squad_id === squadId);

  return {
    search_sets: searchSets.map((s) => ({ code: s.code, name: s.name, found: !!s.assignment, published: !!s.assignment?.is_published })),
    squads: squads.map((sq) => {
      const victimName = codeToName(sq.victim_code);
      const victimSet = victimSets.find((v) => v.victim_name === victimName) ?? null;
      const search = searchSets.find((s) => s.assignment && unlocked(s.assignment.id, sq.id));
      return {
        id: sq.id,
        number: sq.number,
        name: sq.name,
        victim_name: victimName,
        victim_set_found: !!victimSet,
        victim_released: !!victimSet && victimSet.is_published && unlocked(victimSet.id, sq.id),
        search: search?.code ?? null,
      };
    }),
  };
}

async function release(courseId, cohortId, searchBySquad, unlockerId) {
  const { searchSets, victimSets } = await loadSets(courseId);
  const missing = searchSets.filter((s) => !s.assignment).map((s) => s.name);
  if (missing.length || victimSets.length === 0) {
    throw new ValidationError(`Day 5 grand jury prep isn't seeded yet${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`);
  }

  const squads = await Squad.findAll({ where: { cohort_id: cohortId }, attributes: ['id'] });
  const squadIds = squads.map((s) => s.id);
  for (const [squadId, code] of Object.entries(searchBySquad ?? {})) {
    if (!squadIds.includes(squadId)) throw new ValidationError('A squad in the release is not in this cohort');
    if (code !== null && !SEARCH_SETS[code]) throw new ValidationError(`Unknown search scene ${code}`);
  }

  await assignmentService.releaseVictimScopedAssignments(victimSets.map((v) => v.id), cohortId, unlockerId);

  const searchIds = searchSets.map((s) => s.assignment.id);
  await Assignment.update({ is_published: true }, { where: { id: searchIds, is_published: false } });
  const existing = await AssignmentUnlock.findAll({ where: { cohort_id: cohortId, assignment_id: searchIds } });
  const { toUnlock, toLock } = planSearchUnlocks(squadIds, searchSets, searchBySquad ?? {}, existing);
  for (const u of toUnlock) await assignmentService.unlockForCohort(u.assignmentId, cohortId, unlockerId, u.squadId);
  for (const u of toLock) await assignmentService.lockForCohort(u.assignmentId, cohortId, u.squadId);
  assignmentService.invalidateAssignmentLists();

  return getStatus(courseId, cohortId);
}

module.exports = { getStatus, release, planSearchUnlocks };
