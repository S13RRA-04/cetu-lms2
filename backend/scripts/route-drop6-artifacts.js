'use strict';
/**
 * Drop 6 (search-warrant seized-device dump, 222 course_content_items) is the
 * single biggest driver of the "too much evidence, not enough time" survey
 * complaint from PACT July 26. This script cuts per-student reading load
 * without deleting case content:
 *
 *  B1) Victim-code backfill — of Drop 6's 17 per-client "Client Files"
 *      dossiers, only 3 correspond to the course's real victims (Redstone
 *      Memorial Hospital, PixelPlay, CyberDyne — matched by exact folder
 *      name). "Dogwood Enterprises" looks like a 4th victim match at a
 *      glance, but it is NOT: Drop 3's already-tagged victim_code=DOGWOOD
 *      content is titled "Dogwood Hotel — Artifact ...", a different naming
 *      convention. Drop 6 has no dossier for the real Dogwood Hotel & Resort
 *      victim at all — that's a content gap, not something this script can
 *      fabricate, and is called out in the dry-run summary below. Tagging
 *      the 3 confirmed dossiers with victim_code lets the existing
 *      contentMatchesSquadVictim() gate (utils/campaignRelease.js) do the
 *      work: a squad only sees its own assigned victim's dossier, not all 3.
 *
 *  B2) Non-victim "noise" dossier trim — the other 14 client folders are
 *      deliberate decoy clients (the signal-vs-noise investigative skill).
 *      Every squad currently gets all 7 documents for all 14. This keeps
 *      one "01 Client Profile" summary per decoy client shared, and tags the
 *      other ~6-10 documents per client with a sentinel victim_code
 *      ('NOISE') that no real squad ever holds. This — not is_published —
 *      is the release-safe mechanism: releaseDrop() (campaign.service.js)
 *      force-republishes every paired course_content_item on release and
 *      unconditionally cohort-wide-unlocks anything with victim_code=null,
 *      so an is_published:false trim would silently reappear for everyone
 *      the moment the drop is released. A victim_code that can never match
 *      a squad's assigned victim survives release: the item lands in the
 *      victim-scoped bucket and simply never gets a squad unlock.
 *
 *  B3) Role-tag the remaining ~156 items (Reston Residence rooms, RestonIT
 *      Office access-tools/documents/email/logs/goodies, Sam Smith's
 *      devices, and the surviving victim dossiers' sub-documents) using the
 *      role_filters column added in migration
 *      20240101000078-add-role-filters-to-course-content-items.js. Broad
 *      case-narrative documents are left unfiltered (visible to everyone).
 *
 * Idempotent — matches by title substring and only writes changed fields.
 * Never calls releaseDrop(); only edits already-seeded content rows.
 *
 * Run: node backend/scripts/route-drop6-artifacts.js
 * Dry run (no writes):  node backend/scripts/route-drop6-artifacts.js --dry-run
 */

require('dotenv').config();
const { CourseContentItem } = require('../src/models');
const { VICTIMS } = require('../src/constants/victims');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const DROP_NUMBER = 6;
const DRY_RUN = process.argv.includes('--dry-run');
// No real squad is ever assigned this victim_code (victims.js only has
// REDSTONE/DOGWOOD/CYBERDYNE/PIXELPLAY) — see B2 note above.
const NOISE_VICTIM_CODE = 'NOISE';

/* ---- B1: real-victim client folders ------------------------------------ */
const VICTIM_CLIENT_FOLDERS = [
  { folder: 'Client Files Redstone Memorial Hospital', code: 'REDSTONE' },
  { folder: 'Client Files PixelPlay', code: 'PIXELPLAY' },
  { folder: 'Client Files CyberDyne', code: 'CYBERDYNE' },
];
// Confirmed NOT a victim match, despite the name overlap — see file header.
const DOGWOOD_LOOKALIKE_FOLDER = 'Client Files Dogwood Enterprises';

/* ---- B2: decoy client folders to trim to a single profile summary ------ */
const NOISE_CLIENT_FOLDERS = [
  'Client Files Bayfield Dental Group',
  'Client Files Bayport Properties',
  'Client Files Cardinal Components',
  'Client Files Crestview Medical',
  'Client Files Dogwood Enterprises',
  'Client Files Dominion Auto Repair',
  'Client Files Greenway Architects',
  'Client Files Harbor Title And Escrow',
  'Client Files Lakeside Systems',
  'Client Files Old Dominion Hardware',
  'Client Files Park Avenue Dental',
  'Client Files Pinecrest Logsitics',
  'Client Files Riverside Veterinary',
  'Client Files Tidewater Insurance',
];

/* ---- B3: role-tagging rules, first match wins, title-substring based --- */
const ROLE_RULES = [
  // Client-dossier sub-documents (applies to surviving victim dossiers; the
  // non-victim dossiers' non-profile docs get unpublished before this runs).
  [/01 Client Profile/, null],
  [/(Msa Excerpt|Service Review Snapshot)/, ['operational_support_da']],
  [/Invoice/, ['forensic_accountant']],
  [/Asset Inventory/, ['cyber_analyst']],
  [/Support Tickets/, ['operational_support_sos']],
  [/Service Review Email/, ['intelligence_analyst']],
  [/(PowerShell Transcript|Support Health Check|Supporthealth Install|Windows Events) SIMULATED/, ['cyber_analyst']],

  // Reston Residence — Garage
  [/(Infotainment Export|Dashcam Clip Index|Nav Saved Locations)/, ['digital_evidence_lead']],
  [/(Garage Door Log|Equipment Inventory Note)/, ['task_force_officer']],

  // Reston Residence — Office
  [/Office Workstation Export/, ['cyber_analyst']],
  [/Office Firewall Log/, ['cyber_analyst']],
  [/Client Contract Index/, ['operational_support_da']],
  [/Printer Scanner Log/, ['digital_evidence_lead']],

  // Reston Residence — RV Workshop
  [/(Browser Bookmarks Export|Browser History Export|Hotspot Device And Connection Log)/, ['cyber_analyst']],
  [/Coinquest Export/, ['forensic_accountant']],
  [/Dormant Account Checklist/, ['forensic_accountant']],
  [/Sale Planning Notes/, ['forensic_accountant']],
  [/(Workshop Laptop File Listing|Usb Drive File Listing|Old Laptop Directory Listing)/, ['digital_evidence_lead']],
  [/Notes App Local Cache/, ['digital_evidence_lead']],

  // Reston Residence — Home Office Desktop
  [/Account Notes Draft/, ['forensic_accountant']],
  [/Recycle Bin Listing/, ['digital_evidence_lead']],
  [/Saved Passwords Export/, ['digital_evidence_lead']],
  [/Home Office File Listing/, ['digital_evidence_lead']],
  [/Unsent Email Draft/, ['intelligence_analyst']],

  [/Evidence Manifest/, null],

  // RestonIT Office — Access Tools
  [/Account Provisioning Template/, ['operational_support_sos']],
  [/Bhe Negotiation Notes/, ['forensic_accountant']],
  [/Access Tools Chat Log Export/, ['intelligence_analyst']],
  [/Client Access Matrix/, ['operational_support_sos']],
  [/Credential Vault Export/, ['cyber_analyst']],
  [/Access Tools Dormant Account Checklist/, ['forensic_accountant']],
  [/Range Backdoor/, ['cyber_analyst']],
  [/Rmm Connection Profiles/, ['cyber_analyst']],
  [/Toolkit Readme/, ['cyber_analyst']],
  [/Cedarbridge Restonit Console/, ['cyber_analyst']],

  // RestonIT Office — Documents
  [/(Checking Account Statement|Mortgage Statement|Tax Return Summary)/, ['forensic_accountant']],
  [/Documents Coinquest Export/, ['forensic_accountant']],
  [/(Jordan Email|Sandra Email)$/, ['intelligence_analyst']],
  [/Documents Remote Sessions Log/, ['cyber_analyst']],
  [/(Reston Operator Notes|Restonit Build Path Strings) SIMULATED/, ['cyber_analyst']],
  [/Usb Ops Reston Drop Rules/, ['forensic_accountant']],

  // RestonIT Office — Email (top-level threads)
  [/— Email /, ['intelligence_analyst']],

  // RestonIT Office — Goodies
  [/(Autoruns|Dns Queries|Edr Alerts|Goodies Firewall Log|Ioc Hashes|Sysmon) Stem Lap 014/, ['cyber_analyst']],
  [/Internal Chat Export Ops/, ['intelligence_analyst']],
  [/It Triage Incident Summary/, null],
  [/README RESTORE FILES/, ['cyber_analyst']],

  // RestonIT Office — Logs
  [/Telegram Chat Export/, ['intelligence_analyst']],
  [/Logs D 04 Browser History/, ['cyber_analyst']],
  [/(Dns Logs|Proxy Logs) SIMULATED/, ['cyber_analyst']],
  [/M365 Audit Log Extract/, ['cyber_analyst']],
  [/Powershell Console History/, ['cyber_analyst']],

  // Sam Smith
  [/(Draft Alextojordan|From Alex\.Reston@|From Jordan\.Reston@)/, ['intelligence_analyst']],
  [/Sam Smith Work Computer Browser History/, ['cyber_analyst']],
  [/Sam Smith Work Computer From /, ['intelligence_analyst']],
  [/Internal Chat Export Office General/, ['intelligence_analyst']],
  [/Sam Smith Calendar Export/, ['intelligence_analyst']],
  [/Sam Smith Ticket Queue/, ['operational_support_sos']],
  [/Shared Drive Access Log/, ['cyber_analyst']],
  [/Personal Phone Payment App Export/, ['forensic_accountant']],
  [/Personal Phone Text Messages/, ['intelligence_analyst']],
];

function roleFiltersFor(title) {
  for (const [pattern, roles] of ROLE_RULES) {
    if (pattern.test(title)) return roles;
  }
  return undefined; // no rule matched — leave untouched, reported at the end
}

async function main() {
  const items = await CourseContentItem.findAll({
    where: { course_id: COURSE_ID, scenario_name: 'packet-heist', drop_number: DROP_NUMBER },
  });
  console.log(`Loaded ${items.length} Drop ${DROP_NUMBER} items (dry-run: ${DRY_RUN})\n`);

  const summary = { victimTagged: 0, noiseHidden: 0, roleTagged: 0, unmatched: [] };

  for (const item of items) {
    const changes = {};

    // B1 — victim-code backfill
    const victimMatch = VICTIM_CLIENT_FOLDERS.find((v) => item.title.includes(v.folder));
    if (victimMatch && item.victim_code !== victimMatch.code) {
      changes.victim_code = victimMatch.code;
    }
    if (item.title.includes(DOGWOOD_LOOKALIKE_FOLDER) && !victimMatch) {
      // Explicitly NOT tagged — see file header. Falls through to B2/B3 as a noise client.
    }

    // B2 — trim non-victim dossiers to a single profile summary. Tag with a
    // sentinel victim_code (release-safe — see file header) instead of
    // unpublishing, and make sure a stale is_published:false from an earlier
    // run of this script gets reverted to true (releaseDrop() would force
    // this anyway; setting it explicitly keeps admin listings accurate too).
    const isNoiseClientDoc = NOISE_CLIENT_FOLDERS.some((f) => item.title.includes(f));
    const isProfileDoc = /01 Client Profile/.test(item.title);
    if (isNoiseClientDoc && !isProfileDoc) {
      if (item.victim_code !== NOISE_VICTIM_CODE) changes.victim_code = NOISE_VICTIM_CODE;
      if (item.is_published !== true) changes.is_published = true;
    }

    // B3 — role tagging (skip items being hidden this pass, and skip
    // non-victim, non-profile docs entirely since B2 already hides them)
    const willBeHidden = isNoiseClientDoc && !isProfileDoc;
    if (!willBeHidden) {
      const roles = roleFiltersFor(item.title);
      if (roles === undefined) {
        summary.unmatched.push(item.title);
      } else {
        const desired = roles ?? [];
        const current = item.role_filters ?? [];
        const changed = desired.length !== current.length || desired.some((r) => !current.includes(r));
        if (changed) changes.role_filters = desired;
      }
    }

    if (Object.keys(changes).length === 0) continue;

    if (changes.victim_code && changes.victim_code !== NOISE_VICTIM_CODE) summary.victimTagged += 1;
    if (changes.victim_code === NOISE_VICTIM_CODE) summary.noiseHidden += 1;
    if (changes.role_filters) summary.roleTagged += 1;

    if (DRY_RUN) {
      console.log(`[dry-run] ${item.title}\n  -> ${JSON.stringify(changes)}`);
    } else {
      await item.update(changes);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Victim-code tagged:     ${summary.victimTagged}`);
  console.log(`Noise-hidden (sentinel):${summary.noiseHidden}`);
  console.log(`Role-tagged:            ${summary.roleTagged}`);
  if (summary.unmatched.length > 0) {
    console.log(`\nUnmatched titles (${summary.unmatched.length}) — left unfiltered, review rule coverage:`);
    summary.unmatched.forEach((t) => console.log(`  - ${t}`));
  }

  const finalCounts = await CourseContentItem.findAll({
    where: { course_id: COURSE_ID, scenario_name: 'packet-heist', drop_number: DROP_NUMBER },
    attributes: ['is_published', 'victim_code', 'role_filters'],
  });
  // NOISE is release-safe-hidden (see B2), not "unpublished" — report it as
  // its own bucket rather than folding it into the is_published count.
  const visible = finalCounts.filter((i) => i.is_published && i.victim_code !== NOISE_VICTIM_CODE);
  console.log(`\nTotal Drop ${DROP_NUMBER} items: ${finalCounts.length}`);
  console.log(`Noise-hidden (never reaches any squad): ${finalCounts.filter((i) => i.victim_code === NOISE_VICTIM_CODE).length}`);
  console.log(`Reachable by at least one squad: ${visible.length}`);
  for (const v of Object.values(VICTIMS)) {
    console.log(`  ${v.code}: ${visible.filter((i) => i.victim_code === v.code).length} victim-scoped items`);
  }
  console.log(`  shared/unfiltered (every squad, subject to role_filters): ${visible.filter((i) => !i.victim_code).length}`);
  const roleCounts = {};
  for (const i of visible) for (const r of i.role_filters ?? []) roleCounts[r] = (roleCounts[r] ?? 0) + 1;
  console.log('  role-scoped counts (within the shared/victim pools above):', roleCounts);
  console.log('\nApprox. per-student load for a squad tasked with REDSTONE, one special_agent + one operational_support_da:');
  const sharedUnfiltered = visible.filter((i) => !i.victim_code && (i.role_filters ?? []).length === 0).length;
  const redstoneUnfiltered = visible.filter((i) => i.victim_code === 'REDSTONE' && (i.role_filters ?? []).length === 0).length;
  const daOnly = visible.filter((i) => (i.role_filters ?? []).includes('operational_support_da')).length;
  console.log(`  special_agent sees:            ~${sharedUnfiltered + redstoneUnfiltered} items (was 222)`);
  console.log(`  operational_support_da sees:   ~${sharedUnfiltered + redstoneUnfiltered + daOnly} items (was 222)`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
