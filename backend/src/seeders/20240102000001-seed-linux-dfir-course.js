'use strict';
const { randomUUID } = require('crypto');

// Fixed UUIDs so the seeder is idempotent (re-running won't duplicate records).
const COURSE_ID = 'b3e1f7a2-4c8d-4e9f-a012-3d5678901234'; // LAIR course

const DAY1_ID = 'c1000001-0000-0000-0000-000000000001';
const DAY2_ID = 'c2000002-0000-0000-0000-000000000002';
const DAY3_ID = 'c3000003-0000-0000-0000-000000000003';

// Assignments — one per section that has a lab; purely instructional sections
// are included as 'module' type with no questions so they appear in the list.
const ASSIGNMENTS = [
  // ── Day 1 ──────────────────────────────────────────────────────────────────
  {
    id: 'd1a00001-0000-0000-0000-000000000001',
    title: 'Day 1 – Intro & Basic Linux Commands',
    description:
      'Linux command-line fundamentals: navigation, file operations, permissions, process management, and networking commands. ' +
      'Includes a follow-along lab using the SIFT Workstation.',
    type: 'module',
    order_index: 100,
    max_score: 100,
  },
  {
    id: 'd1a00002-0000-0000-0000-000000000002',
    title: 'Day 1 – Package Managers',
    description:
      'APT, dpkg, and YUM/DNF package management. Installing, updating, removing, and auditing packages during an investigation. ' +
      'Lab: enumerate installed packages and identify anomalies.',
    type: 'module',
    order_index: 110,
    max_score: 100,
  },
  {
    id: 'd1a00003-0000-0000-0000-000000000003',
    title: 'Day 1 – Linux Filesystem & Disk Imaging',
    description:
      'Linux filesystem types (ext4, xfs, btrfs), disk layout, partition tables. Evidence acquisition using dd, dcfldd, and FTK Imager. ' +
      'Mounting images read-only and verifying integrity with hash validation. Lab: image and mount a suspect drive.',
    type: 'module',
    order_index: 120,
    max_score: 100,
  },
  {
    id: 'd1a00004-0000-0000-0000-000000000004',
    title: 'Day 1 – The Sleuth Kit (TSK) [Flex Section]',
    description:
      'Open-source command-line forensic tools: mmls, fsstat, fls, icat, mactime. ' +
      'Navigating a filesystem image without mounting it. ' +
      'Note: this section may be replaced with additional Filesystem Structures or Log Analysis content.',
    type: 'module',
    order_index: 130,
    max_score: 100,
  },

  // ── Day 2 ──────────────────────────────────────────────────────────────────
  {
    id: 'd2a00001-0000-0000-0000-000000000005',
    title: 'Day 2 – Linux Filesystem Hierarchy',
    description:
      'FHS deep-dive: /etc, /var, /home, /proc, /sys, /tmp, /usr, /opt. Critical artifact locations and their forensic significance. ' +
      'Transition into threat hunting using filesystem artifacts. Lab: locate attacker-relevant files from a compromised image.',
    type: 'module',
    order_index: 200,
    max_score: 100,
  },
  {
    id: 'd2a00002-0000-0000-0000-000000000006',
    title: 'Day 2 – Device Profiling & Log Basics',
    description:
      'Validating you have the correct device: hardware identifiers, OS version, kernel, hostname, timezone, and uptime artifacts. ' +
      'Introduction to Linux logging subsystems: syslog, rsyslog, journald. Log formats, rotation, and where to look first.',
    type: 'module',
    order_index: 210,
    max_score: 100,
  },
  {
    id: 'd2a00003-0000-0000-0000-000000000007',
    title: 'Day 2 – System & Authentication Logs',
    description:
      'Red Hat vs Debian log locations and key differences. /var/log/auth.log, /var/log/secure, wtmp, btmp, lastlog. ' +
      'Identifying brute-force attempts, privilege escalation, and lateral movement. ' +
      'UFW/iptables/firewalld and auditd log analysis. Lab: hunt for IOCs in a provided auth log set.',
    type: 'module',
    order_index: 220,
    max_score: 100,
  },
  {
    id: 'd2a00004-0000-0000-0000-000000000008',
    title: 'Day 2 – Application Logs',
    description:
      'Web server logs (Apache/Nginx): access and error log formats, detecting web attacks. ' +
      'TLS/SSL certificate and handshake logs. Database logs: MariaDB, MySQL, PostgreSQL — query logs, slow query logs, error logs. ' +
      'journald and journal log analysis. Lab: correlate web and database logs to reconstruct an attack chain.',
    type: 'module',
    order_index: 230,
    max_score: 100,
  },

  // ── Day 3 ──────────────────────────────────────────────────────────────────
  {
    id: 'd3a00001-0000-0000-0000-000000000009',
    title: 'Day 3 – Memory Collection & Analysis',
    description:
      'Volatile memory acquisition with AVML and LiME. Bulk_extractor for rapid artefact extraction. ' +
      'Key memory-on-filesystem locations. Rootkits and Loadable Kernel Modules (LKMs): detection with rkhunter and manual discovery. ' +
      'Lab: acquire memory from a live SIFT VM and run bulk_extractor.',
    type: 'module',
    order_index: 300,
    max_score: 100,
  },
  {
    id: 'd3a00002-0000-0000-0000-000000000010',
    title: 'Day 3 – Live System Analysis via /proc',
    description:
      'Advantages and limitations of live analysis. Interrogating /proc: running processes, open file descriptors, network connections, ' +
      'loaded modules, environment variables, and mapped memory. ' +
      'Lab: enumerate a live system and identify anomalous /proc entries.',
    type: 'module',
    order_index: 310,
    max_score: 100,
  },
  {
    id: 'd3a00003-0000-0000-0000-000000000011',
    title: 'Day 3 – Triage Collection',
    description:
      'Scoped artifact collection for rapid response: what to collect, collection order (volatility order), and packaging evidence. ' +
      'Triage scripts and tools. Chain-of-custody considerations.',
    type: 'module',
    order_index: 320,
    max_score: 100,
  },
  {
    id: 'd3a00004-0000-0000-0000-000000000012',
    title: 'Day 3 – Filesystem Timelines & Super Timelines',
    description:
      'MAC(B) timestamps and their meaning. Building filesystem timelines with fls/mactime and log2timeline/plaso. ' +
      'Super timeline construction, filtering noise, and identifying key events. ' +
      'Anti-forensics: timestamp manipulation (timestomping) and detection strategies. ' +
      'Lab: build and analyze a super timeline from a prepared disk image.',
    type: 'module',
    order_index: 330,
    max_score: 100,
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // ── Course ────────────────────────────────────────────────────────────────
    await queryInterface.bulkInsert(
      'courses',
      [
        {
          id:          COURSE_ID,
          title:       'LAIR — Linux Analysis & Incident Response',
          description:
            '3-day hands-on course covering Linux analysis and incident response fundamentals: evidence acquisition, ' +
            'filesystem forensics, log analysis, memory collection, live system analysis, and super timelines. ' +
            'Students use the SIFT Workstation (VirtualBox OVA) for all labs. ' +
            'Each section (~90 min) includes slides, a follow-along lab, and digital handouts.',
          course_code: 'LAIR-301',
          status:      'draft',
          created_at:  now,
          updated_at:  now,
        },
      ],
      { ignoreDuplicates: true }
    );

    // ── Modules (one per day) ─────────────────────────────────────────────────
    await queryInterface.bulkInsert(
      'modules',
      [
        {
          id:          DAY1_ID,
          course_id:   COURSE_ID,
          title:       'Day 1 – Linux Foundations & Evidence Collection',
          description:
            'Linux command review, package managers, filesystem basics, disk imaging, and optional Sleuth Kit introduction.',
          order_index:  1,
          is_published: false,
          created_at:   now,
          updated_at:   now,
        },
        {
          id:          DAY2_ID,
          course_id:   COURSE_ID,
          title:       'Day 2 – Filesystem Hierarchy, Threat Hunting & Log Analysis',
          description:
            'FHS deep-dive, device profiling, system/auth log analysis (RHEL & Debian), and application log analysis ' +
            '(web, TLS, database, firewall, auditd, journal).',
          order_index:  2,
          is_published: false,
          created_at:   now,
          updated_at:   now,
        },
        {
          id:          DAY3_ID,
          course_id:   COURSE_ID,
          title:       'Day 3 – Memory, Live Analysis & Timelines',
          description:
            'Memory acquisition and analysis (AVML/LiME/bulk_extractor), rootkit detection, live /proc analysis, ' +
            'triage collection, and super timeline construction.',
          order_index:  3,
          is_published: false,
          created_at:   now,
          updated_at:   now,
        },
      ],
      { ignoreDuplicates: true }
    );

    // ── Assignments ───────────────────────────────────────────────────────────
    await queryInterface.bulkInsert(
      'assignments',
      ASSIGNMENTS.map((a) => ({
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

  async down(queryInterface) {
    await queryInterface.bulkDelete('assignments', {
      course_id: COURSE_ID,
    });
    await queryInterface.bulkDelete('modules', {
      course_id: COURSE_ID,
    });
    await queryInterface.bulkDelete('courses', {
      id: COURSE_ID,
    });
  },
};
