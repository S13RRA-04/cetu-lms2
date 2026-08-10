import { useState, useEffect, useCallback } from 'react';
import {
  getCase, getCaseState, getCaseEntities, getCaseEvidence, getCasePersonas, getCaseActions,
  submitCaseAction, getCaseHypotheses, createCaseHypothesis, challengeCaseHypothesis,
  getCaseLegalProcess, submitCaseLegalProcess, getCaseInterview, submitCaseInterview,
  getCaseAttribution, updateCaseAttributionDimension,
} from '../api/pact.js';

const TABS = ['Brief', 'Leads & Evidence', 'Entities', 'Attribution', 'Hypotheses', 'Requests', 'Journal'];
const RATING_OPTIONS = ['none', 'weak', 'moderate', 'strong'];

function Section({ title, children }) {
  return (
    <div className="ic-section">
      <div className="section-label">{title}</div>
      {children}
    </div>
  );
}

function ChatThread({ transcript, onSend, placeholder, sending, disabled, disabledNote }) {
  const [draft, setDraft] = useState('');
  const send = () => {
    if (!draft.trim() || sending) return;
    onSend(draft);
    setDraft('');
  };
  return (
    <div className="ic-chat">
      <div className="ic-chat-transcript">
        {(transcript ?? []).length === 0 && <div className="ic-chat-empty">No messages yet.</div>}
        {(transcript ?? []).map((m, i) => (
          <div key={i} className={`ic-chat-msg ic-chat-msg--${m.role}`}>
            <span className="ic-chat-role">{m.role === 'user' ? 'YOU' : 'THEM'}</span>
            <span>{m.content}</span>
          </div>
        ))}
      </div>
      {disabled ? (
        <div className="ic-chat-disabled">{disabledNote}</div>
      ) : (
        <div className="ic-chat-input">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            rows={2}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button className="ind-btn ind-btn--primary" onClick={send} disabled={sending || !draft.trim()}>
            {sending ? 'SENDING…' : 'SEND'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function InvestigationCase({ assignmentId, color }) {
  const [tab, setTab] = useState('Brief');
  const [caseDef, setCaseDef] = useState(null);
  const [state, setState] = useState(null);
  const [entities, setEntities] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [actions, setActions] = useState([]);
  const [hypotheses, setHypotheses] = useState([]);
  const [legalRequests, setLegalRequests] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    try {
      const [c, s, e, ev, p, a, h, lp] = await Promise.all([
        getCase(assignmentId), getCaseState(assignmentId), getCaseEntities(assignmentId),
        getCaseEvidence(assignmentId), getCasePersonas(assignmentId), getCaseActions(assignmentId),
        getCaseHypotheses(assignmentId), getCaseLegalProcess(assignmentId),
      ]);
      setCaseDef(c); setState(s); setEntities(e); setEvidence(ev); setPersonas(p);
      setActions(a); setHypotheses(h); setLegalRequests(lp);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error?.message ?? 'Unable to load this investigation.');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  if (loading) return <div className="ic-loading">LOADING CASE FILE…</div>;
  if (error && !caseDef) return <div className="err-msg">{error}</div>;

  return (
    <div className="ic-root">
      <div className="ic-tabs">
        {TABS.map((t) => (
          <button key={t} className={`ic-tab${tab === t ? ' ic-tab--active' : ''}`} style={tab === t ? { borderColor: color, color } : undefined} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {error && <div className="err-msg" style={{ marginBottom: 12 }}>{error}</div>}

      {tab === 'Brief' && (
        <Section title="CASE SYNOPSIS">
          <p className="ind-prose">{caseDef.synopsis}</p>
          {caseDef.learning_objectives?.length > 0 && (
            <>
              <div className="section-label" style={{ marginTop: 20 }}>LEARNING OBJECTIVES</div>
              <ul className="ic-list">
                {caseDef.learning_objectives.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </>
          )}
          <div className="section-label" style={{ marginTop: 20 }}>SQUAD PHASE</div>
          <p className="ind-prose">{state?.phase ?? 'intake'}</p>
        </Section>
      )}

      {tab === 'Leads & Evidence' && (
        <LeadsAndEvidence
          assignmentId={assignmentId}
          evidence={evidence}
          color={color}
          onActionSubmitted={refreshAll}
        />
      )}

      {tab === 'Entities' && (
        <Section title={`KNOWN ENTITIES (${entities.length})`}>
          {entities.length === 0 && <p className="ind-prose">No entities discovered yet — pursue leads to surface them.</p>}
          <div className="ic-entity-grid">
            {entities.map((e) => (
              <div key={e.id} className="ic-entity-card">
                <div className="ic-entity-type">{e.type}</div>
                <div className="ic-entity-name">{e.name}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {tab === 'Attribution' && (
        <Attribution assignmentId={assignmentId} entities={entities} evidence={evidence} />
      )}

      {tab === 'Hypotheses' && (
        <Hypotheses assignmentId={assignmentId} hypotheses={hypotheses} onChanged={refreshAll} />
      )}

      {tab === 'Requests' && (
        <Requests
          assignmentId={assignmentId}
          personas={personas}
          legalRequests={legalRequests}
          onChanged={refreshAll}
        />
      )}

      {tab === 'Journal' && (
        <Section title="REASONING JOURNAL">
          {actions.length === 0 && <p className="ind-prose">No actions submitted yet.</p>}
          <div className="ic-journal">
            {actions.map((a) => (
              <div key={a.id} className={`ic-journal-entry ic-journal-entry--${a.status}`}>
                <div className="ic-journal-head">
                  <span className="ic-journal-type">{a.is_inject ? 'COMMAND INJECT' : a.action_type}</span>
                  <span className="ic-journal-status">{a.status.toUpperCase()}</span>
                  <span className="ic-journal-time">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                {a.justification_text && <div className="ic-journal-just">"{a.justification_text}"</div>}
                {a.result?.narrative && <div className="ic-journal-result">{a.result.narrative}</div>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function LeadsAndEvidence({ assignmentId, evidence, color, onActionSubmitted }) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const submit = async () => {
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitCaseAction(assignmentId, { message });
      setLastResult(result);
      setMessage('');
      await onActionSubmitted();
    } catch (err) {
      setLastResult({ status: 'denied', narrative: err.response?.data?.error?.message ?? 'That request failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Section title="SUBMIT AN INVESTIGATIVE ACTION">
        <p className="ind-prose" style={{ maxWidth: 640 }}>
          Describe what you want to do in plain language — e.g. "Request the domain registration records for the
          phishing domain" or "Pull the victim's email headers." The squad's case engine will resolve it.
        </p>
        <textarea
          className="ic-action-input"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What do you want to do next?"
        />
        <button className="ind-btn ind-btn--primary" onClick={submit} disabled={submitting || !message.trim()}>
          {submitting ? 'SUBMITTING…' : 'SUBMIT ACTION'} <span className="ind-btn-arrow">→</span>
        </button>
        {lastResult && (
          <div className={`ic-action-result ic-action-result--${lastResult.status}`}>
            {lastResult.narrative}
          </div>
        )}
      </Section>

      <Section title={`DISCOVERED EVIDENCE (${evidence.length})`}>
        {evidence.length === 0 && <p className="ind-prose">Nothing discovered yet.</p>}
        <div className="ic-evidence-list">
          {evidence.map((e) => (
            <div key={e.id} className="ic-evidence-card">
              <div className="ic-evidence-head">
                <span className="ic-evidence-key">{e.evidence_key}</span>
                <span className="ic-evidence-source">{e.source_type}</span>
              </div>
              <div className="ic-evidence-body">{e.artifact}</div>
              {e.reliability && <div className="ic-evidence-reliability">Reliability: {e.reliability}</div>}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function Hypotheses({ assignmentId, hypotheses, onChanged }) {
  const [statement, setStatement] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [challenges, setChallenges] = useState({});

  const create = async () => {
    if (!statement.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createCaseHypothesis(assignmentId, { statement });
      setStatement('');
      await onChanged();
    } finally {
      setSubmitting(false);
    }
  };

  const challenge = async (id) => {
    const result = await challengeCaseHypothesis(assignmentId, id);
    setChallenges((prev) => ({ ...prev, [id]: result.question }));
  };

  return (
    <Section title="WORKING HYPOTHESES">
      <textarea
        className="ic-action-input"
        rows={2}
        value={statement}
        onChange={(e) => setStatement(e.target.value)}
        placeholder='e.g. "Marcus Delaney controls both the phishing domain and the destination account."'
      />
      <button className="ind-btn ind-btn--primary" onClick={create} disabled={submitting || !statement.trim()}>
        {submitting ? 'SAVING…' : 'RECORD HYPOTHESIS'}
      </button>

      <div className="ic-hypothesis-list">
        {hypotheses.filter((h) => h.status === 'active').map((h) => (
          <div key={h.id} className="ic-hypothesis-card">
            <div className="ic-hypothesis-statement">{h.statement}</div>
            <div className="ic-hypothesis-meta">
              Supporting: {h.supporting_evidence_ids?.length ?? 0} · Contradicting: {h.contradicting_evidence_ids?.length ?? 0}
              {h.confidence != null && ` · Confidence: ${Math.round(h.confidence * 100)}%`}
            </div>
            <button className="ind-btn" onClick={() => challenge(h.id)}>CHALLENGE THIS THEORY</button>
            {challenges[h.id] && <div className="ic-hypothesis-challenge">{challenges[h.id]}</div>}
          </div>
        ))}
      </div>
    </Section>
  );
}

function Attribution({ assignmentId, entities, evidence }) {
  const [subjectId, setSubjectId] = useState('');
  const [assessment, setAssessment] = useState(null);
  const [gaps, setGaps] = useState(null);
  const [saving, setSaving] = useState(false);

  const candidates = entities.filter((e) => e.type === 'person');

  const load = useCallback((id) => {
    if (!id) return;
    getCaseAttribution(assignmentId, id).then((r) => { setAssessment(r.assessment); setGaps(r.gaps); });
  }, [assignmentId]);

  useEffect(() => {
    if (!subjectId && candidates.length > 0) setSubjectId(candidates[0].id);
  }, [candidates, subjectId]);

  useEffect(() => { load(subjectId); }, [subjectId, load]);

  const save = async (dimension, rating, evidenceIds, notes) => {
    setSaving(true);
    try {
      const r = await updateCaseAttributionDimension(assignmentId, subjectId, dimension, { rating, supporting_evidence_ids: evidenceIds, notes });
      setAssessment(r.assessment);
      setGaps(r.gaps);
    } finally {
      setSaving(false);
    }
  };

  if (candidates.length === 0) {
    return <Section title="ATTRIBUTION"><p className="ind-prose">No person entities discovered yet to assess.</p></Section>;
  }

  return (
    <Section title="ATTRIBUTION WORKSPACE">
      <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="ic-action-input" style={{ maxWidth: 320 }}>
        {candidates.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>

      {gaps && (
        <div className="ic-hypothesis-meta" style={{ marginTop: 8 }}>
          Readiness: <strong>{gaps.readiness}</strong> · Corroborated: {gaps.corroborated.length} ·
          Weak/uncited: {gaps.weak.length} · Unassessed: {gaps.unassessed.length}
          {gaps.unassessed.length > 0 && <> — still missing: {gaps.unassessed.join(', ')}</>}
        </div>
      )}

      {assessment && (
        <div className="ic-hypothesis-list">
          {Object.keys(assessment.dimensions || {}).length === 0 && candidates.length > 0 && null}
          {['technical', 'infrastructure', 'identity', 'behavioral', 'financial', 'device', 'account', 'intelligence', 'corroboration'].map((dim) => {
            const d = assessment.dimensions?.[dim] ?? { rating: 'none', supporting_evidence_ids: [], notes: '' };
            return (
              <div key={dim} className="ic-hypothesis-card">
                <div className="ic-hypothesis-statement" style={{ textTransform: 'capitalize' }}>{dim}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                  <select
                    value={d.rating}
                    onChange={(e) => save(dim, e.target.value, d.supporting_evidence_ids, d.notes)}
                    disabled={saving}
                  >
                    {RATING_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <select
                    multiple size={Math.min(4, Math.max(2, evidence.length))}
                    value={d.supporting_evidence_ids}
                    onChange={(e) => save(dim, d.rating, Array.from(e.target.selectedOptions, (o) => o.value), d.notes)}
                    disabled={saving}
                    style={{ minWidth: 200 }}
                  >
                    {evidence.map((ev) => <option key={ev.id} value={ev.id}>{ev.evidence_key}</option>)}
                  </select>
                </div>
                <textarea
                  className="ic-action-input" rows={1} style={{ marginTop: 6 }}
                  defaultValue={d.notes}
                  placeholder="Notes…"
                  onBlur={(e) => save(dim, d.rating, d.supporting_evidence_ids, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function Requests({ assignmentId, personas, legalRequests, onChanged }) {
  const victimPersona = personas.find((p) => p.role_type === 'victim');
  const [interview, setInterview] = useState([]);
  const [legalTranscript, setLegalTranscript] = useState([]);
  const [activeLegalId, setActiveLegalId] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!victimPersona) return;
    getCaseInterview(assignmentId, victimPersona.id).then((rows) => {
      const open = rows.find((r) => r.status === 'in_progress');
      setInterview(open?.transcript ?? []);
    });
  }, [assignmentId, victimPersona]);

  useEffect(() => {
    const pending = legalRequests.find((r) => r.status === 'pending');
    setActiveLegalId(pending?.id ?? null);
    setLegalTranscript(pending?.transcript ?? []);
  }, [legalRequests]);

  const sendInterview = async (message) => {
    setSending(true);
    try {
      const row = await submitCaseInterview(assignmentId, victimPersona.id, { message });
      setInterview(row.transcript);
    } finally {
      setSending(false);
    }
  };

  const sendLegal = async (message) => {
    setSending(true);
    try {
      const row = await submitCaseLegalProcess(assignmentId, { message, request_id: activeLegalId });
      setLegalTranscript(row.transcript);
      await onChanged();
    } finally {
      setSending(false);
    }
  };

  const approved = legalRequests.filter((r) => r.status === 'approved');
  const fullyEscalated = legalRequests.length > 0 && legalRequests.every((r) => r.status === 'approved') && activeLegalId === null;

  return (
    <>
      {victimPersona && (
        <Section title={`INTERVIEW — ${victimPersona.name.toUpperCase()}`}>
          <ChatThread transcript={interview} onSend={sendInterview} sending={sending} placeholder="Ask a question…" />
        </Section>
      )}

      <Section title="LEGAL PROCESS">
        <div className="ic-list">
          {approved.map((r) => <div key={r.id} className="ic-legal-approved">✓ {r.request_type.toUpperCase()} — approved</div>)}
        </div>
        <ChatThread
          transcript={legalTranscript}
          onSend={sendLegal}
          sending={sending}
          placeholder="Justify your request to the AUSA…"
          disabled={fullyEscalated}
          disabledNote="Every legal process for this case has already been granted."
        />
      </Section>
    </>
  );
}
