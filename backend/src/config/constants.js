'use strict';

const ROLES = Object.freeze({
  SUPERADMIN: 'superadmin',
  ADMIN:      'admin',
  INSTRUCTOR: 'instructor',
  STUDENT:    'student',
});

const COURSE_STATUS = Object.freeze({
  DRAFT:     'draft',
  PUBLISHED: 'published',
  ARCHIVED:  'archived',
});

const ENROLLMENT_ROLE = Object.freeze({
  STUDENT:    'student',
  INSTRUCTOR: 'instructor',
  TA:         'ta',
});

const ENROLLMENT_STATUS = Object.freeze({
  ACTIVE:    'active',
  COMPLETED: 'completed',
  WITHDRAWN: 'withdrawn',
});

const CONTENT_TYPE = Object.freeze({
  VIDEO:      'video',
  DOCUMENT:   'document',
  QUIZ:       'quiz',
  ASSIGNMENT: 'assignment',
  LTI_TOOL:   'lti_tool',
  TEXT:       'text',
});

const SUBMISSION_STATUS = Object.freeze({
  SUBMITTED: 'submitted',
  GRADED:    'graded',
  RETURNED:  'returned',
});

module.exports = {
  ROLES,
  COURSE_STATUS,
  ENROLLMENT_ROLE,
  ENROLLMENT_STATUS,
  CONTENT_TYPE,
  SUBMISSION_STATUS,
};
