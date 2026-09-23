'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define(
  'CaseTimeline',
  {
    id:         { type: DataTypes.UUID,  defaultValue: DataTypes.UUIDV4, primaryKey: true },
    squad_id:   { type: DataTypes.UUID,  allowNull: false },
    course_id:  { type: DataTypes.UUID,  allowNull: false },
    // Same shape as SquadChallengeState's manual-field state
    // ({ manual: { answers, field_meta, typing } }) — reuses
    // squadChallengeState.service.js's mergeManualState directly. Each
    // timeline event is a set of `event:<id>:<field>` keys inside
    // `manual.answers`, so the generic per-field lock/merge/typing
    // machinery already built for squad challenge deliverables works here
    // unmodified — see caseTimeline.service.js.
    state:      { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    updated_by: { type: DataTypes.UUID,  allowNull: true },
  },
  { tableName: 'case_timelines' }
);
