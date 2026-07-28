'use strict';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL   = process.env.GEMINI_MODEL ?? 'gemini-flash-latest';

if (!GEMINI_API_KEY) {
  console.warn('[gemini] Missing environment variable GEMINI_API_KEY. LLM persona calls will fail.');
}

/**
 * Calls the Google Gemini generateContent API and returns the assistant's
 * reply text. `messages` is [{role: 'user'|'assistant', content}], oldest
 * first — Gemini's own chat roles are 'user'/'model', so 'assistant' is
 * translated here.
 */
async function callGemini(systemPrompt, messages, { maxTokens = 500 } = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY ?? ''}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text).filter(Boolean).join('\n');
}

module.exports = { callGemini, GEMINI_MODEL };
