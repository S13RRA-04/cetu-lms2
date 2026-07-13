'use strict';
/**
 * Seed PACKET HEIST — Drop 1 challenge assignments for the three victims that
 * were missing them: Dogwood Hotel & Resort (Squad 2), CyberDyne Data Center
 * (Squad 3), Pixel Play Arcade (Squad 4). Mirrors seed-packet-heist-drop1.js
 * (which covers Redstone Memorial Hospital / Squad 1) exactly — same question
 * shape, same scoring, same two-assignment structure — with each victim's
 * content grounded in its own evidence packet under
 * scenarios/PACKET HEIST/Drop 1/<Victim>/ in R2 (Student Analysis Questions.md
 * and Student-Facing Tasking.md).
 *
 * Run: node backend/scripts/seed-packet-heist-drop1-other-victims.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect:        'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging:        false,
});

/* ─────────────────────────────────────────────────────────────────────────────
   Dogwood Hotel & Resort — Initial Victim Analysis (quiz)
───────────────────────────────────────────────────────────────────────────── */
const dogwoodQuestions = [
  {
    id: uuidv4(),
    stem: 'What specific activity caused Dogwood Hotel to report the incident?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'A guest reported their credit card was stolen' },
        { id: 'b', text: 'Discovery of an unauthorized admin token in the guest Wi-Fi management portal, along with after-hours login, device inventory export, and tenant network notes access' },
        { id: 'c', text: 'The hotel reservation system went offline' },
        { id: 'd', text: 'Security cameras in the second-floor closet stopped recording' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The report was triggered by discovery of an unauthorized admin token in the guest Wi-Fi management portal, along with after-hours login, device inventory export, and network notes access — not a payment, reservation, or physical-security event.',
      incorrect: 'Review the initial victim production. The trigger was portal-level activity — an unauthorized admin token plus after-hours access — not payment, reservation, or camera systems.',
      reference: 'Dogwood Hotel — Student Analysis Questions Q1',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which of the following elements support a finding of unauthorized administrative activity? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'Login by netops_guest_admin3 outside any approved maintenance window' },
        { id: 'b', text: 'Export of guest device inventory' },
        { id: 'c', text: 'Creation of backup-netops-token' },
        { id: 'd', text: 'Dogwood IT statement that no employee or approved vendor authorized the activity' },
        { id: 'e', text: 'The guest Wi-Fi portal was running outdated firmware' },
      ],
      correct: ['a', 'b', 'c', 'd'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The login outside a maintenance window, the device inventory export, the new admin token, and the victim’s own statement all support unauthorized activity.',
      incorrect: 'Focus on what the evidence directly shows. Firmware age is not part of the initial production and does not by itself establish unauthorized access.',
      reference: 'Dogwood Hotel — Student Analysis Questions Q2',
    },
  },
  {
    id: uuidv4(),
    stem: 'What account was used during the unauthorized activity?',
    payload: { kind: 'fill_blank', blanks: [{ accepted: ['netops_guest_admin3'], caseSensitive: false }] },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — netops_guest_admin3 was the account used during the unauthorized session.',
      incorrect: 'The account identified in the victim production is netops_guest_admin3.',
      reference: 'Dogwood Hotel — Student Analysis Questions Q3',
    },
  },
  {
    id: uuidv4(),
    stem: 'The use of account netops_guest_admin3 is sufficient to identify the threat actor.',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — the account identifies what was used, not who used it. Determining actor identity requires account ownership records and further evidence.',
      incorrect: 'Account identity ≠ actor identity. The account may have been compromised, shared, or obtained without the owner’s knowledge.',
      reference: 'Dogwood Hotel — Student Analysis Questions Q4',
    },
  },
  {
    id: uuidv4(),
    stem: 'What was the affected system in the initial victim production?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'DW-RESV-PROD01 — the hotel reservation system' },
        { id: 'b', text: 'DW-WIFI-MGMT01 — the guest Wi-Fi management portal' },
        { id: 'c', text: 'DW-PAY-GATEWAY — the guest payment gateway' },
        { id: 'd', text: 'DW-DOORACCESS01 — the door access control system' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'DW-WIFI-MGMT01, the guest Wi-Fi management portal, is the affected system.',
      incorrect: 'The victim production specifically identifies the guest Wi-Fi management portal (DW-WIFI-MGMT01) — not reservation, payment, or door-access systems.',
      reference: 'Dogwood Hotel — Student Analysis Questions Q5',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which systems were NOT shown to be affected in the initial victim production? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'Hotel reservation system' },
        { id: 'b', text: 'Guest payment system' },
        { id: 'c', text: 'Door access system' },
        { id: 'd', text: 'Security camera / NVR system' },
        { id: 'e', text: 'Guest Wi-Fi management portal' },
      ],
      correct: ['a', 'b', 'c', 'd'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'No evidence of impact was shown for the reservation, payment, door-access, or camera/NVR systems. Scope is limited to the guest Wi-Fi management portal.',
      incorrect: 'Distinguish what the evidence shows vs. does not show. Only the guest Wi-Fi portal was identified as affected.',
      reference: 'Dogwood Hotel — Student Analysis Questions Q6',
    },
  },
  {
    id: uuidv4(),
    stem: 'Match each observed post-login action to its investigative category.',
    payload: {
      kind: 'drag_match',
      sources: [
        { id: 'export', text: 'Exported guest device inventory' },
        { id: 'vlan',   text: 'Viewed tenant VLAN notes' },
        { id: 'closet', text: 'Accessed second-floor network closet notes' },
        { id: 'token',  text: 'Created backup-netops-token' },
      ],
      targets: [
        { id: 'collect', text: 'Collection' },
        { id: 'disc',    text: 'Discovery / Reconnaissance' },
        { id: 'pers',    text: 'Persistence Mechanism' },
      ],
      matches: [
        { sourceId: 'export', targetId: 'collect' },
        { sourceId: 'vlan',   targetId: 'disc' },
        { sourceId: 'closet', targetId: 'disc' },
        { sourceId: 'token',  targetId: 'pers' },
      ],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — each observed action maps to a distinct phase: device inventory export is collection, VLAN/closet notes access is reconnaissance, and the new admin token is a persistence mechanism.',
      incorrect: 'Review the categories. Viewing network notes is reconnaissance/discovery; creating a new admin token is persistence.',
      reference: 'Dogwood Hotel — Student-Facing Tasking',
    },
  },
  {
    id: uuidv4(),
    stem: 'The initial evidence packet confirms guest personal or payment data was stolen from Dogwood Hotel.',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — the packet shows export of network device inventory, but no confirmed theft of guest personal, reservation, or payment data.',
      incorrect: 'Avoid overstating the evidence. Device inventory export was confirmed; guest data theft was not.',
      reference: 'Dogwood Hotel — Student Analysis Questions Q10',
    },
  },
  {
    id: uuidv4(),
    stem: 'Why is access to the second-floor network closet notes significant?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'It proves the actor physically entered the hotel' },
        { id: 'b', text: 'It confirms guest payment data was accessed' },
        { id: 'c', text: 'It may indicate reconnaissance of tenant network infrastructure or preparation for later access, and creates a lead for building access logs' },
        { id: 'd', text: 'It was the action that triggered the victim’s initial incident report' },
      ],
      correct: ['c'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Access to the closet notes may indicate reconnaissance or preparation for further access, and points to building access logs as a follow-up lead.',
      incorrect: 'Avoid over-attribution. The closet notes access is significant for reconnaissance and lead generation — not as proof of physical entry or data access.',
      reference: 'Dogwood Hotel — Student Analysis Questions Q9',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which of the following records should the squad request to advance the investigation? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'Account creation records and ownership history for netops_guest_admin3' },
        { id: 'b', text: 'Prior login history and password reset history for the account' },
        { id: 'c', text: 'Building access logs for network closet 2B' },
        { id: 'd', text: 'Vendor support documentation and change tickets' },
        { id: 'e', text: 'Guest reservation and loyalty program records' },
      ],
      correct: ['a', 'b', 'c', 'd'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Account provenance, access history, building access logs, and vendor/change documentation are all appropriate. Reservation/loyalty records are out of scope given current evidence.',
      incorrect: 'Focus requests on what directly addresses investigative gaps around the account and the portal. Guest reservation data is not yet supported by scope.',
      reference: 'Dogwood Hotel — Student Analysis Questions Q11',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which is the most accurate scope statement for this incident based on the initial victim production?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Confirmed theft of guest payment data affecting hotel operations.' },
        { id: 'b', text: 'Confirmed unauthorized activity on the guest Wi-Fi management portal. No current evidence of reservation, payment, door-access, or camera-system compromise.' },
        { id: 'c', text: 'Suspected ransomware affecting hotel-wide IT systems.' },
        { id: 'd', text: 'Unauthorized access to all hotel systems; full scope unknown and cannot be assessed.' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'A proper scope statement confirms what is known and explicitly states what is not affected — here, activity is confirmed only on the guest Wi-Fi portal.',
      incorrect: 'Scope statements must be precise and evidence-bound. Don’t expand beyond the guest Wi-Fi portal without support.',
      reference: 'Dogwood Hotel — Student Analysis Questions Q11',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which conclusions should the squad AVOID reaching prematurely? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'That the owner of netops_guest_admin3 is the intruder' },
        { id: 'b', text: 'That hotel payment or reservation systems were accessed' },
        { id: 'c', text: 'That unauthorized activity occurred on the guest Wi-Fi portal' },
        { id: 'd', text: 'That a specific vendor or person is responsible without corroborating evidence' },
      ],
      correct: ['a', 'b', 'd'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Premature attribution and unsupported system-impact claims undermine investigative integrity. Unauthorized portal activity (option C) IS supportable from current evidence.',
      incorrect: 'Option C (unauthorized portal activity) is supportable from the evidence. The others are premature without additional records.',
      reference: 'Dogwood Hotel — Student Analysis Questions Q12',
    },
  },
];

const dogwoodDeliverables = [
  {
    kind: 'prompt', points: 20,
    text: 'Command Post Briefing Summary — Provide: (1) a 2-3 sentence incident summary, (2) confirmed affected systems, (3) systems confirmed NOT affected, and (4) the top outstanding unknowns your squad has identified.',
    rubric: {
      keyElements: [
        'Names DW-WIFI-MGMT01 (guest Wi-Fi management portal) as the affected system',
        'Describes unauthorized admin activity: after-hours login, device inventory export, admin token creation',
        'Explicitly states reservation, payment, door-access, and camera/NVR systems are NOT affected',
        'Lists ≥3 meaningful unknowns: actor identity, how credentials were obtained, purpose of the closet-notes access, whether data left the environment',
      ],
      commonErrors: ['Claiming guest payment or reservation data was exfiltrated without evidence', 'Implying hotel-wide compromise', 'Omitting the unknowns entirely'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Actor Timeline — Build a preliminary timeline of the actor’s activity on the guest Wi-Fi management portal. List each observed action in chronological order, and briefly note what each action suggests about actor intent.',
    rubric: {
      keyElements: [
        'Login by netops_guest_admin3 outside an approved maintenance window',
        'Device inventory export — collection',
        'Tenant VLAN notes and second-floor closet notes access — reconnaissance',
        'Creation of backup-netops-token — likely persistence',
        'Each action includes a brief statement of likely intent',
      ],
      commonErrors: ['Missing one or more of the four post-login actions', 'Asserting definitive intent without hedging', 'Reversing chronological order'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Investigative Gaps & Records Requests — List every gap identified from the Drop 1 packet. For each gap, specify the record you are requesting and what investigative question it will help answer.',
    rubric: {
      keyElements: [
        'Gap: Account provenance → Request: creation records and ownership history for netops_guest_admin3',
        'Gap: Credential compromise vector → Request: password reset and prior login history',
        'Gap: Physical reconnaissance → Request: building access logs for network closet 2B',
        'Gap: Authorized vendor activity → Request: vendor support documentation and change tickets',
        'Each gap paired with a clear investigative question, not just a record name',
      ],
      commonErrors: ['Listing records without tying them to a question', 'Requesting guest reservation/payment records without scope justification', 'Omitting the closet access-logs request'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Account Analysis — What is known and unknown about account netops_guest_admin3 based on current evidence? Does its use narrow or eliminate any hypotheses about actor identity? Explain your reasoning.',
    rubric: {
      keyElements: [
        'Known: netops_guest_admin3 was used for the unauthorized login and subsequent activity',
        'Known: naming convention suggests a network-operations/vendor-facing role',
        'Unknown: who created, owns, or currently controls the account',
        'Correctly states the account does NOT identify the actor',
        'Identifies what records would narrow attribution',
      ],
      commonErrors: ['Concluding the account creator is the intruder', 'Failing to distinguish account from actor', 'Not identifying records needed to advance the analysis'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Scope Determination — Write your squad’s formal scope statement for this incident. Address: (a) what is confirmed in scope, (b) what is confirmed out of scope, (c) what remains undetermined, and (d) whether any immediate escalation or notification steps are warranted at this stage and why.',
    rubric: {
      keyElements: [
        'In scope: unauthorized access to the guest Wi-Fi management portal; device inventory export; new admin token',
        'Out of scope: reservation, payment, door-access, camera/NVR systems',
        'Undetermined: actor identity, whether data left the environment, purpose of closet-notes access',
        'Escalation: no immediate public notification required absent confirmed guest data theft',
        'Formal, hedged language consistent with an FBI investigative scope statement',
      ],
      commonErrors: ['Including out-of-scope systems without evidentiary basis', 'Recommending notification without confirmed data theft', 'Casual/informal framing'],
    },
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   CyberDyne Data Center — Initial Victim Analysis (quiz)
───────────────────────────────────────────────────────────────────────────── */
const cyberdyneQuestions = [
  {
    id: uuidv4(),
    stem: 'What specific activity caused CyberDyne to report the incident?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'A hypervisor outage affecting hosted customer servers' },
        { id: 'b', text: 'The customer support portal alerted on interactive use of the legacy integration account custsync_api02 and unauthorized creation of an API key' },
        { id: 'c', text: 'A power failure in the data center' },
        { id: 'd', text: 'A customer reported unauthorized charges' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The report was triggered by portal alerting on interactive use of a legacy integration account and unauthorized API key creation — not infrastructure or billing events.',
      incorrect: 'Review the initial victim production. The trigger was customer support portal activity involving a legacy integration account, not power, hypervisor, or billing systems.',
      reference: 'CyberDyne — Student Analysis Questions Q1',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which of the following elements support a finding of unauthorized portal activity? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'Login by custsync_api02, a legacy integration account not expected to be used interactively' },
        { id: 'b', text: 'Creation of API key sync-maint-0426' },
        { id: 'c', text: 'Queries against Huntsville-area customer records' },
        { id: 'd', text: 'CyberDyne’s statement that no employee or approved integration maintenance authorized the activity' },
        { id: 'e', text: 'The support portal had recently been upgraded' },
      ],
      correct: ['a', 'b', 'c', 'd'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Interactive use of a legacy account, an unauthorized API key, targeted customer queries, and the victim’s own statement all support unauthorized activity.',
      incorrect: 'A recent portal upgrade is not part of the initial production and does not by itself establish unauthorized access.',
      reference: 'CyberDyne — Student Analysis Questions Q2',
    },
  },
  {
    id: uuidv4(),
    stem: 'What account was used during the unauthorized activity?',
    payload: { kind: 'fill_blank', blanks: [{ accepted: ['custsync_api02'], caseSensitive: false }] },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — custsync_api02 was the account used during the unauthorized session.',
      incorrect: 'The account identified in the victim production is custsync_api02.',
      reference: 'CyberDyne — Student Analysis Questions Q3',
    },
  },
  {
    id: uuidv4(),
    stem: 'The use of account custsync_api02 is sufficient to identify the threat actor.',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — the account identifies what was used, not who used it. Ownership, credential control, and access-method records are still needed.',
      incorrect: 'Account identity ≠ actor identity. Additional records are required to determine who controlled the credentials.',
      reference: 'CyberDyne — Student Analysis Questions Q4',
    },
  },
  {
    id: uuidv4(),
    stem: 'What was the affected system in the initial victim production?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'CYD-HYPERVISOR01 — the hypervisor management cluster' },
        { id: 'b', text: 'CYD-SUPPORT-PORTAL — the customer support portal' },
        { id: 'c', text: 'CYD-PWR-CTRL01 — the power management controller' },
        { id: 'd', text: 'CYD-CUST-HOST22 — a hosted customer production server' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'CYD-SUPPORT-PORTAL, the customer support portal, is the affected system — not hypervisor, power, or hosted customer infrastructure.',
      incorrect: 'The victim production specifically identifies the customer support portal as affected.',
      reference: 'CyberDyne — Student Analysis Questions Q5',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which systems were NOT shown to be affected in the initial victim production? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'Power and cooling systems' },
        { id: 'b', text: 'Routing controls and hypervisor management' },
        { id: 'c', text: 'Hosted customer servers / customer production environments' },
        { id: 'd', text: 'Customer support portal' },
      ],
      correct: ['a', 'b', 'c'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'No power, cooling, routing, hypervisor, or hosted-customer-server impact was shown. Scope is limited to the customer support portal.',
      incorrect: 'Distinguish what the evidence shows vs. does not show. Only the customer support portal was identified as affected.',
      reference: 'CyberDyne — Student Analysis Questions Q6',
    },
  },
  {
    id: uuidv4(),
    stem: 'Match each observed post-login action to its investigative category.',
    payload: {
      kind: 'drag_match',
      sources: [
        { id: 'key',    text: 'Created API key sync-maint-0426' },
        { id: 'query',  text: 'Queried Huntsville-area customers' },
        { id: 'view',   text: 'Viewed customer profiles' },
        { id: 'export', text: 'Exported limited customer metadata' },
      ],
      targets: [
        { id: 'pers',    text: 'Persistence / Access Enablement' },
        { id: 'disc',    text: 'Discovery / Target Selection' },
        { id: 'collect', text: 'Collection' },
        { id: 'stage',   text: 'Data Staging / Exfiltration Prep' },
      ],
      matches: [
        { sourceId: 'key',    targetId: 'pers' },
        { sourceId: 'query',  targetId: 'disc' },
        { sourceId: 'view',   targetId: 'collect' },
        { sourceId: 'export', targetId: 'stage' },
      ],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — the API key enables continued access (persistence), the targeted queries are discovery/target selection, profile viewing is collection, and metadata export is staging for exfiltration.',
      incorrect: 'Review the categories: creating an API key is persistence, not collection; targeted customer queries are discovery.',
      reference: 'CyberDyne — Student-Facing Tasking',
    },
  },
  {
    id: uuidv4(),
    stem: 'The initial evidence packet confirms CyberDyne’s data center operations (power, cooling, hypervisor, hosted customer servers) were compromised.',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — the initial packet shows no power, cooling, routing, hypervisor, or hosted-server impact.',
      incorrect: 'Avoid overstating the evidence. Only the customer support portal is confirmed affected.',
      reference: 'CyberDyne — Student Analysis Questions Q10',
    },
  },
  {
    id: uuidv4(),
    stem: 'Why is interactive use of custsync_api02 suspicious?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'It proves a specific CyberDyne employee is responsible' },
        { id: 'b', text: 'The account is a legacy integration account not expected to be used for interactive logins, suggesting misuse, compromise, or unauthorized access' },
        { id: 'c', text: 'It confirms customer data was sold' },
        { id: 'd', text: 'It was the action that triggered the power system alert' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'custsync_api02 is a legacy integration account not meant for interactive use — its interactive login suggests misuse, compromise, or unauthorized access.',
      incorrect: 'Avoid over-attribution. The account type/usage mismatch is what makes this suspicious, not proof of a specific employee or confirmed data sale.',
      reference: 'CyberDyne — Student Analysis Questions Q9',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which of the following records should the squad request to advance the investigation? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'Account creation records and ownership history for custsync_api02' },
        { id: 'b', text: 'API key usage logs and full portal audit logs' },
        { id: 'c', text: 'Source IP information and integration ownership records' },
        { id: 'd', text: 'Change tickets and service-provider documentation' },
        { id: 'e', text: 'Hosted customer servers’ production data' },
      ],
      correct: ['a', 'b', 'c', 'd'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Account provenance, API key/portal logs, source IP and integration ownership, and change documentation are all appropriate. Hosted customer production data is out of scope given current evidence.',
      incorrect: 'Focus requests on the account and portal. Hosted customer production data is not yet supported by scope.',
      reference: 'CyberDyne — Student Analysis Questions Q12',
    },
  },
  {
    id: uuidv4(),
    stem: 'What is the investigative significance of hsv_customer_summary.csv?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'It proves customer payment data was stolen' },
        { id: 'b', text: 'It contains limited Huntsville-area customer metadata and may indicate target selection, reconnaissance, or preparation for further activity against local organizations' },
        { id: 'c', text: 'It confirms the identity of the actor' },
        { id: 'd', text: 'It shows hypervisor configuration data was exported' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The exported file contains limited customer metadata targeted at Huntsville-area customers — suggesting reconnaissance or preparation for further activity, not confirmed payment data theft.',
      incorrect: 'Avoid overstating the evidence — the file is limited metadata, not payment data or hypervisor configuration, and does not identify the actor.',
      reference: 'CyberDyne — Student Analysis Questions Q11',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which conclusions should the squad AVOID reaching prematurely? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'That the owner of custsync_api02 is the intruder' },
        { id: 'b', text: 'That data center operations or hosted customer servers were compromised' },
        { id: 'c', text: 'That unauthorized activity occurred on the customer support portal' },
        { id: 'd', text: 'That a specific vendor or person is responsible without corroborating evidence' },
      ],
      correct: ['a', 'b', 'd'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Premature attribution and unsupported infrastructure-impact claims undermine investigative integrity. Unauthorized portal activity (option C) IS supportable from current evidence.',
      incorrect: 'Option C (unauthorized portal activity) is supportable from the evidence. The others are premature without additional records.',
      reference: 'CyberDyne — Student Analysis Questions Q13',
    },
  },
];

const cyberdyneDeliverables = [
  {
    kind: 'prompt', points: 20,
    text: 'Command Post Briefing Summary — Provide: (1) a 2-3 sentence incident summary, (2) confirmed affected systems, (3) systems confirmed NOT affected, and (4) the top outstanding unknowns your squad has identified.',
    rubric: {
      keyElements: [
        'Names CYD-SUPPORT-PORTAL as the affected system',
        'Describes interactive use of custsync_api02, API key creation, and customer metadata export',
        'Explicitly states power, cooling, routing, hypervisor, and hosted-customer-server systems are NOT affected',
        'Lists ≥3 meaningful unknowns: actor identity, how credentials were obtained, purpose of Huntsville-targeted queries, whether data left the environment',
      ],
      commonErrors: ['Claiming data center operations were compromised without evidence', 'Implying hosted customer servers were accessed', 'Omitting the unknowns entirely'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Actor Timeline — Build a preliminary timeline of the actor’s activity on the customer support portal. List each observed action in chronological order, and briefly note what each action suggests about actor intent.',
    rubric: {
      keyElements: [
        'Login by custsync_api02 (interactive use of a legacy integration account)',
        'API key sync-maint-0426 creation — persistence/access enablement',
        'Huntsville-area customer queries — discovery/target selection',
        'Customer profile viewing — collection',
        'Metadata export (hsv_customer_summary.csv) — staging',
        'Each action includes a brief statement of likely intent',
      ],
      commonErrors: ['Missing one or more of the four post-login actions', 'Asserting definitive intent without hedging', 'Reversing chronological order'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Investigative Gaps & Records Requests — List every gap identified from the Drop 1 packet. For each gap, specify the record you are requesting and what investigative question it will help answer.',
    rubric: {
      keyElements: [
        'Gap: Account provenance → Request: creation records and ownership history for custsync_api02',
        'Gap: Access method → Request: source IP information and API key usage logs',
        'Gap: Authorized integration activity → Request: integration ownership records and service-provider documentation',
        'Gap: Full scope → Request: full portal audit logs and change tickets',
        'Each gap paired with a clear investigative question, not just a record name',
      ],
      commonErrors: ['Listing records without tying them to a question', 'Requesting hosted customer production data without scope justification', 'Omitting source IP / API key log requests'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Account Analysis — What is known and unknown about account custsync_api02 based on current evidence? Does its use narrow or eliminate any hypotheses about actor identity? Explain your reasoning.',
    rubric: {
      keyElements: [
        'Known: custsync_api02 is a legacy integration account not expected to be used interactively',
        'Known: it was used to create an API key and query/export customer data',
        'Unknown: who currently owns, controls, or accessed the credentials',
        'Correctly states the account does NOT identify the actor',
        'Identifies what records would narrow attribution',
      ],
      commonErrors: ['Concluding the account owner is the intruder', 'Failing to distinguish account from actor', 'Not identifying records needed to advance the analysis'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Scope Determination — Write your squad’s formal scope statement for this incident. Address: (a) what is confirmed in scope, (b) what is confirmed out of scope, (c) what remains undetermined, and (d) whether any immediate escalation or notification steps are warranted at this stage and why.',
    rubric: {
      keyElements: [
        'In scope: unauthorized/interactive use of custsync_api02; API key creation; targeted customer queries and metadata export on the support portal',
        'Out of scope: power, cooling, routing, hypervisor management, hosted customer servers',
        'Undetermined: actor identity, whether exported data was used further, scope of affected customers beyond the Huntsville set',
        'Escalation: no immediate public notification required absent confirmed broader data theft; affected customers in the export may warrant internal notification',
        'Formal, hedged language consistent with an FBI investigative scope statement',
      ],
      commonErrors: ['Including out-of-scope infrastructure without evidentiary basis', 'Recommending broad customer notification without confirmed scope', 'Casual/informal framing'],
    },
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Pixel Play Arcade — Initial Victim Analysis (quiz)
───────────────────────────────────────────────────────────────────────────── */
const pixelPlayQuestions = [
  {
    id: uuidv4(),
    stem: 'What specific activity caused Pixel Play to report the incident?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'A customer reported a stolen arcade card' },
        { id: 'b', text: 'The payment processor alerted on unusual POS-adjacent activity from PX-BO-POS01, including POS terminal enumeration and an attempted settlement batch metadata query' },
        { id: 'c', text: 'The arcade’s Wi-Fi network went down' },
        { id: 'd', text: 'A vendor requested access to the POS system' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The report was triggered by a payment processor alert on unusual activity from the POS back-office workstation, including terminal enumeration and an attempted settlement metadata query.',
      incorrect: 'Review the initial victim production. The trigger was a payment-processor alert on POS-adjacent workstation activity, not a customer report or network outage.',
      reference: 'Pixel Play Arcade — Student Analysis Questions Q1',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which of the following elements support a finding of unauthorized activity? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'Remote login by pos-maint08 with no approved maintenance window' },
        { id: 'b', text: 'Execution of enum_terms.bat and creation of term_list.txt' },
        { id: 'c', text: 'A failed settlement batch metadata query' },
        { id: 'd', text: 'Pixel Play’s statement that no employee or approved vendor authorized the session' },
        { id: 'e', text: 'The POS workstation had recently received a software update' },
      ],
      correct: ['a', 'b', 'c', 'd'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The unauthorized remote login, script execution and file creation, the failed query, and the victim’s own statement all support unauthorized activity.',
      incorrect: 'A recent software update is not part of the initial production and does not by itself establish unauthorized access.',
      reference: 'Pixel Play Arcade — Student Analysis Questions Q2',
    },
  },
  {
    id: uuidv4(),
    stem: 'What account was used during the unauthorized activity?',
    payload: { kind: 'fill_blank', blanks: [{ accepted: ['pos-maint08'], caseSensitive: false }] },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — pos-maint08 was the account used during the unauthorized session.',
      incorrect: 'The account identified in the victim production is pos-maint08.',
      reference: 'Pixel Play Arcade — Student Analysis Questions Q3',
    },
  },
  {
    id: uuidv4(),
    stem: 'The use of account pos-maint08 is sufficient to identify the threat actor.',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — the account identifies what was used, not who used it. Additional records are needed to determine who controlled the credentials.',
      incorrect: 'Account identity ≠ actor identity. Additional records are required before attributing the activity to a person or organization.',
      reference: 'Pixel Play Arcade — Student Analysis Questions Q4',
    },
  },
  {
    id: uuidv4(),
    stem: 'What was the affected system in the initial victim production?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'PX-BO-POS01 — the POS back-office workstation' },
        { id: 'b', text: 'A customer-facing POS payment terminal' },
        { id: 'c', text: 'The arcade card/token issuance system' },
        { id: 'd', text: 'The cardholder data environment' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'PX-BO-POS01, the POS back-office workstation, is the affected system — not a customer-facing terminal or the cardholder data environment.',
      incorrect: 'The victim production specifically identifies the POS back-office workstation as affected.',
      reference: 'Pixel Play Arcade — Student Analysis Questions Q5',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which systems were NOT shown to be successfully compromised in the initial victim production? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'POS payment terminals' },
        { id: 'b', text: 'Arcade card/token systems' },
        { id: 'c', text: 'Customer-facing systems' },
        { id: 'd', text: 'Cardholder data environment' },
        { id: 'e', text: 'POS back-office workstation' },
      ],
      correct: ['a', 'b', 'c', 'd'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'POS payment terminals, arcade card/token systems, customer-facing systems, and the cardholder data environment were not shown to be successfully compromised. Scope is limited to the back-office workstation.',
      incorrect: 'Distinguish what the evidence shows vs. does not show. Only the back-office workstation (PX-BO-POS01) is confirmed affected.',
      reference: 'Pixel Play Arcade — Student Analysis Questions Q6',
    },
  },
  {
    id: uuidv4(),
    stem: 'Match each observed post-login action to its investigative category.',
    payload: {
      kind: 'drag_match',
      sources: [
        { id: 'remote', text: 'Launched a remote support process (remoteassist.exe)' },
        { id: 'script', text: 'Executed enum_terms.bat' },
        { id: 'enum',   text: 'Enumerated POS terminal and workstation names' },
        { id: 'query',  text: 'Attempted a settlement batch metadata query (failed)' },
        { id: 'file',   text: 'Created term_list.txt' },
      ],
      targets: [
        { id: 'access', text: 'Access / Execution' },
        { id: 'disc',   text: 'Discovery / Reconnaissance' },
        { id: 'collect', text: 'Attempted Collection' },
        { id: 'stage',  text: 'Data Staging' },
      ],
      matches: [
        { sourceId: 'remote', targetId: 'access' },
        { sourceId: 'script', targetId: 'disc' },
        { sourceId: 'enum',   targetId: 'disc' },
        { sourceId: 'query',  targetId: 'collect' },
        { sourceId: 'file',   targetId: 'stage' },
      ],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — the remote-access process is how the actor interacted with the workstation, the enumeration script and terminal listing are reconnaissance, the failed query is an attempted collection, and the output file is staging.',
      incorrect: 'Review the categories: enumeration scripts map to discovery/reconnaissance, and the failed query is an attempted (not completed) collection.',
      reference: 'Pixel Play Arcade — Student-Facing Tasking',
    },
  },
  {
    id: uuidv4(),
    stem: 'Was cardholder data access confirmed in the initial victim production?',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — the settlement metadata query failed due to insufficient permissions, and the payment processor alert states cardholder data access was not confirmed.',
      incorrect: 'Avoid overstating the evidence. The query failed, and cardholder data access was explicitly not confirmed.',
      reference: 'Pixel Play Arcade — Student Analysis Questions Q8',
    },
  },
  {
    id: uuidv4(),
    stem: 'What is the significance of remoteassist.exe in this incident?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'It confirms a specific vendor employee accessed the system' },
        { id: 'b', text: 'It indicates the activity occurred through a remote access/support process, relevant to how the intruder interacted with the workstation — but it does not by itself identify the actor' },
        { id: 'c', text: 'It proves cardholder data was exfiltrated' },
        { id: 'd', text: 'It is unrelated to the incident' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'remoteassist.exe shows the access method (remote support tooling) but does not by itself identify who used it.',
      incorrect: 'Avoid over-attribution. The process indicates access method, not actor identity or confirmed data theft.',
      reference: 'Pixel Play Arcade — Student Analysis Questions Q10',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which of the following records should the squad request to advance the investigation? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'Account creation records and ownership history for pos-maint08' },
        { id: 'b', text: 'Remote access logs and vendor support records' },
        { id: 'c', text: 'Payment processor telemetry and query logs' },
        { id: 'd', text: 'Endpoint image or triage data for PX-BO-POS01' },
        { id: 'e', text: 'Customer loyalty account records' },
      ],
      correct: ['a', 'b', 'c', 'd'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Account provenance, remote access/vendor records, payment processor telemetry, and endpoint data are all appropriate. Customer loyalty records are out of scope given current evidence.',
      incorrect: 'Focus requests on the account, access method, and workstation. Customer loyalty data is not yet supported by scope.',
      reference: 'Pixel Play Arcade — Student Analysis Questions Q11',
    },
  },
  {
    id: uuidv4(),
    stem: 'What is the significance of term_list.txt?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'It contains stolen cardholder data' },
        { id: 'b', text: 'It shows local enumeration of POS terminals, workstation names, and visibility of a settlement batch share — possible reconnaissance or proof-of-access activity' },
        { id: 'c', text: 'It identifies the specific individual who created it' },
        { id: 'd', text: 'It confirms the POS payment terminals were compromised' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'term_list.txt reflects local enumeration and visibility into a settlement batch share — consistent with reconnaissance or proof-of-access, not confirmed data theft.',
      incorrect: 'Avoid overstating the evidence — the file shows enumeration output, not stolen cardholder data or confirmed terminal compromise.',
      reference: 'Pixel Play Arcade — Student Analysis Questions Q9',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which conclusions should the squad AVOID reaching prematurely? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'That cardholder data was stolen' },
        { id: 'b', text: 'That POS payment terminals were compromised' },
        { id: 'c', text: 'That unauthorized activity occurred on PX-BO-POS01' },
        { id: 'd', text: 'That the owner of pos-maint08 is the intruder' },
      ],
      correct: ['a', 'b', 'd'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Premature claims of cardholder data theft, terminal compromise, or account-owner attribution undermine investigative integrity. Unauthorized activity on the back-office workstation (option C) IS supportable.',
      incorrect: 'Option C (unauthorized activity on PX-BO-POS01) is supportable from the evidence. The others are premature without additional records.',
      reference: 'Pixel Play Arcade — Student Analysis Questions Q12',
    },
  },
];

const pixelPlayDeliverables = [
  {
    kind: 'prompt', points: 20,
    text: 'Command Post Briefing Summary — Provide: (1) a 2-3 sentence incident summary, (2) confirmed affected systems, (3) systems confirmed NOT affected, and (4) the top outstanding unknowns your squad has identified.',
    rubric: {
      keyElements: [
        'Names PX-BO-POS01 (POS back-office workstation) as the affected system',
        'Describes remote login by pos-maint08, script execution, terminal enumeration, and an attempted settlement query',
        'Explicitly states POS payment terminals, arcade card/token systems, and the cardholder data environment are NOT confirmed compromised',
        'Lists ≥3 meaningful unknowns: actor identity, how credentials were obtained, whether the failed query was retried, purpose of the terminal enumeration',
      ],
      commonErrors: ['Claiming cardholder data was stolen without evidence', 'Implying POS terminals were compromised', 'Omitting the unknowns entirely'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Actor Timeline — Build a preliminary timeline of the actor’s activity on PX-BO-POS01. List each observed action in chronological order, and briefly note what each action suggests about actor intent.',
    rubric: {
      keyElements: [
        'Remote login via pos-maint08 using remoteassist.exe',
        'Execution of enum_terms.bat — discovery/reconnaissance',
        'Enumeration of POS terminal and workstation names',
        'Attempted (failed) settlement batch metadata query — attempted collection',
        'Creation of term_list.txt — staging',
        'Each action includes a brief statement of likely intent',
      ],
      commonErrors: ['Missing one or more of the five post-login actions', 'Asserting the query succeeded', 'Reversing chronological order'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Investigative Gaps & Records Requests — List every gap identified from the Drop 1 packet. For each gap, specify the record you are requesting and what investigative question it will help answer.',
    rubric: {
      keyElements: [
        'Gap: Account provenance → Request: creation records and ownership history for pos-maint08',
        'Gap: Access method → Request: remote access logs and vendor support records',
        'Gap: Full scope → Request: payment processor telemetry and query logs',
        'Gap: Endpoint activity → Request: endpoint image or triage data for PX-BO-POS01',
        'Each gap paired with a clear investigative question, not just a record name',
      ],
      commonErrors: ['Listing records without tying them to a question', 'Requesting cardholder/customer data without scope justification', 'Omitting the remote access log request'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Account Analysis — What is known and unknown about account pos-maint08 based on current evidence? Does its use narrow or eliminate any hypotheses about actor identity? Explain your reasoning.',
    rubric: {
      keyElements: [
        'Known: pos-maint08 was used for the remote login and subsequent activity',
        'Known: naming convention suggests a POS maintenance/vendor-support role',
        'Unknown: who created, owns, or currently controls the account',
        'Correctly states the account does NOT identify the actor',
        'Identifies what records would narrow attribution',
      ],
      commonErrors: ['Concluding the account owner is the intruder', 'Failing to distinguish account from actor', 'Not identifying records needed to advance the analysis'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Scope Determination — Write your squad’s formal scope statement for this incident. Address: (a) what is confirmed in scope, (b) what is confirmed out of scope, (c) what remains undetermined, and (d) whether any immediate escalation or notification steps are warranted at this stage and why.',
    rubric: {
      keyElements: [
        'In scope: unauthorized remote access to PX-BO-POS01; terminal enumeration; attempted settlement metadata query',
        'Out of scope: POS payment terminals, arcade card/token systems, customer-facing systems, cardholder data environment',
        'Undetermined: actor identity, whether the query was retried via another vector, purpose of the enumeration',
        'Escalation: no PCI/cardholder-data notification required absent confirmed cardholder data access',
        'Formal, hedged language consistent with an FBI investigative scope statement',
      ],
      commonErrors: ['Including out-of-scope payment systems without evidentiary basis', 'Recommending PCI notification without confirmed cardholder data access', 'Casual/informal framing'],
    },
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Main — seeds both challenges for each victim, mirroring
   seed-packet-heist-drop1.js exactly (challenge type, squad grading, drop 1,
   unpublished by default).
───────────────────────────────────────────────────────────────────────────── */
const VICTIMS = [
  { name: 'Dogwood Hotel & Resort', quiz: dogwoodQuestions,   deliverables: dogwoodDeliverables },
  { name: 'CyberDyne Data Center',  quiz: cyberdyneQuestions, deliverables: cyberdyneDeliverables },
  { name: 'Pixel Play Arcade',      quiz: pixelPlayQuestions, deliverables: pixelPlayDeliverables },
];

(async () => {
  await seq.authenticate();
  console.log('PostgreSQL connected\n');

  for (const victim of VICTIMS) {
    const analysisTitle    = 'PACKET HEIST — Drop 1: Initial Victim Analysis';
    const deliverableTitle = 'PACKET HEIST — Drop 1: Squad Deliverables';

    // Clear any previous seed for this victim's two challenges
    await seq.query(
      `DELETE FROM assignments WHERE course_id = :courseId AND victim_name = :victim AND title IN (:t1, :t2)`,
      { replacements: { courseId: COURSE_ID, victim: victim.name, t1: analysisTitle, t2: deliverableTitle } },
    );

    const [[{ next: oi0 }]] = await seq.query(
      "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM assignments WHERE course_id = :courseId AND type = 'challenge'",
      { replacements: { courseId: COURSE_ID } },
    );
    const oi       = Number(oi0);
    const maxScore = victim.quiz.reduce((s, q) => s + q.scoring.points, 0);
    const quizId   = uuidv4();
    const delivId  = uuidv4();

    await seq.query(
      `INSERT INTO assignments
         (id, course_id, title, description, type, grading_mode, max_score, order_index,
          is_published, scenario_name, victim_name, drop_number, questions, role_filters, created_at, updated_at)
       VALUES
         (:id, :courseId, :title, :description, 'challenge', 'squad', :maxScore, :oi,
          false, 'packet-heist', :victim, 1, :questions, '{}', NOW(), NOW())`,
      {
        replacements: {
          id:          quizId,
          courseId:    COURSE_ID,
          title:       analysisTitle,
          description: `Review the Drop 1 evidence packet for ${victim.name} and answer each question based strictly on what the evidence supports. Avoid speculation.`,
          maxScore,
          oi,
          victim:      victim.name,
          questions:   JSON.stringify(victim.quiz),
        },
      },
    );
    console.log(`✓ ${victim.name} — Initial Victim Analysis | ID: ${quizId} | ${victim.quiz.length} questions | ${maxScore} pts`);

    await seq.query(
      `INSERT INTO assignments
         (id, course_id, title, description, type, grading_mode, max_score, order_index,
          is_published, scenario_name, victim_name, drop_number, questions, role_filters, created_at, updated_at)
       VALUES
         (:id, :courseId, :title, :description, 'challenge', 'squad', 100, :oi2,
          false, 'packet-heist', :victim, 1, :questions, '{}', NOW(), NOW())`,
      {
        replacements: {
          id:       delivId,
          courseId: COURSE_ID,
          title:    deliverableTitle,
          victim:   victim.name,
          description: [
            `${victim.name} · Drop 1`,
            '',
            'Complete all five deliverables as a squad. Your responses will be reviewed and graded by command.',
            'Base every response on evidence in the Drop 1 packet. Cite specific artifacts where applicable.',
            'These deliverables feed directly into your Command Post briefing.',
          ].join('\n'),
          oi2:       oi + 1,
          questions: JSON.stringify(victim.deliverables),
        },
      },
    );
    console.log(`✓ ${victim.name} — Squad Deliverables | ID: ${delivId} | ${victim.deliverables.length} prompts\n`);
  }

  console.log('All seeded unpublished. Assign each victim to its squad and unlock via Command → Content Gating when ready.\n');
  await seq.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
