import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getScenarios, getCourseContent } from '../api/pact.js';

const CAMPAIGN_TYPES = ['briefing', 'evidence', 'intel_report'];
const CAMPAIGN_META = {
  briefing:     { label: 'CP Briefing',  color: '#ef4444' },
  evidence:     { label: 'Evidence',     color: '#22c55e' },
  intel_report: { label: 'Intel Report', color: '#f97316' },
};

function viewerType(item) {
  const name = (item.file_name ?? item.url ?? '').toLowerCase();
  if (/\.pptx?$/.test(name) || /\.docx?$/.test(name)) return 'office';
  return 'external';
}

export default function EvidenceDrawer() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState([]);
  const [intelItems, setIntelItems] = useState([]);
  const navigate = useNavigate();

  const load = useCallback(() => {
    if (loaded || loading) return;
    setLoading(true);
    Promise.all([
      getScenarios().catch(() => []),
      getCourseContent().catch(() => []),
    ]).then(([scenarios, content]) => {
      setPackages((Array.isArray(scenarios) ? scenarios : []).filter((p) => p.is_unlocked));
      setIntelItems(
        (Array.isArray(content) ? content : [])
          .filter((i) => i.is_unlocked !== false && CAMPAIGN_TYPES.includes(i.content_type))
      );
      setLoaded(true);
    }).finally(() => setLoading(false));
  }, [loaded, loading]);

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      if (next) load();
      return next;
    });
  };

  const openIntelItem = (item) => {
    const href = item.download_url ?? item.url ?? null;
    if (!href) return;
    window.open(href, '_blank', 'noopener');
  };

  const goToCaseFile = () => {
    setOpen(false);
    navigate('/scenarios');
  };

  const sortedPackages = [...packages].sort((a, b) => (a.release_number ?? 0) - (b.release_number ?? 0));
  const sortedIntel = [...intelItems].sort((a, b) => (a.drop_number ?? 999) - (b.drop_number ?? 999));
  const total = sortedPackages.length + sortedIntel.length;

  return (
    <>
      <button className="evd-tab" onClick={toggle} title="Evidence — all authorized case files and intel in one place">
        <span className="evd-tab-icon">◑</span>
        <span className="evd-tab-label">EVIDENCE</span>
        {total > 0 && <span className="evd-tab-count">{total}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="evd-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="evd-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <div className="evd-header">
                <div>
                  <div className="evd-eyebrow">ALL AUTHORIZED MATERIALS</div>
                  <div className="evd-title">Evidence</div>
                </div>
                <button className="evd-close" onClick={() => setOpen(false)} title="Close">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div className="evd-body">
                {loading && <div className="evd-loading">LOADING...</div>}

                {!loading && total === 0 && (
                  <div className="evd-empty">No evidence authorized for your cohort yet.</div>
                )}

                {!loading && sortedIntel.length > 0 && (
                  <div className="evd-section">
                    <div className="evd-section-label">CAMPAIGN INTEL — INTEL LIBRARY</div>
                    {sortedIntel.map((item) => {
                      const meta = CAMPAIGN_META[item.content_type] ?? CAMPAIGN_META.evidence;
                      const canOpen = !!(item.download_url ?? item.url);
                      return (
                        <button
                          key={item.id}
                          className="evd-row"
                          onClick={() => openIntelItem(item)}
                          disabled={!canOpen}
                        >
                          <span className="evd-row-drop">
                            {item.drop_number != null ? `DROP ${item.drop_number}` : '—'}
                          </span>
                          <span className="evd-row-type" style={{ color: meta.color }}>{meta.label}</span>
                          <span className="evd-row-title">{item.title}</span>
                          {canOpen && (
                            <span className="evd-row-arrow">
                              {viewerType(item) === 'external' ? '↗' : '▶'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {!loading && sortedPackages.length > 0 && (
                  <div className="evd-section">
                    <div className="evd-section-label">CASE FILE RELEASES</div>
                    {sortedPackages.map((pkg) => (
                      <button key={pkg.id} className="evd-row" onClick={goToCaseFile}>
                        <span className="evd-row-drop">
                          RELEASE {String(pkg.release_number ?? '').padStart(2, '0')}
                        </span>
                        <span className="evd-row-title">{pkg.title ?? pkg.scenario_name}</span>
                        <span className="evd-row-arrow">↗</span>
                      </button>
                    ))}
                    <p className="evd-hint">Opens the full Case File for file extraction.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
