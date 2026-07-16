'use strict';
/**
 * Seed Day 4 Module 3 from Investigating_Cryptocurrency.pptx, link the
 * existing Course Content deck, and inherit the current Day 4 unlock scopes.
 * Safe to rerun: assignment, lesson link, and unlocks are updated in place.
 *
 * Run: node backend/scripts/seed-day4-module3-cryptocurrency.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize, Transaction } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const TITLE = 'Day 4 Module 3 — Investigating Cryptocurrency';
const CONTENT_TITLE = 'Investigating Cryptocurrency';
const ORDER_INDEX = 17;

const mc = (id, stem, options, correct, points, mustPass, feedback, reference) => ({
  id,
  stem,
  payload: {
    kind: 'multiple_choice',
    selectionMode: Array.isArray(correct) && correct.length > 1 ? 'multiple' : 'single',
    shuffle: true,
    options,
    correct: Array.isArray(correct) ? correct : [correct],
  },
  scoring: { points, mustPass },
  feedback: { ...feedback, reference },
});

const questions = [
  mc(
    'q_d4m3_mc01_address_identity',
    'An investigator traces ransom funds to a Bitcoin address. What does that address establish by itself?',
    [
      { id: 'movement', text: 'A ledger location involved in the movement of value, but not the identity of its controller' },
      { id: 'identity', text: 'The verified legal identity of the person who controlled the funds' },
      { id: 'intent', text: 'The controller’s criminal intent' },
      { id: 'location', text: 'The controller’s physical location when the transaction occurred' },
    ],
    'movement', 4, true,
    {
      correct: 'Correct. A public ledger shows address activity. Attribution requires corroboration such as exchange KYC, subscriber data, device evidence, or other investigative records.',
      incorrect: 'An address is not an identity. The ledger shows movement of value; attribution requires evidence outside the ledger.',
    },
    'Investigating Cryptocurrency, slides 4 and 10',
  ),
  {
    id: 'q_d4m3_dm01_asset_types',
    stem: 'Match each cryptocurrency category to the investigative implication emphasized in the lesson.',
    payload: {
      kind: 'drag_match', partialCredit: true,
      sources: [
        { id: 'transparent', text: 'Transparent ledger' },
        { id: 'privacy', text: 'Privacy coin' },
        { id: 'stable', text: 'Stablecoin with a centralized issuer' },
      ],
      targets: [
        { id: 'public', text: 'Transactions are publicly visible and can be traced address to address' },
        { id: 'obscured', text: 'Sender, receiver, or amount may be obscured and require specialized capability' },
        { id: 'freeze', text: 'Issuer may have the ability to freeze funds when proper authority is used' },
      ],
      matches: [
        { sourceId: 'transparent', targetId: 'public' },
        { sourceId: 'privacy', targetId: 'obscured' },
        { sourceId: 'stable', targetId: 'freeze' },
      ],
    },
    scoring: { points: 4, mustPass: false },
    feedback: {
      correct: 'Correct. Asset type changes the realistic tracing and restraint options.',
      incorrect: 'Transparent ledgers expose transaction history; privacy coins obscure key fields; centralized stablecoin issuers may provide a restraint point.',
      reference: 'Investigating Cryptocurrency, slide 5',
    },
  },
  mc(
    'q_d4m3_mc02_custody',
    'Which custody arrangement provides a third-party company that investigators can identify and serve with appropriate legal process?',
    [
      { id: 'custodial', text: 'A custodial, exchange-held wallet' },
      { id: 'self', text: 'A self-hosted wallet controlled only by the user’s private key' },
      { id: 'hardware', text: 'An offline hardware wallet in the subject’s possession' },
      { id: 'paper', text: 'A seed phrase written on paper' },
    ],
    'custodial', 3, false,
    {
      correct: 'Correct. A custodial platform holds keys for the user and supplies an identifiable legal-process target.',
      incorrect: 'A custodial exchange is the third-party process target. Self-hosted and hardware wallets have no intermediary custodian to compel.',
    },
    'Investigating Cryptocurrency, slide 6',
  ),
  mc(
    'q_d4m3_ms01_transaction_fields',
    'Which data should be captured at the start of a basic cryptocurrency trace? Select all that apply.',
    [
      { id: 'sender', text: 'Sending address' },
      { id: 'receiver', text: 'Receiving address' },
      { id: 'txid', text: 'Transaction hash (txid)' },
      { id: 'amount_time', text: 'Amount and timestamp' },
      { id: 'identity', text: 'Assumed real-world identity inferred from the address format' },
    ],
    ['sender', 'receiver', 'txid', 'amount_time'], 4, false,
    {
      correct: 'Correct. These four data points anchor a basic trace. Identity is a separate attribution question.',
      incorrect: 'Capture sending address, receiving address, txid, amount, and timestamp. Do not infer identity from an address alone.',
    },
    'Investigating Cryptocurrency, slide 8',
  ),
  mc(
    'q_d4m3_mc03_mixer',
    'A trace enters a mixer and the direct address-to-address link is no longer supportable. What is the best next action?',
    [
      { id: 'document_escalate', text: 'Document the observed pattern and hand the complex trace to specialized cryptocurrency resources' },
      { id: 'guess', text: 'Select the most similar output amount and treat it as the same funds' },
      { id: 'stop_case', text: 'Close the investigation because no other evidence can exist' },
      { id: 'identity', text: 'Attribute every mixer output to the original sender' },
    ],
    'document_escalate', 3, false,
    {
      correct: 'Correct. Document the limit and escalate rather than forcing an unsupported continuation.',
      incorrect: 'A mixer is a handoff point. Preserve what you observed, explain the limitation, and engage trained specialists.',
    },
    'Investigating Cryptocurrency, slides 9, 20, and 22',
  ),
  {
    id: 'q_d4m3_tf01_ledger_limits',
    stem: 'A confirmed blockchain transaction proves where the controller was physically located and why the transfer occurred.',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 3, mustPass: true },
    feedback: {
      correct: 'Correct. The ledger records movement, not motive or real-time physical location.',
      incorrect: 'Blockchain analysis cannot establish intent or physical location from the transaction alone.',
      reference: 'Investigating Cryptocurrency, slide 10',
    },
  },
  mc(
    'q_d4m3_mc04_vasp',
    'Traced funds arrive at an address associated with a regulated exchange. What should the investigator establish next?',
    [
      { id: 'entity_jurisdiction', text: 'The exchange’s legal entity and jurisdiction, then the appropriate process and preservation path' },
      { id: 'owner_public', text: 'The account owner’s identity from public blockchain data alone' },
      { id: 'wait', text: 'A complete end-to-end trace before beginning any legal-process work' },
      { id: 'seize', text: 'Immediate transfer of the funds without legal authority or specialist support' },
    ],
    'entity_jurisdiction', 3, false,
    {
      correct: 'Correct. Identifying the VASP and its jurisdiction turns the trace into an actionable records and potential restraint lead.',
      incorrect: 'Confirm the entity and jurisdiction early. Do not wait for a perfect trace before starting appropriate process.',
    },
    'Investigating Cryptocurrency, slides 12 and 21',
  ),
  mc(
    'q_d4m3_mc05_process',
    'Under the lesson’s starting framework, which request-to-process pairing is correct?',
    [
      { id: 'kyc_subpoena', text: 'Basic subscriber/KYC information — subpoena, subject to current legal guidance' },
      { id: 'content_subpoena', text: 'Sensitive stored content — subpoena in every circumstance' },
      { id: 'history_none', text: 'Transaction and device history — no legal process because the blockchain is public' },
      { id: 'all_warrant', text: 'Every exchange record — search warrant only, regardless of record type' },
    ],
    'kyc_subpoena', 4, true,
    {
      correct: 'Correct. The deck presents subpoena as the starting tier for basic subscriber/KYC records and directs investigators to confirm current standards with counsel.',
      incorrect: 'Match the request to the authority. Basic subscriber/KYC starts at subpoena; more sensitive records may require higher process. Confirm current requirements with the AUSA and counsel.',
    },
    'Investigating Cryptocurrency, slide 13',
  ),
  mc(
    'q_d4m3_ms02_exchange_records',
    'Which records are appropriate starting requests from an exchange, consistent with the legal authority obtained? Select all that apply.',
    [
      { id: 'kyc', text: 'KYC identity records and submitted identification' },
      { id: 'signup', text: 'Account creation details, linked email/phone, and signup IP' },
      { id: 'transactions', text: 'Transaction history and deposit/withdrawal addresses' },
      { id: 'devices', text: 'Login IP and device history' },
      { id: 'unrelated', text: 'Every unrelated customer’s complete account history' },
    ],
    ['kyc', 'signup', 'transactions', 'devices'], 3, false,
    {
      correct: 'Correct. Requests should target identity, account creation, activity, and access records relevant to the account under investigation.',
      incorrect: 'Request relevant KYC, account-creation, transaction, IP/device, and linked-account records within the scope of the process used.',
    },
    'Investigating Cryptocurrency, slide 14',
  ),
  mc(
    'q_d4m3_mc06_freeze',
    'Funds are confirmed at a custodial exchange and remain movable. What is the most appropriate immediate operational priority?',
    [
      { id: 'freeze', text: 'Coordinate quickly on the appropriate legal request to freeze or restrain the account' },
      { id: 'private_key', text: 'Assume the investigator now possesses the private key' },
      { id: 'move', text: 'Transfer the funds to a government wallet without authority or an approved seizure plan' },
      { id: 'delay', text: 'Wait until every downstream hop has been traced before notifying anyone' },
    ],
    'freeze', 3, true,
    {
      correct: 'Correct. Custodial funds can move quickly; timely lawful restraint and early specialist coordination are the priority.',
      incorrect: 'Move quickly through approved legal and seizure channels. Do not improvise custody or wait for a perfect trace.',
    },
    'Investigating Cryptocurrency, slides 16 and 20',
  ),
  mc(
    'q_d4m3_ms03_provenance',
    'Which elements belong in the provenance record for a cryptocurrency finding? Select all that apply.',
    [
      { id: 'identifier', text: 'Wallet or exchange-account identifier' },
      { id: 'platform', text: 'Blockchain or platform examined' },
      { id: 'tx_block', text: 'Transaction hash or block reference' },
      { id: 'query_time', text: 'Date and time of the query' },
      { id: 'method', text: 'Method or tool category used to obtain the record' },
      { id: 'export', text: 'Preserved export, its hash, and storage location' },
      { id: 'memory', text: 'The examiner’s unaided recollection without a saved record' },
    ],
    ['identifier', 'platform', 'tx_block', 'query_time', 'method', 'export'], 4, true,
    {
      correct: 'Correct. All six documented elements are required to make the finding reproducible and defensible.',
      incorrect: 'Record the identifier, platform, txid/block, query time, method, and preserved export with its hash and storage location.',
    },
    'Investigating Cryptocurrency, slides 17 and 23',
  ),
  {
    id: 'q_d4m3_dm02_workflow',
    stem: 'Put the first-response cryptocurrency workflow in the best operational sequence.',
    payload: {
      kind: 'drag_match', partialCredit: true,
      sources: [
        { id: 'step1', text: 'Step 1' },
        { id: 'step2', text: 'Step 2' },
        { id: 'step3', text: 'Step 3' },
        { id: 'step4', text: 'Step 4' },
      ],
      targets: [
        { id: 'capture', text: 'Capture address, txid, amount, and timestamp' },
        { id: 'identify', text: 'Identify asset type and trace immediate hops' },
        { id: 'vasp', text: 'Identify any exchange/VASP and its jurisdiction' },
        { id: 'process', text: 'Begin appropriate process, preserve provenance, and escalate complexity' },
      ],
      matches: [
        { sourceId: 'step1', targetId: 'capture' },
        { sourceId: 'step2', targetId: 'identify' },
        { sourceId: 'step3', targetId: 'vasp' },
        { sourceId: 'step4', targetId: 'process' },
      ],
    },
    scoring: { points: 4, mustPass: false },
    feedback: {
      correct: 'Correct. Capture first, classify and trace, identify the process target, then act and document without waiting for a perfect trace.',
      incorrect: 'The durable sequence is capture → identify/trace → identify VASP and jurisdiction → process, provenance, and escalation.',
      reference: 'Investigating Cryptocurrency, slides 20–22',
    },
  },
];

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false,
});

(async () => {
  await seq.authenticate();
  const transaction = await seq.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE });
  try {
    const [existing] = await seq.query(
      'SELECT id FROM assignments WHERE course_id = :courseId AND title = :title FOR UPDATE',
      { replacements: { courseId: COURSE_ID, title: TITLE }, transaction },
    );
    const assignmentId = existing[0]?.id ?? uuidv4();
    const maxScore = questions.reduce((sum, question) => sum + question.scoring.points, 0);

    await seq.query(
      `INSERT INTO assignments
         (id, course_id, title, description, type, grading_mode, max_score, order_index,
          is_published, scenario_name, drop_number, questions, role_filters, created_at, updated_at)
       VALUES
         (:id, :courseId, :title, :description, 'module', 'individual', :maxScore, :orderIndex,
          true, NULL, NULL, :questions, ARRAY[]::text[], NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         description = EXCLUDED.description,
         type = EXCLUDED.type,
         grading_mode = EXCLUDED.grading_mode,
         max_score = EXCLUDED.max_score,
         order_index = EXCLUDED.order_index,
         is_published = EXCLUDED.is_published,
         questions = EXCLUDED.questions,
         role_filters = EXCLUDED.role_filters,
         updated_at = NOW()`,
      {
        replacements: {
          id: assignmentId,
          courseId: COURSE_ID,
          title: TITLE,
          description: 'Applied question bank for Day 4 Module 3: Investigating Cryptocurrency. Covers blockchain and custody fundamentals, basic tracing, obfuscation limits, VASP legal process, exchange records, seizure coordination, provenance, and escalation. Must-pass items protect against unsupported attribution, process errors, and evidence-handling failures.',
          maxScore,
          orderIndex: ORDER_INDEX,
          questions: JSON.stringify(questions),
        },
        transaction,
      },
    );

    const [day4Scopes] = await seq.query(
      `SELECT u.cohort_id, u.squad_id, MAX(u.unlocked_by::text)::uuid AS unlocked_by
       FROM assignment_unlocks u
       JOIN assignments a ON a.id = u.assignment_id
       WHERE a.course_id = :courseId AND a.type = 'module' AND a.order_index IN (15, 16)
       GROUP BY u.cohort_id, u.squad_id`,
      { replacements: { courseId: COURSE_ID }, transaction },
    );
    for (const scope of day4Scopes) {
      await seq.query(
        `INSERT INTO assignment_unlocks (id, assignment_id, cohort_id, squad_id, unlocked_by, unlocked_at)
         VALUES (:id, :assignmentId, :cohortId, :squadId, :unlockedBy, NOW())
         ON CONFLICT DO NOTHING`,
        {
          replacements: {
            id: uuidv4(), assignmentId, cohortId: scope.cohort_id,
            squadId: scope.squad_id, unlockedBy: scope.unlocked_by,
          },
          transaction,
        },
      );
    }

    const [content] = await seq.query(
      `SELECT id FROM course_content_items
       WHERE course_id = :courseId AND title = :contentTitle
       FOR UPDATE`,
      { replacements: { courseId: COURSE_ID, contentTitle: CONTENT_TITLE }, transaction },
    );
    if (content.length !== 1) throw new Error(`Expected one Course Content item titled "${CONTENT_TITLE}".`);
    const contentId = content[0].id;
    await seq.query(
      `UPDATE course_content_items
       SET linked_assignment_id = :assignmentId, is_published = true, updated_at = NOW()
       WHERE id = :contentId`,
      { replacements: { assignmentId, contentId }, transaction },
    );
    await seq.query(
      `DELETE FROM course_content_unlocks
       WHERE id IN (
         SELECT id FROM (
           SELECT id, ROW_NUMBER() OVER (
             PARTITION BY content_id, cohort_id, squad_id
             ORDER BY unlocked_at, id
           ) AS duplicate_number
           FROM course_content_unlocks
           WHERE content_id = :contentId
         ) ranked
         WHERE duplicate_number > 1
       )`,
      { replacements: { contentId }, transaction },
    );
    for (const scope of day4Scopes) {
      await seq.query(
        `INSERT INTO course_content_unlocks (id, content_id, cohort_id, squad_id, unlocked_by, unlocked_at)
         SELECT :id, :contentId, :cohortId, :squadId, :unlockedBy, NOW()
         WHERE NOT EXISTS (
           SELECT 1 FROM course_content_unlocks
           WHERE content_id = :contentId
             AND cohort_id = :cohortId
             AND squad_id IS NOT DISTINCT FROM :squadId
         )`,
        {
          replacements: {
            id: uuidv4(), contentId, cohortId: scope.cohort_id,
            squadId: scope.squad_id, unlockedBy: scope.unlocked_by,
          },
          transaction,
        },
      );
    }

    await transaction.commit();

    const [verified] = await seq.query(
      `SELECT a.id, a.max_score, a.order_index, a.is_published,
              jsonb_array_length(a.questions::jsonb) AS question_count,
              COUNT(DISTINCT u.id)::int AS assignment_unlocks,
              COUNT(DISTINCT cu.id)::int AS content_unlocks,
              c.id AS content_id, c.is_published AS content_published, c.linked_assignment_id
       FROM assignments a
       JOIN course_content_items c ON c.linked_assignment_id = a.id AND c.title = :contentTitle
       LEFT JOIN assignment_unlocks u ON u.assignment_id = a.id
       LEFT JOIN course_content_unlocks cu ON cu.content_id = c.id
       WHERE a.course_id = :courseId AND a.id = :assignmentId
       GROUP BY a.id, c.id`,
      { replacements: { courseId: COURSE_ID, assignmentId, contentTitle: CONTENT_TITLE } },
    );
    const row = verified[0];
    if (
      verified.length !== 1 || Number(row.max_score) !== 42 || row.order_index !== ORDER_INDEX
      || row.is_published !== true || row.question_count !== 12
      || row.assignment_unlocks !== day4Scopes.length || row.content_unlocks !== day4Scopes.length
      || row.content_published !== true || row.linked_assignment_id !== row.id
    ) throw new Error(`Post-write verification failed for Day 4 Module 3: ${JSON.stringify({ row, expectedUnlocks: day4Scopes.length })}`);

    console.log(`✓ ${TITLE}`);
    console.log(`  questions=12 max_score=42 order_index=17 assignment_unlocks=${row.assignment_unlocks}`);
    console.log(`  linked_content="${CONTENT_TITLE}" published=true content_unlocks=${row.content_unlocks}`);
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  } finally {
    await seq.close();
  }
})().catch((error) => { console.error(error.message); process.exit(1); });
