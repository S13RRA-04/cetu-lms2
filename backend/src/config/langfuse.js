'use strict';

/**
 * Langfuse tracing bootstrap. Must be required before anything that makes an
 * LLM call (server.js loads it straight after dotenv). Spans are created by
 * @langfuse/tracing in config/gemini.js and services/ai/tracing.js; this file
 * only registers the exporter.
 *
 * Opt-in: with no LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY set (local dev,
 * tests) nothing is registered and every tracing call is a no-op, so the app
 * behaves exactly as before. LANGFUSE_BASE_URL defaults to the EU cloud —
 * set it for the US region or a self-hosted instance.
 */

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { LangfuseSpanProcessor } = require('@langfuse/otel');

const hasPublicKey = Boolean(process.env.LANGFUSE_PUBLIC_KEY);
const hasSecretKey = Boolean(process.env.LANGFUSE_SECRET_KEY);
const hasBaseUrl = Boolean(process.env.LANGFUSE_BASE_URL);

if (hasPublicKey !== hasSecretKey) {
  throw new Error('LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY must be configured together');
}
if (hasPublicKey && !hasBaseUrl) {
  throw new Error('LANGFUSE_BASE_URL is required when Langfuse tracing is enabled');
}

const enabled = hasPublicKey && hasSecretKey;

/** Masks common identifiers before telemetry leaves the backend. */
function maskTraceData({ data }) {
  if (typeof data !== 'string') return data;
  return data
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]')
    .replace(/\b(?:Bearer\s+|sk-[A-Za-z0-9_-]*|AIza[A-Za-z0-9_-]*)[A-Za-z0-9._~+\/-]*\b/gi, '[REDACTED_CREDENTIAL]');
}

let sdk = null;

if (enabled) {
  sdk = new NodeSDK({
    // OpenTelemetry 0.223 uses the singular option. This version is pinned to
    // the 2.x core line required by Langfuse v6's current peer dependencies.
    spanProcessor: new LangfuseSpanProcessor({
      // Keeps local/staging traffic out of production dashboards and evals.
      environment: process.env.LANGFUSE_TRACING_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
      mask: maskTraceData,
    }),
  });
  sdk.start();
}

/** Flushes buffered spans. Call on shutdown — spans are exported in batches, so a SIGTERM would otherwise drop the last few. */
async function shutdownTracing() {
  if (!sdk) return;
  try {
    await sdk.shutdown();
  } catch (err) {
    console.warn('[langfuse] Failed to flush traces on shutdown:', err.message);
  }
}

module.exports = { enabled, maskTraceData, shutdownTracing };
