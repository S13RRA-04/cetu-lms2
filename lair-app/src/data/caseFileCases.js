/*
  Case File — case registry. Each entry pairs a stable id with a case data
  module (see ./cases/*.js, each authored against the same shape per the
  Case Author Template). Adding a new case means writing a new module under
  ./cases/ and adding one line here — nothing else in the app needs to
  change to make it selectable.
*/

import * as meridianSkim from './cases/meridianSkim.js';
import * as publicCorruption from './cases/publicCorruption.js';
import * as cyberRansomware from './cases/cyberRansomware.js';
import * as businessEmailCompromise from './cases/businessEmailCompromise.js';
import * as simSwapTheft from './cases/simSwapTheft.js';
import * as insiderTradeSecretTheft from './cases/insiderTradeSecretTheft.js';
import * as extortionDataBreach from './cases/extortionDataBreach.js';

export const CASES = [
  { id: 'meridian-skim', data: meridianSkim },
  { id: 'public-corruption', data: publicCorruption },
  { id: 'cyber-ransomware', data: cyberRansomware },
  { id: 'business-email-compromise', data: businessEmailCompromise },
  { id: 'sim-swap-theft', data: simSwapTheft },
  { id: 'insider-trade-secret-theft', data: insiderTradeSecretTheft },
  { id: 'extortion-data-breach', data: extortionDataBreach },
];

export function getCaseById(id) {
  return CASES.find((c) => c.id === id) ?? CASES[0];
}
