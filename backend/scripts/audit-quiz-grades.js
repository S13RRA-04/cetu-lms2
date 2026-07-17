'use strict';
/**
 * Audits every recorded Grade for score > max_score — mathematically
 * impossible under any honest grading policy, past or present, regardless
 * of how an assignment's questions/points have since been edited. Written
 * in response to a real exploit (see backend/src/utils/quizGrading.js's
 * header comment) where students could forge their own score/max_score by
 * editing the submit request body (discovered via a student's bug-bounty
 * report — see Dakota R.'s Pre-test grade, forged to 20106/219).
 *
 * Deliberately does NOT flag "recorded grade doesn't match a fresh recompute
 * from current assignment.questions" as a signal on its own — assignments
 * get edited after students are graded (points rebalanced, questions
 * added/removed), so that comparison alone produces false positives
 * unrelated to the exploit. Only score > max_score is treated as evidence
 * of tampering.
 *
 * Read-only by default. Pass --fix to overwrite flagged Grade rows with the
 * recomputed honest score (only for rows with a stored answer trail — rows
 * without one are reported as UNRECOVERABLE and never auto-fixed).
 *
 * Run: node backend/scripts/audit-quiz-grades.js [--fix]
 */
require('dotenv').config();
const { Assignment, Submission, Grade, User } = require('../src/models');
const { gradeQuizAnswers, isFullyAutoGradable } = require('../src/utils/quizGrading');

const FIX = process.argv.includes('--fix');

async function main() {
  // Detection strategy: comparing a recorded grade against a fresh recompute
  // from the CURRENT assignment.questions is unreliable on its own —
  // assignments get edited after students are graded (points rebalanced,
  // questions added/removed), so "doesn't match current recompute" produces
  // false positives unrelated to the exploit. The one signal that is NEVER
  // legitimate under any grading policy, past or present, is a recorded
  // score exceeding its own recorded cap (score > max_score) — that's
  // Dakota's exact signature (20106 > 219) and mathematically cannot happen
  // through honest grading no matter how the assignment has since changed.
  const allGrades = await Grade.findAll({ include: [{ model: Assignment, attributes: ['id', 'title', 'questions'] }] });
  const impossible = allGrades.filter((g) => Number(g.score) > Number(g.max_score));

  console.log(`Scanning ${allGrades.length} total grades for the one signature that's never legitimate: score > max_score...\n`);

  const findings = [];
  for (const grade of impossible) {
    const assignment = grade.Assignment;
    const sub = await Submission.findOne({ where: { assignment_id: grade.assignment_id, user_id: grade.user_id } });
    let parsed = null;
    try { parsed = sub?.content ? (typeof sub.content === 'string' ? JSON.parse(sub.content) : sub.content) : null; }
    catch { parsed = null; }

    const recoverable = Array.isArray(parsed?.answers) && isFullyAutoGradable(assignment?.questions);
    const truth = recoverable ? gradeQuizAnswers(assignment.questions, parsed.answers) : null;

    findings.push({
      type: recoverable ? 'MISMATCH' : 'UNRECOVERABLE',
      assignment: assignment?.title ?? '(assignment deleted)', userId: grade.user_id,
      recordedScore: Number(grade.score), recordedMax: Number(grade.max_score),
      trueScore: truth?.totalScore, trueMax: truth?.maxScore,
    });

    if (recoverable && FIX) {
      await grade.update({ score: truth.totalScore, max_score: truth.maxScore, graded_at: new Date() });
    }
  }
  const mismatches = findings.filter((f) => f.type === 'MISMATCH').length;
  const unrecoverable = findings.filter((f) => f.type === 'UNRECOVERABLE').length;
  const checked = allGrades.length;

  if (findings.length > 0) {
    const userIds = [...new Set(findings.map((f) => f.userId))];
    const users = await User.findAll({ where: { id: userIds }, attributes: ['id', 'first_name', 'last_name', 'email'], raw: true });
    const userById = Object.fromEntries(users.map((u) => [u.id, u]));

    console.log('=== FINDINGS ===\n');
    for (const f of findings) {
      const u = userById[f.userId];
      const name = u ? `${u.first_name} ${u.last_name} <${u.email}>` : f.userId;
      if (f.type === 'MISMATCH') {
        console.log(`[MISMATCH] ${name} | ${f.assignment}\n  recorded: ${f.recordedScore} / ${f.recordedMax}\n  true:     ${f.trueScore} / ${f.trueMax}  <-- impossible under honest play${FIX ? '  [FIXED]' : ''}\n`);
      } else {
        console.log(`[UNRECOVERABLE] ${name} | ${f.assignment}\n  recorded: ${f.recordedScore} / ${f.recordedMax}  (no stored answers to verify against — needs manual review)\n`);
      }
    }
  }

  console.log(`\n${checked} total grades scanned. ${impossible.length} had score > max_score (mathematically impossible under any honest grading): ${mismatches} recomputable from stored answers, ${unrecoverable} unrecoverable.`);
  if (mismatches > 0 && !FIX) console.log('Re-run with --fix to correct the MISMATCH rows above (UNRECOVERABLE rows are never auto-fixed — no answer trail to verify against).');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
