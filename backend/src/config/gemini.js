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
async function callGemini(systemPrompt, messages, { maxTokens = 2000 } = {}) {
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
      // Whatever model GEMINI_MODEL currently resolves to on this account
      // spends several hundred hidden "thinking" tokens before writing any
      // visible reply — confirmed via a direct API probe (~800 thinking
      // tokens on a trivial 5-word prompt). Passing generationConfig.
      // thinkingConfig (the documented way to disable/cap thinking) 400s on
      // this account/model version, so the only reliable fix is a generous
      // maxOutputTokens ceiling with real headroom above the thinking cost
      // — a low ceiling here silently truncates the visible reply mid-
      // sentence with finishReason: MAX_TOKENS, not an error.
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const text = parts.filter((p) => !p.thought).map((p) => p.text).filter(Boolean).join('\n');

  if (candidate?.finishReason === 'MAX_TOKENS' && !text.trim()) {
    console.warn('[gemini] Response hit MAX_TOKENS with no visible text — consider raising maxTokens.');
  }

  return text;
}

module.exports = { callGemini, GEMINI_MODEL };
