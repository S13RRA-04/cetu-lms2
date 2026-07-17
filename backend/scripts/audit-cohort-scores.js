'use strict';
/**
 * Read-only score integrity audit for a single cohort's course. Checks:
 *
 *  A) Assignment.max_score vs. the sum of its own question points, for
 *     assignments that are fully auto-gradable (quizGrading.js computes
 *     Grade.max_score independently from the question points, so a mismatch
 *     here means an achievable score can silently exceed/undershoot the
 *     assignment's stated cap — see the Day 5 max_score bug).
 *  B) Any existing Grade row where score > max_score (would already show the
 *     symptom of (A), or a manual-grading data-entry error).
 *  C) Squad-graded assignments: every current squad member who has a Grade
 *     row for that assignment should have the SAME score (grading belongs to
 *     the squad, not the individual — see grade.service.js's gradeSquad/
 *     autoGradeQuiz). Flags squads with split scores or partial fan-out
 *     (some members graded, others not).
 *  D) Submission.squad_id drift: a submission's stored squad_id should match
 *     the student's CURRENT enrollment squad_id (catches squad reassignments
 *     that happened after a student had already submitted).
 *
 * Read-only — prints findings, changes nothing.
 * Run: node backend/scripts/audit-cohort-scores.js
 */
require('dotenv').config();
const { Assignment, Grade, Submission, Enrollment, Squad, Cohort, User } = require('../src/models');
const { isFullyAutoGradable } = require('../src/utils/quizGrading');
const { codeToName } = require('../src/constants/victims');

const COURSE_ID  = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const COHORT_ID  = '62604531-460f-4b85-86f6-dc74ec286421'; // PACT July 26

async function main() {
  const cohort = await Cohort.findByPk(COHORT_ID);
  console.log(`Auditing cohort "${cohort.name}" (${COHORT_ID}) — course ${COURSE_ID}\n`);

  const assignments = await Assignment.findAll({ where: { course_id: COURSE_ID } });
  // Staff accounts (admin/instructor) sometimes sit inside a student squad for
  // preview/testing — they're excluded from squad membership here so this audit
  // matches grade.service.js's fan-out/representative-selection rules, which
  // exclude them the same way.
  const enrollments = await Enrollment.findAll({
    where: { cohort_id: COHORT_ID, course_id: COURSE_ID },
    include: [{ model: User, where: { role: 'student' }, attributes: [] }],
  });
  const squadByUser = new Map(enrollments.map((e) => [e.user_id, e.squad_id]));

  let findingsCount = 0;
  const report = (label, msg) => { console.log(`[${label}] ${msg}`); findingsCount++; };

  /* A) max_score vs question-point sum, for fully auto-gradable assignments */
  console.log('--- A) Assignment max_score vs. question point totals ---');
  for (const a of assignments) {
    const qs = Array.isArray(a.questions) ? a.questions : [];
    if (!isFullyAutoGradable(qs)) continue;
    const qSum = qs.reduce((s, q) => s + (Number(q.scoring?.points) || 0), 0);
    if (qSum !== Number(a.max_score)) {
      report('MAX_SCORE_MISMATCH', `"${a.title}" — assignment.max_score=${Number(a.max_score)} but question points sum to ${qSum} (id ${a.id})`);
    }
  }

  /* B) Grade rows where score exceeds their own max_score */
  console.log('\n--- B) Grade rows exceeding their own max_score ---');
  const courseAssignmentIds = assignments.map((a) => a.id);
  const allGrades = await Grade.findAll({ where: { assignment_id: courseAssignmentIds } });
  for (const g of allGrades) {
    if (Number(g.score) > Number(g.max_score)) {
      const a = assignments.find((x) => x.id === g.assignment_id);
      report('SCORE_OVER_MAX', `user ${g.user_id} scored ${g.score}/${g.max_score} on "${a?.title ?? g.assignment_id}"`);
    }
  }

  /* C) Squad-graded assignments: fan-out consistency among current squad members */
  console.log('\n--- C) Squad-graded assignment score consistency ---');
  const squadAssignments = assignments.filter((a) => a.grading_mode === 'squad');
  const squads = await Squad.findAll({ where: { cohort_id: COHORT_ID } });
  const gradesByAssignment = new Map();
  for (const g of allGrades) {
    if (!gradesByAssignment.has(g.assignment_id)) gradesByAssignment.set(g.assignment_id, []);
    gradesByAssignment.get(g.assignment_id).push(g);
  }
  for (const a of squadAssignments) {
    const grades = gradesByAssignment.get(a.id) ?? [];
    if (grades.length === 0) continue;
    for (const squad of squads) {
      // Victim-scoped squad assignments only apply to the squad tasked with
      // that victim — a grade from a member's OLD squad (before a reassignment)
      // isn't a "missing fan-out" for their current, differently-tasked squad.
      if (a.victim_name && codeToName(squad.victim_code) !== a.victim_name) continue;
      const members = enrollments.filter((e) => e.squad_id === squad.id);
      if (members.length === 0) continue;
      const memberIds = new Set(members.map((e) => e.user_id));
      const squadGrades = grades.filter((g) => memberIds.has(g.user_id));
      if (squadGrades.length === 0) continue; // nobody in this squad has attempted it — fine
      const distinctScores = [...new Set(squadGrades.map((g) => Number(g.score)))];
      if (distinctScores.length > 1) {
        report('SQUAD_SCORE_SPLIT', `"${a.title}" — Squad ${squad.number} has mismatched scores among members: ${distinctScores.join(', ')}`);
      }
      if (squadGrades.length < members.length) {
        const missing = members.length - squadGrades.length;
        report('SQUAD_PARTIAL_FANOUT', `"${a.title}" — Squad ${squad.number} has ${squadGrades.length}/${members.length} members graded (${missing} missing a Grade row)`);
      }
    }
  }

  /* C2) Grades that belong to no current squad's matching victim at all —
     orphaned individual rows left behind by a squad reassignment. */
  console.log('\n--- C2) Orphaned victim-scoped grades (squad reassignment leftovers) ---');
  for (const a of squadAssignments.filter((x) => x.victim_name)) {
    const grades = gradesByAssignment.get(a.id) ?? [];
    for (const g of grades) {
      const userSquadId = squadByUser.get(g.user_id);
      const userSquad = squads.find((s) => s.id === userSquadId);
      const userVictimName = userSquad?.victim_code ? codeToName(userSquad.victim_code) : null;
      if (userVictimName !== a.victim_name) {
        report('ORPHANED_VICTIM_GRADE', `user ${g.user_id} has a Grade row (${g.score}/${g.max_score}) on "${a.title}" (victim: ${a.victim_name}) but their current squad is tasked with ${userVictimName ?? 'no victim'}`);
      }
    }
  }

  /* D) Submission.squad_id drift vs. current enrollment */
  console.log('\n--- D) Submission squad_id drift ---');
  const allSubmissions = await Submission.findAll({ where: { assignment_id: courseAssignmentIds } });
  for (const s of allSubmissions) {
    if (!s.squad_id) continue;
    const currentSquadId = squadByUser.get(s.user_id);
    if (currentSquadId && currentSquadId !== s.squad_id) {
      const a = assignments.find((x) => x.id === s.assignment_id);
      report('SUBMISSION_SQUAD_DRIFT', `user ${s.user_id} submitted "${a?.title ?? s.assignment_id}" under squad ${s.squad_id} but is currently in squad ${currentSquadId}`);
    }
  }

  console.log(`\n${findingsCount} finding(s) total.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
