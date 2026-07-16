'use strict';
const { DropLocationSelection, CampaignDrop } = require('../models');

// Assignments/course-content-items/scenario-packages don't carry drop_id —
// they're paired to a drop by (course_id, drop_number, scenario_name), same
// as campaignRelease.js's pairedMaterialWhere. DropLocationSelection is
// keyed by drop_id (FK), so we join through CampaignDrop to translate.
function dropKey(dropNumber, scenarioName) {
  return `${dropNumber}:${scenarioName ?? ''}`;
}

/* Map of "drop_number:scenario_name" -> location_code the student picked,
   scoped to one course. */
async function getStudentLocationMap(courseId, userId) {
  const rows = await DropLocationSelection.findAll({
    where: { user_id: userId },
    include: [{ model: CampaignDrop, attributes: ['course_id', 'number', 'scenario_name'], required: true }],
  });
  const map = new Map();
  for (const row of rows) {
    const drop = row.CampaignDrop;
    if (drop.course_id !== courseId) continue;
    map.set(dropKey(drop.number, drop.scenario_name), row.location_code);
  }
  return map;
}

// An item with no location_code is unrestricted. An item tagged with one is
// hidden only once the student has self-reported a *different* location for
// that item's drop — no selection recorded yet means unrestricted, same as
// this codebase's puzzle gates (the frontend forces the prompt first; the
// backend doesn't hard-block a student/cohort that never went through it,
// e.g. drops released before this mechanism existed for that cohort).
function locationMatches(item, locationMap) {
  if (!item.location_code) return true;
  if (item.drop_number == null) return true;
  const key = dropKey(item.drop_number, item.scenario_name);
  if (!locationMap.has(key)) return true;
  return locationMap.get(key) === item.location_code;
}

module.exports = { getStudentLocationMap, locationMatches };
