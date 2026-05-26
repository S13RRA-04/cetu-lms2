'use strict';
const { sequelize } = require('../config/database');

const User                = require('./User')(sequelize);
const Course              = require('./Course')(sequelize);
const Module              = require('./Module')(sequelize);
const ContentItem         = require('./ContentItem')(sequelize);
const Enrollment          = require('./Enrollment')(sequelize);
const Cohort              = require('./Cohort')(sequelize);
const Assignment          = require('./Assignment')(sequelize);
const Submission          = require('./Submission')(sequelize);
const Grade               = require('./Grade')(sequelize);
const RefreshToken        = require('./RefreshToken')(sequelize);
const AuditLog            = require('./AuditLog')(sequelize);
const LtiToolRegistration = require('./LtiToolRegistration')(sequelize);

// ── User ↔ Course (instructor relationship) ────────────────────────────────
Course.belongsTo(User, { as: 'instructor', foreignKey: 'instructor_id' });
User.hasMany(Course,   { as: 'taughtCourses', foreignKey: 'instructor_id' });

// ── Course ↔ Module ────────────────────────────────────────────────────────
Course.hasMany(Module, { as: 'modules',  foreignKey: 'course_id', onDelete: 'CASCADE' });
Module.belongsTo(Course,               { foreignKey: 'course_id' });

// ── Module ↔ ContentItem ──────────────────────────────────────────────────
Module.hasMany(ContentItem, { as: 'contentItems', foreignKey: 'module_id', onDelete: 'CASCADE' });
ContentItem.belongsTo(Module,                     { foreignKey: 'module_id' });

// ── User ↔ Course (enrollment) ─────────────────────────────────────────────
User.belongsToMany(Course, { through: Enrollment, foreignKey: 'user_id',   as: 'enrolledCourses' });
Course.belongsToMany(User, { through: Enrollment, foreignKey: 'course_id', as: 'enrolledUsers' });
Enrollment.belongsTo(User,   { foreignKey: 'user_id' });
Enrollment.belongsTo(Course, { foreignKey: 'course_id' });
Enrollment.belongsTo(Cohort, { foreignKey: 'cohort_id', as: 'cohort' });
User.hasMany(Enrollment,   { foreignKey: 'user_id' });
Course.hasMany(Enrollment, { foreignKey: 'course_id' });

// ── Course ↔ Cohort ────────────────────────────────────────────────────────
Course.hasMany(Cohort,  { as: 'cohorts', foreignKey: 'course_id', onDelete: 'CASCADE' });
Cohort.belongsTo(Course,               { foreignKey: 'course_id' });
Cohort.hasMany(Enrollment, { foreignKey: 'cohort_id', as: 'enrollments' });
User.belongsToMany(Cohort, { through: Enrollment, foreignKey: 'user_id',  as: 'cohorts' });
Cohort.belongsToMany(User, { through: Enrollment, foreignKey: 'cohort_id', as: 'members' });

// ── Course ↔ Assignment ────────────────────────────────────────────────────
Course.hasMany(Assignment,  { as: 'assignments', foreignKey: 'course_id', onDelete: 'CASCADE' });
Assignment.belongsTo(Course,                     { foreignKey: 'course_id' });

// ── Assignment ↔ Submission ────────────────────────────────────────────────
Assignment.hasMany(Submission, { foreignKey: 'assignment_id', onDelete: 'CASCADE' });
Submission.belongsTo(Assignment,               { foreignKey: 'assignment_id' });
Submission.belongsTo(User,                     { foreignKey: 'user_id' });
User.hasMany(Submission,                       { foreignKey: 'user_id' });

// ── Assignment ↔ Grade ─────────────────────────────────────────────────────
Assignment.hasMany(Grade, { foreignKey: 'assignment_id', onDelete: 'CASCADE' });
Grade.belongsTo(Assignment,              { foreignKey: 'assignment_id' });
Grade.belongsTo(User, { as: 'student',  foreignKey: 'user_id' });
Grade.belongsTo(User, { as: 'grader',   foreignKey: 'graded_by' });
User.hasMany(Grade,                      { foreignKey: 'user_id' });

// ── User ↔ RefreshToken ────────────────────────────────────────────────────
User.hasMany(RefreshToken,  { foreignKey: 'user_id', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id' });

// ── User ↔ AuditLog ────────────────────────────────────────────────────────
User.hasMany(AuditLog,  { foreignKey: 'user_id' });
AuditLog.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User,
  Course,
  Module,
  ContentItem,
  Enrollment,
  Cohort,
  Assignment,
  Submission,
  Grade,
  RefreshToken,
  AuditLog,
  LtiToolRegistration,
};
