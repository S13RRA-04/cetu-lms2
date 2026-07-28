'use strict';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL   = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5';

if (!ANTHROPIC_API_KEY) {
  console.warn('[anthropic] Missing environment variable ANTHROPIC_API_KEY. LLM persona calls will fail.');
}

/**
 * Calls the Anthropic Messages API and returns the assistant's reply text.
 * `messages` is [{role: 'user'|'assistant', content}], oldest first.
 */
async function callClaude(systemPrompt, messages, { maxTokens = 500 } = {}) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Anthropic API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.content?.map((block) => block.text).filter(Boolean).join('\n') ?? '';
}

module.exports = { callClaude, ANTHROPIC_MODEL };
