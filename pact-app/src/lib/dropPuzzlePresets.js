export const GAME_PRESETS = [
  {
    id: 'packet-heist-restonit-cross-service-denials',
    optionId: 'log_firewall',
    label: 'PACKET HEIST — RestonIT Cross-Service Denials (through Drop 4)',
    description: 'Correlate denied activity across RestonIT mail, remote-support, and credential-vault services without implying a successful compromise.',
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
];

export function presetsForOption(optionId) {
  return GAME_PRESETS.filter((preset) => preset.optionId === optionId);
}

export function applyPuzzlePreset(blankDraft, presetId) {
  const preset = GAME_PRESETS.find((item) => item.id === presetId);
  if (!preset) return { ...blankDraft, _presetId: '' };
  return {
    ...blankDraft,
    prompt: preset.prompt,
    answer: preset.answer ?? '',
    config: structuredClone(preset.config),
    _presetId: preset.id,
  };
}
