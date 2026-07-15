'use strict';

const { Cohort, Enrollment } = require('../models');
const { NotFoundError, AppError } = require('../utils/errors');

const PRE_RANGE_BRIEFING = Object.freeze({
  title: 'Kinetic Cyber Range Pre-Range Briefing',
  duration_minutes: 90,
  expectations: [
    'Each squad must elect one member to remain at the Command Post. Command Post personnel take notes and relay information between scenes.',
    'The operation is conducted in squad pairs. Each squad pair searches its designated venue.',
    'Bring any investigation notes you may find helpful.',
    'Phones may be used to photograph items in place.',
    'Each search team must designate a sketcher to document where evidence is discovered.',
    'Communication between squad pairs is expected and necessary for mission success.',
  ],
  range_rules: [
    'No food or open drinks.',
    'Do not use toilets inside the venues; there is no running water.',
    'No tactics. Every venue is scene safe, and entry teams are considered to have detained all roleplayers.',
    'No live weapons inside the KCR. Secure all weapons in a weapons locker before entry.',
    'Do not remove items from the KCR. Return every collected evidence item to KCR staff before exit.',
  ],
  grading: {
    scale: [
      { score: 0, label: 'Absent or counterproductive' },
      { score: 1, label: 'Present but underdeveloped' },
      { score: 2, label: 'Solid — capable practitioner standard' },
      { score: 3, label: 'Strong — distinguished performance' },
    ],
    criteria: [
      { name: 'Initial scope establishment', description: 'Open with a clear statement of scope, constraints, and success criteria.', weight: 1 },
      { name: 'Role delegation', description: 'Assign evidence, witness, documentation, photography, and other functions deliberately.', weight: 1 },
      { name: 'Authority and warrant discipline', description: 'Stay within notional authority and document the basis for scope decisions.', weight: 1 },
      { name: 'Evidence acquisition discipline', description: 'Identify, document, handle, preserve, and return evidence correctly; record hashes where applicable.', weight: 1 },
      { name: 'Witness engagement', description: 'Use professional introductions, open-ended questions, patience, and accurate documentation.', weight: 1 },
      { name: 'Real-time decision-making', description: 'Make timely decisions as new information surfaces and articulate the reasoning.', weight: 1.5 },
      { name: 'Cross-venue coordination', description: 'Share relevant findings and request needed information from the other squad pair in real time.', weight: 1.5 },
      { name: 'Document and artifact thoroughness', description: 'Review routine documents and artifacts systematically, not only obvious digital evidence.', weight: 1 },
      { name: 'Adaptive scope reasoning', description: 'Reassess scope when new information appears instead of rigidly following the initial plan.', weight: 1.3 },
      { name: 'Squad-internal communication', description: 'Use periodic check-ins, status updates, and course corrections without micromanagement.', weight: 1 },
      { name: 'OPSEC and tradecraft awareness', description: 'Protect sensitive findings and avoid actions or discussions that could compromise the operation.', weight: 1 },
      { name: 'Closure discipline', description: 'Confirm acquisition completeness, coordinate exit, and document unfinished work.', weight: 1 },
      { name: 'Hot wash preparation', description: 'Enter the hot wash with an organized recap and specific observations.', weight: 1 },
    ],
  },
});

function isStaff(user) {
  return user?.role === 'admin' || user?.role === 'instructor';
}

async function get(courseId, cohortId, user) {
  const cohort = await Cohort.findOne({ where: { id: cohortId, course_id: courseId } });
  if (!cohort) throw new NotFoundError('Cohort');

  if (!isStaff(user)) {
    const enrollment = await Enrollment.findOne({
      where: { user_id: user.id, course_id: courseId, cohort_id: cohortId, status: 'active' },
      attributes: ['id'],
    });
    if (!enrollment) throw new AppError('You do not have access to this cohort', 403, 'FORBIDDEN');
    if (!cohort.pre_range_briefing_released_at) return { released: false, briefing: null };
  }

  return {
    released: Boolean(cohort.pre_range_briefing_released_at),
    released_at: cohort.pre_range_briefing_released_at,
    briefing: PRE_RANGE_BRIEFING,
  };
}

async function release(courseId, cohortId, userId) {
  const cohort = await Cohort.findOne({ where: { id: cohortId, course_id: courseId } });
  if (!cohort) throw new NotFoundError('Cohort');
  const releasedAt = new Date();
  await cohort.update({ pre_range_briefing_released_at: releasedAt, pre_range_briefing_released_by: userId });
  return { released: true, released_at: releasedAt, briefing: PRE_RANGE_BRIEFING };
}

async function lock(courseId, cohortId) {
  const cohort = await Cohort.findOne({ where: { id: cohortId, course_id: courseId } });
  if (!cohort) throw new NotFoundError('Cohort');
  await cohort.update({ pre_range_briefing_released_at: null, pre_range_briefing_released_by: null });
  return { released: false, briefing: PRE_RANGE_BRIEFING };
}

module.exports = { PRE_RANGE_BRIEFING, get, release, lock, isStaff };
