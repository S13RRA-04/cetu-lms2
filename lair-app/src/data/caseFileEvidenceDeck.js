/*
  Case File — the Evidence Card Reference, per the Facilitator & Case
  Author's Guide: "pick the subset from the Evidence Card Reference that
  actually fits this case's premise." This is the piece that reference
  describes but the app never actually had — every existing case
  (meridianSkim.js, publicCorruption.js, cyberRansomware.js) invented its
  own bespoke card names from scratch instead, which is why they show heavy,
  unplanned overlap ("Wire Transfer Record," "Corporate Filing," "Former
  Employee Interview," ...) despite never sharing a common list.

  This file supplies card *type* only — what kind of evidence a card is.
  It deliberately carries no case-specific content: no flavor text, no
  central-fact mapping, no Case-Defining flag. Per the Author's Guide (Step
  5), writing what each card *reveals* is explicitly case-authored work, the
  same way `caseFileInjectDecks.js`'s generic bands are fixed by the base
  rules while each case still writes its own inject narrative flavor.

  A case's own `evidenceCards` entry opts into this by adding a `ref` field
  instead of authoring `name` inline:
    { id: 'fin-01', category: 'financial', ref: 'ref-fin-wire-transfer',
      factId: 'shell_companies', flavor: '...case-specific sentence...',
      caseDefining: false }
  `findCard()` in caseFileCaseUtils.js resolves `ref` against this file to
  fill in `name`. Existing cards with an inline `name` and no `ref` are
  untouched and keep working exactly as they do today — this is additive,
  not a migration.
*/

export const EVIDENCE_CARD_REFERENCE = {
  interviews: [
    { id: 'ref-int-person-of-interest', name: 'Person of Interest Interview' },
    { id: 'ref-int-coworker-statement', name: 'Co-worker Statement' },
    { id: 'ref-int-former-employee', name: 'Former Employee Interview' },
    { id: 'ref-int-witness', name: 'Witness Interview' },
    { id: 'ref-int-conflicting-statement', name: 'Conflicting Statement' },
    { id: 'ref-int-confidential-informant', name: 'Confidential Informant' },
    { id: 'ref-int-medical-professional', name: 'Medical Professional Interview' },
    { id: 'ref-int-financial-advisor', name: 'Financial Advisor Interview' },
    { id: 'ref-int-expert-consultation', name: 'Expert Consultation' },
  ],
  documents: [
    { id: 'ref-doc-meeting-minutes', name: 'Meeting Minutes' },
    { id: 'ref-doc-corporate-filing', name: 'Corporate Filing' },
    { id: 'ref-doc-signed-contract', name: 'Signed Contract' },
    { id: 'ref-doc-licensing-permit', name: 'Licensing/Permit Records' },
    { id: 'ref-doc-civil-court-filing', name: 'Civil Court Filing' },
    { id: 'ref-doc-internal-memo', name: 'Internal Memo' },
    { id: 'ref-doc-employment-records', name: 'Employment Records' },
    { id: 'ref-doc-official-record', name: 'Official Record' },
    { id: 'ref-doc-business-ledger', name: 'Business Ledger' },
    { id: 'ref-doc-insurance-policy', name: 'Insurance Policy' },
  ],
  digital: [
    { id: 'ref-dig-email-header', name: 'Email Header' },
    { id: 'ref-dig-text-messages', name: 'Text Messages' },
    { id: 'ref-dig-deleted-file-recovery', name: 'Deleted File Recovery' },
    { id: 'ref-dig-metadata-analysis', name: 'Metadata Analysis' },
    { id: 'ref-dig-cloud-storage-files', name: 'Cloud Storage Files' },
    { id: 'ref-dig-account-registration', name: 'Account Registration' },
    { id: 'ref-dig-vpn-activity-log', name: 'VPN Activity Log' },
    { id: 'ref-dig-authentication-logs', name: 'Authentication Logs' },
    { id: 'ref-dig-chat-application-backup', name: 'Chat Application Backup' },
    { id: 'ref-dig-dark-web-listing', name: 'Dark Web Marketplace Listing' },
    { id: 'ref-dig-crypto-exchange-records', name: 'Cryptocurrency Exchange Records' },
    { id: 'ref-dig-wallet-transaction', name: 'Digital Wallet Transaction' },
  ],
  physical: [
    { id: 'ref-phy-photographs', name: 'Photographs' },
    { id: 'ref-phy-surveillance-footage', name: 'Surveillance Footage' },
    { id: 'ref-phy-discarded-item-recovery', name: 'Discarded Item Recovery' },
    { id: 'ref-phy-access-log', name: 'Access Log' },
    { id: 'ref-phy-inventory-record', name: 'Inventory Record' },
    { id: 'ref-phy-physical-evidence', name: 'Physical Evidence' },
    { id: 'ref-phy-handwriting-sample', name: 'Handwriting Sample' },
    { id: 'ref-phy-digital-storage-media', name: 'Digital Storage Media' },
    { id: 'ref-phy-tool-recovery', name: 'Tool Recovery' },
  ],
  financial: [
    { id: 'ref-fin-vendor-invoice', name: 'Vendor Invoice' },
    { id: 'ref-fin-wire-transfer', name: 'Wire Transfer Record' },
    { id: 'ref-fin-offshore-account', name: 'Offshore Account Record' },
    { id: 'ref-fin-suspicious-activity-report', name: 'Suspicious Activity Report' },
    { id: 'ref-fin-currency-exchange-record', name: 'Currency Exchange Record' },
    { id: 'ref-fin-escrow-record', name: 'Escrow Record' },
    { id: 'ref-fin-financial-record', name: 'Financial Record' },
    { id: 'ref-fin-shell-company-registration', name: 'Shell Company Registration' },
    { id: 'ref-fin-crypto-wallet', name: 'Cryptocurrency Wallet' },
    { id: 'ref-fin-merchant-account-records', name: 'Merchant Account Records' },
  ],
  intelligence: [
    { id: 'ref-intel-confidential-source-report', name: 'Confidential Source Report' },
    { id: 'ref-intel-prior-case-cross-reference', name: 'Prior Case Cross-Reference' },
    { id: 'ref-intel-asset-forfeiture-record', name: 'Asset Forfeiture Record' },
    { id: 'ref-intel-pattern-analysis', name: 'Pattern Analysis' },
    { id: 'ref-intel-watchlist-match', name: 'Watchlist Match' },
    { id: 'ref-intel-behavioral-assessment', name: 'Behavioral Assessment' },
    { id: 'ref-intel-osint-summary', name: 'Open-Source Intelligence Summary' },
    { id: 'ref-intel-signals-intelligence-report', name: 'Signals Intelligence Report' },
    { id: 'ref-intel-interagency-data-match', name: 'Interagency Data Match' },
    { id: 'ref-intel-network-mapping', name: 'Network Mapping' },
    { id: 'ref-intel-criminal-history-summary', name: 'Criminal History Summary' },
  ],
};

export function referenceCardById(category, refId) {
  return EVIDENCE_CARD_REFERENCE[category]?.find((c) => c.id === refId) ?? null;
}
