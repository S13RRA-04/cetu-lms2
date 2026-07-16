'use strict';
/**
 * Seed PACKET HEIST — Drop 6 shared squad challenges (RestonIT office +
 * Alex Reston residence search warrant execution).
 *
 * Sources: Digital Evidence.zip -> RestonIT/Reston, RestonIT/Smith, House 2
 * (rendered to PDF and uploaded to R2 by
 * scripts/render-drop6-evidence.py + backend/scripts/setup-packet-heist-drop6.js).
 *
 * SUPERSEDED (kept for history): the two assignments this script seeds
 * (ANALYSIS_ID / DELIVERABLE_TITLE) required squads to synthesize BOTH the
 * office and residence returns together. That broke down once a real class
 * ran Drop 6 as two search-scene pairs per squad — no single squad saw both
 * locations. seed-packet-heist-drop6-locations.js retires these two from
 * future releases (drop_number set to null so they no longer pair with the
 * drop) and replaces them with four location-specific assignments, gated by
 * each *student's* own self-reported search location (see
 * backend/src/utils/dropLocation.js). Re-running *this* script would re-pair
 * them to the drop and undo that — don't, unless you're deliberately
 * reverting the location split.
 *
 * This script:
 *  - Fixes the pre-existing "Brokered Exit" assignment (id below) which had
 *    scenario_name='brokered-exit' (mismatched vs. every other drop's
 *    'packet-heist') and an empty questions array — reused in place as the
 *    Drop 6 analysis quiz rather than left orphaned or duplicated.
 *  - Adds a new squad deliverable assignment for the case disposition memo.
 *
 * Run: node backend/scripts/seed-packet-heist-drop6.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const DROP = 6;
const SCENARIO = 'packet-heist';
const ANALYSIS_ID = '3131324c-e7dc-45e7-bd25-588e80528636'; // pre-existing "Brokered Exit" stub
const ANALYSIS_TITLE = 'PACKET HEIST - Drop 6: Search Warrant Analysis Assessment';
const DELIVERABLE_TITLE = 'PACKET HEIST — Drop 6: Search Warrant Case Disposition';

const analysisQuestions = [
  {
    id: uuidv4(),
    stem: 'What does the RestonIT office search primarily establish, as distinct from the residence search?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'RestonIT credential custody, exported access records, and legitimate business relationships with all four victims' },
        { id: 'b', text: 'Conclusive proof that Alex personally sold access on Black Harbor Exchange' },
        { id: 'c', text: 'Alex’s cryptocurrency proceeds and travel plans' },
        { id: 'd', text: 'Nothing useful; the office evidence is entirely decoy material' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The office/business records (client contracts, access matrix, RMM logs) establish custody and legitimate access, not the persona-level attribution the residence provides.',
      incorrect: 'Review the client contract index and access matrix from the RestonIT office return; the office evidence is nexus/custody evidence, not persona attribution.',
      reference: 'RestonIT Office — Access tools / Client Files',
    },
  },
  {
    id: uuidv4(),
    stem: 'The four service accounts (RMH `fac-vendor-svc17`, Pixel Play `pos-maint08`, Dogwood `netops_guest_admin3`, CyberDyne `custsync_api02`) share which pattern in the office access-matrix and RMM records?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Each was created for a project, never deprovisioned after the project closed, and shows an off-cadence RMM connection days later with no open ticket' },
        { id: 'b', text: 'Each was created and deleted the same day' },
        { id: 'c', text: 'Each was shared openly with all RestonIT staff, including Sam Smith' },
        { id: 'd', text: 'Each required client sign-off before every login' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'client_access_matrix.csv and rmm_connection_profiles.csv both show the accounts going dormant after project close, then a single unexplained reconnection outside normal support activity.',
      incorrect: 'Cross-check the access matrix creation/close dates against the RMM connection log timestamps.',
      reference: 'RestonIT Office — Access tools/client_access_matrix.csv, rmm_connection_profiles.csv',
    },
  },
  {
    id: uuidv4(),
    stem: 'What specific artifact links Alex’s personal saved-password vault to the BRKR_AL Black Harbor Exchange login?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'A saved-passwords export showing the BRKR_AL forum login sharing the same password hash as his RestonIT webmail and N-able logins' },
        { id: 'b', text: 'A signed confession found in his desk' },
        { id: 'c', text: 'A subpoena return directly from the forum operator naming Alex' },
        { id: 'd', text: 'Sam Smith’s witness statement' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The home office (RIT-RES-09) saved_passwords_export.csv shows password reuse across restonit-llc.com webmail, N-able, and the .onion BRKR_AL login — careless, low-opsec behavior distinct from the RV Workshop’s deliberate tradecraft.',
      incorrect: 'Review the saved-passwords export from the home office desktop, not the RV workshop.',
      reference: 'Alex Reston Residence — RIT-RES-09 Home Office Desktop/saved_passwords_export.csv',
    },
  },
  {
    id: uuidv4(),
    stem: 'The RV Workshop reflects deliberate operational security (isolated hotspot, offline notes) while the home office reflects careless, routine tradecraft on Alex’s normal network — the two locations corroborate the same actor at different discipline levels, not two different people.',
    payload: { kind: 'true_false', correct: true },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct. The RV Workshop’s cash-bought hotspot, offline notes, and draft ops-rules mirror the finished usb_ops_reston_drop_rules.md almost verbatim — same actor, more careful venue.',
      incorrect: 'Compare the RV Workshop notes-app cache draft rules against the finished usb_ops_reston_drop_rules.md found on the RestonIT office side — the overlap in specific language ties them to the same author.',
      reference: 'Alex Reston Residence — RV Workshop / RestonIT Office — Documents/usb_ops_reston_drop_rules.md',
    },
  },
  {
    id: uuidv4(),
    stem: 'What is significant about the two Coinquest Exchange cashouts in the checking account statement?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Both amounts fall just under the $10,000 currency transaction reporting threshold' },
        { id: 'b', text: 'Both amounts exceed $50,000' },
        { id: 'c', text: 'They were deposited into a business account, not a personal one' },
        { id: 'd', text: 'They were immediately withdrawn as cash the same day' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The bank statement itself annotates both deposits ($9,400 and $9,650) as being below the CTR threshold — a structuring indicator, not proof by itself.',
      incorrect: 'Check the dollar amounts in coinquest_export.csv against the checking account statement annotations.',
      reference: 'Alex Reston Residence — Documents/coinquest_export.csv, checking_account_statement_march2026.pdf',
    },
  },
  {
    id: uuidv4(),
    stem: 'Why should Sam Smith’s "covering for Alex" payments and after-hours texts NOT be treated as evidence of Sam’s complicity?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'The payments and calendar entries are consistent with ordinary shift-covering (small memo’d amounts, matching "covering for Alex" calendar entries) and Sam’s shared-drive access log shows zero access to the restricted account-tracking share' },
        { id: 'b', text: 'Sam Smith does not exist in the evidence set' },
        { id: 'c', text: 'Sam was never at the office during the relevant dates' },
        { id: 'd', text: 'The payments prove Sam laundered proceeds for Alex' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Sam’s workstation and shared-drive logs are clean — he was kept away from the "pinecrest" after-hours tickets without being told why, and his own records corroborate an innocent explanation.',
      incorrect: 'Review Sam Smith’s shared_drive_access_log.csv and payment_app_export.csv memos before drawing conclusions about his involvement.',
      reference: 'RestonIT Office — Sam Smith Desk',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which piece of evidence corroborates Alex being physically present at Suite 214 during unusual after-hours periods, while still not proving what he did there?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'The property manager’s email documenting repeated after-11PM badge entries, met with an unverified "client emergency" explanation' },
        { id: 'b', text: 'A signed confession' },
        { id: 'c', text: 'Dashcam footage from the RV workshop' },
        { id: 'd', text: 'The office firewall log, which shows no after-hours traffic at all' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Presence evidence (badge access) is not the same as conduct evidence — it corroborates opportunity, and Alex’s explanation is self-serving and unverified, but the badge record alone does not prove what happened during those windows.',
      incorrect: 'Distinguish presence/opportunity evidence (badge access) from conduct evidence (what was actually done).',
      reference: 'RestonIT Office — property manager correspondence',
    },
  },
  {
    id: uuidv4(),
    stem: 'The office firewall log at the residence (RIT-OFF-03) shows only ordinary business-hours SaaS/RMM traffic with zero connections to any victim network. What does this most likely indicate?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'The illicit activity did not route through the traceable, logged business network — consistent with the deliberate-tradecraft pattern seen at the RV Workshop' },
        { id: 'b', text: 'No illicit activity occurred anywhere in this case' },
        { id: 'c', text: 'RestonIT never had access to any of the four victims' },
        { id: 'd', text: 'The firewall log has been destroyed' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'A clean office network log is exculpatory for the office network specifically, but is consistent with — not contrary to — the broader theory once the RV Workshop’s isolated hotspot is factored in.',
      incorrect: 'A single clean log does not clear a suspect if other evidence shows the actor deliberately avoided that network.',
      reference: 'RestonIT Office — office_firewall_log.txt',
    },
  },
  {
    id: uuidv4(),
    stem: 'Fill in the blank: the name used to sign the phishing email that delivered the intrusion to host STEM-LAP-014, and referenced by name as a fallback cover story in Alex’s own draft ops rules, is __________.',
    payload: { kind: 'fill_blank', blanks: [{ accepted: ['M. Vale', 'M Vale', 'MVale'], caseSensitive: false }] },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct: "M. Vale" appears both as the signature on the Q2 STEM sponsorship phishing email (DKIM/DMARC fail) and as the designated cover-story name in the ops rules found on the RestonIT office side.',
      incorrect: 'Compare the signature on the STEM sponsorship phishing email against the "if asked about staff validation" line in the ops rules document.',
      reference: 'RestonIT Office — Email/Q2 STEM sponsorship, Documents/usb_ops_reston_drop_rules.md',
    },
  },
  {
    id: uuidv4(),
    stem: 'Squad members disagree on whether the residence evidence alone is sufficient to conclusively identify Alex Reston as BRKR_AL beyond any doubt. What is the correct evidence-based position?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'The residence evidence creates a strong, multi-source nexus (password reuse, deleted self-admonishing note, dedicated hotspot, matching draft ops rules) but the case disposition should still use calibrated confidence language and note alternative explanations before closing' },
        { id: 'b', text: 'One saved password alone is proof beyond a reasonable doubt' },
        { id: 'c', text: 'None of the residence evidence is admissible or useful' },
        { id: 'd', text: 'The case should be closed with no further corroboration needed' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Multiple independent residence artifacts converge on the same conclusion, which is strong circumstantial corroboration — but a defensible disposition memo still uses calibrated language and documents what remains unproven.',
      incorrect: 'Weigh the residence evidence as a whole (multiple converging sources) rather than any single artifact in isolation, and avoid both overclaiming and dismissing it.',
      reference: 'Drop 6 packet, synthesized',
    },
  },
];

const deliverableQuestions = [
  {
    kind: 'prompt', points: 20,
    text: 'Build an office-versus-residence nexus matrix for the Drop 6 search. For each location, list the facts establishing nexus and the specific evidence categories recovered there (business custody vs. personal attribution, proceeds, and tradecraft).',
    rubric: {
      keyElements: ['Separately analyzes RestonIT office (Suite 214) and Alex Reston residence', 'Connects each location to specific supporting facts with file/source references', 'Distinguishes business-custody evidence from Alex-specific personal evidence', 'Notes what each location does NOT establish on its own'],
      commonErrors: ['Treating office and residence evidence as interchangeable', 'Citing evidence without connecting it to a specific location'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Write an Alex-specific attribution synthesis connecting Alex Reston to the BRKR_AL persona. Cite at least five specific Drop 6 facts (e.g., password reuse, the recovered deleted note, the RV Workshop hotspot pattern, the draft ops rules) and explain how they corroborate one another.',
    rubric: {
      keyElements: ['Cites at least five specific, sourced facts', 'Explains how independent artifacts corroborate each other rather than relying on one item', 'Distinguishes low-opsec home-office behavior from deliberate RV Workshop tradecraft', 'Uses evidence-based confidence language, not absolute certainty'],
      commonErrors: ['Relying on a single artifact as if it were conclusive proof', 'Ignoring the contrast between home office and RV Workshop opsec levels'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Prepare a limitations and alternative-explanations section. Address: why Sam Smith should not be treated as complicit, why badge-access evidence proves presence but not conduct, why the clean office firewall log does not exonerate the broader theory, and any unresolved gaps in the crypto/proceeds trail.',
    rubric: {
      keyElements: ['Addresses Sam Smith explicitly and explains why his evidence is exculpatory', 'Distinguishes presence/opportunity evidence from conduct evidence', 'Explains why a clean network log is consistent with deliberate tradecraft rather than innocence', 'Identifies remaining evidentiary gaps honestly'],
      commonErrors: ['Treating Sam Smith’s proximity to Alex as suspicious', 'Presenting circumstantial evidence as conclusive', 'Ignoring gaps in the proceeds trail'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Construct a chronology covering account provisioning, dormancy, the BRKR_RU/forum negotiation, the sale, and the crypto cashouts. Cite the specific dates and sources found in the office and residence returns.',
    rubric: {
      keyElements: ['Includes provisioning, dormancy, negotiation/sale, and cashout phases in order', 'Cites specific dates from the access matrix, RMM log, chat/forum evidence, and bank/coinquest records', 'Ties each phase to its supporting source document', 'Keeps the four victim accounts distinguishable rather than merging them'],
      commonErrors: ['Omitting the dormancy gap between account creation and reconnection', 'Using unresolved placeholder values (e.g., partial wallet strings) as if they were confirmed facts'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Write the final case disposition memo. State the suspected offenses or investigative matters, summarize the strongest evidence for each, explicitly note what remains unproven or requires further legal process, and recommend next investigative steps.',
    rubric: {
      keyElements: ['States suspected offenses/investigative matters clearly', 'Summarizes strongest supporting evidence with citations', 'Explicitly separates proven from unproven elements', 'Recommends concrete next investigative steps'],
      commonErrors: ['Declaring guilt in absolute terms', 'Omitting next steps or unresolved questions', 'Failing to distinguish RestonIT the business from Alex the individual'],
    },
  },
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const seq = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres', dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }, logging: false,
  });
  try {
    await seq.authenticate();
    await seq.transaction(async (transaction) => {
      // Fix + populate the pre-existing "Brokered Exit" stub in place.
      await seq.query(
        `UPDATE assignments
            SET title = :title,
                scenario_name = :scenario,
                drop_number = :drop,
                description = :description,
                grading_mode = 'squad',
                max_score = 100,
                questions = :questions,
                is_published = false,
                updated_at = NOW()
          WHERE id = :id`,
        {
          replacements: {
            id: ANALYSIS_ID, title: ANALYSIS_TITLE, scenario: SCENARIO, drop: DROP,
            description: 'Assess the Drop 6 search warrant returns from RestonIT’s office and Alex Reston’s residence, distinguish business custody from personal attribution, and state only conclusions supported by the evidence.',
            questions: JSON.stringify(analysisQuestions),
          },
          transaction,
        },
      );

      // Idempotent delete-then-insert for the new deliverable, matching the
      // pattern used by seed-packet-heist-drop5.js.
      await seq.query(
        `DELETE FROM assignments WHERE course_id = :courseId AND scenario_name = :scenario
         AND drop_number = :drop AND title = :title`,
        { replacements: { courseId: COURSE_ID, scenario: SCENARIO, drop: DROP, title: DELIVERABLE_TITLE }, transaction },
      );
      const [[{ next }]] = await seq.query(
        "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM assignments WHERE course_id = :courseId AND type = 'challenge'",
        { replacements: { courseId: COURSE_ID }, transaction },
      );
      await seq.query(
        `INSERT INTO assignments
           (id, course_id, title, description, type, grading_mode, max_score, order_index,
            is_published, scenario_name, drop_number, questions, role_filters, created_at, updated_at)
         VALUES (:id, :courseId, :title, :description, 'challenge', 'squad', 100, :orderIndex,
            false, :scenario, :drop, :questions, '{}', NOW(), NOW())`,
        {
          replacements: {
            id: uuidv4(), courseId: COURSE_ID, scenario: SCENARIO, drop: DROP,
            title: DELIVERABLE_TITLE,
            description: 'As a squad, synthesize the RestonIT office and Alex Reston residence search returns into a nexus matrix, attribution synthesis, limitations analysis, chronology, and final case disposition memo.',
            orderIndex: Number(next), questions: JSON.stringify(deliverableQuestions),
          },
          transaction,
        },
      );
    });
    console.log(`Seeded Drop ${DROP}: updated "${ANALYSIS_TITLE}" (${ANALYSIS_ID}) and created "${DELIVERABLE_TITLE}".`);
  } finally {
    await seq.close();
  }
}

module.exports = { COURSE_ID, DROP, SCENARIO, ANALYSIS_ID, ANALYSIS_TITLE, DELIVERABLE_TITLE, analysisQuestions, deliverableQuestions };

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
