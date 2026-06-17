import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getScenarios, getScenarioDownloadUrl } from '../api/pact.js';
import useAuthStore from '../store/authStore.js';

const EXT_TYPE = {
  pdf:  'PDF', docx: 'DOC', doc: 'DOC',
  xlsx: 'XLS', xls: 'XLS', csv: 'XLS',
  png:  'IMG', jpg: 'IMG', jpeg: 'IMG', gif: 'IMG', webp: 'IMG', bmp: 'IMG',
  mp4:  'VID', mov: 'VID', avi: 'VID',
  zip:  'PKG', tar: 'PKG', gz: 'PKG', '7z': 'PKG',
  pptx: 'PPT', ppt: 'PPT',
};

function fileType(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  return EXT_TYPE[ext] || 'FILE';
}

function FileIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function LockIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  );
}

// Fake progress bar that runs to ~92% then stalls until files arrive
function DecryptBar() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setPct((p) => {
        if (p >= 92) { clearInterval(id); return 92; }
        return Math.min(92, p + Math.random() * 9 + 3);
      });
    }, 85);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="ep-decrypt-track">
      <div className="ep-decrypt-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function ScenariosPage() {
  const { user }     = useAuthStore();
  const isAdmin      = user?.role === 'admin' || user?.role === 'instructor';
  const [packages,   setPackages]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fileMap,    setFileMap]    = useState({});   // pkgId → files[]
  const [extracting, setExtracting] = useState({});   // pkgId → bool
  const [errors,     setErrors]     = useState({});

  useEffect(() => {
    getScenarios()
      .then((d) => setPackages(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleExtract = async (pkg) => {
    // Collapse if already open
    if (fileMap[pkg.id] !== undefined) {
      setFileMap((m) => { const n = { ...m }; delete n[pkg.id]; return n; });
      return;
    }
    setExtracting((e) => ({ ...e, [pkg.id]: true }));
    setErrors((e) => ({ ...e, [pkg.id]: null }));
    try {
      const [res] = await Promise.all([
        getScenarioDownloadUrl(pkg.id),
        new Promise((r) => setTimeout(r, 1700)), // always show extraction anim
      ]);
      setFileMap((m) => ({ ...m, [pkg.id]: res.files ?? [] }));
    } catch (err) {
      setErrors((e) => ({ ...e, [pkg.id]: err.response?.data?.error?.message ?? 'Extraction failed — access may be restricted.' }));
    } finally {
      setExtracting((e) => ({ ...e, [pkg.id]: false }));
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const visible = packages.filter((p) => isAdmin || p.is_published !== false);

  // Group by scenario_name
  const scenarioMap = new Map();
  for (const pkg of visible) {
    const key = pkg.scenario_name || pkg.title;
    if (!scenarioMap.has(key)) scenarioMap.set(key, []);
    scenarioMap.get(key).push(pkg);
  }
  for (const arr of scenarioMap.values()) arr.sort((a, b) => a.release_number - b.release_number);
  const scenarios = [...scenarioMap.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="ep-root">
      {/* Page header */}
      <div className="ep-page-header">
        <div className="ep-page-eyebrow">CASE FILE // INTELLIGENCE PACKAGES</div>
        <h1 className="ep-page-title">Evidence Repository</h1>
        <p className="ep-page-sub">
          Classified evidence files and intelligence packages authorized for your investigation.
        </p>
      </div>

      {scenarios.length === 0 ? (
        <div className="ep-empty">
          <FileIcon />
          <p>No evidence packages authorized for your cohort.<br />
            <span style={{ opacity: 0.5 }}>Stand by for Command authorization.</span>
          </p>
        </div>
      ) : (
        <div className="ep-scenario-list">
          {scenarios.map(([scenarioName, releases]) => {
            const authorizedCount = releases.filter((r) => isAdmin || r.is_unlocked).length;
            return (
              <div key={scenarioName} className="ep-scenario">

                {/* Folder header */}
                <div className="ep-folder-header">
                  <div>
                    <div className="ep-folder-stamp">CASE FILE</div>
                    <div className="ep-folder-name">{scenarioName}</div>
                    <div className="ep-folder-meta">
                      {authorizedCount} of {releases.length} release{releases.length !== 1 ? 's' : ''} authorized
                    </div>
                  </div>
                  <div className="ep-folder-count">{releases.length}</div>
                </div>

                {/* Release cards */}
                <div className="ep-releases">
                  {releases.map((pkg) => {
                    const unlocked    = isAdmin || pkg.is_unlocked;
                    const files       = fileMap[pkg.id];
                    const expanded    = files !== undefined;
                    const isExtracting = extracting[pkg.id];

                    return (
                      <div key={pkg.id} className={`ep-release${unlocked ? '' : ' ep-release--locked'}`}>

                        {/* Release header bar */}
                        <div className="ep-release-bar">
                          <div className="ep-release-bar-left">
                            <span className="ep-release-id">
                              RELEASE {String(pkg.release_number).padStart(2, '0')}
                            </span>
                            {unlocked ? (
                              <span className="ep-auth-badge">
                                <motion.span
                                  className="ep-auth-dot"
                                  animate={{ opacity: [1, 0.3, 1] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                                AUTHORIZED
                              </span>
                            ) : (
                              <span className="ep-locked-badge">
                                <LockIcon size={9} />
                                RESTRICTED
                              </span>
                            )}
                          </div>
                          {isAdmin && !pkg.is_published && (
                            <span className="ep-draft-tag">DRAFT</span>
                          )}
                        </div>

                        {/* Release body */}
                        <div className="ep-release-body">
                          {pkg.title !== scenarioName && (
                            <div className="ep-release-title">{pkg.title}</div>
                          )}
                          {pkg.description && (
                            <div className="ep-release-desc">{pkg.description}</div>
                          )}

                          {/* Locked content */}
                          {!unlocked && (
                            <div className="ep-redacted">
                              <div className="ep-redact-bar" style={{ width: '82%' }} />
                              <div className="ep-redact-bar" style={{ width: '61%' }} />
                              <div className="ep-redact-bar" style={{ width: '70%' }} />
                              <div className="ep-locked-notice">
                                <LockIcon size={11} />
                                AWAITING COMMAND AUTHORIZATION
                              </div>
                            </div>
                          )}

                          {/* Extraction progress */}
                          {isExtracting && (
                            <div className="ep-extracting">
                              <div className="ep-extracting-label">
                                <motion.span
                                  style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }}
                                  animate={{ opacity: [1, 0.2, 1] }}
                                  transition={{ duration: 0.7, repeat: Infinity }}
                                />
                                DECRYPTING EVIDENCE PACKAGE...
                              </div>
                              <DecryptBar />
                            </div>
                          )}

                          {/* Error */}
                          {errors[pkg.id] && (
                            <div className="ep-error">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              {errors[pkg.id]}
                            </div>
                          )}

                          {/* Extracted file list */}
                          <AnimatePresence>
                            {expanded && !isExtracting && (
                              <motion.div
                                className="ep-file-list"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.28 }}
                              >
                                <div className="ep-file-list-header">
                                  <span className="ep-extraction-complete">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    FILE EXTRACTION COMPLETE
                                  </span>
                                  <span className="ep-file-count">{files.length} FILE{files.length !== 1 ? 'S' : ''}</span>
                                </div>

                                {files.length === 0 ? (
                                  <div className="ep-file-empty">No files in this package.</div>
                                ) : files.map((f, i) => {
                                  const fname = f.name || f.key || '';
                                  const ftype = fileType(fname);
                                  return (
                                    <motion.a
                                      key={f.key}
                                      href={f.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ep-file-row"
                                      download
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: i * 0.06, duration: 0.22 }}
                                    >
                                      <span className="ep-file-type">{ftype}</span>
                                      <span className="ep-file-name">{fname.toUpperCase()}</span>
                                      {f.size != null && (
                                        <span className="ep-file-size">{formatSize(f.size)}</span>
                                      )}
                                      <span className="ep-file-dl"><DownloadIcon /></span>
                                    </motion.a>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Footer */}
                        {unlocked && (
                          <div className="ep-release-footer">
                            <button
                              className="ep-extract-btn"
                              onClick={() => handleExtract(pkg)}
                              disabled={isExtracting}
                            >
                              {isExtracting ? (
                                'DECRYPTING...'
                              ) : expanded ? (
                                <><ChevronUpIcon /> COLLAPSE FILES</>
                              ) : (
                                <><DownloadIcon /> EXTRACT FILES</>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
