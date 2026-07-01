'use strict';

// Indexes for the hot query paths hit on every student page load.
// All use IF NOT EXISTS so re-running is safe.
module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);

    // assignments — listed by course on every admin and student load
    await q('CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id)');
    await q('CREATE INDEX IF NOT EXISTS idx_assignments_course_published ON assignments(course_id, is_published)');

    // submissions — scanned for pending/graded counts on every admin assignment list
    await q('CREATE INDEX IF NOT EXISTS idx_submissions_assignment_status ON submissions(assignment_id, status)');
    await q('CREATE INDEX IF NOT EXISTS idx_submissions_assignment_user ON submissions(assignment_id, user_id)');

    // enrollments — looked up on every student request
    await q('CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON enrollments(user_id, course_id)');
    await q('CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id)');
    await q('CREATE INDEX IF NOT EXISTS idx_enrollments_squad ON enrollments(squad_id) WHERE squad_id IS NOT NULL');

    // grades — aggregated in scoreboard query
    await q('CREATE INDEX IF NOT EXISTS idx_grades_user_id ON grades(user_id)');
    await q('CREATE INDEX IF NOT EXISTS idx_grades_assignment_id ON grades(assignment_id)');

    // assignment_unlocks — checked for every student on every assignment load
    await q('CREATE INDEX IF NOT EXISTS idx_assignment_unlocks_assignment ON assignment_unlocks(assignment_id)');
    await q('CREATE INDEX IF NOT EXISTS idx_assignment_unlocks_cohort_squad ON assignment_unlocks(cohort_id, squad_id)');

    // course_content_items — Intel Library query
    await q('CREATE INDEX IF NOT EXISTS idx_cci_course_published ON course_content_items(course_id, is_published)');
  },

  async down(queryInterface) {
    const drop = (name) => queryInterface.sequelize.query(`DROP INDEX IF EXISTS ${name}`);
    await Promise.all([
      'idx_assignments_course_id', 'idx_assignments_course_published',
      'idx_submissions_assignment_status', 'idx_submissions_assignment_user',
      'idx_enrollments_user_course', 'idx_enrollments_course', 'idx_enrollments_squad',
      'idx_grades_user_id', 'idx_grades_assignment_id',
      'idx_assignment_unlocks_assignment', 'idx_assignment_unlocks_cohort_squad',
      'idx_cci_course_published',
    ].map(drop));
  },
};
