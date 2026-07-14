'use strict';

const ENUM_NAME = 'enum_users_professional_role';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TYPE "${ENUM_NAME}" ADD VALUE IF NOT EXISTS 'forensic_accountant';`);
  },

  async down() {
    // Postgres cannot drop individual enum values; no-op.
  },
};
