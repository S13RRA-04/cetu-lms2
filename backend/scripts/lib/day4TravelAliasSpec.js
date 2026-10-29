'use strict';
/**
 * PACKET HEIST v2 Drop 4 — international cooperation thread: the subject
 * flew HSV -> ATL -> CUN on Sunday 2026-10-25, three days before the
 * Wednesday search warrant, on a U.S. passport obtained in the name of
 * Devin Ray Chapman (died 2024-10-11). Evidence: the five TRAVEL_*.pdf
 * files in Drop 4 (sources in PACT v5\Drops\v2\Drop 4 - Travel Sources\).
 *
 * One multiple_choice + one fill_blank per role, one multiple_choice for
 * the Squad Synthesis Quiz. Ids are fixed (not uuidv4) so
 * apply-drop4-v2-travel-alias-updates.js can replace them in place on the
 * live rows without duplicating; day4RoleSpecs.js includes them so a full
 * reseed carries them too.
 *
 * Dates are cohort-relative: the flight is the Sunday before the cohort's
 * Wednesday search (Oct 2026 cohort: 2026-10-25). Re-date the TRAVEL_*
 * sources and CS's accepted answers for a future cohort.
 */

const MC_POINTS = 10;
const BLANK_POINTS = 10;
const ID_PREFIX = 'd4-travel-';

function mc(id, stem, options, correctIndex, reference) {
  const optionIds = ['a', 'b', 'c', 'd'];
  return {
    id: `${ID_PREFIX}${id}`,
    stem,
    payload: {
      kind: 'multiple_choice',
      selectionMode: 'single',
      shuffle: true,
      options: options.map((text, i) => ({ id: optionIds[i], text })),
      correct: [optionIds[correctIndex]],
    },
    scoring: { points: MC_POINTS, mustPass: false },
    feedback: { correct: 'Correct.', incorrect: `Review ${reference} again.`, reference },
  };
}

function blank(id, stem, accepted, reference) {
  return {
    id: `${ID_PREFIX}${id}`,
    stem,
    payload: { kind: 'fill_blank', blanks: [{ accepted, caseSensitive: false }] },
    scoring: { points: BLANK_POINTS, mustPass: false },
    feedback: { correct: 'Correct.', incorrect: `Review ${reference} again.`, reference },
  };
}

// Keyed by the role codes in day4RoleSpecs.js's ROLES.
const TRAVEL_QUESTIONS_BY_ROLE = {
  SA: [
    mc('sa-mc', 'The subject is in Cancun. Which route gets the Hotel Coral Bahia registration and payment records in a form you can use at trial?',
      ['Ask Legat to have Mexican immigration email them over', 'A formal request under the U.S.-Mexico MLAT, routed through DOJ\'s Office of International Affairs', 'A grand jury subpoena served on the hotel\'s U.S. booking website', 'Cite the Legat communication in the affidavit instead'], 1,
      'the Legal Attaché communication'),
    blank('sa-blank', 'The passport the subject traveled on was issued in the name of a man who died in ______ (year).',
      ['2024'], 'the death certificate and the passport application record'),
  ],
  IA: [
    mc('ia-mc', 'Which field in the airline PNR return connects the "Devin Chapman" traveler to the BRKR_AL identity recovered from the residence laptop?',
      ['The seat assignment', 'The contact email, amr.secure@protonrelay.example', 'The checked-bag weight', 'The fare paid'], 1,
      'the airline PNR return and the PGP keyring export'),
    blank('ia-blank', 'The name on the PNR, the CBP record and the passport is Devin Ray ______.',
      ['Chapman'], 'the airline PNR return'),
  ],
  DA: [
    mc('da-mc', 'How many days before the search warrant was served did the traveler fly out of Huntsville?',
      ['1', '3', '7', '10'], 1, 'the airline PNR return and the seized evidence inventory'),
    blank('da-blank', 'The airline record locator for the Cancun booking is ______.',
      ['QX7RTD'], 'the airline PNR return'),
  ],
  FoA: [
    mc('foa-mc', 'Why does the airfare not appear in Reston\'s personal account ****2091?',
      ['It was refunded', 'It was paid with a prepaid card in the alias name, keeping the purchase off his own accounts', 'Airlines never charge for one-way tickets', 'The personal statement covers only business expenses'], 1,
      'the airline PNR return and the residence personal financials'),
    blank('foa-blank', 'The ticket was paid with a ______ Visa card ending 5518.',
      ['prepaid', 'pre-paid', 'prepaid gift'], 'the airline PNR return'),
  ],
  SOS: [
    mc('sos-mc', 'With the traveler confirmed in Mexico, who is the FBI\'s in-country point of coordination with Mexican authorities?',
      ['The U.S. Marshals field office in Huntsville', 'The Legal Attaché (Legat) office in Mexico City', 'The airline\'s security department', 'The hotel\'s front desk'], 1,
      'the Legal Attaché communication'),
    blank('sos-blank', 'Until it is obtained through a formal request, information Legat passed from Mexican immigration may be used for ______ purposes only.',
      ['lead', 'lead only', 'investigative lead', 'leads'], 'the Legal Attaché communication'),
  ],
  TFO: [
    mc('tfo-mc', 'Inventory item 2B4, Reston\'s mobile phone, was seized at the residence while he was abroad. What does that suggest?',
      ['Nothing; people often own two phones', 'He may have left his primary phone behind so it would not place him abroad — prioritize its extraction', 'The inventory is wrong and should be corrected quietly', 'The phone belongs to Jordan Reston'], 1,
      'the seized evidence inventory and the CBP travel record'),
    blank('tfo-blank', 'Devin Ray Chapman\'s death certificate was filed in ______ County, Alabama.',
      ['Madison', 'Madison County'], 'the death certificate'),
  ],
  CS: [
    mc('cs-mc', 'The PNR shows the booking was made from IP 198.51.100.23 (residential broadband, Huntsville). What is the right next step?',
      ['Conclude it is Reston\'s home connection', 'Serve legal process on the provider for the subscriber assigned that IP at the booking timestamp', 'Geolocate it to a street address and stop there', 'Ignore it; the traveler already left the country'], 1,
      'the airline PNR return'),
    blank('cs-blank', 'The traveler departed Huntsville on the morning of ______ (date).',
      ['2026-10-25', 'October 25, 2026', 'Oct 25, 2026', '10/25/2026', 'October 25', 'Oct 25', '10/25', 'Sunday, October 25, 2026'],
      'the airline PNR return'),
  ],
};

const TRAVEL_SQUAD_QUIZ_QUESTION = mc('squad-mc', 'How was the "Devin Chapman" passport obtained?',
  ['It was stolen from Devin Chapman while he was alive', 'By a first-time application, six months after his death, using his birth certificate, a new ID card and his SSN', 'It was issued by Mexican authorities on arrival', 'It is Reston\'s own passport with the name altered'], 1,
  'the passport application record and the death certificate');

module.exports = { ID_PREFIX, TRAVEL_QUESTIONS_BY_ROLE, TRAVEL_SQUAD_QUIZ_QUESTION };
