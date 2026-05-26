'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ContentItem = sequelize.define(
    'ContentItem',
    {
      id:                   { type: DataTypes.UUID,        defaultValue: DataTypes.UUIDV4, primaryKey: true },
      module_id:            { type: DataTypes.UUID,        allowNull: false },
      title:                { type: DataTypes.STRING(255), allowNull: false },
      type: {
        type:      DataTypes.ENUM('video', 'document', 'quiz', 'assignment', 'lti_tool', 'text'),
        allowNull: false,
      },
      content_url:          { type: DataTypes.STRING(512), allowNull: true },
      lti_resource_link_id: { type: DataTypes.STRING(255), allowNull: true },
      order_index:          { type: DataTypes.INTEGER,     allowNull: false, defaultValue: 0 },
      is_published:         { type: DataTypes.BOOLEAN,     defaultValue: false },
    },
    { tableName: 'content_items' }
  );

  return ContentItem;
};
