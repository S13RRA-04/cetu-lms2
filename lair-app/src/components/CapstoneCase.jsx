import { useCallback, useEffect, useMemo, useState } from 'react';
import { getLegalRequests, submitLegalRequest } from '../api/lair.js';
import { dir } from '../utils/shellLex.js';
import InvestigationGame from './InvestigationGame.jsx';
import {
  BASE_TREE, POST_WARRANT_TREE, HOSTNAME, USER,
  CULPRIT, CULPRIT_ALIASES, KEY_EVIDENCE, HINTS,
} from '../data/capstoneCase.js';

const STATUS_LABEL = { pending: 'Pending review', approved: 'Approved', denied: 'Denied' };
const STATUS_COLOR = { pending: '#e8b339', approved: '#33ff5e', denied: '#ef4444' };

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

  const activeRequest = useMemo(() => {
    const pending = requests.find((r) => r.status === 'pending');
    if (pending) return pending;
    return requests[requests.length - 1] ?? null;
  }, [requests]);

  const isApproved = activeRequest?.status === 'approved'
    || (initialState?.unlockedEvidence?.length ?? 0) > 0;

  const tree = useMemo(() => {
    if (!isApproved) return BASE_TREE;
    return dir({ ...BASE_TREE.children, ...POST_WARRANT_TREE.children });
  }, [isApproved]);

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

  return (
    <div className="capstone-case">
      <div className="capstone-dashboard">
        <div className="section-label">Case Dashboard</div>
        <div className="briefing-box" style={{ marginBottom: 16 }}>
          A workstation has been making unexplained outbound connections. Review the consented log data,
          then request whatever legal process you need from the AUSA before anything further unlocks.
        </div>

        <div className="capstone-status-row">
          <div className="capstone-status-chip">
            <span className="capstone-status-key">Legal Process</span>
            <span
              className="capstone-status-val"
              style={{ color: activeRequest ? STATUS_COLOR[activeRequest.status] : 'var(--muted)' }}
            >
              {loading ? 'Loading…' : activeRequest ? STATUS_LABEL[activeRequest.status] : 'Not yet requested'}
            </span>
          </div>
          <div className="capstone-status-chip">
            <span className="capstone-status-key">Post-Warrant Evidence</span>
            <span className="capstone-status-val" style={{ color: isApproved ? '#33ff5e' : 'var(--muted)' }}>
              {isApproved ? 'Unlocked' : 'Locked'}
            </span>
          </div>
        </div>
      </div>

      <hr className="divider" />

      <div className="capstone-panels">
        <div className="capstone-panel">
          <div className="section-label">Terminal — {HOSTNAME}</div>
          <InvestigationGame
            key={isApproved ? 'unlocked' : 'locked'}
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
          <div className="section-label">Legal Process — Request from the AUSA</div>
          <div className="capstone-chat">
            {(activeRequest?.transcript ?? []).length === 0 && (
              <div className="capstone-chat-empty">
                No request submitted yet. Write your justification for a search warrant of Daniel Reyes's
                residence below — reference specific evidence from the terminal.
              </div>
            )}
            {(activeRequest?.transcript ?? []).map((turn, i) => (
              <div key={i} className={`capstone-chat-msg capstone-chat-${turn.role}`}>
                <span className="capstone-chat-role">{turn.role === 'user' ? 'You' : 'AUSA'}</span>
                <span className="capstone-chat-text">{turn.content}</span>
              </div>
            ))}
          </div>

          {isApproved ? (
            <div className="success-banner">✓ Warrant approved — post-warrant evidence unlocked below.</div>
          ) : (
            <form onSubmit={handleSend} className="capstone-chat-form">
              {error && <div className="err-msg" style={{ marginBottom: 8 }}>{error}</div>}
              <textarea
                className="response-textarea"
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Articulate why a search warrant is needed…"
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
    </div>
  );
}
