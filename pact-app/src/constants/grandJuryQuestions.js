// Grand jury cross-examination prompts, one set per professional_role.
// Facilitator-only reference material for the Command Console's Grand Jury
// Wheel — never shown to students, not graded, not stored server-side.
// Keep professional_role values in sync with backend/src/validators/user.validator.js's
// PROFESSIONAL_ROLES list.
//
// Grounded in the PACT Audience Model's "Final Panel Should Be Multi-Role"
// section — each role answers what it actually did in the investigation,
// not the case's specific victim/location facts (that's Day 5 testimony
// prep's job). Written to work regardless of which victim or search
// location the student in this role happens to be tied to.

export const GRAND_JURY_QUESTIONS = {
  special_agent: {
    label: 'Case Agent',
    questions: [
      'What is your investigative theory of this case, in one or two sentences?',
      'What legal process — subpoenas, search warrants, preservation letters — supports that theory, and in what order did you seek it?',
      'Walk me through how you established probable cause for the search warrant. What specifically justified it?',
      'What is the single weakest point in your case, and how do you address it on cross?',
      'Did any evidence conflict with your theory? How did you resolve or account for it?',
      'If I asked you to state your confidence that the defendant is criminally responsible, separate from what your analysts assessed, what would you say and why?',
    ],
  },
  intelligence_analyst: {
    label: 'Intelligence Analyst',
    questions: [
      'What is your attribution assessment, and what confidence level do you assign it — high, moderate, or low?',
      'Walk me through the specific evidence that supports that confidence level.',
      'What alternative explanations did you consider before reaching this assessment, and why did you rule them out?',
      'Is your assessment based on a single source or corroborated by multiple independent sources? Name them.',
      'Where is the line between what you can state as fact and what remains an analytic judgment?',
      'If new information contradicted your assessment tomorrow, what would you need to see to change your mind?',
    ],
  },
  operational_support_sos: {
    label: 'SOS / Case Coordinator',
    questions: [
      'As of today, what is the case posture — is this case ready for the disposition being recommended?',
      'Walk me through the status of every open lead. Which are resolved, which are still pending?',
      'What is your evidence inventory process? How do you know nothing has been lost or misplaced?',
      'Was there a point where the timeline didn’t add up, or two records conflicted? How was that resolved?',
      'What reports or documentation are still outstanding, and why?',
      'How do you make sure information from one squad reaches the others in time to matter?',
    ],
  },
  operational_support_da: {
    label: 'Data Analyst',
    questions: [
      'What data sources did you correlate to build your findings, and how did you normalize them into a comparable format?',
      'Walk me through one specific correlation that mattered to this case — what two data points did you connect, and what did that connection prove?',
      'How did you rule out false positives or coincidental matches in your correlation work?',
      'What is your process for verifying the provenance and chain of custody of the log data you worked with?',
      'Were there gaps or missing records in the data you worked with? How did that affect your conclusions?',
      'If defense counsel challenged your normalization methodology as introducing bias, how would you respond?',
    ],
  },
  supervisory_special_agent: {
    label: 'SSA (Supervisory Special Agent)',
    questions: [
      'Why did you approve the search, interview, or escalation at the specific point you did — not earlier, not later?',
      'What resourcing or risk trade-offs did you weigh in approving this investigative step?',
      'Did any agent or analyst on your squad flag a concern you had to weigh against moving forward? How was it resolved?',
      'What oversight did you provide to prevent premature or overstated conclusions from reaching this case file?',
      'If this decision is challenged as rushed, what is your defense of the timing?',
      'What would have had to happen for you to have declined to approve this step?',
    ],
  },
  supervisory_intelligence_analyst: {
    label: 'Supervisory Intelligence Analyst',
    questions: [
      'What is your process for reviewing an analyst’s confidence level before it goes into a case file?',
      'Describe a point where two analysts or squads reached different assessments. How was that reconciled?',
      'What standard do you hold analytic products to before they’re used to support a legal action?',
      'How do you distinguish a well-supported assessment from one that’s overreaching, when you review it?',
      'Did you require any assessment in this case to be revised or softened before it was finalized? Why?',
      'If asked whether your review process is rigorous enough to support a grand jury proceeding, what would you say?',
    ],
  },
  task_force_officer: {
    label: 'TFO / Field Lead',
    questions: [
      'What local records, jurisdictional information, or partner-agency leads did you contribute to this case?',
      'Walk me through one specific field lead that changed the direction of the investigation.',
      'How did you verify business addresses, employee associations, or physical presence claims in the case?',
      'What coordination did you handle with local or partner law enforcement, and what were the outcomes?',
      'Did any field information conflict with the digital evidence? How was that reconciled?',
      'What interview targets did your field work identify, and what is the status of those interviews?',
    ],
  },
  cyber_analyst: {
    label: 'Cyber Analyst',
    questions: [
      'What specific technical indicators or TTPs did you identify, and how did you identify them?',
      'What tools or methodology did you use to reach your technical findings, and are they generally accepted in the field?',
      'How confident are you, technically, in your findings — and what would raise or lower that confidence?',
      'Did you cross-reference your technical findings against other artifacts in the case? What did that confirm or complicate?',
      'What is the difference between what the technical evidence proves and what it merely suggests?',
      'If defense counsel challenged your technical methodology as unreliable, how would you defend it?',
    ],
  },
  digital_evidence_lead: {
    label: 'Digital Evidence Lead',
    questions: [
      'Walk me through your evidence collection and preservation procedure, from seizure to analysis.',
      'How do you verify the integrity of digital evidence — what specifically do you rely on to show it wasn’t altered?',
      'What is your chain of custody for the evidence in this case, and were there any gaps?',
      'What did you NOT examine, and why? Are there limitations to what your forensic review covered?',
      'What forensic tools did you use, and are their outputs independently verifiable?',
      'If asked whether your process meets the standard for evidence to be admissible, what would you say?',
    ],
  },
  forensic_accountant: {
    label: 'Forensic Accountant',
    questions: [
      'Walk me through how you traced the financial transactions relevant to this case, from origin to destination.',
      'What wallet clustering or KYC methodology did you use, and what are its limitations?',
      'What indicators led you to flag any transactions as structuring, and how confident are you in that read?',
      'How did you connect financial proceeds back to a specific account or individual?',
      'What gaps remain in the financial trail, and what would close them?',
      'If challenged that correlation between an account and a person isn’t the same as proof of control, how do you respond?',
    ],
  },
};

export function getGrandJuryQuestions(professionalRole) {
  return GRAND_JURY_QUESTIONS[professionalRole] ?? null;
}
