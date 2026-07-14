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

module.exports = { partitionDropMaterials };
