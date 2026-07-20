'use strict';

// The 20240102000001 seeder guessed at a 12-section structure before the
// final slide decks/labs arrived (lair-app/lair-content). The delivered
// content has 11 real sections that don't line up 1:1 with that guess —
// Package Managers and The Sleuth Kit were cut, and Filesystem & Disk
// Imaging split into separate Day 1 (Filesystems, Filesystem Artifacts, OS
// File Structures) and Day 3 (Imaging Collection) sections. This replaces
// the old guessed assignments with ones matching the real agenda
// (lair-app/lair-content/Final_Agenda (1).txt) and zip folder names, so
// ingest-lair-content.js has a real linked_assignment_id to attach files to.
const COURSE_ID = 'b3e1f7a2-4c8d-4e9f-a012-3d5678901234'; // LAIR course

const DAY1_ID = 'c1000001-0000-0000-0000-000000000001';
const DAY2_ID = 'c2000002-0000-0000-0000-000000000002';
const DAY3_ID = 'c3000003-0000-0000-0000-000000000003';

const OLD_ASSIGNMENT_IDS = [
  'd1a00001-0000-0000-0000-000000000001',
  'd1a00002-0000-0000-0000-000000000002',
  'd1a00003-0000-0000-0000-000000000003',
  'd1a00004-0000-0000-0000-000000000004',
  'd2a00001-0000-0000-0000-000000000005',
  'd2a00002-0000-0000-0000-000000000006',
  'd2a00003-0000-0000-0000-000000000007',
  'd2a00004-0000-0000-0000-000000000008',
  'd3a00001-0000-0000-0000-000000000009',
  'd3a00002-0000-0000-0000-000000000010',
  'd3a00003-0000-0000-0000-000000000011',
  'd3a00004-0000-0000-0000-000000000012',
];

// Kept verbatim from 20240102000001 so `down()` can restore it exactly.
const OLD_ASSIGNMENTS = [
  {
    id: 'd1a00001-0000-0000-0000-000000000001',
    title: 'Day 1 – Intro & Basic Linux Commands',
    description:
      'Linux command-line fundamentals: navigation, file operations, permissions, process management, and networking commands. ' +
      'Includes a follow-along lab using the SIFT Workstation.',
    type: 'module', order_index: 100, max_score: 100,
  },
  {
    id: 'd1a00002-0000-0000-0000-000000000002',
    title: 'Day 1 – Package Managers',
    description:
      'APT, dpkg, and YUM/DNF package management. Installing, updating, removing, and auditing packages during an investigation. ' +
      'Lab: enumerate installed packages and identify anomalies.',
    type: 'module', order_index: 110, max_score: 100,
  },
  {
    id: 'd1a00003-0000-0000-0000-000000000003',
    title: 'Day 1 – Linux Filesystem & Disk Imaging',
    description:
      'Linux filesystem types (ext4, xfs, btrfs), disk layout, partition tables. Evidence acquisition using dd, dcfldd, and FTK Imager. ' +
      'Mounting images read-only and verifying integrity with hash validation. Lab: image and mount a suspect drive.',
    type: 'module', order_index: 120, max_score: 100,
  },
  {
    id: 'd1a00004-0000-0000-0000-000000000004',
    title: 'Day 1 – The Sleuth Kit (TSK) [Flex Section]',
    description:
      'Open-source command-line forensic tools: mmls, fsstat, fls, icat, mactime. ' +
      'Navigating a filesystem image without mounting it. ' +
      'Note: this section may be replaced with additional Filesystem Structures or Log Analysis content.',
    type: 'module', order_index: 130, max_score: 100,
  },
  {
    id: 'd2a00001-0000-0000-0000-000000000005',
    title: 'Day 2 – Linux Filesystem Hierarchy',
    description:
      'FHS deep-dive: /etc, /var, /home, /proc, /sys, /tmp, /usr, /opt. Critical artifact locations and their forensic significance. ' +
      'Transition into threat hunting using filesystem artifacts. Lab: locate attacker-relevant files from a compromised image.',
    type: 'module', order_index: 200, max_score: 100,
  },
  {
    id: 'd2a00002-0000-0000-0000-000000000006',
    title: 'Day 2 – Device Profiling & Log Basics',
    description:
      'Validating you have the correct device: hardware identifiers, OS version, kernel, hostname, timezone, and uptime artifacts. ' +
      'Introduction to Linux logging subsystems: syslog, rsyslog, journald. Log formats, rotation, and where to look first.',
    type: 'module', order_index: 210, max_score: 100,
  },
  {
    id: 'd2a00003-0000-0000-0000-000000000007',
    title: 'Day 2 – System & Authentication Logs',
    description:
      'Red Hat vs Debian log locations and key differences. /var/log/auth.log, /var/log/secure, wtmp, btmp, lastlog. ' +
      'Identifying brute-force attempts, privilege escalation, and lateral movement. ' +
      'UFW/iptables/firewalld and auditd log analysis. Lab: hunt for IOCs in a provided auth log set.',
    type: 'module', order_index: 220, max_score: 100,
  },
  {
    id: 'd2a00004-0000-0000-0000-000000000008',
    title: 'Day 2 – Application Logs',
    description:
      'Web server logs (Apache/Nginx): access and error log formats, detecting web attacks. ' +
      'TLS/SSL certificate and handshake logs. Database logs: MariaDB, MySQL, PostgreSQL — query logs, slow query logs, error logs. ' +
      'journald and journal log analysis. Lab: correlate web and database logs to reconstruct an attack chain.',
    type: 'module', order_index: 230, max_score: 100,
  },
  {
    id: 'd3a00001-0000-0000-0000-000000000009',
    title: 'Day 3 – Memory Collection & Analysis',
    description:
      'Volatile memory acquisition with AVML and LiME. Bulk_extractor for rapid artefact extraction. ' +
      'Key memory-on-filesystem locations. Rootkits and Loadable Kernel Modules (LKMs): detection with rkhunter and manual discovery. ' +
      'Lab: acquire memory from a live SIFT VM and run bulk_extractor.',
    type: 'module', order_index: 300, max_score: 100,
  },
  {
    id: 'd3a00002-0000-0000-0000-000000000010',
    title: 'Day 3 – Live System Analysis via /proc',
    description:
      'Advantages and limitations of live analysis. Interrogating /proc: running processes, open file descriptors, network connections, ' +
      'loaded modules, environment variables, and mapped memory. ' +
      'Lab: enumerate a live system and identify anomalous /proc entries.',
    type: 'module', order_index: 310, max_score: 100,
  },
  {
    id: 'd3a00003-0000-0000-0000-000000000011',
    title: 'Day 3 – Triage Collection',
    description:
      'Scoped artifact collection for rapid response: what to collect, collection order (volatility order), and packaging evidence. ' +
      'Triage scripts and tools. Chain-of-custody considerations.',
    type: 'module', order_index: 320, max_score: 100,
  },
  {
    id: 'd3a00004-0000-0000-0000-000000000012',
    title: 'Day 3 – Filesystem Timelines & Super Timelines',
    description:
      'MAC(B) timestamps and their meaning. Building filesystem timelines with fls/mactime and log2timeline/plaso. ' +
      'Super timeline construction, filtering noise, and identifying key events. ' +
      'Anti-forensics: timestamp manipulation (timestomping) and detection strategies. ' +
      'Lab: build and analyze a super timeline from a prepared disk image.',
    type: 'module', order_index: 330, max_score: 100,
  },
];

// New assignments — one per real zip section folder, in agenda order. IDs
// are fresh (not reused from OLD_ASSIGNMENTS) so down() can cleanly tell the
// two sets apart. `section` is the zip folder name ingest-lair-content.js
// matches against to set linked_assignment_id.
const NEW_ASSIGNMENTS = [
  // ── Day 1 ──────────────────────────────────────────────────────────────
  {
    id: 'e1a10001-0000-0000-0000-000000000001',
    section: 'Linux_Commands',
    title: 'Day 1 – Linux Commands',
    description:
      'Linux command-line fundamentals: navigation, file operations, permissions, process management, and networking commands. ' +
      'Includes a follow-along lab using the SIFT Workstation.',
    module_id: DAY1_ID, order_index: 100,
  },
  {
    id: 'e1a10002-0000-0000-0000-000000000002',
    section: 'Linux_Operating_System_File_Structures_DFIR',
    title: 'Day 1 – Linux OS File Structures',
    description:
      'Linux directory layout and file structure conventions. Lab: navigate and identify key structures on a SIFT Workstation image.',
    module_id: DAY1_ID, order_index: 110,
  },
  {
    id: 'e1a10003-0000-0000-0000-000000000003',
    section: 'Linux_Filesystems',
    title: 'Day 1 – Linux Filesystems',
    description:
      'Linux filesystem types (ext4, xfs, btrfs), disk layout, and partition tables. Lecture only — no lab for this section.',
    module_id: DAY1_ID, order_index: 120,
  },
  {
    id: 'e1a10004-0000-0000-0000-000000000004',
    section: 'Linux_Filesystem_Artifacts_DFIR',
    title: 'Day 1 – Linux Filesystem Artifacts',
    description:
      'Forensically significant filesystem artifacts and where to find them. Lab: locate and interpret filesystem artifacts on a provided image.',
    module_id: DAY1_ID, order_index: 130,
  },

  // ── Day 2 ──────────────────────────────────────────────────────────────
  {
    id: 'e2a20001-0000-0000-0000-000000000005',
    section: 'Linux_Device_Profiling_Log_Basics',
    title: 'Day 2 – Device Profiling & Log Basics',
    description:
      'Validating you have the correct device: hardware identifiers, OS version, kernel, hostname, timezone, and uptime artifacts. ' +
      'Introduction to Linux logging subsystems: syslog, rsyslog, journald. Log formats, rotation, and where to look first.',
    module_id: DAY2_ID, order_index: 200,
  },
  {
    id: 'e2a20002-0000-0000-0000-000000000006',
    section: 'Linux_AppLogs_DFIR_Part_1',
    title: 'Day 2 – Application Logs & DFIR Analysis, Part 1',
    description:
      'Application and system log analysis for DFIR, part 1. Lab review held in class before Part 2 begins.',
    module_id: DAY2_ID, order_index: 210,
  },
  {
    id: 'e2a20003-0000-0000-0000-000000000007',
    section: 'Linux_AppLogs_DFIR_Part_2',
    title: 'Day 2 – Application Logs & DFIR Analysis, Part 2',
    description:
      'Application and system log analysis for DFIR, part 2. Builds on Part 1 with an extended lab.',
    module_id: DAY2_ID, order_index: 220,
  },

  // ── Day 3 ──────────────────────────────────────────────────────────────
  {
    id: 'e3a30001-0000-0000-0000-000000000008',
    section: 'Linux_Timelines',
    title: 'Day 3 – Linux Timelines',
    description:
      'MAC(B) timestamps and their meaning. Building filesystem timelines with fls/mactime and log2timeline/plaso. ' +
      'Super timeline construction, filtering noise, and identifying key events. Lab: build and analyze a timeline from a prepared disk image.',
    module_id: DAY3_ID, order_index: 300,
  },
  {
    id: 'e3a30002-0000-0000-0000-000000000009',
    section: 'Linux_Live_Memory_Analysis_DFIR',
    title: 'Day 3 – Live Memory Analysis',
    description:
      'Live system and memory analysis: running processes, open file descriptors, network connections, loaded modules, ' +
      'and other volatile artifacts. Lab: enumerate a live system and identify anomalies.',
    module_id: DAY3_ID, order_index: 310,
  },
  {
    id: 'e3a30003-0000-0000-0000-000000000010',
    section: 'Linux_Live_Memory_Collection_DFIR',
    title: 'Day 3 – Linux Memory Collection',
    description:
      'Volatile memory acquisition with AVML and LiME. Lab: acquire memory from a live SIFT VM.',
    module_id: DAY3_ID, order_index: 320,
  },
  {
    id: 'e3a30004-0000-0000-0000-000000000011',
    section: 'Linux_Imaging_Collection',
    title: 'Day 3 – Linux Image Collection',
    description:
      'Evidence acquisition using dd, dcfldd, and FTK Imager. Mounting images read-only and verifying integrity with hash validation. ' +
      'Lab is optional for this section.',
    module_id: DAY3_ID, order_index: 330,
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkDelete('assignments', { id: OLD_ASSIGNMENT_IDS });

    await queryInterface.bulkInsert(
      'assignments',
      NEW_ASSIGNMENTS.map((a) => ({
        id:           a.id,
        course_id:    COURSE_ID,
        title:        a.title,
        description:  a.description,
        type:         'module',
        grading_mode: 'individual',
        order_index:  a.order_index,
        max_score:    100,
        is_published: false,
        questions:    JSON.stringify([]),
        created_at:   now,
        updated_at:   now,
      })),
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('assignments', { id: NEW_ASSIGNMENTS.map((a) => a.id) });

    const now = new Date();
    await queryInterface.bulkInsert(
      'assignments',
      OLD_ASSIGNMENTS.map((a) => ({
        id:           a.id,
        course_id:    COURSE_ID,
        title:        a.title,
        description:  a.description,
        type:         a.type,
        grading_mode: 'individual',
        order_index:  a.order_index,
        max_score:    a.max_score,
        is_published: false,
        questions:    JSON.stringify([]),
        created_at:   now,
        updated_at:   now,
      })),
      { ignoreDuplicates: true }
    );
  },
};

module.exports.SECTION_TO_ASSIGNMENT = NEW_ASSIGNMENTS.reduce((acc, a) => {
  acc[a.section] = { id: a.id, order_index: a.order_index };
  return acc;
}, {});
module.exports.COURSE_ID = COURSE_ID;
