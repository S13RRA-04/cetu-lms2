'use strict';
const { DropLocationSelection, CampaignDrop } = require('../models');

/* Every location_code a student has ever self-reported anywhere in a course
   (across any drop's DropLocationSelection rows). Location is treated as a
   durable per-student trait for the rest of the campaign — e.g. a student
   who searched the RestonIT office in Drop 6 is still "the one who searched
   the office" for Day 5 testimony prep, which isn't tied to any drop at all. */
async function getStudentLocationCodes(courseId, userId) {
  const rows = await DropLocationSelection.findAll({
    where: { user_id: userId },
    include: [{ model: CampaignDrop, attributes: ['course_id'], required: true }],
  });
  return new Set(rows.filter((row) => row.CampaignDrop.course_id === courseId).map((row) => row.location_code));
}

// An item with no location_code is unrestricted. An item tagged with one is
// hidden only once the student has self-reported a *different* location
// somewhere in this course — never having made any selection at all means
// unrestricted, same as this codebase's puzzle gates (the frontend forces
// the prompt first; the backend doesn't hard-block a student/cohort that
// never went through it, e.g. drops released before this mechanism existed
// for that cohort).
function locationMatches(item, locationCodes) {
  if (!item.location_code) return true;
  if (locationCodes.size === 0) return true;
  return locationCodes.has(item.location_code);
}

module.exports = { getStudentLocationCodes, locationMatches };
