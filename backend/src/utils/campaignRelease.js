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

function contentMatchesSquadVictim(itemVictimCode, squadVictimCode) {
  return !itemVictimCode || itemVictimCode === squadVictimCode;
}

function buildReleasePreview(squads, materials) {
  const partitioned = partitionDropMaterials(materials.assignments, materials.contentItems, materials.scenarioPackages);
  const assignmentDetail = (item) => ({
    id: item.id,
    title: item.title,
    role_filters: item.role_filters ?? [],
    victim_name: item.victim_name ?? null,
  });
  const fileDetail = (item) => ({ id: item.id, title: item.title, file_name: item.file_name ?? null });
  const packageDetail = (item) => ({ id: item.id, title: item.title, file_name: item.file_name ?? null });
  const sharedDetails = {
    challenges: partitioned.sharedAssignments.map(assignmentDetail),
    case_files: partitioned.sharedContent.map(fileDetail),
    packages: partitioned.sharedPackages.map(packageDetail),
  };
  return {
    shared: {
      challenges: sharedDetails.challenges.length,
      case_files: sharedDetails.case_files.length,
      packages: sharedDetails.packages.length,
      details: sharedDetails,
    },
    squads: [...squads].sort((a, b) => a.number - b.number).map((squad) => {
      const victimName = squad.victim_code ? materials.codeToName(squad.victim_code) : null;
      const victimChallenges = victimName ? partitioned.victimAssignments.filter((item) => item.victim_name === victimName) : [];
      const victimFiles = squad.victim_code ? partitioned.victimContent.filter((item) => item.victim_code === squad.victim_code) : [];
      const victimPackages = squad.victim_code ? partitioned.victimPackages.filter((item) => item.victim_code === squad.victim_code) : [];
      const details = {
        challenges: [...partitioned.sharedAssignments, ...victimChallenges].map(assignmentDetail),
        case_files: [...partitioned.sharedContent, ...victimFiles].map(fileDetail),
        packages: [...partitioned.sharedPackages, ...victimPackages].map(packageDetail),
      };
      return {
        squad_id: squad.id,
        squad_number: squad.number,
        victim_code: squad.victim_code ?? null,
        challenges: details.challenges.length,
        case_files: details.case_files.length,
        packages: details.packages.length,
        total_files: details.case_files.length + details.packages.length,
        details,
      };
    }),
  };
}

module.exports = { partitionDropMaterials, unpublishedIds, contentMatchesSquadVictim, buildReleasePreview };
