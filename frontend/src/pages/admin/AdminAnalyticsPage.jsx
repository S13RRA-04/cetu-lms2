import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getCourses, getCourseAnalytics, getCourseEffectiveness } from '../../api/courses.js';
import { listCohorts } from '../../api/cohorts.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';

/* ── Helpers ── */
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);

const gradeColor = (p) =>
  p == null    ? 'var(--text-muted)'
  : p >= 80    ? 'var(--success)'
  : p >= 60    ? 'var(--warning)'
  :              'var(--danger)';

const gradeBg = (p) =>
  p == null    ? 'var(--border)'
  : p >= 80    ? 'var(--success-bg)'
  : p >= 60    ? 'var(--warning-bg)'
  :              'var(--danger-bg)';

function Bar({ value, max, color = 'var(--accent)', height = 8 }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ background: 'var(--border)', borderRadius: 999, height, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${w}%`, background: color, height: '100%', borderRadius: 999, transition: 'width .4s' }} />
    </div>
  );
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 140 }}>
      <div className="card-body" style={{ textAlign: 'center', padding: '20px 16px' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: color ?? 'var(--text)', lineHeight: 1 }}>{value ?? '—'}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Section wrapper ── */
function Section({ title, children, action }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ── Assignment difficulty table ── */
function AssignmentPerformance({ assignments }) {
  const sorted = [...assignments].sort((a, b) => (a.avgPct ?? 101) - (b.avgPct ?? 101));
  const maxEnrolled = Math.max(...assignments.map((a) => a.enrolledCount), 1);

  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Assignment</th>
              <th style={{ width: 90, textAlign: 'center' }}>Submitted</th>
              <th style={{ width: 90, textAlign: 'center' }}>Graded</th>
              <th style={{ width: 160 }}>Avg Score</th>
              <th style={{ width: 80, textAlign: 'center' }}>Avg %</th>
              <th style={{ width: 80, textAlign: 'right' }}>Range</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => {
              const color = gradeColor(a.avgPct);
              return (
                <tr key={a.assignmentId}>
                  <td className="fw-600" style={{ fontSize: 13 }}>{a.title}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: 13 }}>{a.submittedCount}</span>
                    <span className="text-xs text-muted"> /{a.enrolledCount}</span>
                    {a.submissionRate < 50 && (
                      <span title="Low submission rate" style={{ marginLeft: 4, color: 'var(--warning)', fontSize: 11 }}>⚠</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', fontSize: 13 }}>{a.gradedCount}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Bar value={a.avgScore ?? 0} max={a.maxScore} color={color} />
                      <span style={{ fontSize: 12, width: 48, textAlign: 'right', flexShrink: 0 }}>
                        {a.avgScore != null ? `${a.avgScore}/${a.maxScore}` : '—'}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {a.avgPct != null
                      ? <span style={{ fontWeight: 700, color, fontSize: 13 }}>{a.avgPct}%</span>
                      : <span className="text-muted">—</span>}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                    {a.minScore != null ? `${a.minScore}–${a.maxScore2}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Grade distribution histogram ── */
function GradeDistribution({ dist, totalStudents }) {
  const bands = [
    { label: 'A', range: '90–100%', key: 'A', color: 'var(--success)' },
    { label: 'B', range: '80–89%',  key: 'B', color: '#22c55e' },
    { label: 'C', range: '70–79%',  key: 'C', color: 'var(--warning)' },
    { label: 'D', range: '60–69%',  key: 'D', color: '#f97316' },
    { label: 'F', range: '<60%',    key: 'F', color: 'var(--danger)' },
  ];
  const maxCount = Math.max(...bands.map((b) => dist[b.key]), 1);

  return (
    <div className="card">
      <div className="card-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bands.map((b) => {
            const count = dist[b.key];
            const share = pct(count, totalStudents);
            return (
              <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: b.color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13,
                }}>{b.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', width: 72, flexShrink: 0 }}>{b.range}</div>
                <Bar value={count} max={maxCount} color={b.color} height={10} />
                <div style={{ fontSize: 13, fontWeight: 600, width: 24, textAlign: 'right', flexShrink: 0 }}>{count}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', width: 36, flexShrink: 0 }}>({share}%)</div>
              </div>
            );
          })}
        </div>
        {totalStudents === 0 && (
          <p className="text-muted text-sm" style={{ marginTop: 12 }}>No graded students yet.</p>
        )}
      </div>
    </div>
  );
}

/* ── At-risk student list ── */
function AtRiskStudents({ students, totalAssignments }) {
  const atRisk = students.filter((s) => s.isAtRisk)
    .sort((a, b) => (a.avgPct ?? -1) - (b.avgPct ?? -1));

  if (atRisk.length === 0) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--success)' }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>✓</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>No at-risk students detected</div>
          <p className="text-xs text-muted" style={{ marginTop: 4 }}>All graded students are above 60% and have submitted ≥ 50% of assignments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Cohort</th>
              <th style={{ width: 100, textAlign: 'center' }}>Submitted</th>
              <th style={{ width: 90, textAlign: 'center' }}>Avg Grade</th>
              <th style={{ width: 120 }}>Issues</th>
            </tr>
          </thead>
          <tbody>
            {atRisk.map((s) => {
              const subRate   = totalAssignments > 0 ? pct(s.submittedCount, totalAssignments) : 100;
              const lowGrade  = s.avgPct !== null && s.avgPct < 60;
              const lowSubmit = subRate < 50;
              return (
                <tr key={s.userId}>
                  <td>
                    <div className="fw-600" style={{ fontSize: 13 }}>{s.lastName}, {s.firstName}</div>
                    <div className="text-xs text-muted">{s.email}</div>
                  </td>
                  <td className="text-sm text-muted">{s.cohortName ?? '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: 600, color: lowSubmit ? 'var(--danger)' : 'inherit', fontSize: 13 }}>
                      {s.submittedCount}/{totalAssignments}
                    </span>
                    <span className="text-xs text-muted"> ({subRate}%)</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {s.avgPct != null
                      ? <span style={{ fontWeight: 700, color: gradeColor(s.avgPct), fontSize: 13 }}>{s.avgPct}%</span>
                      : <span className="text-muted text-xs">Ungraded</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {lowGrade  && <span className="badge" style={{ background: 'var(--danger-bg)',  color: 'var(--danger)',  fontSize: 10 }}>Low grade</span>}
                      {lowSubmit && <span className="badge" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', fontSize: 10 }}>Missing work</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Cohort comparison ── */
function CohortComparison({ cohorts }) {
  if (cohorts.length < 2) return null;
  const maxPct = Math.max(...cohorts.map((c) => c.avgPct ?? 0), 1);

  return (
    <Section title="Cohort Comparison">
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cohort</th>
                <th style={{ width: 80, textAlign: 'center' }}>Students</th>
                <th style={{ width: 200 }}>Avg Grade</th>
                <th style={{ width: 120 }}>Submission Rate</th>
              </tr>
            </thead>
            <tbody>
              {[...cohorts].sort((a, b) => (b.avgPct ?? -1) - (a.avgPct ?? -1)).map((c) => (
                <tr key={c.cohortId}>
                  <td className="fw-600">{c.cohortName}</td>
                  <td style={{ textAlign: 'center' }}>{c.studentCount}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Bar value={c.avgPct ?? 0} max={100} color={gradeColor(c.avgPct)} height={10} />
                      <span style={{ fontWeight: 700, color: gradeColor(c.avgPct), fontSize: 13, flexShrink: 0 }}>
                        {c.avgPct != null ? `${c.avgPct}%` : '—'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Bar value={c.submissionRate ?? 0} max={100} color="var(--accent)" height={8} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                        {c.submissionRate != null ? `${c.submissionRate}%` : '—'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}

/* ── Course Effectiveness sub-components ── */

/* Narrative insight callout — distinct from KPI cards */
function Insight({ status, headline, detail, action }) {
  const cfg = {
    ok:   { icon: '✓', border: 'var(--success)',  bg: 'var(--success-bg)',  text: 'var(--success)'  },
    warn: { icon: '⚠', border: 'var(--warning)',  bg: 'var(--warning-bg)', text: 'var(--warning)'  },
    bad:  { icon: '✕', border: 'var(--danger)',   bg: 'var(--danger-bg)',  text: 'var(--danger)'   },
    info: { icon: '→', border: 'var(--accent)',   bg: 'var(--accent-light)', text: 'var(--accent)' },
  }[status] ?? { icon: '·', border: 'var(--border)', bg: 'white', text: 'var(--text-muted)' };
  return (
    <div style={{
      border: `1px solid ${cfg.border}`, borderLeft: `4px solid ${cfg.border}`,
      background: cfg.bg, borderRadius: 8, padding: '14px 16px', flex: 1, minWidth: 220,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 16, color: cfg.text, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', lineHeight: 1.3 }}>{headline}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>{detail}</div>
          {action && <div style={{ fontSize: 12, color: cfg.text, marginTop: 6, fontWeight: 600 }}>{action}</div>}
        </div>
      </div>
    </div>
  );
}

/* Difficulty calibration timeline — each assignment is a block colored by how far it deviates from target */
function DifficultyTimeline({ assignments }) {
  const ordered = [...assignments].sort((a, b) => a.orderIndex - b.orderIndex);
  const TARGET_LO = 65, TARGET_HI = 80;

  const blockColor = (pct) => {
    if (pct == null) return '#e2e8f0';
    if (pct > 95)    return '#a3e635'; // trivially easy
    if (pct >= TARGET_LO && pct <= TARGET_HI) return '#16a34a'; // target zone
    if (pct >= 55 && pct < TARGET_LO)  return '#f59e0b'; // slightly hard
    if (pct > TARGET_HI && pct <= 95)  return '#22c55e'; // slightly easy
    if (pct >= 40 && pct < 55)  return '#f97316'; // hard
    return '#dc2626'; // very hard (<40%)
  };

  return (
    <div className="card">
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p className="text-xs text-muted" style={{ margin: 0 }}>
            Each block = one assignment in course order. Height = submission rate. Color = how close to the ideal difficulty zone (65–80% avg score).
          </p>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 16 }}>
            {[
              { color: '#dc2626', label: 'Very hard' },
              { color: '#f97316', label: 'Hard' },
              { color: '#f59e0b', label: 'Slightly hard' },
              { color: '#16a34a', label: '✓ Target (65–80%)' },
              { color: '#22c55e', label: 'Slightly easy' },
              { color: '#a3e635', label: 'Too easy' },
            ].map((l) => (
              <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: l.color, borderRadius: 2 }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {/* Timeline strip */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 80, padding: '0 0 4px' }}>
          {ordered.map((a, i) => {
            const h   = Math.max(12, Math.round((a.engagementRate / 100) * 72));
            const col = blockColor(a.avgPct);
            const tip = [
              a.title,
              a.avgPct != null ? `Avg score: ${a.avgPct}%` : 'No grade data',
              `Submission rate: ${a.engagementRate}%`,
              a.passRate != null ? `Pass rate: ${a.passRate}%` : null,
            ].filter(Boolean).join('\n');
            return (
              <div key={a.assignmentId} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
                title={tip}>
                <div style={{ width: '100%', maxWidth: 32, height: h, background: col, borderRadius: '3px 3px 0 0', opacity: 0.9 }} />
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{i + 1}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted" style={{ marginTop: 2 }}>
          Assignment # in course order · Hover for details
        </p>
      </div>
    </div>
  );
}

/* Score trend: connected dot chart with target-zone band */
function ScoreTrend({ assignments }) {
  const ordered = [...assignments].sort((a, b) => a.orderIndex - b.orderIndex);
  const withData = ordered.filter((a) => a.avgPct !== null);
  if (withData.length === 0) return <div className="card"><div className="card-body"><p className="text-muted text-sm">No graded data yet.</p></div></div>;

  /* Determine overall trend direction */
  const half     = Math.ceil(withData.length / 2);
  const firstAvg = withData.slice(0, half).reduce((s, a) => s + a.avgPct, 0) / half;
  const lastAvg  = withData.slice(-half).reduce((s, a) => s + a.avgPct, 0) / half;
  const delta    = Math.round(lastAvg - firstAvg);
  const trendLabel = delta > 3 ? `↗ Improving (+${delta}%)` : delta < -3 ? `↘ Declining (${delta}%)` : '→ Stable';
  const trendColor = delta > 3 ? 'var(--success)' : delta < -3 ? 'var(--danger)' : 'var(--text-muted)';

  const CHART_H = 120; // px
  const toY = (pct) => CHART_H - Math.round((pct / 100) * CHART_H); // px from top

  return (
    <div className="card">
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p className="text-xs text-muted" style={{ margin: 0 }}>
            Average score % per assignment. Target zone (65–80%) shaded green.
          </p>
          <span style={{ fontWeight: 700, fontSize: 13, color: trendColor }}>{trendLabel}</span>
        </div>

        {/* Chart area */}
        <div style={{ position: 'relative', height: CHART_H, marginBottom: 8 }}>
          {/* Target zone band (65–80%) */}
          <div style={{
            position: 'absolute',
            top:    toY(80), left: 0, right: 0,
            height: toY(65) - toY(80),
            background: 'rgba(22,163,74,.10)',
            borderTop:    '1px dashed rgba(22,163,74,.4)',
            borderBottom: '1px dashed rgba(22,163,74,.4)',
          }} />

          {/* Connecting line segments */}
          {ordered.map((a, i) => {
            if (i === 0 || a.avgPct == null) return null;
            const prev = ordered[i - 1];
            if (prev.avgPct == null) return null;
            const x1 = ((i - 1) / (ordered.length - 1)) * 100;
            const x2 = (i       / (ordered.length - 1)) * 100;
            const y1 = toY(prev.avgPct);
            const y2 = toY(a.avgPct);
            // CSS triangle/line approximation: use a thin div rotated
            const dx  = x2 - x1; // in %
            const dy  = y2 - y1; // in px
            const len = Math.sqrt((dx / 100 * 600) ** 2 + dy ** 2); // rough px length
            const ang = Math.atan2(dy, (dx / 100) * 600) * (180 / Math.PI);
            return (
              <div key={a.assignmentId} style={{
                position: 'absolute',
                top: y1, left: `${x1}%`,
                width: len, height: 2,
                background: 'rgba(37,99,235,.4)',
                transformOrigin: '0 50%',
                transform: `rotate(${ang}deg)`,
                pointerEvents: 'none',
              }} />
            );
          })}

          {/* Dots */}
          {ordered.map((a, i) => {
            if (a.avgPct == null) return null;
            const x   = (ordered.length > 1 ? i / (ordered.length - 1) : 0.5) * 100;
            const y   = toY(a.avgPct);
            const col = a.avgPct >= 65 && a.avgPct <= 80 ? '#16a34a'
              : a.avgPct < 50 ? '#dc2626'
              : a.avgPct < 65 ? '#f59e0b' : '#2563eb';
            const tip = `${a.title}\nAvg: ${a.avgPct}%\nPass rate: ${a.passRate != null ? a.passRate + '%' : 'N/A'}`;
            return (
              <div key={a.assignmentId} title={tip} style={{
                position: 'absolute',
                left: `calc(${x}% - 6px)`, top: y - 6,
                width: 12, height: 12, borderRadius: '50%',
                background: col, border: '2px solid white',
                boxShadow: `0 0 0 1px ${col}`,
                cursor: 'default',
              }} />
            );
          })}

          {/* Y-axis labels */}
          {[100, 80, 65, 50, 0].map((v) => (
            <span key={v} style={{
              position: 'absolute', right: '100%', top: toY(v) - 6,
              fontSize: 9, color: 'var(--text-muted)', width: 24, textAlign: 'right',
              marginRight: 4,
            }}>{v}%</span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-muted)' }}>
          <span style={{ flex: 1, textAlign: 'left' }}>Assignment 1</span>
          <span style={{ flex: 1, textAlign: 'right' }}>Assignment {ordered.length}</span>
        </div>
      </div>
    </div>
  );
}

/* Grading feedback loop — per-assignment turnaround visualized as a heat strip */
function GradingFeedbackLoop({ assignments, summary }) {
  const ordered = [...assignments].sort((a, b) => a.orderIndex - b.orderIndex);
  const maxHours = Math.max(...ordered.map((a) => a.avgTurnaroundHours ?? 0), 1);

  const turnaroundColor = (h) => {
    if (h == null) return '#e2e8f0'; // auto-graded
    if (h <= 24)   return '#16a34a'; // same day
    if (h <= 72)   return '#22c55e'; // 1–3 days
    if (h <= 168)  return '#f59e0b'; // up to 1 week
    return '#dc2626';                // > 1 week
  };

  const fmt = (h) => h == null ? 'auto' : h < 24 ? `${h}h` : `${(h / 24).toFixed(1)}d`;

  return (
    <div className="card">
      <div className="card-body">
        <p className="text-xs text-muted" style={{ marginBottom: 12 }}>
          How long students wait for feedback after submitting. Slow feedback breaks the learning loop — students proceed to the next assignment without knowing if they understood the previous one.
          Auto-graded (quiz) assignments are shown in gray.
        </p>

        <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
          {ordered.map((a, i) => {
            const h   = a.avgTurnaroundHours;
            const col = turnaroundColor(h);
            const tip = [
              a.title,
              h != null ? `Avg turnaround: ${fmt(h)}` : 'Auto-graded',
              a.ungradedCount > 0 ? `${a.ungradedCount} still awaiting grade` : null,
            ].filter(Boolean).join('\n');
            return (
              <div key={a.assignmentId} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
                title={tip}>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', height: 12, lineHeight: '12px' }}>
                  {h != null ? fmt(h) : ''}
                </span>
                <div style={{ width: '100%', maxWidth: 36, height: 28, background: col, borderRadius: 4, opacity: .85,
                  position: 'relative', overflow: 'hidden' }}>
                  {a.ungradedCount > 0 && (
                    <div style={{
                      position: 'absolute', top: 2, right: 2,
                      width: 6, height: 6, borderRadius: '50%', background: 'white', opacity: .9,
                    }} title={`${a.ungradedCount} ungraded`} />
                  )}
                </div>
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{i + 1}</span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
          {[
            { color: '#16a34a', label: '≤ 24h' },
            { color: '#22c55e', label: '1–3 days' },
            { color: '#f59e0b', label: '4–7 days' },
            { color: '#dc2626', label: '> 7 days' },
            { color: '#e2e8f0', label: 'Auto-graded' },
          ].map((l) => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, background: l.color, borderRadius: 2 }} />
              {l.label}
            </span>
          ))}
          {summary.totalUngraded > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              · White dot = has ungraded submissions
            </span>
          )}
        </div>

        {/* Backlog callout */}
        {summary.totalUngraded > 0 && summary.oldestUngradedAt && (
          <div style={{
            marginTop: 12, padding: '10px 14px', background: 'var(--warning-bg)',
            border: '1px solid var(--warning)', borderRadius: 6, fontSize: 13,
          }}>
            <strong style={{ color: 'var(--warning)' }}>⚠ Active backlog:</strong>{' '}
            {summary.totalUngraded} submission{summary.totalUngraded !== 1 ? 's' : ''} awaiting a grade.
            Oldest submitted{' '}
            {Math.floor((Date.now() - new Date(summary.oldestUngradedAt).getTime()) / 86400000)} days ago.
          </div>
        )}
      </div>
    </div>
  );
}

/* Drop-off analysis: where does the biggest engagement cliff happen? */
function DropOffAnalysis({ assignments }) {
  const ordered = [...assignments].sort((a, b) => a.orderIndex - b.orderIndex);
  if (ordered.length < 2) return null;

  /* Find the single biggest consecutive drop */
  let worstDrop = { drop: 0, idx: -1 };
  for (let i = 1; i < ordered.length; i++) {
    const drop = ordered[i - 1].engagementRate - ordered[i].engagementRate;
    if (drop > worstDrop.drop) worstDrop = { drop, idx: i };
  }

  /* Total funnel: from first to last */
  const first = ordered[0]?.engagementRate ?? 100;
  const last  = ordered[ordered.length - 1]?.engagementRate ?? 0;
  const totalDrop = first - last;

  return (
    <div className="card">
      <div className="card-body">
        <p className="text-xs text-muted" style={{ marginBottom: 14 }}>
          Funnel showing the % of enrolled students who submitted each assignment. Overall drop = {totalDrop}%.
        </p>

        {/* Funnel rows — width represents engagement rate */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {ordered.map((a, i) => {
            const w   = a.engagementRate;
            const isCliff = i === worstDrop.idx;
            const col = a.engagementRate >= 80 ? '#16a34a'
              : a.engagementRate >= 60 ? '#22c55e'
              : a.engagementRate >= 40 ? '#f59e0b' : '#dc2626';
            return (
              <div key={a.assignmentId}>
                {isCliff && worstDrop.drop >= 10 && (
                  <div style={{
                    fontSize: 10, color: 'var(--danger)', fontWeight: 600,
                    padding: '3px 6px', background: 'var(--danger-bg)',
                    borderRadius: 4, marginBottom: 2, display: 'inline-block',
                  }}>
                    ↓ Biggest drop here (−{worstDrop.drop}%)
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 16, flexShrink: 0 }}>{i + 1}</span>
                  <div style={{
                    height: 20,
                    width: `${Math.max(w, 4)}%`,
                    background: col,
                    borderRadius: '0 4px 4px 0',
                    display: 'flex', alignItems: 'center',
                    paddingLeft: 6, transition: 'width .4s',
                  }}>
                    <span style={{ fontSize: 10, color: 'white', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {w >= 20 ? `${w}%` : ''}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: col, fontWeight: 600 }}>{w < 20 ? `${w}%` : ''}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
                    title={a.title}>{a.title}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function AdminAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [courses,       setCourses]       = useState([]);
  const [cohorts,       setCohorts]       = useState([]);
  const [perfData,      setPerfData]      = useState(null);
  const [effectData,    setEffectData]    = useState(null);

  const [courseId,      setCourseId]      = useState(searchParams.get('course') ?? '');
  const [cohortId,      setCohortId]      = useState(searchParams.get('cohort') ?? '');
  const [activeTab,     setActiveTab]     = useState(searchParams.get('tab') ?? 'performance');

  const [loadingCourses,  setLoadingCourses]  = useState(true);
  const [loadingCohorts,  setLoadingCohorts]  = useState(false);
  const [loadingPerf,     setLoadingPerf]     = useState(false);
  const [loadingEffect,   setLoadingEffect]   = useState(false);
  const [error,           setError]           = useState('');

  useEffect(() => {
    getCourses({ limit: 200 })
      .then((d) => {
        const list = Array.isArray(d) ? d : (d.data ?? []);
        setCourses(list);
        if (!courseId && list.length > 0) setCourseId(list[0].id);
      })
      .catch(() => setError('Could not load courses.'))
      .finally(() => setLoadingCourses(false));
  }, []);

  useEffect(() => {
    if (!courseId) { setCohorts([]); setCohortId(''); setPerfData(null); setEffectData(null); return; }
    setLoadingCohorts(true);
    setCohortId('');
    setPerfData(null);
    setEffectData(null);
    listCohorts(courseId)
      .then((list) => { setCohorts(list); if (list.length === 1) setCohortId(list[0].id); })
      .catch(() => setCohorts([]))
      .finally(() => setLoadingCohorts(false));
  }, [courseId]);

  /* Load student-performance data */
  useEffect(() => {
    if (!courseId) return;
    setLoadingPerf(true);
    setError('');
    setPerfData(null);
    getCourseAnalytics(courseId, cohortId || null)
      .then(setPerfData)
      .catch(() => setError('Could not load analytics.'))
      .finally(() => setLoadingPerf(false));
  }, [courseId, cohortId]);

  /* Load effectiveness data only when that tab is active */
  useEffect(() => {
    if (!courseId || activeTab !== 'effectiveness') return;
    setLoadingEffect(true);
    setEffectData(null);
    getCourseEffectiveness(courseId, cohortId || null)
      .then(setEffectData)
      .catch(() => setError('Could not load effectiveness data.'))
      .finally(() => setLoadingEffect(false));
  }, [courseId, cohortId, activeTab]);

  /* Sync URL */
  useEffect(() => {
    const p = {};
    if (courseId)   p.course = courseId;
    if (cohortId)   p.cohort = cohortId;
    if (activeTab !== 'performance') p.tab = activeTab;
    setSearchParams(p, { replace: true });
  }, [courseId, cohortId, activeTab]);

  const selectedCourse = courses.find((c) => c.id === courseId);
  const selectedCohort = cohorts.find((c) => c.id === cohortId);
  const { summary, assignments = [], students = [], cohorts: cohortStats = [], gradeDistribution } = perfData ?? {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Course Analytics</h1>
          <p>Student performance and course effectiveness metrics.</p>
        </div>
        {selectedCourse && (
          <Link to={`/courses/${selectedCourse.id}`} className="btn btn-secondary btn-sm">
            View Course →
          </Link>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* ── Selectors ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 240, flex: 1 }}>
            <label>Course</label>
            {loadingCourses ? <LoadingSpinner /> : (
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">— select a course —</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            )}
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 180, flex: '0 1 220px' }}>
            <label>Cohort</label>
            {loadingCohorts ? <LoadingSpinner /> : (
              <select value={cohortId} onChange={(e) => setCohortId(e.target.value)} disabled={!courseId || cohorts.length === 0}>
                <option value="">All cohorts</option>
                {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {[
          { key: 'performance',   label: 'Student Performance' },
          { key: 'effectiveness', label: 'Course Effectiveness' },
        ].map((t) => (
          <button key={t.key} className={`tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {!courseId && (
        <div className="empty-state"><p>Select a course to view analytics.</p></div>
      )}

      {/* ══ Student Performance tab ══ */}
      {courseId && activeTab === 'performance' && (
        <>
          {loadingPerf && <LoadingSpinner />}
          {!loadingPerf && perfData && (
            <>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
                <KpiCard label="Enrolled" value={summary.enrolledCount} sub={`${summary.submittingCount} submitted work`} />
                <KpiCard label="Avg Grade" value={summary.avgGradePct != null ? `${summary.avgGradePct}%` : '—'}
                  color={gradeColor(summary.avgGradePct)} sub={`${summary.gradedStudentCount} students graded`} />
                <KpiCard label="Submission Rate"
                  value={summary.enrolledCount > 0 ? `${pct(summary.submittingCount, summary.enrolledCount)}%` : '—'}
                  sub={`of ${summary.totalAssignments} assignment${summary.totalAssignments !== 1 ? 's' : ''}`} />
                <KpiCard label="At Risk" value={summary.atRiskCount}
                  color={summary.atRiskCount > 0 ? 'var(--danger)' : 'var(--success)'}
                  sub="below 60% or missing work" />
              </div>

              {assignments.length > 0 && (
                <Section title="Assignment Performance" action={<span className="text-xs text-muted">Sorted hardest → easiest</span>}>
                  <AssignmentPerformance assignments={assignments} />
                </Section>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)', gap: 24, marginBottom: 28 }}>
                <Section title="Grade Distribution">
                  <GradeDistribution dist={gradeDistribution} totalStudents={summary.gradedStudentCount} />
                </Section>
                <Section
                  title={`At-Risk Students${summary.atRiskCount > 0 ? ` (${summary.atRiskCount})` : ''}`}
                  action={summary.atRiskCount > 0
                    ? <Link to={`/admin/grades?course=${courseId}${cohortId ? `&cohort=${cohortId}` : ''}`} className="text-xs" style={{ color: 'var(--accent)' }}>View gradebook →</Link>
                    : null}>
                  <AtRiskStudents students={students} totalAssignments={summary.totalAssignments} />
                </Section>
              </div>

              {!cohortId && <CohortComparison cohorts={cohortStats} />}

              <p className="text-xs text-muted">
                At-risk: avg grade &lt; 60% or submitted fewer than half of published assignments.
                ⚠ on assignments = submission rate below 50%.
              </p>
            </>
          )}
        </>
      )}

      {/* ══ Course Effectiveness tab ══ */}
      {courseId && activeTab === 'effectiveness' && (
        <>
          {loadingEffect && <LoadingSpinner />}
          {!loadingEffect && effectData && (() => {
            const { summary: es, assignments: ea } = effectData;
            const ordered = [...ea].sort((a, b) => a.orderIndex - b.orderIndex);

            /* ── Derive insight signals ── */
            const withGrades   = ordered.filter((a) => a.avgPct !== null);
            const halfLen      = Math.ceil(withGrades.length / 2);
            const firstHalfAvg = halfLen > 0
              ? withGrades.slice(0, halfLen).reduce((s, a) => s + a.avgPct, 0) / halfLen : null;
            const lastHalfAvg  = halfLen > 0
              ? withGrades.slice(-halfLen).reduce((s, a) => s + a.avgPct, 0) / halfLen : null;
            const scoreDelta = firstHalfAvg != null && lastHalfAvg != null
              ? Math.round(lastHalfAvg - firstHalfAvg) : null;

            const tooHard    = ea.filter((a) => a.avgPct !== null && a.avgPct < 50);
            const tooEasy    = ea.filter((a) => a.avgPct !== null && a.avgPct > 90);
            const inTarget   = ea.filter((a) => a.avgPct !== null && a.avgPct >= 65 && a.avgPct <= 80);

            /* Biggest engagement drop */
            let cliffDrop = 0, cliffName = '';
            for (let i = 1; i < ordered.length; i++) {
              const drop = ordered[i - 1].engagementRate - ordered[i].engagementRate;
              if (drop > cliffDrop) { cliffDrop = drop; cliffName = ordered[i].title; }
            }

            const oldestDays = es.oldestUngradedAt
              ? Math.floor((Date.now() - new Date(es.oldestUngradedAt).getTime()) / 86400000)
              : null;

            /* Difficulty calibration signal */
            const diffStatus = tooHard.length > 2 ? 'bad'
              : tooHard.length > 0 ? 'warn'
              : tooEasy.length > ea.length / 2 ? 'warn' : 'ok';
            const diffHeadline = tooHard.length > 0
              ? `${tooHard.length} assignment${tooHard.length > 1 ? 's are' : ' is'} too hard (avg < 50%)`
              : tooEasy.length > 2
                ? `${tooEasy.length} assignments may be too easy (avg > 90%)`
                : `${inTarget.length} of ${ea.filter(a => a.avgPct !== null).length} assignments are well-calibrated`;
            const diffDetail = tooHard.length > 0
              ? `Consider revising: ${tooHard.map(a => a.title).slice(0, 2).join(', ')}${tooHard.length > 2 ? '…' : ''}`
              : `Target difficulty range is 65–80% average score.`;

            /* Score trend signal */
            const trendStatus = scoreDelta == null ? 'info'
              : scoreDelta > 5 ? 'ok' : scoreDelta < -10 ? 'bad' : scoreDelta < -3 ? 'warn' : 'ok';
            const trendHeadline = scoreDelta == null ? 'No graded data yet'
              : scoreDelta > 3 ? `Scores improving across the course (+${scoreDelta}%)`
              : scoreDelta < -3 ? `Scores declining as the course progresses (${scoreDelta}%)`
              : 'Scores are consistent across the course';
            const trendDetail = scoreDelta != null && scoreDelta < -3
              ? 'Students may struggle with later content — review scaffolding and prerequisites.'
              : 'Earlier vs. later assignment averages are comparable, indicating good pacing.';

            /* Delivery signal */
            const deliveryStatus = es.totalUngraded > 0 && oldestDays != null && oldestDays > 14 ? 'bad'
              : es.totalUngraded > 0 && oldestDays != null && oldestDays > 7 ? 'warn'
              : es.avgTurnaroundHours != null && es.avgTurnaroundHours > 120 ? 'warn'
              : 'ok';
            const deliveryHeadline = es.totalUngraded > 0
              ? `${es.totalUngraded} submission${es.totalUngraded > 1 ? 's' : ''} awaiting a grade`
              : es.avgTurnaroundHours != null
                ? `Avg grading turnaround: ${es.avgTurnaroundHours < 24 ? es.avgTurnaroundHours + 'h' : (es.avgTurnaroundHours / 24).toFixed(1) + 'd'}`
                : 'All grading up to date';
            const deliveryDetail = es.totalUngraded > 0 && oldestDays != null
              ? `Oldest ungraded submission is ${oldestDays} days old. Delayed feedback disrupts learning.`
              : 'Students are receiving timely feedback on their work.';

            /* Drop-off signal */
            const dropStatus = cliffDrop > 30 ? 'bad' : cliffDrop > 15 ? 'warn' : 'ok';
            const dropHeadline = cliffDrop > 10
              ? `Largest engagement drop: −${cliffDrop}% at "${cliffName.length > 30 ? cliffName.slice(0, 28) + '…' : cliffName}"`
              : 'Engagement is consistent across assignments';
            const dropDetail = cliffDrop > 10
              ? 'A sharp drop often signals a spike in difficulty, unclear instructions, or a missing prerequisite.'
              : 'No single assignment shows an unusually large submission drop-off.';

            return (
              <>
                {/* ── Row 1: Insight callouts (course-design lens, not grade readouts) ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 28 }}>
                  <Insight status={diffStatus}     headline={diffHeadline}     detail={diffDetail}
                    action={tooHard.length > 0 ? 'Review assignment design →' : undefined} />
                  <Insight status={trendStatus}    headline={trendHeadline}    detail={trendDetail} />
                  <Insight status={deliveryStatus} headline={deliveryHeadline} detail={deliveryDetail}
                    action={es.totalUngraded > 0 ? 'Grade pending submissions →' : undefined} />
                  <Insight status={dropStatus}     headline={dropHeadline}     detail={dropDetail} />
                </div>

                {/* ── Difficulty calibration map ── */}
                <Section title="Difficulty Calibration" action={<span className="text-xs text-muted">Block height = submission rate</span>}>
                  <DifficultyTimeline assignments={ea} />
                </Section>

                {/* ── Two-column: score trend + drop-off funnel ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 24, marginBottom: 28 }}>
                  <Section title="Score Trend Across Course">
                    <ScoreTrend assignments={ea} />
                  </Section>
                  <Section title="Engagement Drop-Off">
                    <DropOffAnalysis assignments={ea} />
                  </Section>
                </div>

                {/* ── Grading feedback loop ── */}
                <Section title="Grading Feedback Loop" action={<span className="text-xs text-muted">How quickly do students get feedback?</span>}>
                  <GradingFeedbackLoop assignments={ea} summary={es} />
                </Section>

                <p className="text-xs text-muted">
                  Difficulty target: 65–80% avg score. Turnaround excludes auto-graded quiz submissions.
                  Pass rate = % of graded students scoring ≥ 60% of max score.
                </p>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
