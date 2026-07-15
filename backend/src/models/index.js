'use strict';
const { sequelize } = require('../config/database');

const User                = require('./User')(sequelize);
const Course              = require('./Course')(sequelize);
const Module              = require('./Module')(sequelize);
const ContentItem         = require('./ContentItem')(sequelize);
const Enrollment          = require('./Enrollment')(sequelize);
const Cohort              = require('./Cohort')(sequelize);
const Squad               = require('./Squad')(sequelize);
const AssignmentUnlock    = require('./AssignmentUnlock')(sequelize);
const Assignment          = require('./Assignment')(sequelize);
const Submission          = require('./Submission')(sequelize);
const Grade               = require('./Grade')(sequelize);
const RefreshToken        = require('./RefreshToken')(sequelize);
const PasswordResetToken  = require('./PasswordResetToken')(sequelize);
const AuditLog            = require('./AuditLog')(sequelize);
const LtiToolRegistration   = require('./LtiToolRegistration')(sequelize);
const ScenarioPackage       = require('./ScenarioPackage')(sequelize);
const ScenarioPackageUnlock = require('./ScenarioPackageUnlock')(sequelize);
const CourseContentItem     = require('./CourseContentItem')(sequelize);
const CourseContentUnlock   = require('./CourseContentUnlock')(sequelize);
const CampaignDrop          = require('./CampaignDrop')(sequelize);
const CampaignDropUnlock    = require('./CampaignDropUnlock')(sequelize);
const CampaignDropPuzzle    = require('./CampaignDropPuzzle')(sequelize);
const KcrEnvironment        = require('./KcrEnvironment')(sequelize);
const KcrVenue              = require('./KcrVenue')(sequelize);
const KcrRoom               = require('./KcrRoom')(sequelize);
const KcrArtifact           = require('./KcrArtifact')(sequelize);
const KcrPlacement          = require('./KcrPlacement')(sequelize);
const IntelBoard            = require('./IntelBoard')(sequelize);
const SquadChallengeState   = require('./SquadChallengeState')(sequelize);
const SquadPuzzleCompletion = require('./SquadPuzzleCompletion')(sequelize);

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

// ── Cohort ↔ Squad ─────────────────────────────────────────────────────────
Cohort.hasMany(Squad, { as: 'squads', foreignKey: 'cohort_id', onDelete: 'CASCADE' });
Squad.belongsTo(Cohort,              { foreignKey: 'cohort_id' });
Squad.hasMany(Enrollment, { foreignKey: 'squad_id', as: 'members' });
Enrollment.belongsTo(Squad, { foreignKey: 'squad_id', as: 'squad' });
User.belongsToMany(Squad, { through: Enrollment, foreignKey: 'user_id', as: 'squads' });
Squad.belongsToMany(User, { through: Enrollment, foreignKey: 'squad_id', as: 'students' });

// ── Assignment ↔ AssignmentUnlock ──────────────────────────────────────────
Assignment.hasMany(AssignmentUnlock, { as: 'unlocks', foreignKey: 'assignment_id', onDelete: 'CASCADE' });
AssignmentUnlock.belongsTo(Assignment, { foreignKey: 'assignment_id' });
AssignmentUnlock.belongsTo(Cohort,     { foreignKey: 'cohort_id' });
AssignmentUnlock.belongsTo(User, { as: 'unlocker', foreignKey: 'unlocked_by' });

// ── Submission ↔ Squad ─────────────────────────────────────────────────────
Submission.belongsTo(Squad, { foreignKey: 'squad_id', as: 'squad' });

// ── Course ↔ Assignment ────────────────────────────────────────────────────
Course.hasMany(Assignment,  { as: 'assignments', foreignKey: 'course_id', onDelete: 'CASCADE' });
Assignment.belongsTo(Course,                     { foreignKey: 'course_id' });

// ── Assignment ↔ Submission ────────────────────────────────────────────────
Assignment.hasMany(Submission, { foreignKey: 'assignment_id', onDelete: 'CASCADE' });
Submission.belongsTo(Assignment,               { foreignKey: 'assignment_id' });
Submission.belongsTo(User, { foreignKey: 'user_id', as: 'student' });
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

// ── User ↔ PasswordResetToken ───────────────────────────────────────────────
User.hasMany(PasswordResetToken,   { foreignKey: 'user_id', onDelete: 'CASCADE' });
PasswordResetToken.belongsTo(User, { foreignKey: 'user_id' });

// ── User ↔ AuditLog ────────────────────────────────────────────────────────
User.hasMany(AuditLog,  { foreignKey: 'user_id' });
AuditLog.belongsTo(User, { foreignKey: 'user_id' });

// ── ScenarioPackage ↔ ScenarioPackageUnlock ────────────────────────────────
ScenarioPackage.hasMany(ScenarioPackageUnlock, { as: 'unlocks', foreignKey: 'package_id', onDelete: 'CASCADE' });
ScenarioPackageUnlock.belongsTo(ScenarioPackage, { foreignKey: 'package_id' });
ScenarioPackageUnlock.belongsTo(Cohort,          { foreignKey: 'cohort_id' });
ScenarioPackageUnlock.belongsTo(User, { as: 'unlocker', foreignKey: 'unlocked_by' });
Course.hasMany(ScenarioPackage, { as: 'scenarioPackages', foreignKey: 'course_id', onDelete: 'CASCADE' });
ScenarioPackage.belongsTo(Course,               { foreignKey: 'course_id' });

// ── KCR associations ──────────────────────────────────────────────────────────
KcrEnvironment.hasMany(KcrVenue,    { as: 'venues',    foreignKey: 'environment_id', onDelete: 'CASCADE' });
KcrVenue.belongsTo(KcrEnvironment,                    { foreignKey: 'environment_id' });

KcrVenue.hasMany(KcrRoom,           { as: 'rooms',     foreignKey: 'venue_id', onDelete: 'CASCADE' });
KcrRoom.belongsTo(KcrVenue,                           { foreignKey: 'venue_id' });

KcrEnvironment.hasMany(KcrArtifact, { as: 'artifacts', foreignKey: 'environment_id', onDelete: 'CASCADE' });
KcrArtifact.belongsTo(KcrEnvironment,                 { foreignKey: 'environment_id' });

KcrRoom.hasMany(KcrPlacement,       { as: 'placements', foreignKey: 'room_id', onDelete: 'CASCADE' });
KcrPlacement.belongsTo(KcrRoom,                        { foreignKey: 'room_id' });

KcrArtifact.hasMany(KcrPlacement,   { as: 'placements', foreignKey: 'artifact_id', onDelete: 'CASCADE' });
KcrPlacement.belongsTo(KcrArtifact, { as: 'artifact',   foreignKey: 'artifact_id' });

Course.hasMany(KcrEnvironment,      { as: 'kcrEnvironments', foreignKey: 'course_id' });
KcrEnvironment.belongsTo(Course,                             { foreignKey: 'course_id' });

// ── CampaignDrop ↔ Course / CampaignDropUnlock ────────────────────────────
Course.hasMany(CampaignDrop, { as: 'campaignDrops', foreignKey: 'course_id', onDelete: 'CASCADE' });
CampaignDrop.belongsTo(Course, { foreignKey: 'course_id' });
CampaignDrop.hasMany(CampaignDropUnlock, { as: 'unlocks', foreignKey: 'drop_id', onDelete: 'CASCADE' });
CampaignDropUnlock.belongsTo(CampaignDrop, { foreignKey: 'drop_id' });
CampaignDropUnlock.belongsTo(Cohort,      { foreignKey: 'cohort_id' });
CampaignDropUnlock.belongsTo(User, { as: 'unlocker', foreignKey: 'unlocked_by' });
CampaignDrop.hasMany(CampaignDropPuzzle, { as: 'puzzles', foreignKey: 'drop_id', onDelete: 'CASCADE' });
CampaignDropPuzzle.belongsTo(CampaignDrop, { foreignKey: 'drop_id' });

// ── CourseContentItem ↔ CourseContentUnlock ────────────────────────────────
Course.hasMany(CourseContentItem, { as: 'contentItems', foreignKey: 'course_id', onDelete: 'CASCADE' });
CourseContentItem.belongsTo(Course, { foreignKey: 'course_id' });
CourseContentItem.hasMany(CourseContentUnlock, { as: 'unlocks', foreignKey: 'content_id', onDelete: 'CASCADE' });
CourseContentUnlock.belongsTo(CourseContentItem, { foreignKey: 'content_id' });
CourseContentUnlock.belongsTo(Cohort, { foreignKey: 'cohort_id' });
CourseContentUnlock.belongsTo(User, { as: 'unlocker', foreignKey: 'unlocked_by' });

// ── IntelBoard associations ───────────────────────────────────────────────────
IntelBoard.belongsTo(Squad,  { foreignKey: 'squad_id',  as: 'squad'  });
IntelBoard.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });

// ── SquadChallengeState associations ──────────────────────────────────────────
SquadChallengeState.belongsTo(Assignment, { foreignKey: 'assignment_id', as: 'assignment' });
SquadChallengeState.belongsTo(Squad,      { foreignKey: 'squad_id',      as: 'squad'      });

module.exports = {
  sequelize,
  User,
  Course,
  Module,
  ContentItem,
  Enrollment,
  Cohort,
  Squad,
  AssignmentUnlock,
  Assignment,
  Submission,
  Grade,
  RefreshToken,
  PasswordResetToken,
  AuditLog,
  LtiToolRegistration,
  ScenarioPackage,
  ScenarioPackageUnlock,
  CourseContentItem,
  CourseContentUnlock,
  CampaignDrop,
  CampaignDropUnlock,
  CampaignDropPuzzle,
  KcrEnvironment,
  KcrVenue,
  KcrRoom,
  KcrArtifact,
  KcrPlacement,
  IntelBoard,
  SquadChallengeState,
  SquadPuzzleCompletion,
};
