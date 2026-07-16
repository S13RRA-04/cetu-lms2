'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('drop_location_selections', {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
      drop_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'campaign_drops', key: 'id' }, onDelete: 'CASCADE' },
      user_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      location_code: { type: DataTypes.STRING(64), allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addConstraint('drop_location_selections', { fields: ['drop_id', 'user_id'], type: 'unique', name: 'drop_location_selections_drop_user_unique' });
    await queryInterface.addColumn('assignments', 'location_code', { type: DataTypes.STRING(64), allowNull: true });
    await queryInterface.addColumn('course_content_items', 'location_code', { type: DataTypes.STRING(64), allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('course_content_items', 'location_code');
    await queryInterface.removeColumn('assignments', 'location_code');
    await queryInterface.dropTable('drop_location_selections');
  },
};
