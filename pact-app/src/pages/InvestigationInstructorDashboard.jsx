import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAdminAssignments, getCaseInstructorDashboard, submitCaseInject } from '../api/pact.js';

function CasePicker() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminAssignments()
      .then((rows) => setAssignments(rows.filter((a) => a.type === 'investigation')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="ic-loading">LOADING CASES…</div>;

  return (
    <div className="assignment-page">
      <div className="assignment-body">
        <Link to="/admin" className="back-link">← Command</Link>
        <h1 className="assignment-title">Investigation Cases</h1>
        {assignments.length === 0 && <p className="ind-prose">No investigation cases seeded yet.</p>}
        <div className="ic-entity-grid" style={{ marginTop: 16 }}>
          {assignments.map((a) => (
            <Link key={a.id} to={`/admin/investigation/${a.id}`} className="ic-entity-card" style={{ textDecoration: 'none' }}>
              <div className="ic-entity-type">INVESTIGATION</div>
              <div className="ic-entity-name">{a.title}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function SquadPanel({ assignmentId, entry, onInjectSent }) {
  const [note, setNote] = useState('');
  const [actionType, setActionType] = useState('command_post_inject');
  const [sending, setSending] = useState(false);

  const sendInject = async () => {
    setSending(true);
    try {
      await submitCaseInject(assignmentId, { squad_id: entry.squad.id, action_type: actionType, note });
      setNote('');
      await onInjectSent();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ic-evidence-card">
      <div className="ic-evidence-head">
        <span className="ic-evidence-key">Squad {entry.squad?.number ?? entry.squad?.id}</span>
        <span className="ic-evidence-source">Phase: {entry.state?.phase ?? 'intake'}</span>
      </div>
      <div className="ic-hypothesis-meta">
        Actions: {entry.actionCount} · Hypotheses: {entry.hypotheses?.length ?? 0} ·
        Legal requests: {entry.legalProcesses?.length ?? 0} · Interviews: {entry.interviews?.length ?? 0}
      </div>

      {entry.hypotheses?.length > 0 && (
        <div className="ic-list" style={{ marginTop: 6 }}>
          {entry.hypotheses.slice(0, 3).map((h) => (
            <li key={h.id}>{h.statement} {h.status !== 'active' && `(${h.status})`}</li>
          ))}
        </div>
      )}

      <div className="ic-chat-input" style={{ marginTop: 10, border: '1px solid var(--border)', borderRadius: 6 }}>
        <input
          type="text" value={actionType} onChange={(e) => setActionType(e.target.value)}
          placeholder="action_type (e.g. command_post_inject)"
          style={{ width: 220, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '8px 10px', fontSize: 12 }}
        />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Inject note…" rows={1} />
        <button className="ind-btn ind-btn--primary" onClick={sendInject} disabled={sending}>
          {sending ? 'SENDING…' : 'TRIGGER INJECT'}
        </button>
      </div>
    </div>
  );
}

export default function InvestigationInstructorDashboard() {
  const { assignmentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    if (!assignmentId) return Promise.resolve();
    return getCaseInstructorDashboard(assignmentId)
      .then((d) => { setData(d); setError(''); })
      .catch((err) => setError(err.response?.data?.error?.message ?? 'Unable to load dashboard.'))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  useEffect(() => { refresh(); }, [refresh]);

  if (!assignmentId) return <CasePicker />;
  if (loading) return <div className="ic-loading">LOADING DASHBOARD…</div>;

  return (
    <div className="assignment-page">
      <div className="assignment-body">
        <Link to="/admin/investigation" className="back-link">← All Cases</Link>
        <h1 className="assignment-title">{data?.case?.title}</h1>
        {error && <div className="err-msg">{error}</div>}

        <div className="section-label" style={{ marginTop: 20 }}>SQUAD PROGRESS ({data?.squads?.length ?? 0})</div>
        {(!data?.squads || data.squads.length === 0) && <p className="ind-prose">No squad has started this case yet.</p>}
        <div className="ic-evidence-list">
          {data?.squads?.map((entry) => (
            <SquadPanel key={entry.squad?.id ?? entry.state.id} assignmentId={assignmentId} entry={entry} onInjectSent={refresh} />
          ))}
        </div>
      </div>
    </div>
  );
}
