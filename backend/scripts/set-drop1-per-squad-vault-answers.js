'use strict';
/**
 * Give each squad its own Drop 1 (packet-heist-v2) vault-lock decryption
 * riddle and answer, derived from a fact in that squad's own victim packet
 * instead of the cohort-wide Command Post subject line every squad shared.
 *
 * DO NOT RUN until the backend that strips config.perSquad from non-admin
 * responses (campaignPuzzle.service.js listPuzzlesForDrops) is deployed —
 * an older deployed backend returns `config` to students verbatim, which
 * would hand every squad every other squad's answer.
 *
 * Answers verified against the shipped evidence files:
 *   REDSTONE  INC-9902       it_containment_ticket_9902.txt (ticket header)
 *   DOGWOOD   MAGNOLIA LINEN gm_incident_memo.pdf (vendor whose email was faked)
 *   CYBERDYNE INC-2026-0620  RE_client_data_incident.eml (internal incident opened)
 *   PIXELPLAY 2026-05123     local_pd_report_2026-05123.pdf (HPD report no.)
 *
 * The shared prompt/answer stay in place as the fallback for any squad with
 * no victim assigned.
 *
 * Run: node backend/scripts/set-drop1-per-squad-vault-answers.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./lib/liveDb.js');
const { updatePuzzle } = require('../src/services/campaignPuzzle.service');

const DROP_ID = 'e8d920d3-6b74-4df5-9148-cb4397bcd435';
const PUZZLE_ID = '5bad8144-18dd-40a2-ad53-3e373f3b4baf';

const PER_SQUAD = {
  REDSTONE: {
    prompt: 'Open your IT Service Desk containment ticket. The ticket ID in its header decrypts the drop.',
    answer: 'INC-9902',
  },
  DOGWOOD: {
    prompt: 'The General Manager\'s incident memo names the linen vendor whose banking-update email was faked. That vendor\'s name, in full capitals, decrypts the drop.',
    answer: 'MAGNOLIA LINEN',
  },
  CYBERDYNE: {
    prompt: 'In the client-escalation email, CyberDyne states the internal incident it opened. That incident ID decrypts the drop.',
    answer: 'INC-2026-0620',
  },
  PIXELPLAY: {
    prompt: 'Open the local police report. Its report number decrypts the drop.',
    answer: '2026-05123',
  },
};

async function main() {
  const updated = await updatePuzzle(DROP_ID, PUZZLE_ID, { config: { perSquad: PER_SQUAD } });
  console.log('Per-squad vault answers set for:', Object.keys(updated.config.perSquad).join(', '));
  process.exit(0);
}

main().catch((error) => { console.error(error.message); process.exit(1); });
