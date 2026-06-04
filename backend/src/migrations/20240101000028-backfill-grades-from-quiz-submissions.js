'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      INSERT INTO grades (id, assignment_id, user_id, score, max_score, graded_at, created_at, updated_at)
      SELECT
        gen_random_uuid(),
        s.assignment_id,
        s.user_id,
        (s.content::json->>'totalScore')::numeric,
        (s.content::json->>'maxScore')::numeric,
        s.submitted_at,
        NOW(),
        NOW()
      FROM submissions s
      WHERE s.status IN ('submitted', 'graded')
        AND s.content IS NOT NULL
        AND s.content::jsonb ? 'totalScore'
        AND s.content::jsonb ? 'maxScore'
        AND (s.content::json->>'maxScore')::numeric > 0
      ON CONFLICT ON CONSTRAINT grades_assignment_user_unique DO NOTHING;
    `);
  },

  async down() {
    /* Intentionally non-reversible — do not delete grades that may have been
       subsequently updated by an instructor. */
  },
};
