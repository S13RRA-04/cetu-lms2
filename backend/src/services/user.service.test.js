'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { User } = require('../models');
const userService = require('./user.service');

test('listUsers without course_id keeps the original course-agnostic behavior', async (t) => {
  const originalFindAndCountAll = User.findAndCountAll;
  let capturedOptions;
  User.findAndCountAll = async (options) => {
    capturedOptions = options;
    return { rows: [{ id: 'u1', email: 'a@example.com' }], count: 1 };
  };
  t.after(() => { User.findAndCountAll = originalFindAndCountAll; });

  const result = await userService.listUsers({ limit: 10 });

  assert.equal(capturedOptions.include, undefined);
  assert.deepEqual(result.data, [{ id: 'u1', email: 'a@example.com' }]);
});

test('listUsers with course_id attaches each user\'s cohort for that course, including staff with no enrollment', async (t) => {
  const originalFindAndCountAll = User.findAndCountAll;
  let capturedOptions;
  User.findAndCountAll = async (options) => {
    capturedOptions = options;
    return {
      rows: [
        {
          toJSON: () => ({
            id: 'student-1', email: 'student@example.com',
            Enrollments: [{ id: 'e1', cohort_id: 'cohort-1', cohort: { id: 'cohort-1', name: 'PACT September 26' } }],
          }),
        },
        {
          // Admin account with no Enrollment row for this course.
          toJSON: () => ({ id: 'admin-1', email: 'admin@example.com', Enrollments: [] }),
        },
      ],
      count: 2,
    };
  };
  t.after(() => { User.findAndCountAll = originalFindAndCountAll; });

  const result = await userService.listUsers({ course_id: 'course-1', limit: 10 });

  // Enrollment scoped to the given course, not required — staff/unenrolled
  // accounts must still appear in the results.
  const include = capturedOptions.include[0];
  assert.equal(include.required, false);
  assert.equal(include.where.course_id, 'course-1');
  assert.equal(include.where.cohort_id, undefined);

  assert.deepEqual(result.data[0].cohort, { id: 'cohort-1', name: 'PACT September 26' });
  assert.equal(result.data[1].cohort, null);
  assert.equal(result.data[0].Enrollments, undefined, 'raw Enrollments relation should not leak into the response');
});

test('listUsers with course_id and cohort_id requires a matching enrollment, narrowing the roster', async (t) => {
  const originalFindAndCountAll = User.findAndCountAll;
  let capturedOptions;
  User.findAndCountAll = async (options) => {
    capturedOptions = options;
    return { rows: [], count: 0 };
  };
  t.after(() => { User.findAndCountAll = originalFindAndCountAll; });

  await userService.listUsers({ course_id: 'course-1', cohort_id: 'cohort-1', limit: 10 });

  const include = capturedOptions.include[0];
  assert.equal(include.required, true);
  assert.equal(include.where.course_id, 'course-1');
  assert.equal(include.where.cohort_id, 'cohort-1');
});
