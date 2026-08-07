'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSystemPrompt } = require('./casePersona.service');

const SECRET = 'The destination wallet belongs to a second, still-undiscovered account controlled by Delaney.';

test('buildSystemPrompt never interpolates unknown_facts into the prompt text', () => {
  const persona = {
    name: 'Denise Okafor', role_type: 'victim', personality: 'Cooperative',
    known_facts: ['She wired $340,000 on 2026-07-18.'],
    unknown_facts: [SECRET],
    allowed_disclosures: ['Anything she personally saw or did.'],
    objectives: [], constraints: [],
  };
  const prompt = buildSystemPrompt(persona);
  assert.ok(!prompt.includes(SECRET), 'a fact the persona does not know must never appear in its own prompt, even as a "don\'t reveal" instruction');
});

test('buildSystemPrompt does interpolate known_facts and allowed_disclosures', () => {
  const persona = {
    name: 'Denise Okafor', role_type: 'victim',
    known_facts: ['She wired $340,000 on 2026-07-18.'],
    unknown_facts: [SECRET],
    allowed_disclosures: [], objectives: [], constraints: [],
  };
  const prompt = buildSystemPrompt(persona);
  assert.ok(prompt.includes('She wired $340,000 on 2026-07-18.'));
});

test('buildSystemPrompt handles a persona with empty optional fields without throwing', () => {
  const prompt = buildSystemPrompt({ name: 'Registrar Records System', role_type: 'registrar' });
  assert.ok(prompt.includes('Registrar Records System'));
});
