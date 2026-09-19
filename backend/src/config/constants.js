'use strict';

const ROLES = Object.freeze({
  SUPERADMIN: 'superadmin',
  ADMIN:      'admin',
  INSTRUCTOR: 'instructor',
  STUDENT:    'student',
});

// The four investigation targets in the PACT campaign, keyed by cell number (1-4, repeating)
const CAMPAIGN_VICTIMS = Object.freeze({
  1: { code: 'REDSTONE',  name: 'Redstone Memorial Hospital', sector: 'Healthcare',    color: '#ef4444' },
  2: { code: 'DOGWOOD',   name: 'Dogwood Hotel',              sector: 'Hospitality',   color: '#f59e0b' },
  3: { code: 'CYBERDYNE', name: 'CyberDyne Data Center',      sector: 'Technology',    color: '#3b82f6' },
  4: { code: 'PIXELPLAY', name: 'Pixel Play Arcade',          sector: 'Entertainment', color: '#8b5cf6' },
});

// Keep in sync with enum_users_professional_role (see migrations
// 20240101000031, 20240101000058, 20240101000063),
// backend/src/validators/user.validator.js, and
// pact-app/src/constants/{professionalRoles,certifications}.js — this
// codebase has no single shared source for these, so every copy is
// maintained by hand. This copy had drifted (7/10 roles, 3/4 certs) until
// this fix; if you touch the role/certification list, update all four.
const CERTIFICATIONS = Object.freeze({
  DEXT:             'DExT',
  CART:             'CART',
  DFE:              'DFE',
  CRYPTO_FORENSICS: 'crypto_forensics',
});

const PROFESSIONAL_ROLES = Object.freeze({
  SPECIAL_AGENT:                   'special_agent',
  INTELLIGENCE_ANALYST:            'intelligence_analyst',
  OPERATIONAL_SUPPORT_SOS:         'operational_support_sos',
  OPERATIONAL_SUPPORT_DA:          'operational_support_da',
  SUPERVISORY_SPECIAL_AGENT:       'supervisory_special_agent',
  SUPERVISORY_INTELLIGENCE_ANALYST:'supervisory_intelligence_analyst',
  TASK_FORCE_OFFICER:              'task_force_officer',
  CYBER_ANALYST:                   'cyber_analyst',
  DIGITAL_EVIDENCE_LEAD:           'digital_evidence_lead',
  FORENSIC_ACCOUNTANT:             'forensic_accountant',
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
  PROFESSIONAL_ROLES,
  CERTIFICATIONS,
  CAMPAIGN_VICTIMS,
  COURSE_STATUS,
  ENROLLMENT_ROLE,
  ENROLLMENT_STATUS,
  CONTENT_TYPE,
  SUBMISSION_STATUS,
};
