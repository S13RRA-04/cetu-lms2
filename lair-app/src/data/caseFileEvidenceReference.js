/*
  Case File — Evidence Card Reference (canonical, case-agnostic catalog).
  175 generic card titles across the 6 evidence categories, as authored in
  the project's official Evidence Card Reference document. Per the
  Facilitator & Case Author's Guide's "Building a Case" step 4, authoring a
  new case means picking a subset of these titles that fits the premise —
  individual cases (see ./cases/*.js) attach their own reveal text,
  fact routing, and Case-Defining flags to specific cards drawn from here.

  This file only holds the reference names/categories themselves — no
  case-specific narrative. The full per-card rationale, renaming notes, and
  corroboration-pairing guidance live in the source reference document, not
  here.
*/

export const EVIDENCE_CARD_REFERENCE = {
  interviews: [
    'Witness Interview', 'Victim Interview', 'Person of Interest Interview', 'Confidential Informant',
    'Character Witness', 'Expert Consultation', 'Bystander Statement', 'Co-worker Statement',
    'Anonymous Tip', 'Community Informant', 'Family Member Statement', 'Ex-Partner/Spouse Interview',
    'Landlord Interview', 'Former Employee Interview', 'Medical Professional Interview',
    'Financial Advisor Interview', 'Represented-Party Statement', 'Conflicting Statement',
    'Translator-Assisted Interview', 'Group Interview', 'Juvenile Interview',
    'Interpreter/Translation Review', 'Emergency Caller', 'Neighbor Interview',
  ],
  documents: [
    'Employment Records', 'Correspondence', 'Signed Contract', 'Property Deed', 'Corporate Filing',
    'Medical Records', 'Loan Application', 'Notarized Statement', 'Internal Memo', 'School Records',
    'Meeting Minutes', 'Non-Disclosure Agreement', 'Power of Attorney', 'Insurance Policy',
    'Travel Itinerary', 'Immigration Records', 'Civil Court Filing', 'Licensing/Permit Records',
    'Shipping Manifest', 'Handwritten Note', 'Judicial Filing', 'Utility Records', 'Hotel Records',
    'Rental Agreement', 'Business Ledger', 'Purchase Receipt', 'Maintenance Records',
    'Inspection Report', 'External Proceeding Transcript', 'Official Record',
  ],
  digital: [
    'IP Address Log', 'Email Header', 'Text Messages', 'Social Media Activity', 'Browser History',
    'GPS Location Data', 'Cloud Storage Files', 'Encrypted Device', 'Deleted File Recovery',
    'Metadata Analysis', 'Call Detail Records', 'Voicemail Recording', 'Video Call Log',
    'Smart Home Device Log', 'App Usage Data', 'VPN Activity Log', 'Dark Web Marketplace Listing',
    'Digital Wallet Transaction', 'Device Serial Trace', 'Chat Application Backup',
    'Cell Site Location Information', 'Subscriber Information', 'Account Registration',
    'Authentication Logs', 'Password Manager Vault', 'Web Server Logs', 'Domain Registration',
    'Cryptocurrency Exchange Records', 'Digital Artifact',
  ],
  physical: [
    'Fingerprints', 'DNA Sample', 'Surveillance Footage', 'Weapon Recovery', 'Trace Evidence',
    'Handwriting Sample', 'Photographs', 'Vehicle Inspection', 'Reconstructed Materials',
    'Forensic Ledger', 'Tool Mark Analysis', 'Footwear/Tire Impression', 'Ballistics Report',
    'Toxicology Report', 'Autopsy Report', 'Storage Unit Contents', 'Surveillance Photograph',
    'Discarded Item Recovery', 'Access Log', 'Inventory Record', 'Biological Sample', 'Drug Sample',
    'Tool Recovery', 'Clothing', 'Packaging Material', 'Fire Debris', 'Latent Print Lift',
    'Scene Sketch', 'Digital Storage Media', 'Physical Evidence',
  ],
  financial: [
    'Bank Statement', 'Wire Transfer Record', 'Shell Company Registration', 'Tax Filing',
    'Credit Card Statement', 'Safe Deposit Box', 'Cryptocurrency Wallet', 'Loan Records',
    'Payroll Records', 'Insurance Claim', "Cashier's Check Record", 'Money Order Trail',
    'Offshore Account Record', 'Investment Portfolio', 'Expense Report', 'Vendor Invoice',
    'Cash Deposit Pattern', 'Line of Credit Record', 'Trust Fund Documentation',
    'Point-of-Sale Transaction Log', 'Merchant Account Records', 'Currency Exchange Record',
    'Asset Valuation', 'Mortgage Record', 'Probate/Estate Records', 'Purchase Order',
    'Gift Card Transactions', 'Escrow Record', 'Suspicious Activity Report', 'Financial Record',
  ],
  intelligence: [
    'Law Enforcement Bulletin', 'Cross-Jurisdictional Alert', 'Confidential Source Report',
    'Surveillance Operation Summary', 'Pattern Analysis', 'Prior Case Cross-Reference',
    'Affiliation Report', 'Foreign Liaison Report', 'Undercover Operation Notes', 'Threat Assessment',
    'Task Force Report', 'Interagency Data Match', 'Signals Intelligence Report',
    'Asset Forfeiture Record', 'Informant Debrief', 'Network Mapping', 'Border Crossing Record',
    'Watchlist Match', 'Open-Source Intelligence Summary', 'Consular Records Request',
    'Timeline Analysis', 'Link Analysis', 'Geographic Pattern Analysis', 'Communications Pattern',
    'Intelligence Gap Assessment', 'Criminal History Summary', 'Modus Operandi Comparison',
    'Fusion Center Bulletin', 'Behavioral Assessment', 'Target Package', 'Intelligence Report',
  ],
};

export const EVIDENCE_CATEGORIES = Object.keys(EVIDENCE_CARD_REFERENCE);
