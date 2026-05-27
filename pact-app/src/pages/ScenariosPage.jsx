import { useEffect, useState } from 'react';
import { getScenarios, getScenarioDownloadUrl } from '../api/pact.js';
import useAuthStore from '../store/authStore.js';

export default function ScenariosPage() {
  const { user }      = useAuthStore();
  const isAdmin       = user?.role === 'admin' || user?.role === 'instructor';
  const [packages,    setPackages]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [fileMap,     setFileMap]     = useState({});   // packageId → file[]
  const [loadingPkg,  setLoadingPkg]  = useState({});
  const [errors,      setErrors]      = useState({});

  useEffect(() => {
    getScenarios()
      .then((data) => setPackages(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleExpand = async (pkg) => {
    if (fileMap[pkg.id]) {
      /* toggle off */
      setFileMap((m) => { const n = { ...m }; delete n[pkg.id]; return n; });
      return;
    }
    setLoadingPkg((l) => ({ ...l, [pkg.id]: true }));
    setErrors((e) => ({ ...e, [pkg.id]: null }));
    try {
      const res   = await getScenarioDownloadUrl(pkg.id);
      const files = res.files ?? [];
      setFileMap((m) => ({ ...m, [pkg.id]: files }));
    } catch (err) {
      setErrors((e) => ({ ...e, [pkg.id]: err.response?.data?.error?.message ?? 'Could not load files' }));
    } finally {
      setLoadingPkg((l) => ({ ...l, [pkg.id]: false }));
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const published = packages.filter((p) => isAdmin || p.is_published !== false);

  return (
    <div className="scenarios-page">
      <h1 className="page-title">Scenario Packages</h1>
      <p className="page-subtitle">Download scenario files released for your cohort.</p>

      {published.length === 0 ? (
        <div className="scenarios-empty">
          <div className="scenarios-empty-icon">📦</div>
          <p>No scenario packages have been published yet.</p>
        </div>
      ) : (
        <div className="scenarios-list">
          {published.map((pkg) => {
            const unlocked = isAdmin || pkg.is_unlocked;
            const files    = fileMap[pkg.id];
            const expanded = !!files;
            return (
              <div key={pkg.id} className={`scenario-card${unlocked ? '' : ' scenario-locked'}`}>
                <div className="scenario-card-header">
                  <span className="scenario-release-badge">Package {pkg.release_number}</span>
                  {!isAdmin && (
                    <span className={`scenario-status-badge ${unlocked ? 'status-unlocked' : 'status-locked'}`}>
                      {unlocked ? '🔓 Released' : '🔒 Not yet released'}
                    </span>
                  )}
                  {isAdmin && (
                    <span className={`scenario-status-badge ${pkg.is_published ? 'status-unlocked' : 'status-locked'}`}>
                      {pkg.is_published ? 'Published' : 'Draft'}
                    </span>
                  )}
                </div>

                <div className="scenario-card-body">
                  <h2 className="scenario-title">{pkg.title}</h2>
                  {pkg.description && <p className="scenario-description">{pkg.description}</p>}
                </div>

                {errors[pkg.id] && (
                  <div className="err-msg" style={{ margin: '0 20px 12px' }}>{errors[pkg.id]}</div>
                )}

                {/* File listing */}
                {expanded && files.length > 0 && (
                  <div className="scenario-file-list">
                    {files.map((f) => (
                      <a
                        key={f.key}
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="scenario-file-row"
                        download
                      >
                        <span className="scenario-file-icon">📄</span>
                        <span className="scenario-file-name">{f.name}</span>
                        {f.size != null && (
                          <span className="scenario-file-size">{formatSize(f.size)}</span>
                        )}
                        <span className="scenario-file-dl">↓</span>
                      </a>
                    ))}
                  </div>
                )}
                {expanded && files.length === 0 && (
                  <div className="scenario-file-empty">No files found in this package.</div>
                )}

                <div className="scenario-card-footer">
                  {unlocked ? (
                    <button
                      className="btn-submit scenario-dl-btn"
                      onClick={() => handleExpand(pkg)}
                      disabled={loadingPkg[pkg.id]}
                    >
                      {loadingPkg[pkg.id] ? 'Loading…' : expanded ? '▲ Hide Files' : '↓ View Files'}
                    </button>
                  ) : (
                    <span className="scenario-locked-msg">
                      Your instructor has not released this package yet.
                    </span>
                  )}
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
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
