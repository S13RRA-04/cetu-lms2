'use strict';

const ENUM_NAME = 'enum_assignments_type';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TYPE "${ENUM_NAME}" ADD VALUE IF NOT EXISTS 'investigation';`);
  },

  async down() {
    // Postgres cannot drop individual enum values; no-op.
  },
};
