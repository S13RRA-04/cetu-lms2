'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE course_content_items
          SET content_type = 'handout'
        WHERE drop_number IS NULL
          AND source_drop_number IS NULL
          AND (
            LOWER(TRIM(title)) = 'international evidence'
            OR LOWER(file_name) IN (
              'international evidence.pdf',
              'international-evidence.pdf',
              'international_evidence.pdf'
            )
          )`,
    );
  },

  async down() {
    // Data classification correction is intentionally not reversed.
  },
};
