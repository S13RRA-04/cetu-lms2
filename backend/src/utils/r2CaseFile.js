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
 */
function parseDropCaseFile(key, scenariosPrefix = 'scenarios/') {
  if (!key.startsWith(scenariosPrefix) || key.endsWith('/')) return null;

  const relative = key.slice(scenariosPrefix.length);
  const segments = relative.split('/').filter(Boolean);
  const dropIndex = segments.findIndex((segment) => /^drop[ _-]*\d+$/i.test(segment));
  if (dropIndex < 1 || dropIndex >= segments.length - 1) return null;

  const dropMatch = segments[dropIndex].match(/\d+/);
  const dropNumber = Number(dropMatch?.[0]);
  if (!Number.isSafeInteger(dropNumber) || dropNumber < 1 || dropNumber > 32767) return null;

  const fileName = segments.at(-1);
  const scenarioTitle = segments.slice(0, dropIndex).join(' / ');
  const scenarioName = scenarioSlugFromName(scenarioTitle);
  const victimFolder = segments.length > dropIndex + 2 ? segments[dropIndex + 1] : null;
  const victim = victimFolder ? victimByFolder.get(normalize(victimFolder)) : null;
  const baseTitle = titleFromFileName(fileName);
  const context = victim?.name ?? scenarioTitle;
  const title = `${context} — ${baseTitle}`.slice(0, 255);

  return {
    key,
    fileName,
    title,
    description: `${scenarioTitle} — Drop ${dropNumber}${victim ? ` — ${victim.name}` : ''}`,
    scenarioName,
    contentType: inferContentType(fileName),
    dropNumber,
    victimCode: victim?.code ?? null,
  };
}

module.exports = { parseDropCaseFile, inferContentType, titleFromFileName, scenarioSlugFromName };
