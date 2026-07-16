'use strict';
/**
 * Splits PACKET HEIST Drop 6 into a per-student, location-gated experience —
 * see backend/src/utils/dropLocation.js for the matching mechanism this
 * content relies on.
 *
 * Why: the original Drop 6 content (seed-packet-heist-drop6.js) required
 * squads to synthesize BOTH the RestonIT office and Alex Reston residence
 * returns together, but a real class ran the search as two scene pairs per
 * squad — no single squad saw both locations. This script:
 *  - Retires the two original synthesis assignments from future releases
 *    (sets drop_number to null so campaignRelease.js's pairedMaterialWhere
 *    no longer matches them) WITHOUT touching their rows otherwise — any
 *    cohort already relying on them (unlock rows/submissions reference
 *    assignment_id directly, not drop_number) is unaffected.
 *  - Tags the existing 3 scenario_packages + 222 course_content_items by
 *    their known source_folder value, splitting them into
 *    'restonit_office' / 'reston_residence'. Safe for cohorts that never
 *    self-report a location: dropLocation.js's locationMatches() only hides
 *    a tagged item once the student picks the *other* location, so a
 *    student/cohort with no selection recorded still sees everything.
 *  - Sets campaign_drops.location_options so the frontend's location-choice
 *    prompt (LocationChoiceInterceptor) has options to render.
 *  - Creates 4 new location-specific assignments (idempotent — delete by
 *    title first) covering the same rubric ground as the originals, split
 *    by which location's evidence each question needs.
 *
 * Run: node backend/scripts/seed-packet-heist-drop6-locations.js
 */
require('dotenv').config();
const { Assignment, ScenarioPackage, CourseContentItem, CampaignDrop, sequelize } = require('../src/models');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const DROP_ID = 'c9df6762-fefd-4538-b946-29c45f0e198d';
const OLD_ANALYSIS_ID = '3131324c-e7dc-45e7-bd25-588e80528636';
const OLD_DELIVERABLE_ID = '0459cf09-642f-412a-949f-c3c5c1bda045';

const LOCATION_PROMPT = (correctCode, correctLabel, options) => ({
  id: 'location-confirm',
  stem: 'Which location did your squad search during the Drop 6 warrant execution?',
  payload: {
    kind: 'multiple_choice',
    correct: [correctCode],
    options,
    shuffle: false,
    selectionMode: 'single',
  },
  scoring: { points: 0, mustPass: true },
  feedback: {
    correct: `Confirmed — this assessment covers the ${correctLabel} return only.`,
    incorrect: 'Check your squad\'s assigned search location before continuing.',
    reference: 'Drop 6 briefing',
  },
});

const OFFICE_LOCATION_OPTIONS = [
  { id: 'restonit_office', text: 'RestonIT LLC Office — Suite 214' },
  { id: 'reston_residence', text: "Alex Reston's Residence" },
];

const officeQuiz = {
  course_id: COURSE_ID,
  title: 'PACKET HEIST — Drop 6: RestonIT Office Analysis',
  description: 'Assess the Drop 6 search warrant return from RestonIT’s office (Suite 214) and state only conclusions supported by that location’s evidence.',
  max_score: 100,
  is_published: false,
  type: 'challenge',
  grading_mode: 'individual',
  order_index: 25,
  drop_number: 6,
  scenario_name: 'packet-heist',
  location_code: 'restonit_office',
  role_filters: [],
  questions: [
    LOCATION_PROMPT('restonit_office', 'RestonIT Office', OFFICE_LOCATION_OPTIONS),
    {
      id: '9f11d774-67f2-40a2-9864-1fba0c2c9c57',
      stem: 'What does the RestonIT office search primarily establish?',
      payload: {
        kind: 'multiple_choice',
        correct: ['a'],
        options: [
          { id: 'a', text: 'RestonIT credential custody, exported access records, and legitimate business relationships with all four victims' },
          { id: 'b', text: 'Conclusive proof that Alex personally sold access on Black Harbor Exchange' },
          { id: 'c', text: "Alex’s cryptocurrency proceeds and travel plans" },
          { id: 'd', text: 'Nothing useful; the office evidence is entirely decoy material' },
        ],
        shuffle: true,
        selectionMode: 'single',
      },
      scoring: { points: 20, mustPass: false },
      feedback: {
        correct: 'The office/business records (client contracts, access matrix, RMM logs) establish custody and legitimate access — persona-level attribution requires the residence return, which your squad did not search.',
        incorrect: 'Review the client contract index and access matrix from the RestonIT office return; the office evidence is nexus/custody evidence, not persona attribution.',
        reference: 'RestonIT Office — Access tools / Client Files',
      },
    },
    {
      id: 'a8ef40b4-150d-483e-86f7-d92317c1503a',
      stem: 'The four service accounts (RMH `fac-vendor-svc17`, Pixel Play `pos-maint08`, Dogwood `netops_guest_admin3`, CyberDyne `custsync_api02`) share which pattern in the office access-matrix and RMM records?',
      payload: {
        kind: 'multiple_choice',
        correct: ['a'],
        options: [
          { id: 'a', text: 'Each was created for a project, never deprovisioned after the project closed, and shows an off-cadence RMM connection days later with no open ticket' },
          { id: 'b', text: 'Each was created and deleted the same day' },
          { id: 'c', text: 'Each was shared openly with all RestonIT staff, including Sam Smith' },
          { id: 'd', text: 'Each required client sign-off before every login' },
        ],
        shuffle: true,
        selectionMode: 'single',
      },
      scoring: { points: 20, mustPass: false },
      feedback: {
        correct: 'client_access_matrix.csv and rmm_connection_profiles.csv both show the accounts going dormant after project close, then a single unexplained reconnection outside normal support activity.',
        incorrect: 'Cross-check the access matrix creation/close dates against the RMM connection log timestamps.',
        reference: 'RestonIT Office — Access tools/client_access_matrix.csv, rmm_connection_profiles.csv',
      },
    },
    {
      id: '70cc78fb-4d78-4ba1-beec-2ae085a149f3',
      stem: 'Why should Sam Smith’s "covering for Alex" payments and after-hours texts NOT be treated as evidence of Sam’s complicity?',
      payload: {
        kind: 'multiple_choice',
        correct: ['a'],
        options: [
          { id: 'a', text: 'The payments and calendar entries are consistent with ordinary shift-covering (small memo’d amounts, matching "covering for Alex" calendar entries) and Sam’s shared-drive access log shows zero access to the restricted account-tracking share' },
          { id: 'b', text: 'Sam Smith does not exist in the evidence set' },
          { id: 'c', text: 'Sam was never at the office during the relevant dates' },
          { id: 'd', text: 'The payments prove Sam laundered proceeds for Alex' },
        ],
        shuffle: true,
        selectionMode: 'single',
      },
      scoring: { points: 20, mustPass: false },
      feedback: {
        correct: 'Sam’s workstation and shared-drive logs are clean — he was kept away from the "pinecrest" after-hours tickets without being told why, and his own records corroborate an innocent explanation.',
        incorrect: 'Review Sam Smith’s shared_drive_access_log.csv and payment_app_export.csv memos before drawing conclusions about his involvement.',
        reference: 'RestonIT Office — Sam Smith Desk',
      },
    },
    {
      id: '8912a19e-c7f9-4902-9101-f3ac2dc67f4c',
      stem: 'Which piece of evidence corroborates Alex being physically present at Suite 214 during unusual after-hours periods, while still not proving what he did there?',
      payload: {
        kind: 'multiple_choice',
        correct: ['a'],
        options: [
          { id: 'a', text: 'The property manager’s email documenting repeated after-11PM badge entries, met with an unverified "client emergency" explanation' },
          { id: 'b', text: 'A signed confession' },
          { id: 'c', text: 'Dashcam footage from the RV workshop' },
          { id: 'd', text: 'The office firewall log, which shows no after-hours traffic at all' },
        ],
        shuffle: true,
        selectionMode: 'single',
      },
      scoring: { points: 20, mustPass: false },
      feedback: {
        correct: 'Presence evidence (badge access) is not the same as conduct evidence — it corroborates opportunity, and Alex’s explanation is self-serving and unverified, but the badge record alone does not prove what happened during those windows.',
        incorrect: 'Distinguish presence/opportunity evidence (badge access) from conduct evidence (what was actually done).',
        reference: 'RestonIT Office — property manager correspondence',
      },
    },
    {
      id: '6dec39d7-5bd5-4ef9-9c55-ed4e00af9652',
      stem: 'Fill in the blank: the sender alias used in the phishing email that delivered the intrusion to host STEM-LAP-014, and referenced by name as a fallback cover story in the draft ops rules found on this side of the case, is __________.',
      payload: {
        kind: 'fill_blank',
        blanks: [{ accepted: ['M. Vale', 'M Vale', 'MVale'], caseSensitive: false }],
      },
      scoring: { points: 20, mustPass: false },
      feedback: {
        correct: 'Correct: "M. Vale" appears both as the phishing sender name (Q2 STEM sponsorship email, DKIM/DMARC fail) and as the designated cover-story alias in the ops rules document.',
        incorrect: 'Compare the sender name on the STEM sponsorship phishing email against the "if asked about staff validation" line in the ops rules document.',
        reference: 'RestonIT Office — Email/Q2 STEM sponsorship, Documents/usb_ops_reston_drop_rules.md',
      },
    },
  ],
};

const RESIDENCE_LOCATION_OPTIONS = OFFICE_LOCATION_OPTIONS;

const residenceQuiz = {
  course_id: COURSE_ID,
  title: 'PACKET HEIST — Drop 6: Alex Reston Residence Analysis',
  description: 'Assess the Drop 6 search warrant return from Alex Reston’s residence and state only conclusions supported by that location’s evidence.',
  max_score: 100,
  is_published: false,
  type: 'challenge',
  grading_mode: 'individual',
  order_index: 26,
  drop_number: 6,
  scenario_name: 'packet-heist',
  location_code: 'reston_residence',
  role_filters: [],
  questions: [
    LOCATION_PROMPT('reston_residence', "Alex Reston's Residence", RESIDENCE_LOCATION_OPTIONS),
    {
      id: '0c7d05da-0e90-47f6-821f-d111f07c8567',
      stem: 'What specific artifact links Alex’s personal saved-password vault to the BRKR_AL Black Harbor Exchange login?',
      payload: {
        kind: 'multiple_choice',
        correct: ['a'],
        options: [
          { id: 'a', text: 'A saved-passwords export showing the BRKR_AL forum login sharing the same password hash as his RestonIT webmail and N-able logins' },
          { id: 'b', text: 'A signed confession found in his desk' },
          { id: 'c', text: 'A subpoena return directly from the forum operator naming Alex' },
          { id: 'd', text: 'Sam Smith’s witness statement' },
        ],
        shuffle: true,
        selectionMode: 'single',
      },
      scoring: { points: 20, mustPass: false },
      feedback: {
        correct: 'The home office (RIT-RES-09) saved_passwords_export.csv shows password reuse across restonit-llc.com webmail, N-able, and the .onion BRKR_AL login — careless, low-opsec behavior distinct from the RV Workshop’s deliberate tradecraft.',
        incorrect: 'Review the saved-passwords export from the home office desktop, not the RV workshop.',
        reference: 'Alex Reston Residence — RIT-RES-09 Home Office Desktop/saved_passwords_export.csv',
      },
    },
    {
      id: 'e9e2d9c6-dbe6-425f-9604-a221912616bf',
      stem: 'The RV Workshop reflects deliberate operational security (isolated hotspot, offline notes) while the home office reflects careless, routine tradecraft on Alex’s normal network — the two areas of the residence corroborate the same actor at different discipline levels, not two different people.',
      payload: { kind: 'true_false', correct: true },
      scoring: { points: 20, mustPass: false },
      feedback: {
        correct: 'Correct. The RV Workshop’s cash-bought hotspot and offline notes-app draft rules are self-consistent with the home office’s careless password reuse — same actor, more careful venue when it mattered.',
        incorrect: 'Compare the RV Workshop notes-app cache against the home office saved-passwords export — the discipline gap between the two areas points to the same actor being more careful in one venue than the other.',
        reference: 'Alex Reston Residence — RV Workshop / Home Office',
      },
    },
    {
      id: 'ec5a5e25-91d3-49d1-ad55-2bc114fbb0ab',
      stem: 'What is significant about the two Coinquest Exchange cashouts in the checking account statement?',
      payload: {
        kind: 'multiple_choice',
        correct: ['a'],
        options: [
          { id: 'a', text: 'Both amounts fall just under the $10,000 currency transaction reporting threshold' },
          { id: 'b', text: 'Both amounts exceed $50,000' },
          { id: 'c', text: 'They were deposited into a business account, not a personal one' },
          { id: 'd', text: 'They were immediately withdrawn as cash the same day' },
        ],
        shuffle: true,
        selectionMode: 'single',
      },
      scoring: { points: 20, mustPass: false },
      feedback: {
        correct: 'The bank statement itself annotates both deposits ($9,400 and $9,650) as being below the CTR threshold — a structuring indicator, not proof by itself.',
        incorrect: 'Check the dollar amounts in coinquest_export.csv against the checking account statement annotations.',
        reference: 'Alex Reston Residence — Documents/coinquest_export.csv, checking_account_statement_march2026.pdf',
      },
    },
    {
      id: '2b54b566-908e-471e-a023-ac3186630c70',
      stem: 'A copy of the office firewall log recovered from the home office (RIT-OFF-03) shows only ordinary business-hours SaaS/RMM traffic with zero connections to any victim network. What does this most likely indicate?',
      payload: {
        kind: 'multiple_choice',
        correct: ['a'],
        options: [
          { id: 'a', text: 'The illicit activity did not route through the traceable, logged business network — consistent with the deliberate-tradecraft pattern seen at the RV Workshop' },
          { id: 'b', text: 'No illicit activity occurred anywhere in this case' },
          { id: 'c', text: 'RestonIT never had access to any of the four victims' },
          { id: 'd', text: 'The firewall log has been destroyed' },
        ],
        shuffle: true,
        selectionMode: 'single',
      },
      scoring: { points: 20, mustPass: false },
      feedback: {
        correct: 'A clean business-network log is exculpatory for that network specifically, but is consistent with — not contrary to — the broader theory once the RV Workshop’s isolated hotspot is factored in.',
        incorrect: 'A single clean log does not clear a suspect if other evidence shows the actor deliberately avoided that network.',
        reference: 'Alex Reston Residence — Home Office/office_firewall_log.txt',
      },
    },
    {
      id: 'ae359d2f-815c-4085-ab52-7f508c9c0ff4',
      stem: 'Squad members disagree on whether the residence evidence alone is sufficient to conclusively identify Alex Reston as BRKR_AL beyond any doubt. What is the correct evidence-based position?',
      payload: {
        kind: 'multiple_choice',
        correct: ['a'],
        options: [
          { id: 'a', text: 'The residence evidence creates a strong, multi-source nexus (password reuse, deleted self-admonishing note, dedicated hotspot, matching draft ops rules) but the case disposition should still use calibrated confidence language and note alternative explanations before closing' },
          { id: 'b', text: 'One saved password alone is proof beyond a reasonable doubt' },
          { id: 'c', text: 'None of the residence evidence is admissible or useful' },
          { id: 'd', text: 'The case should be closed with no further corroboration needed' },
        ],
        shuffle: true,
        selectionMode: 'single',
      },
      scoring: { points: 20, mustPass: false },
      feedback: {
        correct: 'Multiple independent residence artifacts converge on the same conclusion, which is strong circumstantial corroboration — but a defensible disposition memo still uses calibrated language and documents what remains unproven.',
        incorrect: 'Weigh the residence evidence as a whole (multiple converging sources) rather than any single artifact in isolation, and avoid both overclaiming and dismissing it.',
        reference: 'Drop 6 packet, Alex Reston Residence',
      },
    },
  ],
};

const officeDeliverable = {
  course_id: COURSE_ID,
  title: 'PACKET HEIST — Drop 6: RestonIT Office Case Disposition',
  description: 'As a squad, write up the RestonIT office (Suite 214) search return: what it establishes, its limitations, and next steps for the business-custody side of the case.',
  max_score: 100,
  is_published: false,
  type: 'challenge',
  grading_mode: 'squad',
  order_index: 74,
  drop_number: 6,
  scenario_name: 'packet-heist',
  location_code: 'restonit_office',
  role_filters: [],
  questions: [
    {
      kind: 'prompt',
      text: 'Write a RestonIT office nexus brief. List the facts establishing office-side nexus and the specific evidence categories recovered there (business custody, the four grouped victim accounts, CedarBridge/CedarVault export traces, Alex’s business laptop metadata).',
      points: 25,
      rubric: {
        keyElements: [
          'Connects facts to specific file/source references from the office return',
          'Establishes RestonIT’s legitimate business access and credential custody',
          'Shows the four victim accounts were grouped/reviewed together internally',
          'Notes what the office evidence does NOT establish on its own (no persona-level attribution)',
        ],
        commonErrors: [
          'Claiming the office evidence proves Alex is BRKR_AL (that requires the residence return)',
          'Citing evidence without connecting it to a specific source document',
        ],
      },
    },
    {
      kind: 'prompt',
      text: 'Construct the office-side chronology: account provisioning for the four victims, and the dormancy period before an unexplained reconnection. Cite the specific dates and sources found in the access matrix and RMM logs.',
      points: 25,
      rubric: {
        keyElements: [
          'Includes provisioning and dormancy phases in order',
          'Cites specific dates from the access matrix and RMM connection log',
          'Ties each phase to its supporting source document',
          'Keeps the four victim accounts distinguishable rather than merging them',
        ],
        commonErrors: [
          'Omitting the dormancy gap between account creation and reconnection',
          'Merging the four victim accounts into one undifferentiated narrative',
        ],
      },
    },
    {
      kind: 'prompt',
      text: 'Prepare an office-side limitations section. Address: why Sam Smith should not be treated as complicit, why badge-access evidence proves presence but not conduct, and why the clean office firewall log does not exonerate the broader theory.',
      points: 25,
      rubric: {
        keyElements: [
          'Addresses Sam Smith explicitly and explains why his evidence is exculpatory',
          'Distinguishes presence/opportunity evidence (badge access) from conduct evidence',
          'Explains why a clean network log is consistent with deliberate tradecraft rather than innocence',
        ],
        commonErrors: [
          'Treating Sam Smith’s proximity to Alex as suspicious',
          'Presenting badge-access presence as proof of conduct',
        ],
      },
    },
    {
      kind: 'prompt',
      text: 'Write the office-side portion of the case disposition memo. Summarize the strongest business-custody evidence, explicitly note what remains unproven from this location alone, and recommend next investigative steps (e.g., what the residence return should be checked against).',
      points: 25,
      rubric: {
        keyElements: [
          'Summarizes strongest supporting evidence with citations',
          'Explicitly separates proven (business custody) from unproven (personal attribution) elements',
          'Recommends concrete next investigative steps, including cross-referencing the residence return',
          'Distinguishes RestonIT the business from Alex the individual',
        ],
        commonErrors: [
          'Declaring persona-level attribution using only office evidence',
          'Omitting next steps or unresolved questions',
        ],
      },
    },
  ],
};

const residenceDeliverable = {
  course_id: COURSE_ID,
  title: 'PACKET HEIST — Drop 6: Alex Reston Residence Case Disposition',
  description: 'As a squad, write up the Alex Reston residence search return: what it establishes, its limitations, and next steps for the personal-attribution side of the case.',
  max_score: 100,
  is_published: false,
  type: 'challenge',
  grading_mode: 'squad',
  order_index: 75,
  drop_number: 6,
  scenario_name: 'packet-heist',
  location_code: 'reston_residence',
  role_filters: [],
  questions: [
    {
      kind: 'prompt',
      text: 'Write an Alex-specific attribution synthesis connecting Alex Reston to the BRKR_AL persona. Cite at least five specific residence facts (e.g., password reuse, the recovered deleted note, the RV Workshop hotspot pattern, the draft ops rules) and explain how they corroborate one another.',
      points: 25,
      rubric: {
        keyElements: [
          'Cites at least five specific, sourced facts',
          'Explains how independent artifacts corroborate each other rather than relying on one item',
          'Distinguishes low-opsec home-office behavior from deliberate RV Workshop tradecraft',
          'Uses evidence-based confidence language, not absolute certainty',
        ],
        commonErrors: [
          'Relying on a single artifact as if it were conclusive proof',
          'Ignoring the contrast between home-office and RV Workshop opsec levels',
        ],
      },
    },
    {
      kind: 'prompt',
      text: 'Construct the residence-side chronology: the BRKR_RU/forum negotiation, the sale, and the crypto cashouts. Cite the specific dates and sources found in the chat/forum evidence and bank/coinquest records.',
      points: 25,
      rubric: {
        keyElements: [
          'Includes negotiation/sale and cashout phases in order',
          'Cites specific dates from chat/forum evidence and bank/coinquest records',
          'Ties each phase to its supporting source document',
          'Keeps the four victim accounts distinguishable rather than merging them',
        ],
        commonErrors: [
          'Using unresolved placeholder values (e.g., partial wallet strings) as if they were confirmed facts',
          'Merging the four victim accounts into one undifferentiated narrative',
        ],
      },
    },
    {
      kind: 'prompt',
      text: 'Prepare a residence-side limitations section. Address any unresolved gaps in the crypto/proceeds trail, and why the travel/"fishing trip" evidence is circumstantial rather than conclusive on its own.',
      points: 25,
      rubric: {
        keyElements: [
          'Identifies remaining evidentiary gaps in the proceeds trail honestly',
          'Explains why travel/cover-story evidence is circumstantial, not conclusive alone',
          'Avoids overclaiming certainty from residence evidence',
        ],
        commonErrors: [
          'Presenting circumstantial evidence as conclusive',
          'Ignoring gaps in the proceeds trail',
        ],
      },
    },
    {
      kind: 'prompt',
      text: 'Write the residence-side portion of the case disposition memo. Summarize the strongest personal-attribution evidence, explicitly note what remains unproven from this location alone, and recommend next investigative steps (e.g., what the office return should be checked against).',
      points: 25,
      rubric: {
        keyElements: [
          'Summarizes strongest supporting evidence with citations',
          'Explicitly separates proven from unproven elements',
          'Recommends concrete next investigative steps, including cross-referencing the office return',
          'Distinguishes RestonIT the business from Alex the individual',
        ],
        commonErrors: [
          'Declaring guilt in absolute terms',
          'Omitting next steps or unresolved questions',
        ],
      },
    },
  ],
};

const NEW_ASSIGNMENTS = [officeQuiz, residenceQuiz, officeDeliverable, residenceDeliverable];

async function main() {
  await Assignment.update({ drop_number: null }, { where: { id: [OLD_ANALYSIS_ID, OLD_DELIVERABLE_ID] } });
  console.log('Retired original synthesis assignments from future Drop 6 releases.');

  // IMPORTANT: the frontend's "have I seen this drop/package already" check
  // (pact-app/src/lib/dropSeen.js, AppShell's findNewScenario) is keyed off
  // updated_at. Bumping it on a drop/package a cohort already unlocked and
  // acknowledged re-triggers that reveal for every one of its students —
  // and if they're then forced through the (for them, retroactive) location
  // prompt, answering it actively hides whichever location they didn't pick
  // from evidence they already had. Capture and restore updated_at below so
  // re-running this script is safe for cohorts released before this split.
  const dropBefore = await CampaignDrop.findByPk(DROP_ID, { attributes: ['updated_at'] });
  const packagesBefore = await ScenarioPackage.findAll({
    where: { drop_number: 6, scenario_name: 'packet-heist' },
    attributes: ['id', 'updated_at'],
  });

  await CampaignDrop.update(
    {
      location_options: [
        { code: 'restonit_office', label: 'RestonIT LLC Office — Suite 214' },
        { code: 'reston_residence', label: "Alex Reston's Residence" },
      ],
    },
    { where: { id: DROP_ID } },
  );

  const [officePkgCount] = await ScenarioPackage.update(
    { location_code: 'restonit_office' },
    { where: { title: ['Drop 6 — RestonIT Office (Reston Desk)', 'Drop 6 — RestonIT Office (Sam Smith Desk)'] } },
  );
  const [residencePkgCount] = await ScenarioPackage.update(
    { location_code: 'reston_residence' },
    { where: { title: 'Drop 6 — Alex Reston Residence' } },
  );
  const [officeItemCount] = await CourseContentItem.update(
    { location_code: 'restonit_office' },
    { where: { drop_number: 6, scenario_name: 'packet-heist', source_folder: ['RestonIT Office - Reston', 'RestonIT Office - Sam Smith'] } },
  );
  const [residenceItemCount] = await CourseContentItem.update(
    { location_code: 'reston_residence' },
    { where: { drop_number: 6, scenario_name: 'packet-heist', source_folder: 'Alex Reston Residence' } },
  );
  console.log(`Tagged packages: office ${officePkgCount}, residence ${residencePkgCount}`);
  console.log(`Tagged content items: office ${officeItemCount}, residence ${residenceItemCount}`);

  // Raw SQL, not Model.update() — Sequelize's bulk update() stamps
  // updated_at = NOW() regardless of what's in the values object (silent:
  // true does not suppress it for the static/bulk form), which would defeat
  // the whole point above.
  await sequelize.query(
    'UPDATE campaign_drops SET updated_at = :updatedAt WHERE id = :id',
    { replacements: { updatedAt: dropBefore.updated_at, id: DROP_ID } },
  );
  for (const pkg of packagesBefore) {
    await sequelize.query(
      'UPDATE scenario_packages SET updated_at = :updatedAt WHERE id = :id',
      { replacements: { updatedAt: pkg.updated_at, id: pkg.id } },
    );
  }
  console.log('Restored drop/package updated_at (content items have no equivalent frontend "seen" gate).');

  await Assignment.destroy({ where: { course_id: COURSE_ID, title: NEW_ASSIGNMENTS.map((a) => a.title) } });
  const created = await Promise.all(NEW_ASSIGNMENTS.map((data) => Assignment.create(data)));
  for (const a of created) console.log(a.id, '|', a.title, '|', a.location_code, '|', a.grading_mode);
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { main };