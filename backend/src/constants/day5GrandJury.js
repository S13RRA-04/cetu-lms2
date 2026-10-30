'use strict';

/* Titles of the PACKET HEIST v2 Day 5 grand jury prep challenges. Shared by
   the seeder (scripts/lib/day5GrandJuryPrepSpec.js) and the one-click release
   (services/day5GrandJury.service.js), which finds the challenges by title —
   change a title here and both follow. */
const TITLE_PREFIX = 'Day 5: Grand Jury Prep (PACKET HEIST v2)';

// One search-testimony set per Day 3 KCR search team.
const SEARCH_SETS = {
  RESIDENCE: { name: 'Reston Residence' },
  OFFICE:    { name: 'RestonIT Office & CyberDyne Rack C3' },
};

const victimTitle = (victimName) => `${TITLE_PREFIX} — ${victimName}`;
const searchTitle = (code) => `${TITLE_PREFIX} — Search Testimony: ${SEARCH_SETS[code].name}`;

module.exports = { TITLE_PREFIX, SEARCH_SETS, victimTitle, searchTitle };
