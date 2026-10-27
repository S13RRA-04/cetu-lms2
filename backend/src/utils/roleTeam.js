'use strict';
const { matchesRoleFilters } = require('./campaignRelease');

/* A role team: squad-graded work aimed at specific roles (e.g. a squad's
   Special Agents working one shared Role Tasking together). It is shared
   exactly like squad work — one submission per squad, live state keyed by
   (assignment, squad) — but only the squad members the assignment targets
   are on the team: they're the only ones who can see it, work it, submit
   it, or receive its grade. Same membership rule as visibility
   (matchesRoleFilters: professional_role or a matching certification). */
function isRoleTeam(assignment) {
  return assignment?.grading_mode === 'squad'
    && Array.isArray(assignment.role_filters) && assignment.role_filters.length > 0;
}

// True for anything that isn't role-team work.
function isOnRoleTeam(assignment, user) {
  if (!isRoleTeam(assignment)) return true;
  return matchesRoleFilters(assignment.role_filters, user?.professional_role ?? null, user?.certifications ?? []);
}

module.exports = { isRoleTeam, isOnRoleTeam };
