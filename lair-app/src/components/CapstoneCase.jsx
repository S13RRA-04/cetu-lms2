import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  getLegalRequests, submitLegalRequest,
  sendTacticalMessage, sendTrainingMessage,
} from '../api/lair.js';
import { dir } from '../utils/shellLex.js';
import InvestigationGame from './InvestigationGame.jsx';
import {
  BASE_TREE, SUBPOENA_TREE, ORDER_2703D_TREE, RESIDENCE_TREE,
  HOSTNAME, USER, CULPRIT, CULPRIT_ALIASES, KEY_EVIDENCE, HINTS,
} from '../data/capstoneCase.js';

/**
 * Mirrors backend/src/services/legalRequest.service.js's PROCESS_TYPES —
 * display-only here (id/label/threshold, which tree each unlocks). The
 * server alone decides the actual sequencing/gate; this is just so the UI
 * can label whichever step comes back and show a progression strip without
 * a round trip. If the backend order ever changes, update this too.
 */
const PROCESS_TYPES = [
  { id: 'subpoena',      label: 'Administrative Subpoena', threshold: 'relevance',                        tree: SUBPOENA_TREE },
  { id: 'order_2703d',   label: '§2703(d) Order',           threshold: 'specific and articulable facts',   tree: ORDER_2703D_TREE },
  { id: 'search_warrant', label: 'Search Warrant',          threshold: 'probable cause',                    tree: RESIDENCE_TREE },
];

/**
 * Shared shape for the two purely-advisory, ephemeral (no persistence
 * across reload) persona chats — Tactical Specialist and Training Agent.
 * Unlike the AUSA panel (below), neither of these gates or unlocks
 * anything, so there's no server-tracked request/transcript to load; the
 * frontend just owns the running conversation in local state and calls
 * whichever stateless send function is passed in.
 */
function ConsultPanel({ title, roleName, placeholder, buttonLabel, emptyText, color, sendFn }) {
  const [history, setHistory] = useState([]);
  const [draft, setDraft]     = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState('');

  const handleSend = useCallback(async (e) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    const message = draft;
    setSending(true);
    setError('');
    setHistory((prev) => [...prev, { role: 'user', content: message }]);
    setDraft('');
    try {
      const { reply } = await sendFn({ history, message });
      setHistory((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.response?.data?.error?.message ?? 'Failed to send — try again.');
    } finally {
      setSending(false);
    }
  }, [draft, sending, history, sendFn]);

  return (
    <div className="capstone-panel">
      <div className="section-label">{title}</div>
      <div className="capstone-chat">
        {history.length === 0 && <div className="capstone-chat-empty">{emptyText}</div>}
        {history.map((turn, i) => (
          <div key={i} className={`capstone-chat-msg capstone-chat-${turn.role}`}>
            <span className="capstone-chat-role">{turn.role === 'user' ? 'You' : roleName}</span>
            <span className="capstone-chat-text">{turn.content}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="capstone-chat-form">
        {error && <div className="err-msg" style={{ marginBottom: 8 }}>{error}</div>}
        <textarea
          className="response-textarea"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          disabled={sending}
        />
        <div className="action-row">
          <button type="submit" className="btn-submit" style={{ background: color }} disabled={sending || !draft.trim()}>
            {sending ? 'Sending…' : buttonLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CapstoneCase({ assignmentId, color, initialState, onComplete }) {
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [draft, setDraft]         = useState('');
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    getLegalRequests(assignmentId)
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const approvedIds = useMemo(
    () => requests.filter((r) => r.status === 'approved').map((r) => r.request_type),
    [requests],
  );

  const activeRequest = useMemo(() => {
    const pending = requests.find((r) => r.status === 'pending');
    if (pending) return pending;
    return requests[requests.length - 1] ?? null;
  }, [requests]);

  const nextType = useMemo(
    () => PROCESS_TYPES.find((p) => !approvedIds.includes(p.id)) ?? null,
    [approvedIds],
  );

  const fullyEscalated = !nextType;
  const currentType = activeRequest?.status === 'pending'
    ? PROCESS_TYPES.find((p) => p.id === activeRequest.request_type)
    : nextType;

  const tree = useMemo(() => {
    let merged = { ...BASE_TREE.children };
    for (const p of PROCESS_TYPES) {
      if (approvedIds.includes(p.id)) merged = { ...merged, ...p.tree.children };
    }
    return dir(merged);
  }, [approvedIds]);

  const handleSend = useCallback(async (e) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const canContinue = activeRequest && activeRequest.status === 'pending';
      const updated = await submitLegalRequest(assignmentId, {
        message: draft,
        requestId: canContinue ? activeRequest.id : undefined,
      });
      setRequests((prev) => {
        const idx = prev.findIndex((r) => r.id === updated.id);
        if (idx === -1) return [...prev, updated];
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
      setDraft('');
    } catch (err) {
      setError(err.response?.data?.error?.message ?? 'Failed to send — try again.');
    } finally {
      setSending(false);
    }
  }, [assignmentId, draft, sending, activeRequest]);

  const sendTactical = useCallback((body) => sendTacticalMessage(assignmentId, body), [assignmentId]);
  const sendTraining  = useCallback((body) => sendTrainingMessage(assignmentId, body), [assignmentId]);

  return (
    <div className="capstone-case">
      <div className="capstone-dashboard">
        <div className="section-label">Case Dashboard</div>
        <div className="briefing-box" style={{ marginBottom: 16 }}>
          A workstation has been making unexplained outbound connections. Review the consented log data,
          then request whatever legal process you need from the AUSA — one step at a time — before
          anything further unlocks.
        </div>

        <div className="capstone-status-row">
          {PROCESS_TYPES.map((p) => {
            const isApproved = approvedIds.includes(p.id);
            const isCurrent  = !isApproved && currentType?.id === p.id;
            const state = isApproved ? 'Approved' : isCurrent ? 'Current step' : 'Locked';
            const stateColor = isApproved ? '#33ff5e' : isCurrent ? '#e8b339' : 'var(--muted)';
            return (
              <div className="capstone-status-chip" key={p.id}>
                <span className="capstone-status-key">{p.label}</span>
                <span className="capstone-status-val" style={{ color: stateColor }}>
                  {loading ? '…' : state}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <hr className="divider" />

      <div className="capstone-panels">
        <div className="capstone-panel">
          <div className="section-label">Terminal — {HOSTNAME}</div>
          <InvestigationGame
            key={approvedIds.join(',')}
            assignmentId={assignmentId}
            color={color}
            initialState={initialState}
            onComplete={onComplete}
            tree={tree}
            hostname={HOSTNAME}
            user={USER}
            culprit={CULPRIT}
            culpritAliases={CULPRIT_ALIASES}
            keyEvidence={KEY_EVIDENCE}
            hints={HINTS}
            commandSet="advanced"
          />
        </div>

        <div className="capstone-panel">
          <div className="section-label">
            Legal Process — {fullyEscalated ? 'All steps granted' : `Requesting: ${currentType.label}`}
          </div>
          <div className="capstone-chat">
            {(activeRequest?.transcript ?? []).length === 0 && !fullyEscalated && (
              <div className="capstone-chat-empty">
                No request submitted yet. Once you've built a case from the evidence in the terminal,
                submit your justification below — reference specific evidence, not just a hunch.
              </div>
            )}
            {(activeRequest?.transcript ?? []).map((turn, i) => (
              <div key={i} className={`capstone-chat-msg capstone-chat-${turn.role}`}>
                <span className="capstone-chat-role">{turn.role === 'user' ? 'You' : 'AUSA'}</span>
                <span className="capstone-chat-text">{turn.content}</span>
              </div>
            ))}
          </div>

          {fullyEscalated ? (
            <div className="success-banner">✓ Every step has been granted — full evidence set unlocked below.</div>
          ) : (
            <form onSubmit={handleSend} className="capstone-chat-form">
              {error && <div className="err-msg" style={{ marginBottom: 8 }}>{error}</div>}
              <textarea
                className="response-textarea"
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Articulate why a ${currentType.label.toLowerCase()} is needed…`}
                disabled={sending}
              />
              <div className="action-row">
                <button type="submit" className="btn-submit" style={{ background: color }} disabled={sending || !draft.trim()}>
                  {sending ? 'Sending…' : 'Send to AUSA'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="capstone-panels capstone-panels-secondary">
        <ConsultPanel
          title="Staff Operations — Tactical Specialist"
          roleName="Staff Ops"
          color={color}
          placeholder="Ask Staff Ops to run something down…"
          buttonLabel="Ask Staff Ops"
          emptyText="Consult with Staff Ops on anything you want run down — an IP address, a name, background on someone with access. This is advisory only; it doesn't unlock evidence on its own."
          sendFn={sendTactical}
        />
        <ConsultPanel
          title="Training Agent"
          roleName="Training Agent"
          color={color}
          placeholder="Ask the Training Agent for a nudge…"
          buttonLabel="Ask Training Agent"
          emptyText="Stuck? The Training Agent can offer advice based on what you've found so far. This is advisory only; it doesn't unlock evidence on its own."
          sendFn={sendTraining}
        />
      </div>
    </div>
  );
}
