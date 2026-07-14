import test from 'node:test';
import assert from 'node:assert/strict';
import { guessContentType } from './contentType.js';

test('classifies the International Evidence PDF as a handout', () => {
  assert.equal(guessContentType('International Evidence.pdf'), 'handout');
});

test('file format takes priority over evidence-like words in instructional uploads', () => {
  assert.equal(guessContentType('Evidence Collection Slides.pptx'), 'slides');
  assert.equal(guessContentType('Incident Artifact Worksheet.docx'), 'handout');
});

test('uses semantic classification when the file format does not identify instructional material', () => {
  assert.equal(guessContentType('IOC export.zip'), 'evidence');
  assert.equal(guessContentType('Threat analysis.json'), 'intel_report');
});
