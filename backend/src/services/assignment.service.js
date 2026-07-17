'use strict';
const { Op }             = require('sequelize');
const { sequelize }      = require('../config/database');
const { Assignment, AssignmentUnlock, Course, Cohort, Enrollment, User, Submission, CourseContentItem, CourseContentUnlock, Squad } = require('../models');
const { NotFoundError, AppError } = require('../utils/errors');
const { paginate, paginatedResponse } = require('../utils/pagination');
const TtlCache = require('../utils/ttlCache');
const { getStudentLocationCodes, locationMatches } = require('../utils/dropLocation');
const { codeToName } = require('../constants/victims');

// Admin assignment list is the same for every instructor request.
// 15-second TTL absorbs thundering-herd without hiding new submissions long.
const listCache = new TtlCache(15_000);

// Live-progress overview is polled repeatedly (Command's Live Progress tab) —
// short TTL so several instructors polling at once don't each re-run the
// aggregate query, while still refreshing fast enough to feel "live".
const liveOverviewCache = new TtlCache(5_000);

// Per-student assignment list — hit on every dashboard/AppShell load. Short TTL,
// invalidated on the student's own submit/progress writes (see submission.service.js).
const studentListCache = new TtlCache(10_000);

function invalidateStudentCache(courseId, userId) {
  studentListCache.invalidate(`listForStudent:${courseId}:${userId}`);
}

// studentListCache is keyed per-user, so a targeted invalidation would need
// every enrolled user's ID. A full flush is cheap (list queries are fast and
// infrequent) and guarantees a drop release's bulk-publish is immediately
// visible instead of waiting out the TTL per student.
function invalidateAssignmentLists() {
  listCache.flush();
  studentListCache.flush();
}

async function listByCourse(courseId, query, { includeUnpublished = false } = {}) {
  const { limit, offset, page } = paginate(query);
  const cacheKey = `listByCourse:${includeUnpublished ? 'all' : 'published'}:${courseId}:${limit}:${offset}`;
  return listCache.get(cacheKey, () => _queryListByCourse(courseId, { limit, offset, page, includeUnpublished }));
}

async function _queryListByCourse(courseId, { limit, offset, page, includeUnpublished = false }) {
  const where = { course_id: courseId };
  if (!includeUnpublished) where.is_published = true;

  const { rows, count } = await Assignment.findAndCountAll({
    where,
    include: [{ model: AssignmentUnlock, as: 'unlocks', include: [{ model: Cohort, attributes: ['id', 'name'] }] }],
    limit, offset,
    order: [['order_index', 'ASC'], ['created_at', 'ASC']],
  });

  if (rows.length > 0) {
    const assignmentIds = rows.map((r) => r.id);
    const subs = await Submission.findAll({
      where:      { assignment_id: assignmentIds, status: { [Op.in]: ['submitted', 'graded'] } },
      attributes: ['assignment_id', 'status'],
    });
    const pendingMap = {};
    const gradedMap  = {};
    for (const s of subs) {
      if (s.status === 'submitted') pendingMap[s.assignment_id] = (pendingMap[s.assignment_id] ?? 0) + 1;
      else                          gradedMap[s.assignment_id]  = (gradedMap[s.assignment_id]  ?? 0) + 1;
    }
    for (const r of rows) {
      r.dataValues.pending_count = pendingMap[r.id] ?? 0;
      r.dataValues.graded_count  = gradedMap[r.id]  ?? 0;
    }
  }

  return paginatedResponse(rows, count, { page, limit });
}

async function listForStudent(courseId, userId) {
  return studentListCache.get(`listForStudent:${courseId}:${userId}`, () => _queryListForStudent(courseId, userId));
}

async function _queryListForStudent(courseId, userId) {
  // Round-trip 1: enrollment, assignment list, and the student's professional
  // role are independent — run in parallel
  const [enrollment, assignments, student] = await Promise.all([
    Enrollment.findOne({
      where:   { user_id: userId, course_id: courseId },
      include: [{ association: 'squad', attributes: ['id', 'victim_code'] }],
    }),
    Assignment.findAll({
      where: { course_id: courseId, is_published: true },
      order: [['order_index', 'ASC'], ['created_at', 'ASC']],
    }),
    User.findByPk(userId, { attributes: ['professional_role', 'certifications'] }),
  ]);
  if (!enrollment) throw new AppError('Not enrolled in this course', 403, 'FORBIDDEN');

  // role_filters empty/null = visible to everyone; otherwise visible to
  // students whose professional_role is in the list, OR who hold a
  // certification in the list (e.g. a role-tasking row gated on
  // ['forensic_accountant', 'crypto_forensics'] reaches Forensic Accountants
  // and anyone else who holds the crypto_forensics certification).
  const professionalRole = student?.professional_role ?? null;
  const studentCertifications = student?.certifications ?? [];
  // Location-tagged assignments (e.g. a Drop 6 "which scene did you search"
  // split) stay invisible until the student has self-reported a matching
  // DropLocationSelection for that drop — see utils/dropLocation.js.
  const locationCodes = await getStudentLocationCodes(courseId, userId);
  // Victim-tagged assignments (e.g. Day 5 testimony prep's per-victim sets)
  // stay invisible to squads tasked with a different victim — same "hide it
  // outright" treatment as location, rather than courseContent.service.js's
  // show-but-locked approach, so a squad's list only shows what applies to them.
  const squadVictimName = enrollment.squad?.victim_code ? codeToName(enrollment.squad.victim_code) : null;
  const visibleAssignments = assignments.filter((a) => {
    if (a.victim_name && a.victim_name !== squadVictimName) return false;
    if (!locationMatches(a, locationCodes)) return false;
    const filters = a.role_filters;
    if (!filters || filters.length === 0) return true;
    return filters.includes(professionalRole) || studentCertifications.some((c) => filters.includes(c));
  });

  const squadId   = enrollment.squad?.id ?? null;
  const orClauses = [{ cohort_id: enrollment.cohort_id, squad_id: null }];
  if (squadId) orClauses.push({ squad_id: squadId });

  // Round-trip 2: unlocks (needs enrollment) + submissions (needs assignment IDs) — run in parallel
  const assignmentIds = visibleAssignments.map((a) => a.id);
  const [unlocks, submissions] = await Promise.all([
    AssignmentUnlock.findAll({ where: { [Op.or]: orClauses } }),
    assignmentIds.length
      ? Submission.findAll({ where: { assignment_id: assignmentIds, user_id: userId }, attributes: ['assignment_id', 'progress', 'status'] })
      : [],
  ]);

  const unlockedIds = new Set(unlocks.map((u) => u.assignment_id));
  const progressMap = Object.fromEntries(submissions.map((s) => [s.assignment_id, s.progress ?? 0]));

  return visibleAssignments.map((a) => ({
    ...a.toJSON(),
    is_unlocked: unlockedIds.has(a.id),
    progress:    progressMap[a.id] ?? 0,
  }));
}

async function unlockForCohort(assignmentId, cohortId, unlockerId, squadId = null) {
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment');

  const cohort = await Cohort.findByPk(cohortId);
  if (!cohort) throw new NotFoundError('Cohort');

  const [unlock] = await AssignmentUnlock.findOrCreate({
    where:    { assignment_id: assignmentId, cohort_id: cohortId, squad_id: squadId },
    defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
  });

  if (assignment.type === 'module') {
    const linked = await CourseContentItem.findAll({ where: { linked_assignment_id: assignmentId } });
    await Promise.all(linked.map((item) =>
      CourseContentUnlock.findOrCreate({
        where:    { content_id: item.id, cohort_id: cohortId, squad_id: squadId },
        defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
      })
    ));
  }

  return unlock;
}

/* Squad-scoped release for assignments tagged with victim_name but not tied
   to any CampaignDrop (e.g. Day 5 testimony prep) — campaignRelease.js's
   victim fan-out only runs inside releaseDrop(), which needs a drop. This
   is the same "does this squad's victim match?" pairing, standalone: each
   assignment gets unlocked only for squads whose victim_code maps to its
   victim_name. Squads with no victim assigned are skipped and reported back,
   same as releaseDrop's skippedSquads. */
async function releaseVictimScopedAssignments(assignmentIds, cohortId, unlockerId) {
  const [assignments, squads] = await Promise.all([
    Assignment.findAll({ where: { id: assignmentIds } }),
    Squad.findAll({ where: { cohort_id: cohortId }, attributes: ['id', 'number', 'victim_code'] }),
  ]);

  const unpublished = assignments.filter((a) => a.is_published !== true).map((a) => a.id);
  if (unpublished.length > 0) {
    await Assignment.update({ is_published: true }, { where: { id: unpublished } });
    invalidateAssignmentLists();
  }

  let released = 0;
  const skippedSquads = [];
  for (const squad of squads) {
    if (!squad.victim_code) { skippedSquads.push(squad.number); continue; }
    const victimName = codeToName(squad.victim_code);
    for (const a of assignments) {
      if (a.victim_name !== victimName) continue;
      const [, created] = await AssignmentUnlock.findOrCreate({
        where:    { assignment_id: a.id, cohort_id: cohortId, squad_id: squad.id },
        defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
      });
      if (created) released++;
    }
  }
  invalidateAssignmentLists();
  return { released_assignments: released, skipped_squads: skippedSquads };
}

async function lockForCohort(assignmentId, cohortId, squadId = null) {
  const assignment = await Assignment.findByPk(assignmentId);
  await AssignmentUnlock.destroy({
    where: { assignment_id: assignmentId, cohort_id: cohortId, squad_id: squadId },
  });

  if (assignment?.type === 'module') {
    const linked = await CourseContentItem.findAll({ where: { linked_assignment_id: assignmentId } });
    if (linked.length) {
      await CourseContentUnlock.destroy({
        where: { content_id: linked.map((i) => i.id), cohort_id: cohortId, squad_id: squadId },
      });
    }
  }
}

// One-shot overview for Command's "Live Progress" tab — every module/challenge
// in the course with live in-progress vs. completed counts, so an instructor
// can see at a glance which taskings students are actively working right now
// before drilling into a specific one via getProgressForAssignment.
async function getLiveOverview(courseId) {
  return liveOverviewCache.get(`liveOverview:${courseId}`, () => _queryLiveOverview(courseId));
}

async function _queryLiveOverview(courseId) {
  const [rows] = await sequelize.query(
    `SELECT a.id, a.title, a.type, a.drop_number,
            COUNT(*) FILTER (WHERE s.status = 'in_progress')                       AS "inProgressCount",
            COUNT(*) FILTER (WHERE s.status IN ('submitted', 'graded', 'returned')) AS "completedCount",
            MAX(s.updated_at) FILTER (WHERE s.status = 'in_progress')              AS "lastActivityAt"
     FROM assignments a
     LEFT JOIN submissions s ON s.assignment_id = a.id
     WHERE a.course_id = :courseId
       AND a.type IN ('module', 'challenge', 'assessment', 'survey')
       AND a.is_published = true
     GROUP BY a.id
     ORDER BY a.order_index ASC, a.created_at ASC`,
    { replacements: { courseId } }
  );
  return rows.map((r) => ({
    id:               r.id,
    title:            r.title,
    type:             r.type,
    drop_number:      r.drop_number,
    inProgressCount:  parseInt(r.inProgressCount, 10),
    completedCount:   parseInt(r.completedCount, 10),
    lastActivityAt:   r.lastActivityAt,
  }));
}

async function getUnlockStatus(assignmentId) {
  const assignment = await Assignment.findByPk(assignmentId, {
    include: [{ model: AssignmentUnlock, as: 'unlocks', include: [{ model: Cohort, attributes: ['id', 'name'] }] }],
  });
  if (!assignment) throw new NotFoundError('Assignment');
  return assignment;
}

async function getById(id, userId = null) {
  const assignment = await Assignment.findByPk(id, {
    include: [{ model: Course, attributes: ['id', 'title', 'course_code'] }],
  });
  if (!assignment) throw new NotFoundError('Assignment');

  if (userId) {
    const enrollment = await Enrollment.findOne({
      where: { user_id: userId, course_id: assignment.course_id },
      include: [{ association: 'squad', attributes: ['id'] }],
    });
    if (enrollment?.cohort_id) {
      const squadId = enrollment.squad?.id ?? null;
      const orClauses = [{ assignment_id: id, cohort_id: enrollment.cohort_id, squad_id: null }];
      if (squadId) orClauses.push({ assignment_id: id, squad_id: squadId });
      const unlock = await AssignmentUnlock.findOne({ where: { [Op.or]: orClauses } });
      return { ...assignment.toJSON(), is_unlocked: !!unlock };
    }
    return { ...assignment.toJSON(), is_unlocked: false };
  }

  return assignment;
}

async function create(courseId, data) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new NotFoundError('Course');
  return Assignment.create({ ...data, course_id: courseId });
}

async function update(id, data) {
  const assignment = await Assignment.findByPk(id);
  if (!assignment) throw new NotFoundError('Assignment');
  return assignment.update(data);
}

async function remove(id) {
  const assignment = await Assignment.findByPk(id);
  if (!assignment) throw new NotFoundError('Assignment');
  await assignment.destroy();
}

module.exports = { listByCourse, listForStudent, getById, create, update, remove, unlockForCohort, lockForCohort, releaseVictimScopedAssignments, getUnlockStatus, getLiveOverview, invalidateStudentCache, invalidateAssignmentLists };
