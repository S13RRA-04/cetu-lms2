'use strict';
/**
 * Deletes Grade rows on squad-graded assignments that belong to non-student
 * accounts (admin/instructor). Staff sometimes sit inside a student squad
 * for preview/testing; before this fix, gradeSquad()/autoGradeQuiz() fanned
 * every squad-graded score onto every enrollment in the squad — including
 * staff — and the squad scoreboard could even pick a staff member as the
 * squad's representative. grade.service.js now excludes staff from that
 * fan-out and from representative selection going forward; this is the
 * one-off cleanup of what already got written under the old behavior.
 *
 * Leaves individually-graded assignment grades on staff accounts untouched
 * (that's a staff member's own work, not squad contamination — and it
 * already never counts on any scoreboard, since both scoreboard queries
 * filter to role = 'student').
 *
 * Run: node backend/scripts/cleanup-staff-squad-grades.js
 */
require('dotenv').config();
const { Assignment, Grade, User } = require('../src/models');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

async function main() {
  const squadAssignments = await Assignment.findAll({ where: { course_id: COURSE_ID, grading_mode: 'squad' }, attributes: ['id', 'title'] });
  const assignmentIds = squadAssignments.map((a) => a.id);

  const staffGrades = await Grade.findAll({
    where: { assignment_id: assignmentIds },
    include: [{ model: User, as: 'student', where: { role: { [require('sequelize').Op.ne]: 'student' } }, attributes: ['id', 'first_name', 'last_name', 'role'] }],
  });

  if (staffGrades.length === 0) {
    console.log('No staff Grade rows found on squad-graded assignments.');
    return;
  }

  console.log(`Deleting ${staffGrades.length} staff Grade row(s) on squad-graded assignments:`);
  for (const g of staffGrades) {
    const a = squadAssignments.find((x) => x.id === g.assignment_id);
    console.log(` - ${g.student.first_name} ${g.student.last_name} (${g.student.role}) — ${Number(g.score)}/${Number(g.max_score)} on "${a?.title}"`);
  }

  await Grade.destroy({ where: { id: staffGrades.map((g) => g.id) } });
  console.log('\nDone.');
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { main };
