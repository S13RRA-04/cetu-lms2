'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE course_content_items
         ADD COLUMN IF NOT EXISTS source_drop_number SMALLINT,
         ADD COLUMN IF NOT EXISTS source_victim_code VARCHAR(20);

       UPDATE course_content_items
          SET source_drop_number = drop_number,
              source_victim_code = victim_code
        WHERE r2_key IS NOT NULL
          AND scenario_name IS NOT NULL;

       CREATE INDEX IF NOT EXISTS course_content_items_r2_source_scope_idx
         ON course_content_items(course_id, scenario_name, source_drop_number, source_victim_code);`,
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('course_content_items', 'course_content_items_r2_source_scope_idx');
    await queryInterface.removeColumn('course_content_items', 'source_victim_code');
    await queryInterface.removeColumn('course_content_items', 'source_drop_number');
  },
};
