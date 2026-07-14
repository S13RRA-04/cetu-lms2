'use strict';

/* Mirrors pact-app/src/constants/victims.js (code/name only — no display
   fields needed server-side). Kept in sync by hand; there is no shared
   package between backend and pact-app in this monorepo. */
const VICTIMS = {
  1: { code: 'REDSTONE',  name: 'Redstone Memorial Hospital' },
  2: { code: 'DOGWOOD',   name: 'Dogwood Hotel & Resort' },
  3: { code: 'CYBERDYNE', name: 'CyberDyne Data Center' },
  4: { code: 'PIXELPLAY', name: 'Pixel Play Arcade' },
};

const byCode = Object.fromEntries(Object.values(VICTIMS).map((v) => [v.code, v]));

function codeToName(code) {
  return byCode[code]?.name ?? null;
}

module.exports = { VICTIMS, codeToName };
