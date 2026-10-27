'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { InMemorySpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');

test('AI tracing nests a Gemini generation and records model, usage, and safe trace context', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  const exporter = new InMemorySpanExporter();
  const spanProcessor = new SimpleSpanProcessor(exporter);
  const sdk = new NodeSDK({ spanProcessor });
  sdk.start();

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      modelVersion: 'gemini-test-version',
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Test reply' }] } }],
      usageMetadata: {
        promptTokenCount: 11,
        candidatesTokenCount: 7,
        thoughtsTokenCount: 3,
        totalTokenCount: 21,
      },
    }),
  });

  try {
    const { traceAiTurn } = require('./tracing');
    const { callGemini } = require('../../config/gemini');
    const result = await traceAiTurn('training-agent-chat', {
      asType: 'agent',
      userId: 'user-1',
      sessionId: 'session-1',
      tags: ['training-agent'],
      input: 'Test question',
    }, () => callGemini('System instructions', [
      { role: 'user', content: 'Test question' },
    ], { name: 'generate-training-hint', maxTokens: 50 }));

    assert.equal(result, 'Test reply');
    await spanProcessor.forceFlush();
    const spans = exporter.getFinishedSpans();
    assert.equal(spans.length, 2);

    const root = spans.find((span) => span.name === 'training-agent-chat');
    const generation = spans.find((span) => span.name === 'generate-training-hint');
    assert.ok(root);
    assert.ok(generation);
    assert.equal(generation.parentSpanContext.spanId, root.spanContext().spanId);
    assert.equal(generation.attributes['langfuse.observation.model.name'], 'gemini-test-version');
    assert.equal(generation.attributes['langfuse.observation.usage_details'], JSON.stringify({
      input: 11,
      output: 10,
      total: 21,
    }));
  } finally {
    global.fetch = originalFetch;
    await sdk.shutdown();
    delete process.env.GEMINI_API_KEY;
  }
});
