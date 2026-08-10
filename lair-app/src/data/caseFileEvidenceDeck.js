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

  `maxTier` (1-4) is the *ceiling* on how many Legal Instrument tiers
  (discovered/subpoena/court_order/search_warrant — see TIER_NUMBER in
  caseFileTheme.js) a card of this type can narratively support, matching
  the physical card's four orientation states. Not every card type earns a
  four-part story: a Witness Interview can plausibly deepen through
  follow-up, subpoena, and cross-examination; a single Photograph is one
  fixed moment and doesn't get more true with more legal process. A case's
  own `tiers` array (its per-tier narrative_entry text) may use fewer tiers
  than this ceiling but never more — see caseFileCaseUtils.js's
  resolveMaxTier(). This ceiling is about narrative depth only; it doesn't
  touch the Legal Instrument Ladder's own case-wide Case Strength gates.
*/

export const EVIDENCE_CARD_REFERENCE = {
  interviews: [
    { id: 'ref-int-person-of-interest', name: 'Person of Interest Interview', maxTier: 4 },
    { id: 'ref-int-coworker-statement', name: 'Co-worker Statement', maxTier: 3 },
    { id: 'ref-int-former-employee', name: 'Former Employee Interview', maxTier: 3 },
    { id: 'ref-int-witness', name: 'Witness Interview', maxTier: 4 },
    { id: 'ref-int-conflicting-statement', name: 'Conflicting Statement', maxTier: 2 },
    { id: 'ref-int-confidential-informant', name: 'Confidential Informant', maxTier: 3 },
    { id: 'ref-int-medical-professional', name: 'Medical Professional Interview', maxTier: 2 },
    { id: 'ref-int-financial-advisor', name: 'Financial Advisor Interview', maxTier: 2 },
    { id: 'ref-int-expert-consultation', name: 'Expert Consultation', maxTier: 2 },
  ],
  documents: [
    { id: 'ref-doc-meeting-minutes', name: 'Meeting Minutes', maxTier: 2 },
    { id: 'ref-doc-corporate-filing', name: 'Corporate Filing', maxTier: 3 },
    { id: 'ref-doc-signed-contract', name: 'Signed Contract', maxTier: 2 },
    { id: 'ref-doc-licensing-permit', name: 'Licensing/Permit Records', maxTier: 2 },
    { id: 'ref-doc-civil-court-filing', name: 'Civil Court Filing', maxTier: 2 },
    { id: 'ref-doc-internal-memo', name: 'Internal Memo', maxTier: 2 },
    { id: 'ref-doc-employment-records', name: 'Employment Records', maxTier: 3 },
    { id: 'ref-doc-official-record', name: 'Official Record', maxTier: 2 },
    { id: 'ref-doc-business-ledger', name: 'Business Ledger', maxTier: 3 },
    { id: 'ref-doc-insurance-policy', name: 'Insurance Policy', maxTier: 2 },
  ],
  digital: [
    { id: 'ref-dig-email-header', name: 'Email Header', maxTier: 2 },
    { id: 'ref-dig-text-messages', name: 'Text Messages', maxTier: 3 },
    { id: 'ref-dig-deleted-file-recovery', name: 'Deleted File Recovery', maxTier: 3 },
    { id: 'ref-dig-metadata-analysis', name: 'Metadata Analysis', maxTier: 3 },
    { id: 'ref-dig-cloud-storage-files', name: 'Cloud Storage Files', maxTier: 2 },
    { id: 'ref-dig-account-registration', name: 'Account Registration', maxTier: 2 },
    { id: 'ref-dig-vpn-activity-log', name: 'VPN Activity Log', maxTier: 3 },
    { id: 'ref-dig-authentication-logs', name: 'Authentication Logs', maxTier: 3 },
    { id: 'ref-dig-chat-application-backup', name: 'Chat Application Backup', maxTier: 3 },
    { id: 'ref-dig-dark-web-listing', name: 'Dark Web Marketplace Listing', maxTier: 2 },
    { id: 'ref-dig-crypto-exchange-records', name: 'Cryptocurrency Exchange Records', maxTier: 3 },
    { id: 'ref-dig-wallet-transaction', name: 'Digital Wallet Transaction', maxTier: 2 },
  ],
  physical: [
    { id: 'ref-phy-photographs', name: 'Photographs', maxTier: 1 },
    { id: 'ref-phy-surveillance-footage', name: 'Surveillance Footage', maxTier: 2 },
    { id: 'ref-phy-discarded-item-recovery', name: 'Discarded Item Recovery', maxTier: 2 },
    { id: 'ref-phy-access-log', name: 'Access Log', maxTier: 2 },
    { id: 'ref-phy-inventory-record', name: 'Inventory Record', maxTier: 1 },
    { id: 'ref-phy-physical-evidence', name: 'Physical Evidence', maxTier: 2 },
    { id: 'ref-phy-handwriting-sample', name: 'Handwriting Sample', maxTier: 2 },
    { id: 'ref-phy-digital-storage-media', name: 'Digital Storage Media', maxTier: 2 },
    { id: 'ref-phy-tool-recovery', name: 'Tool Recovery', maxTier: 1 },
  ],
  financial: [
    { id: 'ref-fin-vendor-invoice', name: 'Vendor Invoice', maxTier: 2 },
    { id: 'ref-fin-wire-transfer', name: 'Wire Transfer Record', maxTier: 1 },
    { id: 'ref-fin-offshore-account', name: 'Offshore Account Record', maxTier: 2 },
    { id: 'ref-fin-suspicious-activity-report', name: 'Suspicious Activity Report', maxTier: 2 },
    { id: 'ref-fin-currency-exchange-record', name: 'Currency Exchange Record', maxTier: 2 },
    { id: 'ref-fin-escrow-record', name: 'Escrow Record', maxTier: 1 },
    { id: 'ref-fin-financial-record', name: 'Financial Record', maxTier: 2 },
    { id: 'ref-fin-shell-company-registration', name: 'Shell Company Registration', maxTier: 2 },
    { id: 'ref-fin-crypto-wallet', name: 'Cryptocurrency Wallet', maxTier: 1 },
    { id: 'ref-fin-merchant-account-records', name: 'Merchant Account Records', maxTier: 2 },
  ],
  intelligence: [
    { id: 'ref-intel-confidential-source-report', name: 'Confidential Source Report', maxTier: 3 },
    { id: 'ref-intel-prior-case-cross-reference', name: 'Prior Case Cross-Reference', maxTier: 2 },
    { id: 'ref-intel-asset-forfeiture-record', name: 'Asset Forfeiture Record', maxTier: 2 },
    { id: 'ref-intel-pattern-analysis', name: 'Pattern Analysis', maxTier: 2 },
    { id: 'ref-intel-watchlist-match', name: 'Watchlist Match', maxTier: 1 },
    { id: 'ref-intel-behavioral-assessment', name: 'Behavioral Assessment', maxTier: 2 },
    { id: 'ref-intel-osint-summary', name: 'Open-Source Intelligence Summary', maxTier: 2 },
    { id: 'ref-intel-signals-intelligence-report', name: 'Signals Intelligence Report', maxTier: 2 },
    { id: 'ref-intel-interagency-data-match', name: 'Interagency Data Match', maxTier: 2 },
    { id: 'ref-intel-network-mapping', name: 'Network Mapping', maxTier: 2 },
    { id: 'ref-intel-criminal-history-summary', name: 'Criminal History Summary', maxTier: 1 },
  ],
};

export function referenceCardById(category, refId) {
  return EVIDENCE_CARD_REFERENCE[category]?.find((c) => c.id === refId) ?? null;
}
