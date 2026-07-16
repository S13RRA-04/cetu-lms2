import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getScenarios, getCourseContent } from '../api/pact.js';
import { isScenarioDropContent } from '../lib/contentClassification.js';

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
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState([]);
  const [intelItems, setIntelItems] = useState([]);
  const [collapsedSections, setCollapsedSections] = useState({});
  const navigate = useNavigate();

  // Re-fetch every time the drawer is opened, not just the first time — this
  // component is mounted once for the whole session (in AppShell), so a
  // one-shot `loaded` guard meant anything an admin unlocked/published after
  // a student's first visit would never show up here without a hard page
  // refresh, even though the same data is fresh everywhere else.
  const load = useCallback(() => {
    if (loading) return;
    setLoading(true);
    Promise.all([
      getScenarios().catch(() => []),
      getCourseContent().catch(() => []),
    ]).then(([scenarios, content]) => {
      setPackages((Array.isArray(scenarios) ? scenarios : []).filter((p) => p.is_unlocked));
      setIntelItems(
        (Array.isArray(content) ? content : [])
          .filter((i) => i.is_unlocked !== false && isScenarioDropContent(i))
      );
    }).finally(() => setLoading(false));
  }, [loading]);

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

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const sortedPackages = [...packages].sort((a, b) => collator.compare(
    a.title ?? a.scenario_name ?? '',
    b.title ?? b.scenario_name ?? '',
  ));
  const sortedIntel = [...intelItems].sort((a, b) => collator.compare(a.title ?? '', b.title ?? ''));
  const total = sortedPackages.length + sortedIntel.length;

  const toggleSection = (section) => {
    setCollapsedSections((current) => ({ ...current, [section]: !current[section] }));
  };

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

                {!loading && sortedPackages.length > 0 && (
                  <div className="evd-section">
                    <button type="button" className="evd-section-label" onClick={() => toggleSection('case-file-releases')} aria-expanded={!collapsedSections['case-file-releases']}>
                      <span className="evd-section-chevron" aria-hidden="true">▾</span>
                      <span>CASE FILE RELEASES</span>
                      <span className="evd-section-count">{sortedPackages.length}</span>
                    </button>
                    {!collapsedSections['case-file-releases'] && sortedPackages.map((pkg) => (
                      <button key={pkg.id} className="evd-row" onClick={goToCaseFile}>
                        <span className="evd-row-drop">
                          RELEASE {String(pkg.release_number ?? '').padStart(2, '0')}
                        </span>
                        <span className="evd-row-title">{pkg.title ?? pkg.scenario_name}</span>
                        <span className="evd-row-arrow">↗</span>
                      </button>
                    ))}
                    {!collapsedSections['case-file-releases'] && <p className="evd-hint">Opens the full Case File for file extraction.</p>}
                  </div>
                )}

                {!loading && sortedIntel.length > 0 && (
                  <div className="evd-section">
                    <button type="button" className="evd-section-label" onClick={() => toggleSection('scenario-drop-files')} aria-expanded={!collapsedSections['scenario-drop-files']}>
                      <span className="evd-section-chevron" aria-hidden="true">▾</span>
                      <span>SCENARIO DROP FILES — CASE FILE</span>
                      <span className="evd-section-count">{sortedIntel.length}</span>
                    </button>
                    {!collapsedSections['scenario-drop-files'] && sortedIntel.map((item) => {
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

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
