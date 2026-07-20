import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAssignments, getCourseContent, updateProgress } from '../api/lair.js';
import ContentByType from '../components/ContentByType.jsx';

const DAY_META = {
  1: { label: 'Day 1', title: 'Linux Foundations & Evidence Collection' },
  2: { label: 'Day 2', title: 'Filesystem Hierarchy, Threat Hunting & Logs' },
  3: { label: 'Day 3', title: 'Memory, Live Analysis & Timelines' },
};

const CONTENT_META = {
  slides:   { label: 'Slides',                icon: '◈' },
  handout:  { label: 'Handout',                icon: '◇' },
  agenda:   { label: 'Agenda',                 icon: '⬡' },
  form:     { label: 'Form',                   icon: '◉' },
  resource: { label: 'Resource',               icon: '◆' },
};

const PCT_STEPS = [0, 25, 50, 75, 100];

function dayOf(assignment) {
  return Math.floor((assignment.order_index ?? 0) / 100);
}

export default function CoursePage() {
  const [assignments, setAssignments] = useState([]);
  const [content,     setContent]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [openDays,    setOpenDays]    = useState(() => new Set([1, 2, 3]));
  const [pending,     setPending]     = useState({});

  useEffect(() => {
    Promise.all([getAssignments().catch(() => []), getCourseContent().catch(() => [])])
      .then(([rawA, rawC]) => {
        setAssignments(Array.isArray(rawA) ? rawA : (rawA.data ?? []));
        setContent(Array.isArray(rawC) ? rawC : []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !window.location.hash) return;
    const el = document.getElementById(window.location.hash.slice(1));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [loading]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const toggleDay = (day) => setOpenDays((prev) => {
    const next = new Set(prev);
    next.has(day) ? next.delete(day) : next.add(day);
    return next;
  });

  const handleProgress = async (assignmentId, pct) => {
    setPending((p) => ({ ...p, [assignmentId]: pct }));
    setAssignments((prev) => prev.map((a) => a.id === assignmentId ? { ...a, progress: pct } : a));
    try { await updateProgress(assignmentId, pct); } catch {}
    setPending((p) => { const n = { ...p }; delete n[assignmentId]; return n; });
  };

  const days = [1, 2, 3].map((day) => ({
    day,
    meta: DAY_META[day],
    sections: assignments
      .filter((a) => dayOf(a) === day)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
  })).filter((d) => d.sections.length > 0);

  const preAssessment  = assignments.find((a) => dayOf(a) === 0);
  const postAssessment = assignments.find((a) => dayOf(a) === 4);
  const courseSurvey   = assignments.find((a) => dayOf(a) === 5);

  const resources = content.filter((c) => !c.linked_assignment_id && c.is_unlocked !== false);

  return (
    <div className="course-page">
      <div className="cc-header">
        <h1 className="page-title">Course</h1>
        <p className="page-subtitle">Slides, guides, and labs for each section — organized by day.</p>
      </div>

      {resources.length > 0 && <ContentByType items={resources} />}

      {preAssessment && (
        <BookendCard label="Before Day 1" assignment={preAssessment} />
      )}

      <div className="course-days">
        {days.map(({ day, meta, sections }) => {
          const completed = sections.filter((s) => (s.progress ?? 0) >= 100).length;
          const dayPct = Math.round(sections.reduce((s, a) => s + (a.progress ?? 0), 0) / sections.length);
          const isOpen = openDays.has(day);

          return (
            <div key={day} className="course-day glass-card">
              <button className="course-day-header" onClick={() => toggleDay(day)}>
                <div className="course-day-heading">
                  <span className="course-day-label">{meta.label}</span>
                  <span className="course-day-title">{meta.title}</span>
                </div>
                <div className="course-day-progress">
                  <div className="progress-track course-day-track">
                    <div className="progress-fill progress-fill-glow" style={{ width: `${dayPct}%` }} />
                  </div>
                  <span className="course-day-fraction">{completed}/{sections.length}</span>
                  <span className={`course-day-chevron${isOpen ? ' open' : ''}`}>›</span>
                </div>
              </button>

              {isOpen && (
                <div className="course-sections">
                  {sections.map((section) => (
                    <SectionRow
                      key={section.id}
                      section={section}
                      files={content.filter((c) => c.linked_assignment_id === section.id)}
                      pendingPct={pending[section.id]}
                      onProgress={(pct) => handleProgress(section.id, pct)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {postAssessment && (
        <BookendCard label="After Day 3" assignment={postAssessment} />
      )}

      {courseSurvey && (
        <BookendCard label="Course Feedback" assignment={courseSurvey} />
      )}
    </div>
  );
}

function BookendCard({ label, assignment }) {
  const isLocked = assignment.is_unlocked === false;
  const pct      = assignment.progress ?? 0;
  return (
    <div className="glass-card course-bookend">
      <div className="course-bookend-label">{label}</div>
      <div className="course-bookend-body">
        <div>
          <div className="course-bookend-title">
            {isLocked && <span className="lock-icon">🔒</span>}
            {assignment.title}
          </div>
          {assignment.description && <p className="section-row-desc">{assignment.description}</p>}
        </div>
        {!isLocked && (
          <Link to={`/assignment/${assignment.id}`} className="btn-sm-primary section-quiz-link">
            {pct >= 100 ? 'Review' : pct > 0 ? 'Continue' : 'Start'}
          </Link>
        )}
      </div>
      {isLocked && <p className="locked-msg">Not yet unlocked for your cohort.</p>}
    </div>
  );
}

function SectionRow({ section, files, pendingPct, onProgress }) {
  const isLocked = section.is_unlocked === false;
  const hasQuiz  = Array.isArray(section.questions) && section.questions.length > 0;
  const pct      = pendingPct ?? section.progress ?? 0;

  return (
    <div id={section.id} className={`section-row${isLocked ? ' section-row-locked' : ''}`}>
      <div className="section-row-top">
        <div className="section-row-title">
          {isLocked && <span className="lock-icon">🔒</span>}
          {section.title.replace(/^Day \d+ [–-]\s*/, '')}
        </div>
        {hasQuiz && !isLocked && (
          <Link to={`/assignment/${section.id}`} className="btn-sm-primary section-quiz-link">
            {pct >= 100 ? 'Review Assessment' : 'Start Assessment'}
          </Link>
        )}
      </div>

      {section.description && <p className="section-row-desc">{section.description}</p>}

      {files.length > 0 && (
        <div className="section-files">
          {files.map((f) => {
            const meta = CONTENT_META[f.content_type] ?? CONTENT_META.resource;
            const url  = f.download_url ?? f.url;
            return (
              <a key={f.id} className="section-file-chip" href={url} target="_blank" rel="noopener noreferrer">
                <span>{meta.icon}</span> {meta.label}
              </a>
            );
          })}
        </div>
      )}

      {!isLocked && !hasQuiz && (
        <div className="section-progress-row">
          <div className="progress-track section-progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="progress-btns">
            {PCT_STEPS.map((step) => (
              <button
                key={step}
                className={`pct-btn${pct === step ? ' active' : ''}`}
                onClick={() => onProgress(step)}
              >
                {step}%
              </button>
            ))}
          </div>
        </div>
      )}

      {isLocked && <p className="locked-msg">Not yet unlocked for your cohort.</p>}
    </div>
  );
}
