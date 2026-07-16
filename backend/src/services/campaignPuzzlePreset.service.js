'use strict';
const crypto = require('node:crypto');

const GAME_PRESETS = [
  {
    id: 'signal-hunt-bravo-relay',
    optionId: 'signal_hunt',
    label: 'SIGNAL TRACE — Bravo Relay',
    description: 'A ready-to-run source-inspection challenge using a concise operational code.',
    tags: { difficulty: 'beginner', objective: 'source inspection', storyline: 'Operation Nightwatch' },
    prompt: 'Inspect the page source for the embedded field signal_code. Submit its value exactly as written.',
    answer: 'BRAVO-7-TANGO',
    config: { signalCode: 'BRAVO-7-TANGO' },
  },
  {
    id: 'vault-lock-incident-clock',
    optionId: 'vault_lock',
    label: 'VAULT LOCK — Incident Clock',
    description: 'Derive a four-digit PIN from the stated incident timeline.',
    tags: { difficulty: 'beginner', objective: 'timeline analysis', storyline: 'Operation Nightwatch' },
    prompt: 'The incident began at 21:00 and containment finished 47 minutes later. Enter the four-digit 24-hour completion time (HHMM).',
    answer: '2147',
    config: {},
  },
  {
    id: 'cipher-caesar-isolate-host',
    optionId: 'cipher_caesar',
    label: 'CIPHER WHEEL — Isolate Host',
    description: 'Decode a Caesar-shifted containment instruction using the built-in rotation workbench.',
    tags: { difficulty: 'beginner', objective: 'classical cryptography', storyline: 'Operation Nightwatch' },
    prompt: 'Rotate the intercepted text back to plaintext and submit the full two-word instruction.',
    answer: 'ISOLATE HOST',
    config: { method: 'caesar', shift: 7, cipherText: 'PZVSHAL OVZA' },
  },
  {
    id: 'cipher-rot13-verify-backup',
    optionId: 'cipher_rot13',
    label: 'ROT13 — Recovery Check',
    description: 'Decode a fixed ROT13 recovery instruction.',
    tags: { difficulty: 'beginner', objective: 'classical cryptography', storyline: 'Recovery Runbook' },
    prompt: 'Apply ROT13 to the intercepted text and submit the full two-word instruction.',
    answer: 'VERIFY BACKUP',
    config: { method: 'rot13', cipherText: 'IREVSL ONPXHC' },
  },
  {
    id: 'cipher-atbash-zero-trust',
    optionId: 'cipher_atbash',
    label: 'ATBASH — Access Doctrine',
    description: 'Decode a short security principle with the reversed alphabet.',
    tags: { difficulty: 'intermediate', objective: 'classical cryptography', storyline: 'Zero Trust Initiative' },
    prompt: 'Decode the Atbash text (A↔Z, B↔Y) and submit the two-word phrase.',
    answer: 'ZERO TRUST',
    config: { method: 'atbash', cipherText: 'AVIL GIFHG' },
  },
  {
    id: 'auth-log-impossible-travel',
    optionId: 'log_auth',
    label: 'AUTH LOG — Impossible Travel',
    description: 'Identify the account with successful sign-ins from distant regions minutes apart.',
    tags: { difficulty: 'intermediate', objective: 'identity threat detection', storyline: 'RestonIT Intrusion' },
    prompt: 'Find the account with successful sign-ins from Virginia and Germany within ten minutes. Submit the email address only.',
    answer: 'morgan@restit.example',
    config: {
      lineFormat: 'auth',
      logLines: [
        '2026-04-08T08:11:03Z result=SUCCESS user=casey@restit.example region=US-VA method=mfa',
        '2026-04-08T08:14:19Z result=FAIL user=jamie@restit.example region=DE-BE reason=bad_password',
        '2026-04-08T09:02:41Z result=SUCCESS user=morgan@restit.example region=US-VA method=mfa',
        '2026-04-08T09:09:12Z result=SUCCESS user=morgan@restit.example region=DE-BE method=password',
        '2026-04-08T09:15:55Z result=SUCCESS user=casey@restit.example region=US-VA method=mfa',
      ],
    },
  },
  {
    id: 'packet-heist-restonit-cross-service-denials',
    optionId: 'log_firewall',
    label: 'PACKET HEIST — RestonIT Cross-Service Denials (through Drop 4)',
    description: 'Correlate denied activity across RestonIT mail, remote-support, and credential-vault services without implying a successful compromise.',
    tags: { difficulty: 'advanced', objective: 'network log correlation', storyline: 'Packet Heist' },
    prompt: 'RestonIT reported failed authentication activity between March 18 and March 20. Filter the firewall stream for DENY events and identify the single source IP that attempted to reach all three protected services: mail portal, remote-support gateway, and credential vault. Submit the source IP only. These denied events support further investigation; they do not prove a successful compromise.',
    answer: '192.0.2.201',
    config: {
      lineFormat: 'firewall',
      logLines: [
        '2026-03-18T13:42:11Z action=ALLOW src=198.51.100.24 dst=10.44.20.15 dpt=443 service=mail-portal user=taylor@restit.example reason=mfa_pass',
        '2026-03-18T14:03:27Z action=DENY src=192.0.2.201 dst=10.44.20.15 dpt=443 service=mail-portal user=support@restit.example reason=geo_policy',
        '2026-03-18T14:04:02Z action=DENY src=192.0.2.201 dst=10.44.20.15 dpt=443 service=mail-portal user=helpdesk@restit.example reason=geo_policy',
        '2026-03-18T16:18:44Z action=DENY src=203.0.113.162 dst=10.44.20.15 dpt=443 service=mail-portal user=unknown reason=rate_limit',
        '2026-03-19T02:11:09Z action=ALLOW src=198.51.100.31 dst=10.44.30.20 dpt=443 service=remote-support user=sam@restit.example reason=mfa_pass',
        '2026-03-19T02:17:55Z action=DENY src=192.0.2.201 dst=10.44.30.20 dpt=443 service=remote-support user=sam@restit.example reason=geo_policy',
        '2026-03-19T02:18:13Z action=DENY src=192.0.2.201 dst=10.44.30.20 dpt=443 service=remote-support user=support@restit.example reason=geo_policy',
        '2026-03-19T09:26:38Z action=DENY src=198.51.100.87 dst=10.44.30.20 dpt=22 service=remote-support user=unknown reason=port_policy',
        '2026-03-19T15:51:06Z action=ALLOW src=198.51.100.24 dst=10.44.40.12 dpt=443 service=credential-vault user=alex@restit.example reason=mfa_pass',
        '2026-03-20T00:07:41Z action=DENY src=203.0.113.162 dst=10.44.20.15 dpt=443 service=mail-portal user=unknown reason=rate_limit',
        '2026-03-20T00:12:08Z action=DENY src=192.0.2.201 dst=10.44.40.12 dpt=443 service=credential-vault user=alex@restit.example reason=geo_policy',
        '2026-03-20T00:12:49Z action=DENY src=192.0.2.201 dst=10.44.40.12 dpt=443 service=credential-vault user=support@restit.example reason=geo_policy',
        '2026-03-20T08:33:17Z action=ALLOW src=198.51.100.31 dst=10.44.30.20 dpt=443 service=remote-support user=sam@restit.example reason=mfa_pass',
        '2026-03-20T11:05:29Z action=DENY src=198.51.100.87 dst=10.44.40.12 dpt=22 service=credential-vault user=unknown reason=port_policy',
        '2026-03-20T17:22:53Z action=ALLOW src=198.51.100.24 dst=10.44.20.15 dpt=443 service=mail-portal user=alex@restit.example reason=mfa_pass',
      ],
    },
  },
  {
    id: 'vpn-log-stale-contractor',
    optionId: 'log_vpn',
    label: 'VPN LOG — Stale Contractor Access',
    description: 'Locate the disabled contractor account that established a VPN session.',
    tags: { difficulty: 'intermediate', objective: 'remote access auditing', storyline: 'RestonIT Intrusion' },
    prompt: 'Filter for a CONNECTED event involving an account marked disabled=true. Submit the username only.',
    answer: 'contractor.lee',
    config: {
      lineFormat: 'vpn',
      logLines: [
        '2026-04-11T22:01:08Z event=CONNECTED user=alex source=198.51.100.18 disabled=false tunnel=corp-east',
        '2026-04-11T22:07:31Z event=REJECTED user=contractor.lee source=203.0.113.45 disabled=true reason=device_posture',
        '2026-04-11T22:09:02Z event=CONNECTED user=contractor.lee source=203.0.113.45 disabled=true tunnel=corp-east',
        '2026-04-11T22:13:46Z event=DISCONNECTED user=alex source=198.51.100.18 disabled=false tunnel=corp-east',
        '2026-04-11T22:18:20Z event=CONNECTED user=sam source=198.51.100.77 disabled=false tunnel=corp-west',
      ],
    },
  },
  {
    id: 'vpn-log-restonit-noncompliant-device',
    optionId: 'log_vpn',
    label: 'VPN LOG — RestonIT Noncompliant Device',
    description: 'Identify the RestonIT account that established remote access from a device that failed compliance checks.',
    tags: { difficulty: 'beginner', objective: 'remote access auditing', storyline: 'RestonIT Intrusion' },
    prompt: 'Find the CONNECTED event where device_compliant=false. Submit the username only.',
    answer: 'j.holloway',
    config: {
      lineFormat: 'vpn',
      logLines: [
        '2026-04-12T07:42:18Z event=CONNECTED user=a.nguyen source=198.51.100.24 device=RIT-LT-104 device_compliant=true tunnel=corp-east',
        '2026-04-12T07:48:03Z event=REJECTED user=m.santos source=203.0.113.61 device=UNKNOWN device_compliant=false reason=device_posture',
        '2026-04-12T07:51:29Z event=CONNECTED user=j.holloway source=203.0.113.88 device=BYOD-771 device_compliant=false tunnel=corp-east',
        '2026-04-12T08:02:47Z event=DISCONNECTED user=a.nguyen source=198.51.100.24 device=RIT-LT-104 device_compliant=true tunnel=corp-east',
        '2026-04-12T08:11:15Z event=CONNECTED user=d.wright source=198.51.100.52 device=RIT-LT-219 device_compliant=true tunnel=corp-west',
      ],
    },
  },
  {
    id: 'hash-md5-legacy-manifest',
    optionId: 'hash_md5',
    label: 'MD5 — Legacy Manifest',
    description: 'Practice reproducing a legacy checksum from an exact evidence string.',
    tags: { difficulty: 'beginner', objective: 'file integrity verification', storyline: 'Digital Evidence Lab' },
    prompt: 'Compute the MD5 digest of the evidence text exactly as shown and submit the lowercase hexadecimal digest.',
    config: { algorithm: 'md5', inputText: 'artifact=backup-17.zip;size=4096' },
  },
  {
    id: 'hash-sha1-chain-record',
    optionId: 'hash_sha1',
    label: 'SHA-1 — Chain Record',
    description: 'Verify a compact evidence custody record with SHA-1.',
    tags: { difficulty: 'intermediate', objective: 'chain of custody', storyline: 'Digital Evidence Lab' },
    prompt: 'Compute the SHA-1 digest of the evidence text exactly as shown and submit the lowercase hexadecimal digest.',
    config: { algorithm: 'sha1', inputText: 'CASE-1042|USB-03|2026-04-12T14:30:00Z' },
  },
  {
    id: 'hash-sha256-evidence-integrity',
    optionId: 'hash_sha256',
    label: 'SHA-256 — Evidence Integrity',
    description: 'Use SHA-256 to fingerprint a forensic acquisition record.',
    tags: { difficulty: 'intermediate', objective: 'file integrity verification', storyline: 'Digital Evidence Lab' },
    prompt: 'Compute the SHA-256 digest of the evidence text exactly as shown and submit the lowercase hexadecimal digest.',
    config: { algorithm: 'sha256', inputText: 'image=disk01.E01;examiner=RIVERA;verified=true' },
  },
  {
    id: 'signal-hunt-ember-beacon', optionId: 'signal_hunt', label: 'SIGNAL TRACE — Ember Beacon',
    description: 'Locate a mixed-case beacon token in page source.',
    tags: { difficulty: 'intermediate', objective: 'source inspection', storyline: 'Ember Watch' },
    prompt: 'Inspect the page source for signal_code and submit the value with its original capitalization.',
    answer: 'Ember-9-Kilo', config: { signalCode: 'Ember-9-Kilo' },
  },
  {
    id: 'signal-hunt-ghost-relay', optionId: 'signal_hunt', label: 'SIGNAL TRACE — Ghost Relay',
    description: 'Recover a longer segmented source token without normalization.',
    tags: { difficulty: 'advanced', objective: 'source inspection', storyline: 'Ghost Relay' },
    prompt: 'Find the embedded signal_code in the page source. Submit every segment exactly, including hyphens.',
    answer: 'GHOST-14-DELTA-6', config: { signalCode: 'GHOST-14-DELTA-6' },
  },
  {
    id: 'vault-lock-evidence-count', optionId: 'vault_lock', label: 'VAULT LOCK — Evidence Count',
    description: 'Calculate a PIN from two evidence inventory counts.',
    tags: { difficulty: 'intermediate', objective: 'evidence accounting', storyline: 'Digital Evidence Lab' },
    prompt: 'Investigators acquired 18 drives and 27 mobile devices. Concatenate the two two-digit counts to form the PIN.',
    answer: '1827', config: {},
  },
  {
    id: 'vault-lock-port-pair', optionId: 'vault_lock', label: 'VAULT LOCK — Secure Port Pair',
    description: 'Derive a PIN from standard secure service ports.',
    tags: { difficulty: 'advanced', objective: 'network service recognition', storyline: 'Packet Heist' },
    prompt: 'Concatenate the standard port for HTTPS followed by the standard port for SSH. Enter all five digits.',
    answer: '44322', config: {},
  },
  {
    id: 'cipher-caesar-secure-node', optionId: 'cipher_caesar', label: 'CIPHER WHEEL — Secure Node',
    description: 'Decode a short Caesar instruction shifted by three.',
    tags: { difficulty: 'intermediate', objective: 'classical cryptography', storyline: 'Ember Watch' },
    prompt: 'Use the rotation workbench to decode the intercepted instruction.',
    answer: 'SECURE NODE', config: { method: 'caesar', shift: 3, cipherText: 'VHFXUH QRGH' },
  },
  {
    id: 'cipher-caesar-rotate-keys', optionId: 'cipher_caesar', label: 'CIPHER WHEEL — Rotate Keys',
    description: 'Identify an instruction hidden with a larger Caesar shift.',
    tags: { difficulty: 'advanced', objective: 'classical cryptography', storyline: 'Ghost Relay' },
    prompt: 'Determine the rotation and submit the decoded two-word instruction.',
    answer: 'ROTATE KEYS', config: { method: 'caesar', shift: 11, cipherText: 'CZELEP VPJD' },
  },
  {
    id: 'cipher-rot13-monitor-dns', optionId: 'cipher_rot13', label: 'ROT13 — Monitor DNS',
    description: 'Decode a network-monitoring instruction using ROT13.',
    tags: { difficulty: 'intermediate', objective: 'classical cryptography', storyline: 'Packet Heist' },
    prompt: 'Apply ROT13 and submit the decoded instruction.',
    answer: 'MONITOR DNS', config: { method: 'rot13', cipherText: 'ZBAVGBE QAF' },
  },
  {
    id: 'cipher-rot13-patch-server', optionId: 'cipher_rot13', label: 'ROT13 — Patch Server',
    description: 'Recover a remediation instruction from an intercepted message.',
    tags: { difficulty: 'advanced', objective: 'remediation sequencing', storyline: 'Ember Watch' },
    prompt: 'Decode the ROT13 message and submit the two-word remediation action.',
    answer: 'PATCH SERVER', config: { method: 'rot13', cipherText: 'CNGPU FREIRE' },
  },
  {
    id: 'cipher-atbash-audit-access', optionId: 'cipher_atbash', label: 'ATBASH — Audit Access',
    description: 'Decode an identity-review instruction using Atbash.',
    tags: { difficulty: 'beginner', objective: 'identity governance', storyline: 'RestonIT Intrusion' },
    prompt: 'Use the reversed alphabet to decode and submit the instruction.',
    answer: 'AUDIT ACCESS', config: { method: 'atbash', cipherText: 'ZFWRG ZXXVHH' },
  },
  {
    id: 'cipher-atbash-lock-account', optionId: 'cipher_atbash', label: 'ATBASH — Lock Account',
    description: 'Recover an account-containment action using Atbash.',
    tags: { difficulty: 'advanced', objective: 'identity containment', storyline: 'Ghost Relay' },
    prompt: 'Decode the Atbash evidence and submit the full containment action.',
    answer: 'LOCK ACCOUNT', config: { method: 'atbash', cipherText: 'OLXP ZXXLFMG' },
  },
  {
    id: 'auth-log-password-spray', optionId: 'log_auth', label: 'AUTH LOG — Password Spray',
    description: 'Identify a source producing failures across several accounts.',
    tags: { difficulty: 'beginner', objective: 'identity threat detection', storyline: 'Ember Watch' },
    prompt: 'Find the source IP associated with failures for three different users. Submit the IP only.',
    answer: '203.0.113.90', config: { lineFormat: 'auth', logLines: [
      '2026-05-02T10:01:00Z result=FAIL user=alex source=203.0.113.90', '2026-05-02T10:01:14Z result=FAIL user=sam source=203.0.113.90',
      '2026-05-02T10:01:29Z result=FAIL user=jamie source=203.0.113.90', '2026-05-02T10:02:03Z result=SUCCESS user=morgan source=198.51.100.8',
    ] },
  },
  {
    id: 'auth-log-dormant-admin', optionId: 'log_auth', label: 'AUTH LOG — Dormant Administrator',
    description: 'Correlate privileged access with dormant-account status.',
    tags: { difficulty: 'advanced', objective: 'privileged access monitoring', storyline: 'Ghost Relay' },
    prompt: 'Identify the dormant account that successfully accessed the admin console. Submit the username.',
    answer: 'svc.archive', config: { lineFormat: 'auth', logLines: [
      '2026-05-04T01:11:09Z result=SUCCESS user=svc.backup target=storage dormant=false',
      '2026-05-04T01:14:22Z result=SUCCESS user=svc.archive target=admin-console dormant=true',
      '2026-05-04T01:18:52Z result=FAIL user=admin target=admin-console dormant=false',
    ] },
  },
  {
    id: 'firewall-log-exposed-database', optionId: 'log_firewall', label: 'FIREWALL — Exposed Database',
    description: 'Find an allowed inbound connection to a database port.',
    tags: { difficulty: 'beginner', objective: 'network log analysis', storyline: 'Ember Watch' },
    prompt: 'Find the ALLOW event targeting database port 5432. Submit the source IP only.',
    answer: '198.51.100.66', config: { lineFormat: 'firewall', logLines: [
      '2026-05-06T03:10:00Z action=DENY src=203.0.113.4 dst=10.0.4.8 dpt=22',
      '2026-05-06T03:11:18Z action=ALLOW src=198.51.100.66 dst=10.0.4.20 dpt=5432',
      '2026-05-06T03:13:42Z action=ALLOW src=198.51.100.12 dst=10.0.4.8 dpt=443',
    ] },
  },
  {
    id: 'firewall-log-lateral-scan', optionId: 'log_firewall', label: 'FIREWALL — Lateral Scan',
    description: 'Correlate one internal source scanning multiple protected destinations.',
    tags: { difficulty: 'intermediate', objective: 'network log correlation', storyline: 'Ghost Relay' },
    prompt: 'Identify the source that was denied access to three distinct internal destinations. Submit its IP.',
    answer: '10.0.8.44', config: { lineFormat: 'firewall', logLines: [
      '2026-05-07T00:01:10Z action=DENY src=10.0.8.44 dst=10.0.2.10 dpt=445', '2026-05-07T00:01:14Z action=DENY src=10.0.8.44 dst=10.0.3.10 dpt=445',
      '2026-05-07T00:01:19Z action=DENY src=10.0.8.44 dst=10.0.4.10 dpt=3389', '2026-05-07T00:02:01Z action=DENY src=10.0.8.12 dst=10.0.2.10 dpt=22',
    ] },
  },
  {
    id: 'vpn-log-off-hours', optionId: 'log_vpn', label: 'VPN LOG — Off-Hours Session',
    description: 'Locate an approved user connecting outside the maintenance window.',
    tags: { difficulty: 'beginner', objective: 'remote access auditing', storyline: 'Recovery Runbook' },
    prompt: 'The approved window starts at 06:00Z. Identify the user who connected before it. Submit the username.',
    answer: 'rivera', config: { lineFormat: 'vpn', logLines: [
      '2026-05-08T05:42:00Z event=CONNECTED user=rivera source=198.51.100.9', '2026-05-08T06:03:14Z event=CONNECTED user=alex source=198.51.100.10',
      '2026-05-08T06:12:50Z event=CONNECTED user=sam source=198.51.100.11',
    ] },
  },
  {
    id: 'vpn-log-session-overlap', optionId: 'log_vpn', label: 'VPN LOG — Concurrent Regions',
    description: 'Correlate overlapping sessions for one identity in two regions.',
    tags: { difficulty: 'advanced', objective: 'session correlation', storyline: 'Ghost Relay' },
    prompt: 'Find the user with overlapping CONNECTED sessions in US-VA and NL-NH. Submit the username.',
    answer: 'patel', config: { lineFormat: 'vpn', logLines: [
      '2026-05-09T14:00:00Z event=CONNECTED user=patel region=US-VA session=A7', '2026-05-09T14:04:12Z event=CONNECTED user=patel region=NL-NH session=B2',
      '2026-05-09T14:07:00Z event=DISCONNECTED user=patel region=US-VA session=A7', '2026-05-09T14:10:00Z event=CONNECTED user=chen region=US-VA session=C4',
    ] },
  },
  {
    id: 'hash-md5-export-check', optionId: 'hash_md5', label: 'MD5 — Export Check',
    description: 'Fingerprint a short legacy export marker.',
    tags: { difficulty: 'intermediate', objective: 'file integrity verification', storyline: 'Recovery Runbook' },
    prompt: 'Compute the MD5 digest exactly as shown and submit lowercase hexadecimal.',
    config: { algorithm: 'md5', inputText: 'EXPORT|2026-05-10|records=842' },
  },
  {
    id: 'hash-md5-malware-sample', optionId: 'hash_md5', label: 'MD5 — Sample Triage',
    description: 'Create a legacy fingerprint for a malware triage record.',
    tags: { difficulty: 'advanced', objective: 'malware triage', storyline: 'Ghost Relay' },
    prompt: 'Hash the evidence string with MD5 exactly as displayed.',
    config: { algorithm: 'md5', inputText: 'sample=quarantine-04.bin|bytes=7312|status=isolated' },
  },
  {
    id: 'hash-sha1-email-record', optionId: 'hash_sha1', label: 'SHA-1 — Email Record',
    description: 'Fingerprint an email evidence record.',
    tags: { difficulty: 'beginner', objective: 'chain of custody', storyline: 'RestonIT Intrusion' },
    prompt: 'Compute the SHA-1 digest of the evidence text exactly as shown.',
    config: { algorithm: 'sha1', inputText: 'MSG-8821|mailbox=support|export=01' },
  },
  {
    id: 'hash-sha1-memory-capture', optionId: 'hash_sha1', label: 'SHA-1 — Memory Capture',
    description: 'Verify a volatile-memory acquisition record.',
    tags: { difficulty: 'advanced', objective: 'volatile evidence handling', storyline: 'Ember Watch' },
    prompt: 'Compute and submit the lowercase SHA-1 digest for the exact record.',
    config: { algorithm: 'sha1', inputText: 'host=WEB-07|capture=mem.raw|utc=2026-05-11T02:18:44Z' },
  },
  {
    id: 'hash-sha256-config-baseline', optionId: 'hash_sha256', label: 'SHA-256 — Configuration Baseline',
    description: 'Fingerprint an approved secure configuration marker.',
    tags: { difficulty: 'beginner', objective: 'configuration integrity', storyline: 'Zero Trust Initiative' },
    prompt: 'Compute the SHA-256 digest exactly as shown and submit lowercase hexadecimal.',
    config: { algorithm: 'sha256', inputText: 'baseline=server-v3|approved=true|owner=security' },
  },
  {
    id: 'hash-sha256-forensic-image', optionId: 'hash_sha256', label: 'SHA-256 — Forensic Image',
    description: 'Verify a detailed forensic image custody marker.',
    tags: { difficulty: 'advanced', objective: 'forensic acquisition integrity', storyline: 'Ghost Relay' },
    prompt: 'Hash the complete evidence record exactly as displayed using SHA-256.',
    config: { algorithm: 'sha256', inputText: 'case=GR-204|device=LAPTOP-12|image=GR204-01.E01|segment=all' },
  },
];

function presetsForOption(optionId) {
  return GAME_PRESETS.filter((preset) => preset.optionId === optionId);
}

const PRESET_FILTER_OPTIONS = Object.freeze({
  difficulty: [...new Set(GAME_PRESETS.map((preset) => preset.tags.difficulty))],
  objective: [...new Set(GAME_PRESETS.map((preset) => preset.tags.objective))].sort(),
  storyline: [...new Set(GAME_PRESETS.map((preset) => preset.tags.storyline))].sort(),
});

function filterPresets(presets, filters = {}) {
  return presets.filter((preset) => ['difficulty', 'objective', 'storyline'].every(
    (key) => !filters[key] || preset.tags?.[key] === filters[key],
  ));
}

function searchPresets(presets, query = '') {
  const term = query.trim().toLowerCase();
  if (!term) return presets;
  return presets.filter((preset) => [
    preset.label,
    preset.description,
    preset.prompt,
    ...Object.values(preset.tags ?? {}),
  ].some((value) => String(value).toLowerCase().includes(term)));
}

function expectedAnswerForPreset(preset) {
  if (!preset) return '';
  if (preset.answer) return preset.answer;
  if (preset.optionId.startsWith('hash_')) {
    return crypto.createHash(preset.config.algorithm).update(preset.config.inputText, 'utf8').digest('hex');
  }
  return '';
}

function listPresets() {
  return GAME_PRESETS.map((preset) => {
    const { answer, ...dto } = structuredClone(preset);
    return { ...dto, expectedAnswer: expectedAnswerForPreset(preset) };
  });
}

module.exports = { GAME_PRESETS, PRESET_FILTER_OPTIONS, presetsForOption, filterPresets, searchPresets, expectedAnswerForPreset, listPresets };
