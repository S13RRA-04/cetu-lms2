// Keep in sync with backend enum_users_professional_role (see migrations
// 20240101000031, 20240101000058, 20240101000063) and
// backend/src/validators/user.validator.js's PROFESSIONAL_ROLES list.
export const PROFESSIONAL_ROLES = [
  { value: 'supervisory_special_agent',        label: 'Squad Lead / Acting SSA',              blurb: 'Keeps the squad focused, assigns work, and prepares the Command Post briefing.' },
  { value: 'special_agent',                     label: 'Case Agent',                           blurb: 'Determines investigative predication, victim impact, and legal/investigative next steps.' },
  { value: 'cyber_analyst',                     label: 'Cyber Analyst',                        blurb: 'Analyzes technical activity, IOCs, and observed behavior without over-attributing.' },
  { value: 'operational_support_da',            label: 'Data Analyst',                         blurb: 'Normalizes the timeline, structures evidence, and correlates entities across sources.' },
  { value: 'intelligence_analyst',              label: 'Intelligence Analyst',                 blurb: 'Develops hypotheses, identifies intelligence gaps, and guards against premature attribution.' },
  { value: 'operational_support_sos',           label: 'SOS / Case Coordinator',                blurb: 'Maintains the case organization, evidence index, lead tracker, and briefing hygiene.' },
  { value: 'task_force_officer',                label: 'TFO / Field Lead',                     blurb: 'Identifies physical-world, victim, vendor, and records-based follow-up leads.' },
  { value: 'digital_evidence_lead',             label: 'Digital Evidence Lead / CART Liaison', blurb: 'Identifies what digital evidence should be preserved, collected, or imaged.' },
  { value: 'supervisory_intelligence_analyst',  label: 'Supervisory Intelligence Analyst',      blurb: 'Senior intelligence oversight across the squad’s hypotheses and analytic products.' },
  { value: 'forensic_accountant',               label: 'Forensic Accountant',                   blurb: 'Traces financial transactions, account flows, and money-laundering patterns tied to the case.' },
];

export function professionalRoleLabel(value) {
  return PROFESSIONAL_ROLES.find((r) => r.value === value)?.label ?? null;
}
