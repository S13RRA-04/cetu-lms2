import { useCallback, useRef, useState } from 'react';

/*
  useCaseFileTour — drives the "Learn to Play" walkthrough by impersonating
  useCaseFileSession's return shape ({ state, lastResult, sendAction, ... })
  against a scripted beat list instead of a live WebSocket. Because
  CaseFilePlayer.jsx / CaseFileFacilitator.jsx only ever read `state` /
  `lastResult` / call `sendAction` by name, the exact same board JSX renders
  the tour with zero changes — this hook is the only thing that's fake.

  Each beat is either:
    - 'narrate': pure spotlight + copy, advanced via next()/back().
    - 'action': spotlight highlights a real interactive element; whatever
      sendAction() call that element's own click handler fires is answered
      with this beat's canned result/stateAfter, then the tour auto-advances.
*/

export default function useCaseFileTour(beats) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const requestId = useRef(0);
  const settleTimer = useRef(null);
  const advanceTimer = useRef(null);

  const clearTimers = () => {
    clearTimeout(settleTimer.current);
    clearTimeout(advanceTimer.current);
  };

  const goTo = useCallback((index) => {
    const clamped = Math.max(0, Math.min(index, beats.length - 1));
    clearTimers();
    setStepIndex(clamped);
    setState(beats[clamped].state);
    setLastResult(beats[clamped].lastResult ?? null);
  }, [beats]);

  const start = useCallback(() => {
    setActive(true);
    goTo(0);
  }, [goTo]);

  const end = useCallback(() => {
    clearTimers();
    setActive(false);
  }, []);

  const next = useCallback(() => {
    if (stepIndex >= beats.length - 1) { end(); return; }
    goTo(stepIndex + 1);
  }, [stepIndex, beats.length, goTo, end]);

  const back = useCallback(() => {
    if (stepIndex <= 0) return;
    goTo(stepIndex - 1);
  }, [stepIndex, goTo]);

  const sendAction = useCallback((action, params = {}) => {
    const beat = beats[stepIndex];
    if (!beat || beat.type !== 'action') return null;
    const id = ++requestId.current;
    clearTimers();
    settleTimer.current = setTimeout(() => {
      setLastResult({ action, requestId: id, result: beat.result });
      setState(beat.stateAfter ?? beat.state);
      advanceTimer.current = setTimeout(() => next(), 1100);
    }, beat.delayMs ?? 550);
    return id;
  }, [beats, stepIndex, next]);

  return {
    active,
    stepIndex,
    steps: beats,
    step: beats[stepIndex] ?? null,
    isFirst: stepIndex === 0,
    isLast: stepIndex === beats.length - 1,
    state,
    lastResult,
    sendAction,
    start,
    end,
    next,
    back,
  };
}
