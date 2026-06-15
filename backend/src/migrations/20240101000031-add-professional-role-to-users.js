'use strict';

const ENUM_NAME = 'enum_users_professional_role';
const ENUM_VALUES = [
  'special_agent',
  'intelligence_analyst',
  'operational_support_sos',
  'operational_support_da',
  'supervisory_special_agent',
  'supervisory_intelligence_analyst',
  'task_force_officer',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `CREATE TYPE "${ENUM_NAME}" AS ENUM (${ENUM_VALUES.map((v) => `'${v}'`).join(', ')});`
    );
    await queryInterface.addColumn('users', 'professional_role', {
      type: Sequelize.ENUM(...ENUM_VALUES),
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'professional_role');
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${ENUM_NAME}";`);
  },
};
