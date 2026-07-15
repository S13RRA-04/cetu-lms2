import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(root, 'docs/forensics/PACKET_HEIST_FORENSIC_TIMELINE.md');
const outputPath = resolve(root, 'docs/forensics/PACKET_HEIST_FORENSIC_TIMELINE.csv');
const source = readFileSync(sourcePath, 'utf8');
const section = source.match(/## Master chronology\s+([\s\S]*?)\n## Per-victim lifecycle summary/)?.[1];
if (!section) throw new Error('Master chronology table was not found');

const clean = (value) => value.trim().replaceAll('`', '').replaceAll('**', '');
const idFor = (prefix, value) => `${prefix}-${createHash('sha256').update(value).digest('hex').slice(0, 10).toUpperCase()}`;
const exactTimestamp = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/;

function normalizeTimestamp(raw) {
  const match = clean(raw).match(exactTimestamp);
  if (!match) return { precision: /^\d{4}-\d{2}-\d{2}$/.test(clean(raw)) ? 'day' : 'range', utc: '', offset: '' };
  const [, year, month, day, hour, minute, second = '00'] = match;
  const daylight = Number(month) >= 3 && Number(month) <= 10;
  const offsetHours = daylight ? 5 : 6;
  const utc = new Date(Date.UTC(+year, +month - 1, +day, +hour + offsetHours, +minute, +second)).toISOString();
  return { precision: 'second', utc, offset: daylight ? '-05:00' : '-06:00' };
}

const rows = [];
for (const line of section.split(/\r?\n/)) {
  if (!line.startsWith('|') || line.includes('|---') || line.includes('Local date/time')) continue;
  const cells = line.slice(1, -1).split('|').map(clean);
  if (cells.length !== 6) throw new Error(`Unexpected chronology row: ${line}`);
  const [localTime, phase, event, entity, status, sourceRef] = cells;
  const normalized = normalizeTimestamp(localTime);
  const identity = [localTime, phase, event, entity].join('|');
  rows.push({
    event_id: idFor('PH-EVT', identity),
    exhibit_id: idFor('PH-EXH', sourceRef),
    timestamp_local: localTime,
    timezone: 'America/Chicago',
    utc_offset: normalized.offset,
    timestamp_utc: normalized.utc,
    time_precision: normalized.precision,
    phase,
    entity,
    event,
    evidentiary_status: status,
    source_reference: sourceRef,
    classification: 'UNCLASSIFIED // FOR TRAINING USE ONLY (FOUO)',
    scenario: 'PACKET HEIST',
  });
}

const headers = Object.keys(rows[0]);
const csv = [headers, ...rows.map((row) => headers.map((header) => row[header]))]
  .map((values) => values.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
  .join('\r\n') + '\r\n';
writeFileSync(outputPath, csv, 'utf8');
console.log(`Wrote ${rows.length} events to ${outputPath}`);
