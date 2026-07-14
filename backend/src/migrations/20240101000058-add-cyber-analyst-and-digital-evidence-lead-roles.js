'use strict';

const ENUM_NAME = 'enum_users_professional_role';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TYPE "${ENUM_NAME}" ADD VALUE IF NOT EXISTS 'cyber_analyst';`);
    await queryInterface.sequelize.query(`ALTER TYPE "${ENUM_NAME}" ADD VALUE IF NOT EXISTS 'digital_evidence_lead';`);
  },

  async down() {
    // Postgres cannot drop individual enum values; no-op.
  },
};
