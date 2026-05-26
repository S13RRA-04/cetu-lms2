'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
  },
  async down(queryInterface) {
    // Intentionally left blank — dropping pgcrypto can break other DB objects
  },
};
