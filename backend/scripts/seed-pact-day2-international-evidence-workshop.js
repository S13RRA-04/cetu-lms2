'use strict';
/**
 * Seed the Day 2, 1445 "International Evidence Workshop" — squads draft a
 * real MLAT request package against a standalone fact pattern (Northline
 * Freight Logistics, a BEC case with Romanian-hosted evidence), using the
 * seven-element OIA request structure from the lecture.
 *
 * This assignment covers the DRAFTING portion only. The source materials'
 * second half — exchanging the finished draft with another squad for peer
 * review, the failure-mode cross-check, and the "one change we'd make"
 * synthesis — is a live, in-person, cross-squad exchange (facilitator pairs
 * squads and swaps physical/screen-shared drafts). There is no mechanism in
 * this app for one squad to see another squad's submission, and building one
 * is a materially different, unrequested feature — that phase stays exactly
 * as designed in the facilitator guide, run by the instructor in the room.
 *
 * Not part of packet-heist/packet-heist-v2 (no drop_number/scenario_name),
 * same pattern as the other Day 1/2 workshops — gated purely by
 * is_published + per-squad AssignmentUnlock, not the campaign release engine.
 *
 * Run: node backend/scripts/seed-pact-day2-international-evidence-workshop.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./lib/liveDb.js');
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const TITLE = 'Day 2 Workshop — International Evidence (Drafting an MLAT Request)';
const DAY2_CAPSTONE_ID = 'fd7e9558-3aaf-49ff-96bd-114b323632b2';

const CASE_NARRATIVE = `Your squad will draft an actual MLAT request package for a fresh fact pattern — not the capstone case — using the OIA request-element checklist from this afternoon's lecture. Talk out each element together before anyone writes. This is a real work product, not a worksheet: by the end, your draft should be good enough that, with real names and dates substituted in, it could plausibly be submitted.

THE CASE

Northline Freight Logistics, a mid-size trucking and freight-forwarding company headquartered in Ohio, reported a business email compromise resulting in two fraudulent wire transfers totaling $310,000.

The CFO's email account was compromised via a phishing link. Vendor-payment instructions were subsequently altered in email threads with two regular vendors, redirecting the combined $310,000 to new account numbers.

Header data recovered from Northline's own email system shows the forwarding-rule change on the CFO's mailbox was made from an external webmail account: cfo.updates@postbox-ro.example, hosted by PostBox RO, a webmail provider headquartered in Bucharest, Romania, with no U.S. presence.

Login records already obtained from Northline's own U.S.-based email provider (which cooperated with a federal grand jury subpoena) show the attacker accessed the compromised mailbox from IP address 82.77.14.203 on multiple dates.

Open-source WHOIS research shows 82.77.14.203 is allocated to Carpathia Cloud SRL, a hosting company in Cluj-Napoca, Romania, also with no U.S. presence.

An Article 29 preservation request was sent to Romania's central authority three days after the foreign nexus was identified, covering the PostBox RO account and any Carpathia Cloud hosting logs tied to that IP address for the relevant date range. Confirmation of preservation was received five days later.

A parallel U.S. subpoena to Meridian Pay Solutions (the U.S.-based payment processor used for one of the two fraudulent transfers) has already returned the destination account's opening documentation, which lists a name investigators believe is fictitious. That thread is a separate, already-progressing part of the case.

Investigators now need, from Romania: (1) subscriber and account-opening information for cfo.updates@postbox-ro.example; (2) the content of that account's stored emails and its login/IP history for the relevant date range; (3) any hosting or subscriber records Carpathia Cloud SRL holds tied to IP address 82.77.14.203 for the same period.

None of this is reachable through U.S. process — PostBox RO and Carpathia Cloud SRL both have no U.S. presence. Preservation is already secured and the U.S.-reachable parallel-cooperation avenue (Meridian Pay) is already in progress on its own track. What remains is the formal MLAT request to Romania for the PostBox RO and Carpathia Cloud evidence — the exercise below.

YOUR TASK

Draft the formal MLAT request to Romania's central authority covering the PostBox RO and Carpathia Cloud SRL evidence described above. Use the seven elements below as your structure. For each, answer directly in the actual language you'd use in the request, not a summary of what you'd say.

SELF-CHECK BEFORE YOU FINALIZE

Apply the test from Slide 9: if a Romanian law enforcement officer with no knowledge of U.S. law read your Element 2 statement of facts cold, would they understand what happened, what's being requested, and why — without needing to look anything up? If not, revise it before moving on.`;

const DESCRIPTION = 'Squad exercise drafting a real MLAT request package against a standalone fact pattern (Northline Freight Logistics), using the seven-element OIA request structure from the Day 2 lecture. Talk through each element as a squad before drafting — the goal is a work product good enough to plausibly submit with real names substituted in, not a summary of what you’d say.';

function refNote(text) {
  return [`MODEL DRAFT (reference only — grade against the must-include list, not exact wording): ${text}`];
}

const PROMPTS = [
  {
    points: 8,
    text: `**ELEMENT 1 — Requesting authority and case agent**\n\nWho's asking; who can answer follow-up questions. Draft this element in the actual language you'd use in the request.`,
    keyElements: [
      "Names a specific requesting authority (e.g. FBI, field office/cyber squad)",
      "Names a specific case agent with contact information",
      "Names a specific assigned AUSA and district, and a case number — not left as generic placeholders like just \"the FBI\"",
    ],
    commonErrors: refNote(`Requesting Authority: Federal Bureau of Investigation, [Field Office] Cyber Squad. Case Agent: SA [Name], [phone/email]. Assigned AUSA: [Name], U.S. Attorney's Office, [District]. Case number: [XX-XXXXXX].`),
  },
  {
    points: 20,
    text: `**ELEMENT 2 — Statement of facts**\n\nSufficient for the receiving country to evaluate under their own law — not a U.S. probable-cause affidavit. Draft this element as an actual narrative, in the language you'd use in the request.`,
    keyElements: [
      "Written as narrative facts a non-lawyer, non-American reader could follow — NOT legal-analytic language (e.g. does not write \"the elements of wire fraud under 18 U.S.C. §1343 are satisfied because...\")",
      "Covers what happened: the BEC scheme, the $310,000 in fraudulent transfers, how the account settings were changed",
      "Connects the facts to the foreign nexus: the account-setting change traced to PostBox RO (Bucharest), and repeated access from an IP allocated to Carpathia Cloud SRL (Cluj-Napoca)",
      "Passes the cold-read test: apply it directly — read the squad's Element 2 aloud and ask whether a non-lawyer, non-American reader would follow it",
    ],
    commonErrors: refNote(`In [month/year], Northline Freight Logistics, a freight-forwarding company in Ohio, discovered that two wire payments totaling $310,000 intended for regular vendors had instead been sent to accounts the company did not recognize. Investigation determined that an employee's email account had been accessed without authorization after clicking a fraudulent link, and that the intruder used that access to alter the banking instructions in ongoing email exchanges with two of the company's vendors, causing the company's bank to send the payments to accounts controlled by the intruder rather than the vendors. Records obtained from the company's U.S. email provider show that the account settings enabling this scheme were changed from an external email account hosted by PostBox RO of Bucharest, and that the same intruder accessed the compromised account from an internet address allocated to Carpathia Cloud SRL of Cluj-Napoca on multiple occasions during the relevant period.`),
  },
  {
    points: 15,
    text: `**ELEMENT 3 — Specific data identification**\n\nProvider, account, time range, data type — precise enough to act on. Draft this element in the actual language you'd use in the request.`,
    keyElements: [
      "Separates the two providers into two distinct asks, not one undifferentiated request (\"records related to the account and the IP address\")",
      "From PostBox RO: subscriber and account-opening information, plus stored content and login/IP history, for cfo.updates@postbox-ro.example, for a specific date range",
      "From Carpathia Cloud SRL: subscriber/customer records associated with IP address 82.77.14.203 for the same period, including which customer account controlled that address",
    ],
    commonErrors: refNote(`(a) From PostBox RO: subscriber and account-opening information, and the stored content and login/IP history, for account cfo.updates@postbox-ro.example, for the period [start date] through [end date]. (b) From Carpathia Cloud SRL: subscriber or customer records associated with IP address 82.77.14.203 for the same period, including any records showing which customer account controlled that address. These are two separate providers holding two separate categories of records — the request should not blend them into one undifferentiated ask.`),
  },
  {
    points: 10,
    text: `**ELEMENT 4 — Legal basis under U.S. law**\n\nWhich statute, which subsection, what the conduct constitutes. Draft this element in the actual language you'd use in the request.`,
    keyElements: [
      "Cites wire fraud, 18 U.S.C. §1343 (use of interstate wire communications to execute a scheme to defraud)",
      "ALSO cites unauthorized access to a protected computer, 18 U.S.C. §1030(a)(2) and (a)(4) — squads commonly cite wire fraud alone and forget the CFAA angle; both apply here",
    ],
    commonErrors: refNote(`The conduct described constitutes wire fraud in violation of 18 U.S.C. § 1343 (use of interstate wire communications to execute a scheme to defraud) and unauthorized access to a protected computer in violation of 18 U.S.C. § 1030(a)(2) and (a)(4).`),
  },
  {
    points: 12,
    text: `**ELEMENT 5 — Connection to the investigation**\n\nWhy this specific evidence matters to this specific case — not what's being requested again, but what it will let the case team do next. Draft this element in the actual language you'd use in the request.`,
    keyElements: [
      "Explains why the PostBox RO account matters: it's the specific instrument used to alter the victim's email settings, expected to identify the intruder or additional accounts/infrastructure",
      "Explains why the Carpathia Cloud records matter: expected to identify the subscriber who controlled the IP used to access the compromised account — a direct lead toward the intruder's identity",
      "Does NOT simply restate Element 3 (what's being requested) — explains the actual investigative logic instead",
    ],
    commonErrors: refNote(`The PostBox RO account is the specific instrument the intruder used to alter the victim's email settings and redirect the fraudulent payments; its subscriber information and content are expected to identify the intruder or additional accounts and infrastructure used in the scheme. The Carpathia Cloud records are expected to identify the subscriber who controlled the IP address used to access the compromised account, which is a direct investigative lead toward the intruder's identity.`),
  },
  {
    points: 15,
    text: `**ELEMENT 6 — Confidentiality requirements**\n\nWhat the U.S. needs kept confidential, and from whom. Draft this element in the actual language you'd use in the request.`,
    keyElements: [
      "Requests that the existence and content of the request not be disclosed to the account holder or any third party",
      "Requests that disclosure to the subject be deferred pending further coordination",
      "ALSO asks Romania's central authority what confidentiality its own domestic law permits, including any defendant-notification trigger — this second, two-directional piece is the part squads most often omit",
    ],
    commonErrors: refNote(`The United States requests that the existence and content of this request not be disclosed to the account holder or any third party, and that any disclosure to the subject of the investigation be deferred pending further coordination with the requesting authority. We ask Romania's central authority to advise, at the time of response, what confidentiality its domestic law permits it to honor, including whether and when any defendant-notification obligation would be triggered.`),
  },
  {
    points: 12,
    text: `**ELEMENT 7 — Form-of-evidence requirements**\n\nWhat's needed for eventual U.S. trial admissibility — attestation, hashes, original media. Draft this element in the actual language you'd use in the request.`,
    keyElements: [
      "Requests certification/attestation by the responding provider or Romanian authority that records are true and accurate copies of business records maintained in the ordinary course",
      "Requests hash values for any digital files produced, to support authentication under the Federal Rules of Evidence",
    ],
    commonErrors: refNote(`For any records intended for use at trial in the United States, the United States requests certification or attestation by the responding provider or Romanian authority that the records are true and accurate copies of business records maintained in the ordinary course, together with hash values for any digital files produced, to support authentication under the Federal Rules of Evidence.`),
  },
  {
    points: 8,
    text: `**SELF-CHECK — The cold-read test**\n\nApply the test from Slide 9 to your own Element 2: if a Romanian law enforcement officer with no knowledge of U.S. law read it cold, would they understand what happened, what's being requested, and why — without needing to look anything up? State honestly whether it passed on the first attempt, and if not, what your squad changed.`,
    keyElements: [
      "Directly answers whether Element 2 passed the cold-read test as originally written",
      "If it did not pass, describes a specific, real change made to Element 2 as a result — not a vague \"we reviewed it and it was fine\"",
    ],
  },
];

function buildQuestions() {
  return PROMPTS.map((p) => ({
    id: uuidv4(),
    kind: 'prompt',
    points: p.points,
    text: p.text,
    rubric: { keyElements: p.keyElements, ...(p.commonErrors ? { commonErrors: p.commonErrors } : {}) },
  }));
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const seq = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false,
  });

  try {
    await seq.authenticate();
    await seq.transaction(async (transaction) => {
      const [existing] = await seq.query(
        `SELECT id FROM assignments WHERE course_id = :courseId AND title = :title`,
        { replacements: { courseId: COURSE_ID, title: TITLE }, transaction },
      );
      if (existing.length > 0) {
        const id = existing[0].id;
        const [[{ count: subCount }]] = await seq.query('SELECT count(*)::int AS count FROM submissions WHERE assignment_id = :id', { replacements: { id }, transaction });
        const [[{ count: gradeCount }]] = await seq.query('SELECT count(*)::int AS count FROM grades WHERE assignment_id = :id', { replacements: { id }, transaction });
        if (subCount > 0 || gradeCount > 0) {
          throw new Error(`Refusing to replace "${TITLE}" (id=${id}) — it already has ${subCount} submission(s)/${gradeCount} grade(s). Reseed manually if you're sure.`);
        }
        await seq.query('DELETE FROM assignments WHERE id = :id', { replacements: { id }, transaction });
        console.log(`Deleted prior untouched row (id=${id}) before reseeding.`);
      }

      // Make room at order_index 11 — the Day 2 Capstone currently sits
      // there (confirmed live: 0 submissions/grades) and shifts to 12.
      const [capstone] = await seq.query(
        `SELECT order_index FROM assignments WHERE id = :id`,
        { replacements: { id: DAY2_CAPSTONE_ID }, transaction },
      );
      if (capstone.length > 0 && capstone[0].order_index === 11) {
        await seq.query(
          `UPDATE assignments SET order_index = 12 WHERE id = :id`,
          { replacements: { id: DAY2_CAPSTONE_ID }, transaction },
        );
        console.log('Shifted Day 2 Capstone from order_index 11 to 12 to make room.');
      }

      const questions = buildQuestions();
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

      await seq.query(
        `INSERT INTO assignments
           (id, course_id, title, description, launch_briefing, max_score, order_index,
            is_published, type, grading_mode, scenario_name, drop_number, questions, role_filters,
            created_at, updated_at)
         VALUES
           (:id, :courseId, :title, :description, :launchBriefing, :maxScore, 11,
            false, 'challenge', 'squad', NULL, NULL, :questions, ARRAY[]::text[],
            NOW(), NOW())`,
        {
          replacements: {
            id: uuidv4(),
            courseId: COURSE_ID,
            title: TITLE,
            description: DESCRIPTION,
            launchBriefing: CASE_NARRATIVE,
            maxScore: totalPoints,
            questions: JSON.stringify(questions),
          },
          transaction,
        },
      );

      console.log(`Seeded unpublished: "${TITLE}" (${questions.length} prompts, ${totalPoints} pts, order_index 11)`);
    });
  } finally {
    await seq.close();
  }
}

module.exports = { COURSE_ID, TITLE };

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
