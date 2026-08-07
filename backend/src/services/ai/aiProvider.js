'use strict';
const { callGemini } = require('../../config/gemini');

/**
 * Single seam between the investigation-simulation engine and whichever LLM
 * actually answers it. Every case service calls through here rather than
 * `callGemini` directly, so swapping providers (or adding a local model per
 * the design brief) means changing this file only. All four methods are
 * Gemini-backed for now — no behavior differs between them yet beyond intent
 * (documented per-method) — but callers must not assume that stays true.
 */

/** General-purpose one-shot or multi-turn generation. */
async function generate(systemPrompt, messages, opts = {}) {
  return callGemini(systemPrompt, messages, opts);
}

/** Alias for persona/character chat — same mechanics as generate(), kept
 * distinct so call sites read as "this is roleplay" at a glance. */
async function roleplay(systemPrompt, messages, opts = {}) {
  return callGemini(systemPrompt, messages, opts);
}

/**
 * Asks the model to translate free text into a JSON object matching the
 * caller-supplied instructions in `systemPrompt`. Never trust the parsed
 * result as-is — callers (caseActionInterpreter.service.js) must validate
 * every referenced id against real DB rows before acting on it; this
 * function only guarantees the reply parses as JSON, not that its content
 * is true.
 */
async function classifyIntent(systemPrompt, userText, opts = {}) {
  const raw = await callGemini(systemPrompt, [{ role: 'user', content: userText }], opts);
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/** One-shot rendering of authoritative facts into realistic prose/document text. */
async function generateArtifact(systemPrompt, factsPrompt, opts = {}) {
  return callGemini(systemPrompt, [{ role: 'user', content: factsPrompt }], opts);
}

module.exports = { generate, roleplay, classifyIntent, generateArtifact };
