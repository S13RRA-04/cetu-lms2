'use strict';

/* Server-side port of pact-app/src/components/QuizFlow.jsx's isAnswerCorrect().
   MUST stay in sync with that function's grading semantics per question kind.

   Why this exists: submission.service.js used to trust totalScore/maxScore
   embedded in the client-submitted content JSON verbatim — any student could
   edit the request body and hand themselves (and their whole squad, for
   squad-graded assignments) an arbitrary grade, including feeding a forged
   score into LTI grade passback. This recomputes the authoritative score
   from the assignment's own answer key + the student's raw per-question
   answers, so nothing about the client's self-reported score/correctness is
   ever trusted.

   Simplification vs. the client: QuizFlow's in-session scoring awards
   partial credit based on hints used / wrong attempts (a stateful "available
   points" value carried in squad-shared UI state). That state isn't
   independently verifiable server-side (a client could report `revealed:
   true` for a question it never answered correctly), so this grades
   binary — full points for a correct final answer, zero otherwise. */

function isAnswerCorrect(question, raw) {
  const p = question.payload;
  if (!p) return false;

  if (p.kind === 'multiple_choice') {
    const correct  = new Set(p.correct ?? []);
    const selected = new Set(Array.isArray(raw) ? raw : []);
    if (p.selectionMode === 'single') {
      return selected.size === 1 && correct.has([...selected][0]);
    }
    return [...correct].every((id) => selected.has(id))
        && [...selected].every((id) => correct.has(id));
  }

  if (p.kind === 'true_false') {
    return raw === p.correct;
  }

  if (p.kind === 'drag_match') {
    const matchMap = Object.fromEntries((p.matches ?? []).map((m) => [m.sourceId, m.targetId]));
    const entries  = Object.entries(raw && typeof raw === 'object' ? raw : {});
    return entries.length === (p.matches ?? []).length
        && entries.every(([src, tgt]) => matchMap[src] === tgt);
  }

  if (p.kind === 'fill_blank') {
    const blank = p.blanks?.[0];
    if (!blank) return false;
    const accepted = (blank.accepted ?? []).map((s) => blank.caseSensitive ? s : s.toLowerCase());
    const given = typeof raw === 'string' ? raw.trim() : '';
    const test  = blank.caseSensitive ? given : given.toLowerCase();
    return accepted.includes(test);
  }

  return false;
}

/* questions: Assignment.questions (server's own copy — the answer key).
   submittedAnswers: the client's [{ questionId, raw }, ...] — only `raw` is
   trusted; any isCorrect/points the client attached is ignored. Returns
   { totalScore, maxScore } to feed into grade.service.js's autoGradeQuiz. */
function gradeQuizAnswers(questions, submittedAnswers) {
  const rawByQuestionId = new Map(
    (Array.isArray(submittedAnswers) ? submittedAnswers : [])
      .filter((a) => a && typeof a.questionId === 'string')
      .map((a) => [a.questionId, a.raw]),
  );

  let totalScore = 0;
  let maxScore   = 0;
  for (const q of questions ?? []) {
    const points = Number(q.scoring?.points) || 0;
    maxScore += points;
    if (isAnswerCorrect(q, rawByQuestionId.get(q.id))) totalScore += points;
  }
  return { totalScore, maxScore };
}

/* True only for question kinds this module can independently grade. If an
   assignment mixes in a manually-graded kind (e.g. 'prompt'), the whole
   submission should NOT be auto-graded here — same rule QuizFlow's own
   routing already follows (see AssignmentPage.jsx's hasQuiz check). */
function isFullyAutoGradable(questions) {
  const AUTO_GRADABLE_KINDS = new Set(['multiple_choice', 'true_false', 'drag_match', 'fill_blank']);
  return Array.isArray(questions) && questions.length > 0
      && questions.every((q) => AUTO_GRADABLE_KINDS.has(q.payload?.kind));
}

module.exports = { isAnswerCorrect, gradeQuizAnswers, isFullyAutoGradable };
