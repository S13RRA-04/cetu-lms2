'use strict';

const { VICTIMS } = require('../constants/victims');

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const victimByFolder = new Map();

for (const victim of Object.values(VICTIMS)) {
  victimByFolder.set(normalize(victim.code), victim);
  victimByFolder.set(normalize(victim.name), victim);
}

function titleFromFileName(fileName) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function inferContentType(fileName) {
  const normalized = fileName.toLowerCase();
  if (/\b(briefing|bulletin|command[ _-]?post|tasking)\b/.test(normalized)) return 'briefing';
  if (/\b(intel|report|matrix|indicator|hypothesis|assessment)\b/.test(normalized)) return 'intel_report';
  return 'evidence';
}

function scenarioSlugFromName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Parse keys shaped like scenarios/<scenario>/Drop <number>/[<victim>/]<file>.
 * Objects outside a drop folder and folder-marker objects are intentionally ignored.
 * Every folder mirrors its source files into a nested PDFs/ subfolder — only the
 * PDF is treated as the distributable case file, and the PDFs/ segment is
 * unwrapped so scoping (victim vs. cohort-wide) is computed at the true folder
 * level instead of PDFs being mistaken for an unrecognized victim folder.
 */
function parseDropCaseFile(key, scenariosPrefix = 'scenarios/') {
  if (!key.startsWith(scenariosPrefix) || key.endsWith('/')) return null;
  if (!/\.pdf$/i.test(key)) return null;

  const relative = key.slice(scenariosPrefix.length);
  let segments = relative.split('/').filter(Boolean);
  if (segments.length >= 2 && segments[segments.length - 2].toLowerCase() === 'pdfs') {
    segments = [...segments.slice(0, -2), segments.at(-1)];
  }
  const dropIndex = segments.findIndex((segment) => /^drop[ _-]*\d+$/i.test(segment));
  if (dropIndex < 1 || dropIndex >= segments.length - 1) return null;

  const dropMatch = segments[dropIndex].match(/\d+/);
  const dropNumber = Number(dropMatch?.[0]);
  if (!Number.isSafeInteger(dropNumber) || dropNumber < 1 || dropNumber > 32767) return null;

  const fileName = segments.at(-1);
  const scenarioTitle = segments.slice(0, dropIndex).join(' / ');
  const scenarioName = scenarioSlugFromName(scenarioTitle);
  const folderSegment = segments.length > dropIndex + 2 ? segments[dropIndex + 1] : null;
  const victim = folderSegment ? victimByFolder.get(normalize(folderSegment)) : null;
  // A subfolder that isn't a recognized victim (e.g. "Parallel Investigative
  // Squad Update") is kept as its own group rather than collapsed into
  // cohort-wide — it's surfaced in the UI so an admin can bulk-assign it.
  const sourceFolder = folderSegment && !victim ? folderSegment : null;
  const baseTitle = titleFromFileName(fileName);
  const context = victim?.name ?? sourceFolder ?? scenarioTitle;
  const title = `${context} — ${baseTitle}`.slice(0, 255);

  return {
    key,
    fileName,
    title,
    description: `${scenarioTitle} — Drop ${dropNumber}${victim ? ` — ${victim.name}` : sourceFolder ? ` — ${sourceFolder}` : ''}`,
    scenarioName,
    contentType: inferContentType(fileName),
    dropNumber,
    victimCode: victim?.code ?? null,
    sourceFolder,
  };
}

module.exports = { parseDropCaseFile, inferContentType, titleFromFileName, scenarioSlugFromName };
