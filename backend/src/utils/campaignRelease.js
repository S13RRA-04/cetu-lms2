'use strict';

function partitionDropMaterials(assignments, contentItems, scenarioPackages) {
  const sharedAssignments = assignments.filter((assignment) => !assignment.victim_name);
  const victimAssignments = assignments.filter((assignment) => assignment.victim_name);
  const sharedContent = contentItems.filter((item) => !item.victim_code);
  const victimContent = contentItems.filter((item) => item.victim_code);
  const sharedPackages = scenarioPackages.filter((pkg) => !pkg.victim_code);
  const victimPackages = scenarioPackages.filter((pkg) => pkg.victim_code);

  return {
    sharedAssignments,
    victimAssignments,
    sharedContent,
    victimContent,
    sharedPackages,
    victimPackages,
    hasVictimScopedMaterial: victimAssignments.length > 0 || victimContent.length > 0 || victimPackages.length > 0,
  };
}

// Works for any item shaped { id, is_published } — assignments and course
// content items alike.
function unpublishedIds(items) {
  return items.filter((item) => item.is_published !== true).map((item) => item.id);
}

module.exports = { partitionDropMaterials, unpublishedIds };
