import { useState, useEffect, useRef } from 'react';
import { getCaseTimeline, saveCaseTimeline, getCourseContent, COURSE_ID } from '../api/pact.js';
import useAuthStore from '../store/authStore.js';
import useSquadFieldSync from '../hooks/useSquadFieldSync.js';
import DecryptText from '../components/DecryptText.jsx';
import { VICTIMS } from '../constants/victims.js';

const VICTIM_OPTIONS = Object.values(VICTIMS);
const uid = () => Math.random().toString(36).slice(2, 10);

// Standard MITRE ATT&CK Enterprise tactic (lifecycle phase) list — not every
// timeline event is a technical intrusion step (a wire transfer, a search
// warrant, a witness statement aren't ATT&CK phases), hence the leading
// non-technical option.
const ATTCK_PHASES = [
  'N/A — Non-Technical',
  'Reconnaissance', 'Resource Development', 'Initial Access', 'Execution',
  'Persistence', 'Privilege Escalation', 'Defense Evasion', 'Credential Access',
  'Discovery', 'Lateral Movement', 'Collection', 'Command and Control',
  'Exfiltration', 'Impact',
];
const CONFIDENCE_LEVELS = ['Low', 'Medium', 'High'];
// What kind of clock the Date/Time reflects — a raw timestamp pulled from a
// log is meaningless without knowing whether it's already normalized to UTC,
// still in a system's local time, or just an approximate time a witness
// reported observing something.
const TIME_REFERENCES = ['UTC', 'Local', 'Observed'];

// A timeline event is stored as a set of `event:<id>:<field>` keys inside the
// squad's shared manual-field state (same shape/merge machinery as
// ChallengeFlow's consensus fields — see caseTimeline.service.js). There is
// no separate "list of events" record: an event is simply whichever ids have
// at least one non-deleted field, discovered by scanning the flat map.
const FIELD_KEY_RE = /^event:([^:]+):(date|time|timeRef|action|origin|confidence|attckPhase|persona|victim|desc|source|deleted)$/;

function parseEvents(answers = {}) {
  const byId = new Map();
  for (const key of Object.keys(answers)) {
    const match = key.match(FIELD_KEY_RE);
    if (!match) continue;
    const [, id, field] = match;
    if (!byId.has(id)) byId.set(id, { id });
    byId.get(id)[field] = answers[key];
  }
  return [...byId.values()].filter((e) => e.deleted !== '1');
}

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const ad = a.date || '';
    const bd = b.date || '';
    if (!ad && !bd) return (a.action ?? '').localeCompare(b.action ?? '');
    if (!ad) return 1;
    if (!bd) return -1;
    return ad === bd ? (a.time ?? '').localeCompare(b.time ?? '') : ad.localeCompare(bd);
  });
}

function fieldKey(eventId, field) { return `event:${eventId}:${field}`; }

function formatEventDate(event) {
  if (!event.date) return 'Undated';
  // new Date('YYYY-MM-DD') parses as UTC midnight — format the parts
  // directly instead, so the displayed date can't drift a day depending on
  // the viewer's own timezone.
  const [y, m, d] = event.date.split('-');
  const label = `${m}/${d}/${y}`;
  return event.time ? `${label} · ${event.time}` : label;
}

export default function CaseTimelinePage() {
  const user = useAuthStore((s) => s.user);

  const [answers,    setAnswers]    = useState({});
  const [typing,     setTyping]     = useState({});
  const [fieldMeta,  setFieldMeta]  = useState({});
  const [loading,    setLoading]    = useState(true);
  const [noSquad,    setNoSquad]    = useState(false);
  const [saveError,  setSaveError]  = useState(false);
  const [evidenceSources, setEvidenceSources] = useState([]);

  const sharedTimers = useRef({});
  const pendingFieldsRef = useRef(new Set());
  const focusedFieldRef = useRef(null);
  const eventCardRefs = useRef({});
  const scrollToEvent = (id) => eventCardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const {
    fieldLocks: liveLocks, liveValues, connected: liveConnected, takeoverNotice,
    claimField, releaseField: releaseLiveField, sendInput,
  } = useSquadFieldSync({ courseId: COURSE_ID, wsPath: '/ws/squad-timeline', enabled: !noSquad && !loading });

  /* Initial load */
  useEffect(() => {
    getCaseTimeline()
      .then((data) => {
        if (data?.noSquad) { setNoSquad(true); return; }
        setAnswers(data?.manual?.answers ?? {});
        setTyping(data?.manual?.typing ?? {});
        setFieldMeta(data?.manual?.field_meta ?? {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* Evidence sources for the "Source Document / Artifact" field's
     autocomplete — only items actually unlocked for this squad right now
     (is_unlocked), never the full published catalog, so the suggestion list
     can't leak the existence/titles of evidence a drop hasn't released yet. */
  useEffect(() => {
    getCourseContent()
      .then((items) => {
        const titles = (Array.isArray(items) ? items : [])
          .filter((item) => item.is_unlocked)
          .map((item) => item.title)
          .filter(Boolean);
        setEvidenceSources([...new Set(titles)].sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {});
  }, []);

  /* REST poll — durability/reconnect fallback, same role as ChallengeFlow's
     6s poll: live editing is carried by the WebSocket above. */
  useEffect(() => {
    if (noSquad || loading) return undefined;
    let cancelled = false;
    const apply = (data) => {
      if (cancelled || data?.noSquad) return;
      const manual = data?.manual;
      if (!manual) return;
      const incoming = manual.answers ?? {};
      const isProtected = (field) => focusedFieldRef.current === field || pendingFieldsRef.current.has(field);
      setAnswers((prev) => {
        const merged = { ...incoming };
        for (const key of Object.keys(prev)) if (isProtected(key)) merged[key] = prev[key];
        return merged;
      });
      setTyping(manual.typing ?? {});
      setFieldMeta(manual.field_meta ?? {});
    };
    const timer = setInterval(() => getCaseTimeline().then(apply).catch(() => {}), 6000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [noSquad, loading]);

  const syncField = (field, value, isTyping = true) => {
    clearTimeout(sharedTimers.current[field]);
    pendingFieldsRef.current.add(field);
    sharedTimers.current[field] = setTimeout(() => {
      saveCaseTimeline({ manual: { answers: { [field]: value }, typing: { [field]: isTyping } } })
        .then((remote) => {
          pendingFieldsRef.current.delete(field);
          setSaveError(false);
          const manual = remote?.manual;
          if (!manual) return;
          setTyping(manual.typing ?? {});
          setFieldMeta(manual.field_meta ?? {});
        })
        .catch(() => { pendingFieldsRef.current.delete(field); setSaveError(true); });
    }, isTyping ? 350 : 0);
  };

  const updateField = (field, value) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    syncField(field, value, true);
    sendInput(field, value);
  };

  const commitField = (field, value) => syncField(field, value, false);

  const focusField = (field) => { focusedFieldRef.current = field; claimField(field); };
  const blurField = (field) => {
    if (focusedFieldRef.current === field) focusedFieldRef.current = null;
    releaseLiveField(field);
  };

  // A <select> has no meaningful "typing" — pick, commit immediately, and
  // broadcast it live the same fire-and-forget-in-order way structural
  // changes do below (claim just long enough to get one input through).
  const commitSelect = (field, value) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    claimField(field);
    sendInput(field, value);
    releaseLiveField(field);
    commitField(field, value);
  };

  const lockFor = (field) => liveLocks[field];
  const isFieldMine = (field) => {
    const lock = lockFor(field);
    return !lock || lock.user_id === user?.id;
  };
  // The server never echoes a client's own broadcast input back to it
  // (publishInput excludes the sender), so liveValues only ever holds
  // teammates' in-flight edits — safe to merge over `answers` unconditionally
  // rather than only for fields we've lost the lock on. Merging into the
  // event-parsing source itself (not just per-field display) means a
  // brand-new event a teammate just started, or one they just deleted,
  // appears/disappears live for everyone instead of waiting on the 6s poll —
  // unlike ChallengeFlow's fixed deliverable set, this tool's event list is
  // itself dynamic, so "live" has to cover structural changes too.
  const mergedAnswers = { ...answers, ...liveValues };
  const displayValue = (field) => mergedAnswers[field] ?? '';

  // The server only accepts a broadcast `input` for a field the sender
  // currently holds the claim on (coordinator.publishInput checks lock
  // ownership) — there's no such thing as an unclaimed live broadcast. A
  // structural change (new event, deletion) has nobody holding its field
  // yet, so both helpers below take the claim just long enough to announce
  // the change, then release it — same fire-and-forget-in-order pattern
  // useSquadFieldSync's own releaseField already relies on (flush a pending
  // input, then release, over one WebSocket, trusting in-order delivery).

  const addEvent = () => {
    const id = uid();
    // Action/Event is the natural anchor field: parseEvents discovers an
    // event by scanning for any `event:<id>:*` key, so this alone makes the
    // card exist.
    const field = fieldKey(id, 'action');
    setAnswers((prev) => ({ ...prev, [field]: '' }));
    claimField(field);
    sendInput(field, '');
    releaseLiveField(field);
    // Immediate (not debounced) REST persist so the new card survives a
    // refresh even if the creator never types anything into it.
    commitField(field, '');
    return id;
  };

  const deleteEvent = (id) => {
    if (!window.confirm('Remove this event from the timeline? This cannot be undone.')) return;
    const field = fieldKey(id, 'deleted');
    setAnswers((prev) => ({ ...prev, [field]: '1' }));
    claimField(field);
    sendInput(field, '1');
    releaseLiveField(field);
    syncField(field, '1', false);
  };

  const events = sortEvents(parseEvents(mergedAnswers));

  const collaborators = [...new Map(Object.values(typing)
    .filter((presence) => presence?.name)
    .map((presence) => [presence.user_id, presence])).values()];

  const lockBanner = (field) => {
    const lock = lockFor(field);
    if (!lock || isFieldMine(field)) return null;
    return (
      <div className="timeline-lock-banner">
        <span>{lock.name} is editing — locked for you{liveConnected ? '' : ' (reconnecting…)'}</span>
        <button type="button" onClick={() => claimField(field)}>TAKE CONTROL</button>
      </div>
    );
  };

  const editLabel = (field) => {
    const meta = fieldMeta[field];
    if (!meta?.updated_at) return null;
    return `${meta.name} · ${new Date(meta.updated_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  };

  if (loading) return (
    <div className="timeline-loading">
      <DecryptText text="INITIALIZING CASE TIMELINE..." speed={22} hold={3} />
    </div>
  );

  if (noSquad) return (
    <div className="timeline-loading">
      <div className="ops-empty-state">
        <div className="ops-empty-label">NO SQUAD ASSIGNED</div>
        <div className="ops-empty-sub">Contact your instructor to be assigned to a squad before accessing the Case Timeline.</div>
      </div>
    </div>
  );

  return (
    <div className="timeline-root">
      {/* Shared by every event's Source Document/Artifact field below —
          suggestions only, the input stays free text so a citation can
          still add detail (a page number, a specific line) beyond the
          evidence item's title. */}
      <datalist id="timeline-evidence-sources">
        {evidenceSources.map((title) => <option key={title} value={title} />)}
      </datalist>
      <div className="timeline-header">
        <span className="timeline-header-eyebrow">
          <DecryptText text="CASE TIMELINE // CHRONOLOGICAL BUILD" speed={18} hold={3} />
        </span>
        <span className="timeline-header-badge">SQUAD TIMELINE · ALL MEMBERS CAN VIEW &amp; EDIT</span>
        <span className="timeline-header-spacer" />
        {saveError && <span className="timeline-save-status timeline-save-error">! SAVE ERROR</span>}
        <button type="button" className="timeline-add-btn" onClick={addEvent}>+ ADD EVENT</button>
      </div>

      {collaborators.length > 0 && (
        <div className="timeline-collaborators">
          <span>ACTIVE COLLABORATORS</span>
          {collaborators.map((presence) => (
            <span key={presence.user_id} className="timeline-collaborator-chip">{presence.name}</span>
          ))}
        </div>
      )}

      {takeoverNotice && (
        <div className="timeline-takeover-notice">
          {takeoverNotice.by?.name ?? 'A teammate'} took control of a field you were editing — it's now read-only for you until they finish.
        </div>
      )}

      {events.length === 0 ? (
        <div className="ops-empty-state">
          <div className="ops-empty-label">TIMELINE IS EMPTY</div>
          <div className="ops-empty-sub">Add the first event your squad has established from the evidence so far.</div>
        </div>
      ) : (
        <>
          {/* Graph is a direct render of `events` (already chronologically
              sorted above) — it has no state of its own, so it extends
              itself automatically the instant a squadmate adds, edits, or
              deletes an event, live or via the poll fallback, with no
              separate sync path to keep in step. Ordinal spacing (one tick
              per event, evenly spaced) rather than true date-proportional
              spacing — real elapsed time can range from minutes to weeks
              between events in this case, and proportional placement would
              crush most markers together; the date labels still carry the
              actual gap. */}
          <div className="timeline-graph">
            <div className="timeline-graph-rail">
              <div className="timeline-graph-line" />
              {events.map((event, i) => {
                const victim = VICTIM_OPTIONS.find((v) => v.code === event.victim);
                const above = i % 2 === 0;
                return (
                  <button
                    type="button"
                    key={event.id}
                    className={`timeline-graph-tick${above ? ' timeline-graph-tick--above' : ' timeline-graph-tick--below'}`}
                    onClick={() => scrollToEvent(event.id)}
                    title={event.action || 'Untitled event'}
                  >
                    <span className="timeline-graph-label">
                      <span className="timeline-graph-date">{formatEventDate(event)}</span>
                      <span className="timeline-graph-action">{event.action || 'Untitled event'}</span>
                    </span>
                    <span className="timeline-graph-stub" />
                    <span className="timeline-graph-dot" style={victim ? { background: victim.color, boxShadow: `0 0 0 3px ${victim.colorDim}` } : undefined} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="timeline-events">
          {events.map((event, i) => {
            const victim = VICTIM_OPTIONS.find((v) => v.code === event.victim);
            return (
              <div
                key={event.id}
                ref={(el) => { eventCardRefs.current[event.id] = el; }}
                className="timeline-event-card"
                style={victim ? { borderLeftColor: victim.color } : undefined}
              >
                <div className="timeline-event-num">EVENT {String(i + 1).padStart(2, '0')}</div>

                {/* ── Row 1: chronology + confidence ── */}
                <div className="timeline-event-row">
                  <label className="timeline-field timeline-field-date">
                    <span>Date</span>
                    <input
                      type="date"
                      value={displayValue(fieldKey(event.id, 'date'))}
                      disabled={!isFieldMine(fieldKey(event.id, 'date'))}
                      onFocus={() => focusField(fieldKey(event.id, 'date'))}
                      onBlur={(e) => { blurField(fieldKey(event.id, 'date')); commitField(fieldKey(event.id, 'date'), e.target.value); }}
                      onChange={(e) => updateField(fieldKey(event.id, 'date'), e.target.value)}
                    />
                    {lockBanner(fieldKey(event.id, 'date'))}
                  </label>
                  <label className="timeline-field timeline-field-time">
                    <span>Time</span>
                    <input
                      type="text"
                      placeholder="e.g. 03:12 or overnight"
                      value={displayValue(fieldKey(event.id, 'time'))}
                      disabled={!isFieldMine(fieldKey(event.id, 'time'))}
                      onFocus={() => focusField(fieldKey(event.id, 'time'))}
                      onBlur={(e) => { blurField(fieldKey(event.id, 'time')); commitField(fieldKey(event.id, 'time'), e.target.value); }}
                      onChange={(e) => updateField(fieldKey(event.id, 'time'), e.target.value)}
                    />
                    {lockBanner(fieldKey(event.id, 'time'))}
                  </label>
                  <label className="timeline-field timeline-field-narrow">
                    <span>Time Ref.</span>
                    <select
                      value={displayValue(fieldKey(event.id, 'timeRef'))}
                      disabled={!isFieldMine(fieldKey(event.id, 'timeRef'))}
                      onFocus={() => focusField(fieldKey(event.id, 'timeRef'))}
                      onBlur={() => blurField(fieldKey(event.id, 'timeRef'))}
                      onChange={(e) => commitSelect(fieldKey(event.id, 'timeRef'), e.target.value)}
                    >
                      <option value="">—</option>
                      {TIME_REFERENCES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className="timeline-field timeline-field-narrow">
                    <span>Confidence</span>
                    <select
                      value={displayValue(fieldKey(event.id, 'confidence'))}
                      disabled={!isFieldMine(fieldKey(event.id, 'confidence'))}
                      onFocus={() => focusField(fieldKey(event.id, 'confidence'))}
                      onBlur={() => blurField(fieldKey(event.id, 'confidence'))}
                      onChange={(e) => commitSelect(fieldKey(event.id, 'confidence'), e.target.value)}
                    >
                      <option value="">—</option>
                      {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <button type="button" className="timeline-delete-btn" onClick={() => deleteEvent(event.id)} title="Remove event">✕</button>
                </div>

                {/* ── Row 2: headline ── */}
                <label className="timeline-field">
                  <span>Action / Event</span>
                  <input
                    type="text"
                    placeholder="What happened"
                    value={displayValue(fieldKey(event.id, 'action'))}
                    disabled={!isFieldMine(fieldKey(event.id, 'action'))}
                    onFocus={() => focusField(fieldKey(event.id, 'action'))}
                    onBlur={(e) => { blurField(fieldKey(event.id, 'action')); commitField(fieldKey(event.id, 'action'), e.target.value); }}
                    onChange={(e) => updateField(fieldKey(event.id, 'action'), e.target.value)}
                  />
                  {lockBanner(fieldKey(event.id, 'action'))}
                </label>

                {/* ── Row 3: attribution ── */}
                <div className="timeline-event-row">
                  <label className="timeline-field">
                    <span>Origin</span>
                    <input
                      type="text"
                      placeholder="IP, host, account, actor…"
                      value={displayValue(fieldKey(event.id, 'origin'))}
                      disabled={!isFieldMine(fieldKey(event.id, 'origin'))}
                      onFocus={() => focusField(fieldKey(event.id, 'origin'))}
                      onBlur={(e) => { blurField(fieldKey(event.id, 'origin')); commitField(fieldKey(event.id, 'origin'), e.target.value); }}
                      onChange={(e) => updateField(fieldKey(event.id, 'origin'), e.target.value)}
                    />
                    {lockBanner(fieldKey(event.id, 'origin'))}
                  </label>
                  <label className="timeline-field">
                    <span>Persona</span>
                    <input
                      type="text"
                      placeholder="Who this centers on"
                      value={displayValue(fieldKey(event.id, 'persona'))}
                      disabled={!isFieldMine(fieldKey(event.id, 'persona'))}
                      onFocus={() => focusField(fieldKey(event.id, 'persona'))}
                      onBlur={(e) => { blurField(fieldKey(event.id, 'persona')); commitField(fieldKey(event.id, 'persona'), e.target.value); }}
                      onChange={(e) => updateField(fieldKey(event.id, 'persona'), e.target.value)}
                    />
                    {lockBanner(fieldKey(event.id, 'persona'))}
                  </label>
                  <label className="timeline-field timeline-field-attck">
                    <span>ATT&amp;CK Phase</span>
                    <select
                      value={displayValue(fieldKey(event.id, 'attckPhase'))}
                      disabled={!isFieldMine(fieldKey(event.id, 'attckPhase'))}
                      onFocus={() => focusField(fieldKey(event.id, 'attckPhase'))}
                      onBlur={() => blurField(fieldKey(event.id, 'attckPhase'))}
                      onChange={(e) => commitSelect(fieldKey(event.id, 'attckPhase'), e.target.value)}
                    >
                      <option value="">—</option>
                      {ATTCK_PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                  <label className="timeline-field timeline-field-victim">
                    <span>Victim</span>
                    <select
                      value={displayValue(fieldKey(event.id, 'victim'))}
                      disabled={!isFieldMine(fieldKey(event.id, 'victim'))}
                      onFocus={() => focusField(fieldKey(event.id, 'victim'))}
                      onBlur={() => blurField(fieldKey(event.id, 'victim'))}
                      onChange={(e) => commitSelect(fieldKey(event.id, 'victim'), e.target.value)}
                    >
                      <option value="">— Unassigned —</option>
                      {VICTIM_OPTIONS.map((v) => <option key={v.code} value={v.code}>{v.name}</option>)}
                    </select>
                  </label>
                </div>

                {/* ── Row 4: detail ── */}
                <label className="timeline-field">
                  <span>Description</span>
                  <textarea
                    rows={2}
                    placeholder="Detail, and how you know it"
                    value={displayValue(fieldKey(event.id, 'desc'))}
                    disabled={!isFieldMine(fieldKey(event.id, 'desc'))}
                    onFocus={() => focusField(fieldKey(event.id, 'desc'))}
                    onBlur={(e) => { blurField(fieldKey(event.id, 'desc')); commitField(fieldKey(event.id, 'desc'), e.target.value); }}
                    onChange={(e) => updateField(fieldKey(event.id, 'desc'), e.target.value)}
                  />
                  {lockBanner(fieldKey(event.id, 'desc'))}
                </label>

                {/* ── Row 5: citation ── */}
                <label className="timeline-field">
                  <span>Source Document / Artifact</span>
                  <input
                    type="text"
                    list="timeline-evidence-sources"
                    placeholder="Which evidence file this comes from"
                    value={displayValue(fieldKey(event.id, 'source'))}
                    disabled={!isFieldMine(fieldKey(event.id, 'source'))}
                    onFocus={() => focusField(fieldKey(event.id, 'source'))}
                    onBlur={(e) => { blurField(fieldKey(event.id, 'source')); commitField(fieldKey(event.id, 'source'), e.target.value); }}
                    onChange={(e) => updateField(fieldKey(event.id, 'source'), e.target.value)}
                  />
                  {lockBanner(fieldKey(event.id, 'source'))}
                </label>

                {editLabel(fieldKey(event.id, 'action')) && (
                  <div className="timeline-event-meta">Last edited by {editLabel(fieldKey(event.id, 'action'))}</div>
                )}
              </div>
            );
          })}
          </div>
        </>
      )}
    </div>
  );
}
