'use strict';
const { DropDay } = require('../models');

// One course day per (scenario, drop) pair — Command's Content workspace
// uses it as the default day for every assignment in that drop.
async function list(courseId) {
  return DropDay.findAll({
    where: { course_id: courseId },
    attributes: ['scenario_name', 'drop_number', 'course_day'],
    order: [['scenario_name', 'ASC'], ['drop_number', 'ASC']],
  });
}

// course_day null clears the mapping. Returns the stored row, or null.
async function set(courseId, { scenario_name, drop_number, course_day }) {
  const where = { course_id: courseId, scenario_name: scenario_name ?? '', drop_number };
  if (course_day == null) {
    await DropDay.destroy({ where });
    return null;
  }
  const [row, created] = await DropDay.findOrCreate({ where, defaults: { course_day } });
  if (!created && row.course_day !== course_day) await row.update({ course_day });
  return { scenario_name: row.scenario_name, drop_number: row.drop_number, course_day };
}

module.exports = { list, set };
