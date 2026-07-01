import { useEffect, useState, useCallback } from 'react';
import useAuthStore from '../store/authStore.js';
import { motion, AnimatePresence } from 'motion/react';
import { getCourseContent } from '../api/pact.js';
import DecryptText from '../components/DecryptText.jsx';

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
  const { user }     = useAuthStore();
  const isAdmin      = user?.role === 'admin' || user?.role === 'instructor';
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('all');
  const [viewerItem, setViewerItem] = useState(null);

  useEffect(() => {
    getCourseContent()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.16em' }}>
        LOADING INTEL LIBRARY...
      </div>
    </div>
  );

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
      <div className="ops-dashboard" style={{ paddingBottom: 0, marginBottom: 20 }}>
        <div className="ops-dash-eyebrow"><DecryptText text="INTEL LIBRARY // CLASSIFIED MATERIALS" speed={18} hold={3} /></div>
        <h1 className="ops-dash-name">Intel Library</h1>
      </div>

      {unlocked.length === 0 ? (
        <div className="ops-empty-state">
          <div className="ops-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
          </div>
          <div className="ops-empty-label">{isAdmin ? 'NO CONTENT ADDED YET' : 'NO MATERIALS AUTHORIZED'}</div>
          <div className="ops-empty-sub">
            {isAdmin
              ? 'Add slides, handouts, or links via COMMAND → Content. These are separate from Assignments.'
              : 'Stand by for Command authorization.'}
          </div>
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
                {dropItems.map((item, i) => <CaseCard key={item.id} item={item} idx={i} onOpen={setViewerItem} />)}
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
                {materialItems.map((item, i) => <CaseCard key={item.id} item={item} idx={i} onOpen={setViewerItem} />)}
              </div>
            </>
          )}
        </>
      )}

      <AnimatePresence>
        {viewerItem && (
          <DeckViewer item={viewerItem} onClose={() => setViewerItem(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function viewerType(item) {
  const name = (item.file_name ?? item.url ?? '').toLowerCase();
  if (/\.pptx?$/.test(name)) return 'office';
  if (/\.docx?$/.test(name)) return 'office';
  if (/\.pdf$/.test(name))   return 'pdf';
  return 'external';
}

function CaseCard({ item, idx = 0, onOpen }) {
  const meta       = TYPE_META[item.content_type] ?? TYPE_META.resource;
  const isCampaign = CAMPAIGN_TYPES.includes(item.content_type);
  const href       = item.download_url ?? item.url ?? null;
  const canView    = !!href;
  const type       = viewerType(item);

  const handleClick = useCallback(() => {
    if (!canView) return;
    if (type === 'external') {
      window.open(href, '_blank', 'noopener');
    } else {
      onOpen(item);
    }
  }, [canView, href, type, item, onOpen]);

  return (
    <motion.div
      className="cc-card"
      onClick={handleClick}
      style={{
        cursor: canView ? 'pointer' : 'default',
        borderLeft: isCampaign ? `3px solid ${meta.color}` : undefined,
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: idx * 0.06 }}
    >
      <div className="cc-card-icon" style={{ color: meta.color }}>{meta.icon}</div>
      <div className="cc-card-body">
        <div className="cc-card-type" style={{ color: meta.color }}>{meta.label}</div>
        <div className="cc-card-title">{item.title}</div>
        {item.description && <div className="cc-card-desc">{item.description}</div>}
        {item.file_name && <div className="cc-card-file">{item.file_name}</div>}
      </div>
      {canView && (
        <div className="cc-card-arrow" style={{ color: meta.color }}>
          {type === 'external' ? '↗' : '▶'}
        </div>
      )}
    </motion.div>
  );
}

function DeckViewer({ item, onClose }) {
  const href = item.download_url ?? item.url ?? null;
  const type = viewerType(item);
  const meta = TYPE_META[item.content_type] ?? TYPE_META.resource;

  // Office Online direct embed — passes the public R2 URL directly to Microsoft's
  // viewer so their servers fetch the file. No WOPI protocol needed.
  const embedUrl = type === 'office' && href
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(href)}`
    : type === 'pdf' && href
    ? href
    : null;

  useEffect(() => {
    document.body.classList.add('deck-viewer-open');
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.classList.remove('deck-viewer-open');
      window.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  return (
    <motion.div
      className="cc-viewer-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className="cc-viewer-panel"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.18 }}
      >
        {/* Header */}
        <div className="cc-viewer-header">
          <div className="cc-viewer-title-row">
            <span className="cc-viewer-type" style={{ color: meta.color }}>{meta.label}</span>
            <span className="cc-viewer-title">{item.title}</span>
          </div>
          <div className="cc-viewer-actions">
            <a
              href={href}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="cc-viewer-download-btn"
            >
              ↓ Download
            </a>
            <button className="cc-viewer-close-btn" onClick={onClose} title="Close (Esc)">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="cc-viewer-body">
          {embedUrl && (
            <iframe
              src={embedUrl}
              title={item.title}
              className="cc-viewer-iframe"
              frameBorder="0"
              allowFullScreen
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
