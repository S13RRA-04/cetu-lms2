'use strict';
const { propagateAttributes, startActiveObservation } = require('@langfuse/tracing');

/**
 * Wraps one unit of AI work (a chat turn, a classification, an artifact
 * render) as a Langfuse trace: a root observation named `name` whose
 * input/output is what a reviewer needs at a glance — the student's message
 * and the reply — while the generation inside (config/gemini.js) holds the
 * full prompt. Each turn is its own trace; `sessionId` ties a conversation's
 * turns together in the Sessions view.
 *
 * `fn` returns the feature's result; `toOutput(result)` picks what to show as
 * the trace output (defaults to the result itself). Names are treated like
 * an API — evaluators and dashboards key on them, so keep them stable and
 * free of ids (ids go in `metadata`). No-op when Langfuse isn't configured.
 */
async function traceAiTurn(name, {
  asType = 'span', userId, sessionId, tags = [], metadata = {}, input, toOutput = (r) => r,
}, fn) {
  return propagateAttributes({
    traceName: name,
    userId: userId ?? undefined,
    sessionId: sessionId ?? undefined,
    tags,
  }, () => startActiveObservation(name, async (span) => {
    span.update({ input, metadata });
    try {
      const result = await fn();
      span.update({ output: toOutput(result) });
      return result;
    } catch (err) {
      span.update({ level: 'ERROR', statusMessage: err.message });
      throw err;
    }
  }, { asType }));
}

module.exports = { traceAiTurn };
