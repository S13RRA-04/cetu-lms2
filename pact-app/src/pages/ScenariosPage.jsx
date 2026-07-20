import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getScenarios, getScenarioDownloadUrl, downloadScenarioZip, getCourseContent } from '../api/pact.js';
import useAuthStore from '../store/authStore.js';
import DecryptText from '../components/DecryptText.jsx';
import { isScenarioDropContent } from '../lib/contentClassification.js';

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

/* "packet-heist" → "Packet Heist" — scenario_name is stored as a slug so
   packages and drop files group together by strict equality; this is purely
   the display form. */
function scenarioLabel(name) {
  if (!name) return 'Unassigned';
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* "restonit_office" → "Restonit Office" — location_code is a slug too, same
   deal as scenarioLabel. Items with no location_code (most content, for any
   drop that doesn't split by search scene) fall into a general bucket. */
function locationLabel(code) {
  if (!code) return 'GENERAL — NOT LOCATION-SPECIFIC';
  return code.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
  const isAdmin      = user?.role === 'admin' || user?.role === 'instructor' || user?.role === 'superadmin';
  const [packages,   setPackages]   = useState([]);
  const [dropFiles,  setDropFiles]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fileMap,    setFileMap]    = useState({});   // pkgId → files[]
  const [extracting, setExtracting] = useState({});   // pkgId → bool
  const [zipping,    setZipping]    = useState({});   // pkgId → bool
  const [errors,     setErrors]     = useState({});
  const [openDrops,  setOpenDrops]  = useState({});

  useEffect(() => {
    Promise.all([getScenarios(), getCourseContent()])
      .then(([scenarioData, contentData]) => {
        setPackages(Array.isArray(scenarioData) ? scenarioData : []);
        setDropFiles(
          (Array.isArray(contentData) ? contentData : [])
            .filter((item) => item.is_unlocked !== false && isScenarioDropContent(item)),
        );
      })
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

  const handleDownloadAll = async (pkg) => {
    setZipping((z) => ({ ...z, [pkg.id]: true }));
    setErrors((e) => ({ ...e, [pkg.id]: null }));
    try {
      const blob = await downloadScenarioZip(pkg.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pkg.title.replace(/[^\w.-]+/g, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // responseType 'blob' means error bodies arrive as a Blob too, not JSON.
      let message = 'Zip download failed — access may be restricted.';
      if (err.response?.data instanceof Blob) {
        try { message = JSON.parse(await err.response.data.text())?.error?.message ?? message; } catch { /* keep default */ }
      }
      setErrors((e) => ({ ...e, [pkg.id]: message }));
    } finally {
      setZipping((z) => ({ ...z, [pkg.id]: false }));
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.16em' }}>
        LOADING CASE FILE...
      </div>
    </div>
  );

  // Publish state is enforced server-side (published-only, even for admins);
  // no client-side bypass here. `is_unlocked`-based gating below still lets
  // admins preview locked-but-published content, which is intentional.
  const visible = packages;

  // Group by scenario_name, then by search location, then by drop number.
  // Packages and loose case files both carry location_code + drop_number now
  // (see Drop 6's office/residence split), so they fold into the same
  // Location → Drop nesting instead of two separate flat lists.
  const scenarioMap = new Map();
  const ensureScenario = (key) => {
    if (!scenarioMap.has(key)) scenarioMap.set(key, { locations: new Map() });
    return scenarioMap.get(key);
  };
  const ensureLocation = (scenario, locationCode) => {
    if (!scenario.locations.has(locationCode)) scenario.locations.set(locationCode, new Map());
    return scenario.locations.get(locationCode);
  };
  const ensureDrop = (location, dropNumber) => {
    if (!location.has(dropNumber)) location.set(dropNumber, { packages: [], files: [] });
    return location.get(dropNumber);
  };

  for (const pkg of visible) {
    const scenario = ensureScenario(pkg.scenario_name || pkg.title);
    const location = ensureLocation(scenario, pkg.location_code ?? null);
    ensureDrop(location, pkg.drop_number ?? null).packages.push(pkg);
  }
  for (const item of dropFiles) {
    const scenario = ensureScenario(item.scenario_name || 'scenario-drops');
    const location = ensureLocation(scenario, item.location_code ?? null);
    ensureDrop(location, item.drop_number ?? item.source_drop_number ?? null).files.push(item);
  }

  // Named locations first (alphabetically), general/unassigned bucket last.
  // Within a location, drops sort numerically with the driveless bucket last.
  const sortLocationEntries = (a, b) => {
    if (a[0] == null) return 1;
    if (b[0] == null) return -1;
    return a[0].localeCompare(b[0]);
  };
  const sortDropEntries = (a, b) => {
    if (a[0] == null) return 1;
    if (b[0] == null) return -1;
    return a[0] - b[0];
  };
  for (const scenario of scenarioMap.values()) {
    for (const location of scenario.locations.values()) {
      for (const drop of location.values()) {
        drop.packages.sort((a, b) => a.release_number - b.release_number);
      }
    }
  }
  const scenarios = [...scenarioMap.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="ep-root">
      {/* Page header */}
      <div className="ep-page-header">
        <div className="ep-page-eyebrow"><DecryptText text="CASE FILE // INTELLIGENCE PACKAGES" speed={18} hold={3} /></div>
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
          {scenarios.map(([scenarioName, scenarioGroup], si) => {
            const locationEntries = [...scenarioGroup.locations.entries()].sort(sortLocationEntries);
            const totalPackages = locationEntries.reduce((sum, [, drops]) =>
              sum + [...drops.values()].reduce((s, d) => s + d.packages.filter((p) => isAdmin || p.is_unlocked).length, 0), 0);
            const totalFiles = locationEntries.reduce((sum, [, drops]) =>
              sum + [...drops.values()].reduce((s, d) => s + d.files.length, 0), 0);

            return (
              <motion.div
                key={scenarioName}
                className="ep-scenario"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: si * 0.09 }}
              >

                {/* Folder header */}
                <div className="ep-folder-header">
                  <div>
                    <div className="ep-folder-stamp">CASE FILE</div>
                    <div className="ep-folder-name">{scenarioLabel(scenarioName)}</div>
                    <div className="ep-folder-meta">
                      {totalPackages} package{totalPackages !== 1 ? 's' : ''} and {totalFiles} drop file{totalFiles !== 1 ? 's' : ''} authorized
                    </div>
                  </div>
                  <div className="ep-folder-count">{totalPackages + totalFiles}</div>
                </div>

                {locationEntries.map(([locationCode, dropsMap]) => {
                  const dropEntries = [...dropsMap.entries()].sort(sortDropEntries);
                  const locationPackageCount = dropEntries.reduce((s, [, d]) => s + d.packages.filter((p) => isAdmin || p.is_unlocked).length, 0);
                  const locationFileCount = dropEntries.reduce((s, [, d]) => s + d.files.length, 0);

                  return (
                    <div key={`loc-${locationCode ?? 'none'}`} className="ep-location-group" style={{ marginBottom: 20 }}>
                      <div className="ep-location-header" style={{
                        fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em',
                        color: locationCode ? 'var(--primary)' : 'var(--muted)',
                        borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 12,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                      }}>
                        <span>◈ {locationLabel(locationCode)}</span>
                        <span style={{ color: 'var(--muted)', fontSize: 10 }}>
                          {locationPackageCount} package{locationPackageCount !== 1 ? 's' : ''} · {locationFileCount} file{locationFileCount !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {dropEntries.map(([dropNumber, { packages: dropPackages, files: dropFilesForDrop }]) => (
                        <div key={`drop-${locationCode ?? 'none'}-${dropNumber ?? 'none'}`} style={{ marginBottom: 16, marginLeft: 4 }}>
                          <div className="ep-drop-subheader" style={{
                            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.08em',
                            color: 'var(--muted)', marginBottom: 8,
                          }}>
                            {dropNumber != null ? `DROP ${String(dropNumber).padStart(2, '0')}` : 'UNASSIGNED TO A DROP'}
                          </div>

                          {dropFilesForDrop.length > 0 && (() => {
                            const dropKey = `${scenarioName}:${locationCode ?? 'none'}:${dropNumber ?? 'none'}`;
                            const expanded = Boolean(openDrops[dropKey]);
                            return (
                              <div className="ep-releases" style={{ marginBottom: 14 }}>
                                <div className="ep-release">
                                  <button
                                    type="button"
                                    className="ep-release-bar"
                                    onClick={() => setOpenDrops((current) => ({ ...current, [dropKey]: !current[dropKey] }))}
                                    aria-expanded={expanded}
                                    style={{ width: '100%', border: 0, cursor: 'pointer', textAlign: 'left' }}
                                  >
                                    <div className="ep-release-bar-left">
                                      <span className="ep-release-id">CASE FILES</span>
                                      <span className="ep-auth-badge">AUTHORIZED</span>
                                    </div>
                                    <span className="ep-file-count">{dropFilesForDrop.length} FILE{dropFilesForDrop.length !== 1 ? 'S' : ''} {expanded ? '▴' : '▾'}</span>
                                  </button>
                                  <AnimatePresence initial={false}>
                                  {expanded && <motion.div
                                    className="ep-release-body"
                                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}
                                  >
                                    <div className="ep-file-list" style={{ opacity: 1 }}>
                                      {dropFilesForDrop.map((item) => {
                                        const href = item.download_url ?? item.url;
                                        const name = item.file_name || item.title;
                                        return (
                                          <a
                                            key={item.id}
                                            href={href || undefined}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ep-file-row"
                                            download
                                            aria-disabled={!href}
                                          >
                                            <span className="ep-file-type">{fileType(name)}</span>
                                            <span className="ep-file-name">{name.toUpperCase()}</span>
                                            {item.file_size != null && <span className="ep-file-size">{formatSize(Number(item.file_size))}</span>}
                                            {href && <span className="ep-file-dl"><DownloadIcon /></span>}
                                          </a>
                                        );
                                      })}
                                    </div>
                                  </motion.div>}
                                  </AnimatePresence>
                                </div>
                              </div>
                            );
                          })()}

                {/* Release cards */}
                <div className="ep-releases">
                  {dropPackages.map((pkg) => {
                    const unlocked    = isAdmin || pkg.is_unlocked;
                    const files       = fileMap[pkg.id];
                    const expanded    = files !== undefined;
                    const isExtracting = extracting[pkg.id];
                    const isZipping   = zipping[pkg.id];

                    return (
                      <div key={pkg.id} className={`ep-release${unlocked ? '' : ' ep-release--locked'}`}>

                        {/* Release header bar */}
                        <div className="ep-release-bar">
                          <div className="ep-release-bar-left">
                            <span className="ep-release-id">
                              RELEASE {String(pkg.release_number ?? 0).padStart(2, '0')}
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
                          <div className="ep-release-footer" style={{ display: 'flex', gap: 8 }}>
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
                            <button
                              className="ep-extract-btn"
                              onClick={() => handleDownloadAll(pkg)}
                              disabled={isZipping}
                            >
                              {isZipping ? 'PACKAGING...' : <><DownloadIcon /> DOWNLOAD ALL</>}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </motion.div>
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
