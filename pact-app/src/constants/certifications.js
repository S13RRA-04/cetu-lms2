// Keep in sync with backend/src/validators/user.validator.js's CERTIFICATIONS list.
export const CERTIFICATIONS = [
  { value: 'DExT',            label: 'DExT — Digital Evidence Examiner Training',      blurb: 'Formal training in digital evidence handling and examination.' },
  { value: 'CART',            label: 'CART — Computer Analysis and Response Team',     blurb: 'Computer forensics response and analysis training.' },
  { value: 'DFE',             label: 'DFE — Digital Forensic Examiner',                blurb: 'Certified digital forensic examination credential.' },
  { value: 'crypto_forensics', label: 'Cryptocurrency & Blockchain Forensics',         blurb: 'Training or certification in tracing cryptocurrency transactions, wallet clustering, and exchange KYC/subpoena processes.' },
];

export function certificationLabel(value) {
  return CERTIFICATIONS.find((c) => c.value === value)?.label ?? value;
}
