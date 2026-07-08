'use strict';

module.exports = {
  async up(queryInterface) {
    /* De-duplicate existing (assignment_id, user_id) collisions — created by the
       double-submit race this constraint is about to close off. Keep the most
       recently updated row per pair, drop the rest. */
    await queryInterface.sequelize.query(`
      DELETE FROM submissions s
      USING (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY assignment_id, user_id
                 ORDER BY updated_at DESC, submitted_at DESC, id
               ) AS rn
        FROM submissions
      ) ranked
      WHERE s.id = ranked.id AND ranked.rn > 1;
    `);

    await queryInterface.addConstraint('submissions', {
      fields: ['assignment_id', 'user_id'],
      type:   'unique',
      name:   'submissions_assignment_user_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('submissions', 'submissions_assignment_user_unique');
    /* Deduplication above is intentionally non-reversible. */
  },
};
