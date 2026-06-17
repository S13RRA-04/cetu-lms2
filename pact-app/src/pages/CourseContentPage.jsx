import { useEffect, useState, useCallback } from 'react';
import { getCourseContent, getContentDownloadUrl } from '../api/pact.js';

const TYPE_META = {
  // Standard course materials
  slides:      { label: 'Slides',       icon: '◈', color: '#6366f1', group: 'materials' },
  handout:     { label: 'Handout',      icon: '◇', color: '#0ea5e9', group: 'materials' },
  agenda:      { label: 'Agenda',       icon: '⬡', color: '#10b981', group: 'materials' },
  form:        { label: 'Form',         icon: '◉', color: '#f59e0b', group: 'materials' },
  resource:    { label: 'Resource',     icon: '◆', color: '#8b5cf6', group: 'materials' },
  // Campaign content types
  briefing:    { label: 'CP Briefing',  icon: '▣', color: '#ef4444', group: 'campaign' },
  evidence:    { label: 'Evidence',     icon: '◑', color: '#22c55e', group: 'campaign' },
  intel_report:{ label: 'Intel Report', icon: '◐', color: '#f97316', group: 'campaign' },
};

const CAMPAIGN_TYPES = ['briefing', 'evidence', 'intel_report'];
const MATERIAL_TYPES = ['slides', 'handout', 'agenda', 'form', 'resource'];
const TYPE_ORDER = [...CAMPAIGN_TYPES, ...MATERIAL_TYPES];

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
    : filter === 'campaign'
    ? unlocked.filter((i) => CAMPAIGN_TYPES.includes(i.content_type))
    : filter === 'materials'
    ? unlocked.filter((i) => MATERIAL_TYPES.includes(i.content_type))
    : unlocked.filter((i) => i.content_type === filter);

  // Group visible campaign items by drop_number, then append untagged items
  const hasCampaignItems = unlocked.some((i) => CAMPAIGN_TYPES.includes(i.content_type));

  // Split campaign items by drop for grouped display
  const campaignByDrop = (() => {
    const campaignItems = visible.filter((i) => CAMPAIGN_TYPES.includes(i.content_type));
    if (campaignItems.length === 0) return [];
    const dropNums = [...new Set(campaignItems.map((i) => i.drop_number))].sort((a, b) => {
      if (a === null) return 1; if (b === null) return -1; return a - b;
    });
    return dropNums.map((num) => ({
      drop: num,
      items: campaignItems.filter((i) => i.drop_number === num),
    }));
  })();

  const materialItems = visible.filter((i) => MATERIAL_TYPES.includes(i.content_type));

  return (
    <div className="cc-page">
      <div className="cc-header">
        <h1 className="page-title">Case File</h1>
        <p className="page-subtitle">Evidence, briefings, intelligence reports, and course materials released for your cohort.</p>
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
            {hasCampaignItems && (
              <button
                className={`cc-filter-tab${filter === 'campaign' ? ' active' : ''}`}
                style={filter === 'campaign' ? { borderColor: '#ef4444', color: '#ef4444' } : {}}
                onClick={() => setFilter('campaign')}
              >
                ◑ Case Materials
                <span className="cc-filter-count">{unlocked.filter((i) => CAMPAIGN_TYPES.includes(i.content_type)).length}</span>
              </button>
            )}
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

          {/* Campaign materials grouped by drop */}
          {campaignByDrop.map(({ drop, items: dropItems }) => (
            <div key={drop ?? 'none'} style={{ marginBottom: 28 }}>
              {drop != null && (
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--primary)',
                  marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border)',
                  textTransform: 'uppercase',
                }}>
                  DROP {drop} — RELEASED MATERIALS
                </div>
              )}
              <div className="cc-grid">
                {dropItems.map((item) => <CaseCard key={item.id} item={item} />)}
              </div>
            </div>
          ))}

          {/* Standard materials */}
          {materialItems.length > 0 && (
            <>
              {hasCampaignItems && (
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--muted)',
                  marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border)',
                  textTransform: 'uppercase',
                }}>
                  COURSE MATERIALS
                </div>
              )}
              <div className="cc-grid">
                {materialItems.map((item) => <CaseCard key={item.id} item={item} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function CaseCard({ item }) {
  const [fetching, setFetching] = useState(false);
  const meta       = TYPE_META[item.content_type] ?? TYPE_META.resource;
  const isCampaign = CAMPAIGN_TYPES.includes(item.content_type);
  const hasDownload = item.r2_key ? true : !!(item.download_url ?? item.url);
  const downloadHref = item.r2_key
    ? getContentDownloadUrl(item.id)
    : (item.download_url ?? item.url);

  const handleOpen = useCallback(() => {
    if (!hasDownload || fetching) return;
    setFetching(true);
    setTimeout(() => {
      window.open(downloadHref, '_blank', 'noopener');
      setFetching(false);
    }, 680);
  }, [hasDownload, fetching, downloadHref]);

  return (
    <div
      className="cc-card"
      onClick={handleOpen}
      style={{
        cursor: hasDownload ? 'pointer' : 'default',
        borderLeft: isCampaign ? `3px solid ${meta.color}` : undefined,
      }}
    >
      {fetching && (
        <div className="cc-card-fetching-overlay">
          <span className="cc-card-fetching-text">RETRIEVING CLASSIFIED FILE...</span>
        </div>
      )}
      <div className="cc-card-icon" style={{ color: meta.color }}>{meta.icon}</div>
      <div className="cc-card-body">
        <div className="cc-card-type" style={{ color: meta.color }}>{meta.label}</div>
        <div className="cc-card-title">{item.title}</div>
        {item.description && <div className="cc-card-desc">{item.description}</div>}
        {item.file_name && <div className="cc-card-file">{item.file_name}</div>}
      </div>
      {hasDownload && !fetching && (
        <div className="cc-card-arrow" style={{ color: meta.color }}>→</div>
      )}
    </div>
  );
}
