import { useEffect, useState } from 'react';
import { getScenarios, getScenarioDownloadUrl } from '../api/pact.js';
import useAuthStore from '../store/authStore.js';

export default function ScenariosPage() {
  const { user }     = useAuthStore();
  const isAdmin      = user?.role === 'admin' || user?.role === 'instructor';
  const [packages,   setPackages]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [downloading, setDownloading] = useState({});
  const [errors,     setErrors]     = useState({});

  useEffect(() => {
    getScenarios()
      .then((data) => setPackages(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (pkg) => {
    setDownloading((d) => ({ ...d, [pkg.id]: true }));
    setErrors((e) => ({ ...e, [pkg.id]: null }));
    try {
      let url = pkg.download_url;
      if (!url) {
        const res = await getScenarioDownloadUrl(pkg.id);
        url = res.url;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [pkg.id]: err.response?.data?.error?.message ?? 'Download unavailable',
      }));
    } finally {
      setDownloading((d) => ({ ...d, [pkg.id]: false }));
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const published = packages.filter((p) => isAdmin || p.is_published !== false);

  return (
    <div className="scenarios-page">
      <h1 className="page-title">Scenario Packages</h1>
      <p className="page-subtitle">
        Download scenario files released for your cohort.
      </p>

      {published.length === 0 ? (
        <div className="scenarios-empty">
          <div className="scenarios-empty-icon">📦</div>
          <p>No scenario packages have been published yet.</p>
        </div>
      ) : (
        <div className="scenarios-list">
          {published.map((pkg) => {
            const unlocked = isAdmin || pkg.is_unlocked;
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
                  {pkg.description && (
                    <p className="scenario-description">{pkg.description}</p>
                  )}
                  <div className="scenario-file-name">
                    <span className="scenario-file-icon">📄</span>
                    {pkg.file_name}
                  </div>
                </div>

                {errors[pkg.id] && (
                  <div className="err-msg" style={{ margin: '0 20px 12px' }}>{errors[pkg.id]}</div>
                )}

                <div className="scenario-card-footer">
                  {unlocked ? (
                    <button
                      className="btn-submit scenario-dl-btn"
                      onClick={() => handleDownload(pkg)}
                      disabled={downloading[pkg.id]}
                    >
                      {downloading[pkg.id] ? 'Opening…' : '↓ Download'}
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
