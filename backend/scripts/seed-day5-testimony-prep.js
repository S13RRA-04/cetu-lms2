'use strict';
/**
 * Day 5 morning: grand jury testimony prep. Not tied to any CampaignDrop —
 * per the course design, Day 5 morning has "no drops," it's a stand-alone
 * question set getting students ready for the afternoon capstone (Day 5
 * Capstone: Operation BROKERED EXIT — Disposition and Courtroom Defense).
 *
 * Testimony must stay scoped to what a given student can actually speak to:
 *  - the ONE victim their squad investigated (existing squad.victim_code /
 *    Assignment.victim_name mechanism — see assignment.service.js's new
 *    releaseVictimScopedAssignments, since there's no drop to fan this out
 *    through campaignRelease.js/releaseDrop this time)
 *  - the ONE search location they self-reported for Drop 6 (existing
 *    DropLocationSelection / location_code mechanism — now drop-agnostic,
 *    see utils/dropLocation.js, so it works fine for a no-drop assignment)
 *
 * Seeds 7 assignments, all squad grading_mode, is_published: false:
 *  - 1 shared "conspiracy as a whole" set (cohort-wide, no targeting)
 *  - 4 victim-specific sets (Redstone/Dogwood/CyberDyne/Pixel Play) — release
 *    with assignmentService.releaseVictimScopedAssignments(ids, cohortId, ...)
 *  - 2 location-specific sets (Office/Residence) — release with a normal
 *    cohort-wide unlockForCohort; per-student location_code filtering does
 *    the rest, same as Drop 6's evidence packages.
 *
 * All facts are grounded in the existing Drop 1/3 victim-specific quiz banks
 * and Drop 6 office/residence content already in the DB — nothing invented.
 *
 * Run: node backend/scripts/seed-day5-testimony-prep.js
 */
require('dotenv').config();
const { Assignment } = require('../src/models');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const ORDER_INDEX = 19; // ties with "Day 4 Capstone" (19); created_at ASC tiebreak sorts these after it, before "Day 5 Capstone" (20)

const mc = (id, stem, options, correct, feedback, reference, points = 15) => ({
  id, stem,
  payload: { kind: 'multiple_choice', selectionMode: 'single', shuffle: true, options, correct },
  scoring: { points, mustPass: false },
  feedback: { ...feedback, reference },
});

const tf = (id, stem, correct, feedback, reference, points = 15) => ({
  id, stem,
  payload: { kind: 'true_false', correct },
  scoring: { points, mustPass: false },
  feedback: { ...feedback, reference },
});

const fb = (id, stem, accepted, feedback, reference, points = 15) => ({
  id, stem,
  payload: { kind: 'fill_blank', blanks: [{ accepted, caseSensitive: false }] },
  scoring: { points, mustPass: false },
  feedback: { ...feedback, reference },
});

/* ── Shared: the conspiracy as a whole ─────────────────────────────────── */
const sharedAssignment = {
  course_id: COURSE_ID,
  title: 'Day 5: Grand Jury Testimony Prep — The Conspiracy as a Whole',
  description: 'Before this afternoon’s capstone, confirm you can testify accurately about the case pattern that connects all four victims — without overstating what the evidence actually establishes.',
  max_score: 100,
  is_published: false,
  type: 'challenge',
  grading_mode: 'squad',
  order_index: ORDER_INDEX,
  drop_number: null,
  scenario_name: null,
  victim_name: null,
  location_code: null,
  role_filters: [],
  questions: [
    mc('conspiracy-1',
      'What common pattern connects all four victim intrusions (Redstone, Dogwood, CyberDyne, Pixel Play)?',
      [
        { id: 'a', text: 'Each involved a RestonIT-provisioned service/vendor account that went dormant after a legitimate project closed, then was used without authorization months later' },
        { id: 'b', text: 'Each involved a ransomware payload deployed directly by RestonIT staff' },
        { id: 'c', text: 'Each victim used the same password across all systems' },
        { id: 'd', text: 'Each intrusion was reported by the same employee' },
      ], ['a'],
      { correct: 'That dormant-account-reactivation pattern is the throughline Command Post has tracked since Drop 3 — it is what ties the four otherwise-unrelated victims together.',
        incorrect: 'The common thread across all four victims is the dormant RestonIT-provisioned account pattern, not a shared payload, password, or reporter.' },
      'Drop 3 Cross-Squad CP Bulletin, all four victims'),
    mc('conspiracy-2',
      'What do all four victim support tickets / closeout records share in common?',
      [
        { id: 'a', text: 'None of the four accounts were confirmed deactivated or re-validated after their approved project or engagement ended' },
        { id: 'b', text: 'All four were closed with a note confirming the account was safely disabled' },
        { id: 'c', text: 'All four tickets were filed by the same RestonIT technician' },
        { id: 'd', text: 'All four accounts were flagged as compromised at creation' },
      ], ['a'],
      { correct: 'Redstone and Pixel Play closed "access review pending," Dogwood’s disablement was never documented, and CyberDyne’s ownership review was deferred to a quarterly audit that never caught it — different wording, same underlying failure: no one confirmed the account was actually shut off.',
        incorrect: 'Look at what each closeout record does NOT say, not what it does say — none of the four confirm the account was actually deactivated or re-reviewed.' },
      'Drop 1/3 support tickets, all four victims'),
    tf('conspiracy-3',
      'RestonIT’s connection to all four accounts, by itself, establishes that RestonIT conducted the intrusions.',
      false,
      { correct: 'Correct. The Cross-Squad CP Bulletin explicitly warns against this leap for every victim — RestonIT’s tie is to the accounts’ support/provisioning history, not to hands-on-keyboard conduct.',
        incorrect: 'This is exactly the premature conclusion the Bulletin warns against for all four victims. Support-history nexus is not conduct evidence.' },
      'Drop 3 Cross-Squad CP Bulletin'),
    mc('conspiracy-4',
      'Command Post’s bulletins list a closed set of possible classifications for RestonIT’s role (e.g., negligent custodian, compromised MSP, poor account hygiene, intentional upstream source, requires further investigation). If asked on the stand whether RestonIT could be "a criminal enterprise formally organized for the purpose of selling access," what is the accurate answer?',
      [
        { id: 'a', text: 'That characterization is not one of the classifications the evidence currently supports, and testimony should not go beyond the classifications actually documented' },
        { id: 'b', text: 'Yes, that is the confirmed classification' },
        { id: 'c', text: 'It cannot be answered under any circumstances' },
        { id: 'd', text: 'RestonIT has already been indicted for this' },
      ], ['a'],
      { correct: 'Testimony should track exactly what Command Post has documented — inventing or agreeing to a classification that was never on the list is overstatement.',
        incorrect: 'Stick to the classifications actually in the record. A "criminal enterprise" framing was never one of the documented possibilities for any of the four victims.' },
      'Drop 3 Cross-Squad CP Bulletin, all four victims'),
    fb('conspiracy-5',
      'Fill in the blank: the criminal forum handle DEV-01/Drop 6 evidence ties to Alex Reston is __________.',
      ['BRKR_AL', 'BRKR AL', 'BRKRAL'],
      { correct: 'Correct — BRKR_AL is the Black Harbor Exchange handle tied to Reston through the residence saved-password evidence and forum-nexus artifacts.',
        incorrect: 'The handle is BRKR_AL, established through the Drop 6 residence return (saved-password reuse, forum-nexus notes).' },
      'Drop 6 — Alex Reston Residence'),
    mc('conspiracy-6',
      'Each victim’s downstream intrusion is being investigated by a different squad (e.g., Hometown Cyber Squad A/B, Regional Cyber, Financial Crimes) under a different case number. What is the correct way to testify about the relationship between those four investigations and the RestonIT/Reston case?',
      [
        { id: 'a', text: 'They are separate, currently unconfirmed identity questions; they matter to this case only insofar as they help explain how each victim’s credential reached its downstream user — they are not evidence of who Reston is or what he did' },
        { id: 'b', text: 'They are all the same person as Reston, operating under aliases' },
        { id: 'c', text: 'They are irrelevant and should not be mentioned at all' },
        { id: 'd', text: 'They confirm Reston’s guilt by association' },
      ], ['a'],
      { correct: 'Command Post guidance on every victim bulletin draws this exact line — the downstream-actor leads are relevant to explain the credential pipeline, not to prove who Reston is.',
        incorrect: 'Do not conflate the four downstream actor investigations with the upstream Reston/RestonIT question — they are separate, unconfirmed identities relevant only to the credential pipeline.' },
      'Drop 3 Cross-Squad CP Bulletin, Parallel Investigative Squad Updates'),
    mc('conspiracy-7',
      'Defense counsel asks: "Isn’t it true you have no direct evidence Mr. Reston personally executed any of the four intrusions?" What is the accurate response?',
      [
        { id: 'a', text: 'Agree — the evidence supports Reston as a likely upstream access source (broker), not as the hands-on-keyboard intruder in any of the four victim networks; that is a separate, unconfirmed question' },
        { id: 'b', text: 'Disagree — the evidence proves he personally executed all four intrusions' },
        { id: 'c', text: 'Refuse to answer the question' },
        { id: 'd', text: 'Say the question is irrelevant to the case' },
      ], ['a'],
      { correct: 'Conceding a true, narrow statement — that direct hands-on-keyboard evidence is a separate, unresolved question from the broker theory — is what calibrated testimony sounds like. It does not undermine the broker case.',
        incorrect: 'A witness who overclaims here loses credibility. The accurate answer concedes the narrow, true point without abandoning the broker theory the evidence does support.' },
      'Testimony discipline — calibrated confidence'),
    mc('conspiracy-8',
      'What is the correct order for structuring an attribution judgment when testifying (e.g., "Was Alex Reston operating as BRKR_AL?")?',
      [
        { id: 'a', text: 'State the conclusion first, then the supporting evidence, then your confidence level, then the limitations/gaps' },
        { id: 'b', text: 'List every piece of evidence first, then let the panel or jury draw their own conclusion' },
        { id: 'c', text: 'State your confidence level only — evidence and conclusions are for the attorneys to summarize' },
        { id: 'd', text: 'Start with the limitations and gaps, so as not to overstate the case' },
      ], ['a'],
      { correct: 'Conclusion → evidence → confidence → limitations is the structure that keeps testimony clear and defensible under cross-examination.',
        incorrect: 'The expected structure leads with the conclusion, follows with the specific supporting evidence, then states confidence level, then limitations — not the reverse.' },
      'Day 5 testimony prep guidance'),
  ],
};

/* ── Victim-specific sets ───────────────────────────────────────────────── */
function victimAssignment({ victimName, title, questions }) {
  return {
    course_id: COURSE_ID,
    title,
    description: `Before this afternoon’s capstone, confirm you can testify accurately and only about ${victimName} — the victim your squad actually investigated.`,
    max_score: 100,
    is_published: false,
    type: 'challenge',
    grading_mode: 'squad',
    order_index: ORDER_INDEX,
    drop_number: null,
    scenario_name: null,
    victim_name: victimName,
    location_code: null,
    role_filters: [],
    questions,
  };
}

const redstoneAssignment = victimAssignment({
  victimName: 'Redstone Memorial Hospital',
  title: 'Day 5: Testimony Prep — Redstone Memorial Hospital',
  questions: [
    fb('redstone-1', 'Fill in the blank: the compromised account used in the Redstone Memorial Hospital intrusion was __________.',
      ['fac-vendor-svc17', 'rmh\\fac-vendor-svc17', 'fac vendor svc17'],
      { correct: 'Correct — fac-vendor-svc17.', incorrect: 'The account is fac-vendor-svc17.' }, 'Redstone Memorial — Account Creation Record'),
    mc('redstone-2', 'If asked what system was affected, what is the accurate answer?',
      [
        { id: 'a', text: 'RMH-FAC-SUP01 — a non-clinical vendor/facilities support server' },
        { id: 'b', text: 'The hospital’s EMR system' },
        { id: 'c', text: 'The hospital’s payment processing system' },
        { id: 'd', text: 'All hospital systems, scope undetermined' },
      ], ['a'],
      { correct: 'RMH-FAC-SUP01, and only that server — clinical, EMR, and payment systems are explicitly not shown to be affected.',
        incorrect: 'The affected system is specifically RMH-FAC-SUP01, a non-clinical vendor support server — not EMR or payment systems.' },
      'Redstone Memorial — Initial Victim Analysis'),
    mc('redstone-3', 'What project and organization was fac-vendor-svc17 originally created for?',
      [
        { id: 'a', text: 'The Facilities Support Project, with RestonIT LLC listed as the requesting/support organization, approved by Karen Holt (RMH Facilities Operations)' },
        { id: 'b', text: 'A clinical systems upgrade approved by hospital IT security' },
        { id: 'c', text: 'An anonymous request with no department of record' },
        { id: 'd', text: 'A billing system integration approved by the finance department' },
      ], ['a'],
      { correct: 'The account creation record ties this to the Facilities Support Project, RestonIT LLC, and approver Karen Holt.',
        incorrect: 'Review the account creation record — Facilities Support Project, RestonIT LLC, approved by Karen Holt.' },
      'Redstone Memorial — Account Creation Record'),
    mc('redstone-4', 'What is the accurate account of the dormancy gap for fac-vendor-svc17?',
      [
        { id: 'a', text: 'No approved use is identified between the January 21, 2026 closeout validation and the unauthorized login on April 7, 2026 — roughly 2.5 months' },
        { id: 'b', text: 'The account was used continuously and legitimately through the incident date' },
        { id: 'c', text: 'The account was created the same day as the incident' },
        { id: 'd', text: 'There is no dormancy gap in this case' },
      ], ['a'],
      { correct: 'The gap runs from the Jan 21 closeout validation to the Apr 7 unauthorized login.',
        incorrect: 'Check the dates in the prior login history — closeout validation Jan 21, unauthorized login Apr 7, roughly a 2.5-month gap.' },
      'Redstone Memorial — Prior Login History'),
    tf('redstone-5', 'The evidence currently confirms PHI (protected health information) was exfiltrated from Redstone Memorial Hospital.',
      false,
      { correct: 'Correct — outbound communication creates suspicion, not confirmation. Overstating this on the stand would be a factual error.',
        incorrect: 'This has not been confirmed. Do not testify that PHI exfiltration is established — only that suspicious outbound activity occurred.' },
      'Redstone Memorial — Initial Victim Analysis'),
    mc('redstone-6', 'What did the support ticket’s "access review pending" closure status establish?',
      [
        { id: 'a', text: 'The review that should have re-validated or disabled the account after project closeout was never confirmed complete' },
        { id: 'b', text: 'The account was confirmed disabled immediately at project closeout' },
        { id: 'c', text: 'RMH declined RestonIT’s access request entirely' },
        { id: 'd', text: 'The ticket was never actually closed' },
      ], ['a'],
      { correct: 'The ticket closed with the review still pending — that unresolved review is directly why the account remained exploitable.',
        incorrect: 'The ticket explicitly closed "access review pending" — the promised review never happened.' },
      'Redstone Memorial — Support Ticket'),
  ],
});

const dogwoodAssignment = victimAssignment({
  victimName: 'Dogwood Hotel & Resort',
  title: 'Day 5: Testimony Prep — Dogwood Hotel & Resort',
  questions: [
    fb('dogwood-1', 'Fill in the blank: the compromised account used in the Dogwood Hotel & Resort intrusion was __________.',
      ['netops_guest_admin3', 'netops guest admin3'],
      { correct: 'Correct — netops_guest_admin3.', incorrect: 'The account is netops_guest_admin3.' }, 'Dogwood Hotel — Account Creation Record'),
    mc('dogwood-2', 'If asked what system was affected, what is the accurate answer?',
      [
        { id: 'a', text: 'DW-WIFI-MGMT01 — the guest Wi-Fi management portal' },
        { id: 'b', text: 'The hotel reservation system' },
        { id: 'c', text: 'The guest payment gateway' },
        { id: 'd', text: 'The door access control system' },
      ], ['a'],
      { correct: 'DW-WIFI-MGMT01 only — reservations, payment gateway, door access, and camera/NVR systems are not shown to be affected.',
        incorrect: 'The affected system is DW-WIFI-MGMT01, the guest Wi-Fi management portal — not reservations, payment, or door access.' },
      'Dogwood Hotel — Initial Victim Analysis'),
    mc('dogwood-3', 'What did the account’s closeout record establish?',
      [
        { id: 'a', text: 'Follow-up testing was completed, but account disablement was never documented' },
        { id: 'b', text: 'The account was confirmed disabled the same day testing completed' },
        { id: 'c', text: 'The account was deleted entirely at project close' },
        { id: 'd', text: 'No testing was ever performed' },
      ], ['a'],
      { correct: 'Testing wrapped up Feb 7, 2026 — but nothing in the record shows the account was actually disabled afterward.',
        incorrect: 'The change record shows completed testing but no documented disablement — that gap is the point.' },
      'Dogwood Hotel — Change Record'),
    mc('dogwood-4', 'What is the accurate account of the dormancy gap and unauthorized activity date?',
      [
        { id: 'a', text: 'Approved use ran Feb 3–7, 2026; the unauthorized login occurred April 8, 2026 — roughly a 2-month gap' },
        { id: 'b', text: 'The account was used continuously through April' },
        { id: 'c', text: 'The unauthorized login occurred the same week the account was created' },
        { id: 'd', text: 'There is no confirmed date for the unauthorized login' },
      ], ['a'],
      { correct: 'Feb 3–7 approved use, April 8 unauthorized login — about two months dormant.',
        incorrect: 'Check the prior login history — approved use Feb 3–7, unauthorized login April 8, roughly a 2-month gap.' },
      'Dogwood Hotel — Prior Login History'),
    tf('dogwood-5', 'The evidence currently confirms guest payment or reservation data was stolen from Dogwood.',
      false,
      { correct: 'Correct — only a guest device inventory export is confirmed. Payment and reservation systems are not shown to be affected.',
        incorrect: 'Do not testify that payment or reservation data was stolen — only a device inventory export is confirmed.' },
      'Dogwood Hotel — Initial Victim Analysis'),
    mc('dogwood-6', 'What distinguishes Dogwood’s post-login activity from a purely remote/digital intrusion?',
      [
        { id: 'a', text: 'The actor viewed second-floor network closet notes — a detail suggesting reconnaissance relevant to physical access, not just remote activity' },
        { id: 'b', text: 'The actor physically broke into the hotel' },
        { id: 'c', text: 'The actor called hotel staff directly' },
        { id: 'd', text: 'Nothing distinguishes it — activity was purely remote with no physical dimension' },
      ], ['a'],
      { correct: 'The network closet notes access is the one Dogwood-specific detail that opens a physical-reconnaissance angle — worth a building access log request, not worth overclaiming as a confirmed physical intrusion.',
        incorrect: 'The distinguishing detail is the second-floor network closet notes access — a possible physical-reconnaissance indicator, not confirmed physical intrusion.' },
      'Dogwood Hotel — Initial Victim Analysis'),
  ],
});

const cyberdyneAssignment = victimAssignment({
  victimName: 'CyberDyne Data Center',
  title: 'Day 5: Testimony Prep — CyberDyne Data Center',
  questions: [
    fb('cyberdyne-1', 'Fill in the blank: the compromised account used in the CyberDyne Data Center intrusion was __________.',
      ['custsync_api02', 'custsync api02'],
      { correct: 'Correct — custsync_api02.', incorrect: 'The account is custsync_api02.' }, 'CyberDyne Data Center — Account Creation Record'),
    mc('cyberdyne-2', 'What made the unauthorized login on this account especially notable?',
      [
        { id: 'a', text: 'custsync_api02 was an integration account not expected to be used interactively at all — so any interactive login is itself anomalous' },
        { id: 'b', text: 'It was the first time the account had ever logged in' },
        { id: 'c', text: 'It used multi-factor authentication correctly' },
        { id: 'd', text: 'Nothing was notable about it' },
      ], ['a'],
      { correct: 'The creation record marks this account "Interactive Login Expected: No" — an interactive session on it is inherently suspicious.',
        incorrect: 'This account was provisioned for non-interactive integration use — an interactive login on it is itself an anomaly.' },
      'CyberDyne Data Center — Account Creation Record'),
    mc('cyberdyne-3', 'If asked what system was affected, what is the accurate answer?',
      [
        { id: 'a', text: 'CYD-SUPPORT-PORTAL — the customer support portal; no evidence of access to the hypervisor cluster, power/cooling controls, or hosted customer production servers' },
        { id: 'b', text: 'CYD-HYPERVISOR01, the hypervisor management cluster' },
        { id: 'c', text: 'CYD-PWR-CTRL01, the power management controller' },
        { id: 'd', text: 'All data center systems, unknown scope' },
      ], ['a'],
      { correct: 'Only CYD-SUPPORT-PORTAL is shown affected — power, cooling, hypervisor, and hosted customer systems are explicitly out of scope.',
        incorrect: 'The affected system is CYD-SUPPORT-PORTAL specifically — not power, cooling, hypervisor, or hosted customer infrastructure.' },
      'CyberDyne Data Center — Initial Victim Analysis'),
    mc('cyberdyne-4', 'What is the accurate account of the dormancy gap for this account, and how does it compare to the other three victims?',
      [
        { id: 'a', text: 'Final validation was December 16, 2025; the unauthorized login was April 9, 2026 — roughly 4 months, the longest dormancy gap of the four victims' },
        { id: 'b', text: 'The gap was under a week, the shortest of the four' },
        { id: 'c', text: 'There was no dormancy — the account was used continuously' },
        { id: 'd', text: 'The gap cannot be determined from the evidence' },
      ], ['a'],
      { correct: 'Dec 16, 2025 to Apr 9, 2026 — about 4 months, longer than Redstone (~2.5 mo), Dogwood (~2 mo), or Pixel Play (~2.5 mo).',
        incorrect: 'CyberDyne’s dormancy gap runs Dec 16, 2025 to Apr 9, 2026 — roughly 4 months, the longest among the four victims.' },
      'CyberDyne Data Center — Prior Account Activity'),
    tf('cyberdyne-5', 'The evidence currently confirms cardholder or payment data was exported from CyberDyne.',
      false,
      { correct: 'Correct — only "limited customer metadata" export is confirmed (hsv_customer_summary.csv), not cardholder or payment data.',
        incorrect: 'Do not testify to cardholder or payment data exposure — only a limited customer metadata export is confirmed.' },
      'CyberDyne Data Center — Initial Victim Analysis'),
    mc('cyberdyne-6', 'What geographic detail is unique to the CyberDyne intrusion, and why does it matter to testify carefully about it?',
      [
        { id: 'a', text: 'The actor queried and exported records tied to Huntsville-area customers specifically — worth noting as a targeting/selection detail, without overclaiming it proves a broader geographic campaign' },
        { id: 'b', text: 'The actor was physically located in Huntsville' },
        { id: 'c', text: 'CyberDyne itself is located in a different state than its customers' },
        { id: 'd', text: 'There is no geographic detail in this case' },
      ], ['a'],
      { correct: 'The Huntsville-area customer targeting is a real, specific detail worth testifying to — but it shows target selection, not the actor’s own location or a confirmed broader campaign.',
        incorrect: 'The Huntsville-area customer query/export (hsv_customer_summary.csv) is the unique detail — it indicates target selection, not the actor’s physical location.' },
      'CyberDyne Data Center — Initial Victim Analysis'),
  ],
});

const pixelPlayAssignment = victimAssignment({
  victimName: 'Pixel Play Arcade',
  title: 'Day 5: Testimony Prep — Pixel Play Arcade',
  questions: [
    fb('pixelplay-1', 'Fill in the blank: the compromised account used in the Pixel Play Arcade intrusion was __________.',
      ['pos-maint08', 'pos maint08'],
      { correct: 'Correct — pos-maint08.', incorrect: 'The account is pos-maint08.' }, 'Pixel Play Arcade — Account Creation Record'),
    mc('pixelplay-2', 'If asked what system was affected, what is the accurate answer?',
      [
        { id: 'a', text: 'PX-BO-POS01 — the POS back-office workstation; no confirmed access to payment terminals, card/token issuance, or the cardholder data environment' },
        { id: 'b', text: 'The POS payment terminals directly' },
        { id: 'c', text: 'The full cardholder data environment' },
        { id: 'd', text: 'The arcade’s customer loyalty database' },
      ], ['a'],
      { correct: 'PX-BO-POS01 only. A cardholder-data query was attempted but failed on permissions — it was not completed.',
        incorrect: 'The affected system is PX-BO-POS01, the POS back-office workstation — payment terminals and cardholder data were not confirmed accessed.' },
      'Pixel Play Arcade — Initial Victim Analysis'),
    mc('pixelplay-3', 'What is the accurate account of the dormancy gap and closure status?',
      [
        { id: 'a', text: 'Vendor validation completed January 31, 2026; the unauthorized login occurred April 10, 2026 (~2.5 months); the support ticket closed "access review pending"' },
        { id: 'b', text: 'The account was actively used by RocketPay Systems through April 2026' },
        { id: 'c', text: 'The ticket confirmed the account was disabled at closeout' },
        { id: 'd', text: 'There is no dormancy gap in this case' },
      ], ['a'],
      { correct: 'Jan 31 validation to Apr 10 unauthorized login (~2.5 months), ticket closed "access review pending" — the same closure-status pattern seen at Redstone.',
        incorrect: 'Vendor validation Jan 31, unauthorized login Apr 10, ticket closed "access review pending" — review never confirmed complete.' },
      'Pixel Play Arcade — Support Ticket / Prior Login History'),
    mc('pixelplay-4', 'RocketPay Systems, Pixel Play’s POS vendor, issued a statement about the incident window. What did it say, and why does it matter?',
      [
        { id: 'a', text: 'RocketPay denies performing any approved maintenance during the incident window — ruling out legitimate vendor activity as an explanation for the login' },
        { id: 'b', text: 'RocketPay confirmed it authorized the login' },
        { id: 'c', text: 'RocketPay refused to comment' },
        { id: 'd', text: 'RocketPay is not mentioned in the evidence' },
      ], ['a'],
      { correct: 'RocketPay’s denial is what rules out "this was just routine vendor maintenance" as an innocent explanation.',
        incorrect: 'RocketPay Systems denied performing approved maintenance during the incident window — this rules out the innocent-vendor-activity explanation.' },
      'Pixel Play Arcade — Parallel Investigative Squad Update'),
    tf('pixelplay-5', 'The evidence currently confirms cardholder data was accessed during the Pixel Play intrusion.',
      false,
      { correct: 'Correct — the settlement batch metadata query failed due to insufficient permissions. This was an attempted, not completed, collection.',
        incorrect: 'This is not confirmed — the settlement batch query attempt failed on permissions. Do not testify that cardholder data was accessed.' },
      'Pixel Play Arcade — Initial Victim Analysis'),
    tf('pixelplay-6', 'The downstream actor’s activity at Pixel Play has been confirmed as organized crime.',
      false,
      { correct: 'Correct — the Parallel Investigative Squad Update describes the activity as "appears financially motivated," which is not the same as confirmed organized crime.',
        incorrect: 'The evidence only supports "appears financially motivated" — organized crime is not confirmed and should not be stated as fact.' },
      'Pixel Play Arcade — Parallel Investigative Squad Update'),
  ],
});

/* ── Location-specific sets ─────────────────────────────────────────────── */
function locationAssignment({ locationCode, locationLabel, title, questions }) {
  return {
    course_id: COURSE_ID,
    title,
    description: `Before this afternoon’s capstone, confirm you can testify accurately and only about the ${locationLabel} search — the location you personally worked during Drop 6.`,
    max_score: 100,
    is_published: false,
    type: 'challenge',
    grading_mode: 'squad',
    order_index: ORDER_INDEX,
    drop_number: null,
    scenario_name: null,
    victim_name: null,
    location_code: locationCode,
    role_filters: [],
    questions,
  };
}

const officeLocationAssignment = locationAssignment({
  locationCode: 'restonit_office',
  locationLabel: 'RestonIT Office — Suite 214',
  title: 'Day 5: Testimony Prep — RestonIT Office Search',
  questions: [
    mc('office-tp-1', 'On cross-examination you are asked what the office search establishes. What is the accurate answer?',
      [
        { id: 'a', text: 'RestonIT’s credential custody, exported access records, and legitimate business relationships with all four victims — not persona-level attribution' },
        { id: 'b', text: 'Conclusive proof Alex Reston personally sold access on Black Harbor Exchange' },
        { id: 'c', text: 'Alex Reston’s cryptocurrency proceeds and travel plans' },
        { id: 'd', text: 'Nothing useful was found at the office' },
      ], ['a'],
      { correct: 'The office return establishes business custody and legitimate access, not persona-level attribution — that requires the residence return, which you did not personally search.',
        incorrect: 'Testify only to what the office search shows: business custody and credential records, not persona attribution.' },
      'RestonIT Office — Access tools / Client Files'),
    mc('office-tp-2', 'What pattern did the office access-matrix and RMM records show for the four victim accounts?',
      [
        { id: 'a', text: 'Each was created for a project, never deprovisioned after the project closed, and showed an off-cadence reconnection with no open ticket' },
        { id: 'b', text: 'Each was created and deleted the same day' },
        { id: 'c', text: 'Each was openly shared with every RestonIT staff member' },
        { id: 'd', text: 'Each required client sign-off before every login' },
      ], ['a'],
      { correct: 'client_access_matrix.csv and rmm_connection_profiles.csv both show the dormant-then-reconnected pattern across all four accounts.',
        incorrect: 'The access matrix and RMM logs show the accounts going dormant after project close, then reconnecting outside normal support activity.' },
      'RestonIT Office — Access tools/client_access_matrix.csv, rmm_connection_profiles.csv'),
    mc('office-tp-3', 'Defense counsel suggests Sam Smith should be a suspect because he worked at RestonIT. What is the accurate response, based on what you found at the office?',
      [
        { id: 'a', text: 'Sam’s workstation and shared-drive access log are clean — his own records show zero access to the restricted account-tracking share, consistent with ordinary shift-covering, not complicity' },
        { id: 'b', text: 'Sam Smith should be considered an equally strong suspect as Alex Reston' },
        { id: 'c', text: 'Sam Smith does not appear anywhere in the evidence' },
        { id: 'd', text: 'Sam Smith’s records were never reviewed' },
      ], ['a'],
      { correct: 'The Sam Smith desk evidence is exculpatory — this is the correct, evidence-based answer to that defense suggestion.',
        incorrect: 'Sam Smith’s workstation and access logs are clean — this evidence is exculpatory, not merely neutral.' },
      'RestonIT Office — Sam Smith Desk'),
    mc('office-tp-4', 'You are asked whether badge-access records prove Alex Reston committed the intrusions from the office. What is the accurate answer?',
      [
        { id: 'a', text: 'Badge access corroborates his presence at Suite 214 during unusual after-hours periods, but presence is not the same as proof of conduct' },
        { id: 'b', text: 'Yes — badge access is conclusive proof of what he did while inside' },
        { id: 'c', text: 'Badge records do not exist for this case' },
        { id: 'd', text: 'Badge access proves he was never at the office' },
      ], ['a'],
      { correct: 'This is the presence-versus-conduct distinction — badge access corroborates opportunity, not what actually happened during those windows.',
        incorrect: 'Badge access is presence/opportunity evidence, not conduct evidence — do not overstate what it proves.' },
      'RestonIT Office — property manager correspondence'),
    fb('office-tp-5', 'Fill in the blank: the sender alias on the phishing email that delivered the STEM-LAP-014 intrusion, also used as a fallback cover story in the office-side draft ops rules, is __________.',
      ['M. Vale', 'M Vale', 'MVale'],
      { correct: 'Correct — "M. Vale" appears in both the phishing email and the ops-rules cover-story language.',
        incorrect: 'The alias is "M. Vale," appearing in both the phishing email and the office ops-rules document.' },
      'RestonIT Office — Email/Q2 STEM sponsorship, Documents/usb_ops_reston_drop_rules.md'),
  ],
});

const residenceLocationAssignment = locationAssignment({
  locationCode: 'reston_residence',
  locationLabel: "Alex Reston's Residence",
  title: 'Day 5: Testimony Prep — Alex Reston Residence Search',
  questions: [
    mc('residence-tp-1', 'What specific artifact from the residence links Alex Reston’s personal accounts to the BRKR_AL Black Harbor Exchange login?',
      [
        { id: 'a', text: 'A saved-passwords export showing the BRKR_AL forum login sharing the same password hash as his RestonIT webmail and N-able logins' },
        { id: 'b', text: 'A signed confession found in his desk' },
        { id: 'c', text: 'A subpoena return directly from the forum operator naming Alex' },
        { id: 'd', text: 'Sam Smith’s witness statement' },
      ], ['a'],
      { correct: 'This is the residence-side password-reuse evidence — the strongest single technical link you can testify to from your own search.',
        incorrect: 'The home office saved-passwords export is the artifact — it shows password reuse across his personal and forum logins.' },
      'Alex Reston Residence — RIT-RES-09 Home Office Desktop/saved_passwords_export.csv'),
    tf('residence-tp-2', 'The RV Workshop area and the home office area of the residence reflect different levels of operational security by the same actor, not two different people.',
      true,
      { correct: 'Correct — the RV Workshop’s isolated hotspot and offline notes are more disciplined than the home office’s careless password reuse, but both are internally consistent with one actor at different discipline levels.',
        incorrect: 'This is true — the discipline gap between the two areas of the residence points to one actor, not two.' },
      'Alex Reston Residence — RV Workshop / Home Office'),
    mc('residence-tp-3', 'What is significant about the two Coinquest Exchange cashouts you found in the residence financial records?',
      [
        { id: 'a', text: 'Both amounts fall just under the $10,000 currency transaction reporting threshold' },
        { id: 'b', text: 'Both amounts exceed $50,000' },
        { id: 'c', text: 'They were deposited into a business account, not a personal one' },
        { id: 'd', text: 'They were immediately withdrawn as cash the same day' },
      ], ['a'],
      { correct: 'The bank statement itself annotates both deposits as below the CTR threshold — a structuring indicator, not proof by itself.',
        incorrect: 'The two deposits ($9,400 and $9,650) fall just under the $10,000 CTR threshold — a structuring indicator, testify to it as exactly that, not as conclusive proof.' },
      'Alex Reston Residence — Documents/coinquest_export.csv, checking_account_statement_march2026.pdf'),
    mc('residence-tp-4', 'A copy of the office firewall log was found at the residence, showing only ordinary business-hours traffic with zero connections to any victim network. If asked whether this clears Alex Reston, what is the accurate answer?',
      [
        { id: 'a', text: 'No — a clean log for the business network is consistent with, not contrary to, the theory that the actor deliberately avoided that traceable network, given the RV Workshop’s isolated-hotspot pattern' },
        { id: 'b', text: 'Yes — a clean firewall log proves no illicit activity occurred anywhere' },
        { id: 'c', text: 'The firewall log was destroyed, so nothing can be said' },
        { id: 'd', text: 'RestonIT never had access to any of the four victims' },
      ], ['a'],
      { correct: 'This is the same principle as the deliberate-tradecraft pattern — a clean log on one network does not clear a suspect who appears to have deliberately avoided that network.',
        incorrect: 'Do not testify that a clean log clears the suspect — it is consistent with deliberate avoidance of a traceable network, not exoneration.' },
      'Alex Reston Residence — Home Office/office_firewall_log.txt'),
    mc('residence-tp-5', 'If asked on the stand whether the residence evidence alone conclusively identifies Alex Reston as BRKR_AL beyond any doubt, what is the correct, defensible answer?',
      [
        { id: 'a', text: 'The residence evidence creates a strong, multi-source nexus (password reuse, a recovered deleted note, the dedicated hotspot, matching draft ops rules) but testimony should use calibrated confidence language and note what remains unproven' },
        { id: 'b', text: 'One saved password alone is proof beyond a reasonable doubt' },
        { id: 'c', text: 'None of the residence evidence is admissible or useful' },
        { id: 'd', text: 'The case should be treated as closed with no further corroboration needed' },
      ], ['a'],
      { correct: 'Multiple independent residence artifacts converging is strong circumstantial corroboration — testify to that strength using calibrated language, not absolute certainty.',
        incorrect: 'Weigh the residence evidence as a whole rather than any single artifact, and avoid both overclaiming and dismissing it.' },
      'Drop 6 packet, Alex Reston Residence'),
  ],
});

const ALL_ASSIGNMENTS = [
  sharedAssignment,
  redstoneAssignment, dogwoodAssignment, cyberdyneAssignment, pixelPlayAssignment,
  officeLocationAssignment, residenceLocationAssignment,
];

async function main() {
  const titles = ALL_ASSIGNMENTS.map((a) => a.title);
  await Assignment.destroy({ where: { course_id: COURSE_ID, title: titles } });
  const created = await Promise.all(ALL_ASSIGNMENTS.map((data) => Assignment.create(data)));
  for (const a of created) {
    console.log(a.id, '|', a.title, '| victim:', a.victim_name ?? '-', '| location:', a.location_code ?? '-');
  }
  console.log(`\nSeeded ${created.length} Day 5 testimony-prep assignments (all is_published: false).`);
  console.log('Release: use assignmentService.unlockForCohort() for the shared + 2 location assignments (cohort-wide, no squadId),');
  console.log('and assignmentService.releaseVictimScopedAssignments([...4 victim assignment ids], cohortId, unlockerId) for the 4 victim-specific ones.');
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { main, ALL_ASSIGNMENTS };
