'use strict';

const { startObservation } = require('@langfuse/tracing');

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
 *
 * Every call is recorded as a Langfuse `generation` named `opts.name`
 * (verb-first and stable, e.g. 'generate-ausa-reply' — dashboards and evals
 * key on it), nested under whatever observation is active. No-op when
 * Langfuse isn't configured (see config/langfuse.js).
 */
async function callGemini(systemPrompt, messages, { maxTokens = 2000, name = 'generate-gemini-reply' } = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY ?? ''}`;

  const generation = startObservation(name, {
    model: GEMINI_MODEL,
    modelParameters: { maxOutputTokens: maxTokens },
    // Exactly what the model sees, as role-labeled messages so the Langfuse
    // session view can stitch multi-turn conversations together.
    input: [{ role: 'system', content: systemPrompt }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
  }, { asType: 'generation' });

  try {
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
    const usage = data.usageMetadata ?? {};
    const thinkingTokens = usage.thoughtsTokenCount ?? 0;

    const truncated = candidate?.finishReason === 'MAX_TOKENS' && !text.trim();
    if (truncated) {
      console.warn('[gemini] Response hit MAX_TOKENS with no visible text — consider raising maxTokens.');
    }

    generation.update({
      // GEMINI_MODEL is usually an alias ('gemini-flash-latest'); modelVersion
      // is the concrete model that answered, which is what Langfuse prices.
      model: data.modelVersion ?? GEMINI_MODEL,
      output: { role: 'assistant', content: text },
      // Gemini bills hidden thinking tokens at the output rate, so they're
      // folded into `output` for correct cost; the split is kept in metadata.
      usageDetails: {
        input: usage.promptTokenCount ?? 0,
        output: (usage.candidatesTokenCount ?? 0) + thinkingTokens,
        total: usage.totalTokenCount ?? 0,
      },
      metadata: { finishReason: candidate?.finishReason, thinkingTokens, requestedModel: GEMINI_MODEL },
      ...(truncated && { level: 'WARNING', statusMessage: 'Hit MAX_TOKENS before producing visible text' }),
    });

    return text;
  } catch (err) {
    generation.update({ level: 'ERROR', statusMessage: err.message });
    throw err;
  } finally {
    generation.end();
  }
}

module.exports = { callGemini, GEMINI_MODEL };
