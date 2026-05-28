import { useEffect, useState } from 'react';
import { getCourseContent } from '../api/pact.js';

const TYPE_META = {
  slides:   { label: 'Slides',   icon: '◈', color: '#6366f1' },
  handout:  { label: 'Handout',  icon: '◇', color: '#0ea5e9' },
  agenda:   { label: 'Agenda',   icon: '⬡', color: '#10b981' },
  form:     { label: 'Form',     icon: '◉', color: '#f59e0b' },
  resource: { label: 'Resource', icon: '◆', color: '#8b5cf6' },
};

const TYPE_ORDER = ['slides', 'handout', 'agenda', 'form', 'resource'];

export default function CourseContentPage() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  useEffect(() => {
    getCourseContent()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const unlocked  = items.filter((i) => i.is_unlocked !== false);
  const typesUsed = [...new Set(unlocked.map((i) => i.content_type))];

  const visible = filter === 'all'
    ? unlocked
    : unlocked.filter((i) => i.content_type === filter);

  return (
    <div className="cc-page">
      <div className="cc-header">
        <h1 className="page-title">Course Content</h1>
        <p className="page-subtitle">Slides, handouts, agendas, and resources released for your cohort.</p>
      </div>

      {unlocked.length === 0 ? (
        <div className="scenarios-empty">
          <div className="scenarios-empty-icon">📂</div>
          <p>No content has been released for your cohort yet.</p>
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          <div className="cc-filter-tabs">
            <button
              className={`cc-filter-tab${filter === 'all' ? ' active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All <span className="cc-filter-count">{unlocked.length}</span>
            </button>
            {TYPE_ORDER.filter((t) => typesUsed.includes(t)).map((t) => (
              <button
                key={t}
                className={`cc-filter-tab${filter === t ? ' active' : ''}`}
                style={filter === t ? { borderColor: TYPE_META[t].color, color: TYPE_META[t].color } : {}}
                onClick={() => setFilter(t)}
              >
                {TYPE_META[t].icon} {TYPE_META[t].label}
                <span className="cc-filter-count">{unlocked.filter((i) => i.content_type === t).length}</span>
              </button>
            ))}
          </div>

          <div className="cc-grid">
            {visible.map((item) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ContentCard({ item }) {
  const meta = TYPE_META[item.content_type] ?? TYPE_META.resource;
  const url  = item.download_url ?? item.url;

  return (
    <a
      className="cc-card"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ '--cc-color': meta.color }}
    >
      <div className="cc-card-icon">{meta.icon}</div>
      <div className="cc-card-body">
        <div className="cc-card-type">{meta.label}</div>
        <div className="cc-card-title">{item.title}</div>
        {item.description && <div className="cc-card-desc">{item.description}</div>}
      </div>
      <div className="cc-card-action">
        {item.r2_key ? '↓' : '↗'}
      </div>
    </a>
  );
}
