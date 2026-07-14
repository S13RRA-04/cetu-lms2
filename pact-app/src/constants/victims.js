export const VICTIMS = {
  1: {
    code:     'REDSTONE',
    name:     'Redstone Memorial Hospital',
    sector:   'Healthcare',
    color:    '#ef4444',
    colorDim: 'rgba(239,68,68,0.10)',
    incident: 'A ransomware deployment has been detected across clinical systems. Patient records and critical care infrastructure are at risk. Hospital operations are partially degraded. Data exfiltration cannot be ruled out.',
  },
  2: {
    code:     'DOGWOOD',
    name:     'Dogwood Hotel & Resort',
    sector:   'Hospitality',
    color:    '#f59e0b',
    colorDim: 'rgba(245,158,11,0.10)',
    incident: 'Business email compromise and unauthorized access to guest payment systems confirmed. Personally identifiable information of guests and staff may have been exfiltrated. Threat actor remains active in the environment.',
  },
  3: {
    code:     'CYBERDYNE',
    name:     'CyberDyne Data Center',
    sector:   'Technology',
    color:    '#3b82f6',
    colorDim: 'rgba(59,130,246,0.10)',
    incident: 'An advanced persistent threat actor has been identified with lateral movement detected across multiple client environments hosted at this facility. Supply chain implications are under active assessment.',
  },
  4: {
    code:     'PIXELPLAY',
    name:     'Pixel Play Arcade',
    sector:   'Entertainment',
    color:    '#8b5cf6',
    colorDim: 'rgba(139,92,246,0.10)',
    incident: 'A data breach affecting user accounts and financial transaction records has been confirmed. A credential harvesting operation is suspected. Customer-facing APIs show signs of compromise.',
  },
};

// Deprecated: victim used to be algorithmically derived from squad number.
// Staff now assign victims to squads manually — use getVictimByCode instead.
export function getVictim(squadNumber) {
  if (!squadNumber) return null;
  const key = ((Number(squadNumber) - 1) % 4) + 1;
  return VICTIMS[key] ?? null;
}

export function getVictimByCode(code) {
  if (!code) return null;
  return Object.values(VICTIMS).find((v) => v.code === code) ?? null;
}
