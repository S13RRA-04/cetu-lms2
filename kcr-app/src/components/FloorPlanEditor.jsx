import { useEffect, useRef, useState, useCallback } from 'react';
import {
  getFloorPlanUrl, presignFloorPlan, confirmFloorPlan,
  listPlacements, createPlacement, updatePlacement, deletePlacement,
} from '../api/kcr.js';
import ArtifactMarker from './ArtifactMarker.jsx';

const TYPE_COLORS = {
  physical:  'var(--physical)',
  digital:   'var(--digital)',
  personnel: 'var(--personnel)',
  inject:    'var(--inject)',
};

export default function FloorPlanEditor({ eid, vid, rid, isAdmin, artifacts }) {
  const containerRef = useRef(null);
  const [floorPlanUrl,  setFloorPlanUrl]  = useState(null);
  const [placements,    setPlacements]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [uploading,     setUploading]     = useState(false);
  const [uploadErr,     setUploadErr]     = useState('');
  const [isDragOver,    setIsDragOver]    = useState(false);
  const [selected,      setSelected]      = useState(null); // placement id

  /* Load floor plan URL + placements whenever room changes */
  useEffect(() => {
    setLoading(true);
    setFloorPlanUrl(null);
    setPlacements([]);
    setSelected(null);

    Promise.all([
      getFloorPlanUrl(eid, vid, rid).then((d) => setFloorPlanUrl(d.floor_plan_url)).catch(() => {}),
      listPlacements(eid, vid, rid).then(setPlacements).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [eid, vid, rid]);

  /* ── Floor plan image upload ── */
  const handleFileUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setUploadErr('Please select an image file.');
      return;
    }
    setUploading(true);
    setUploadErr('');
    try {
      const { upload_url, key } = await presignFloorPlan(eid, vid, rid, file.type);
      await fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const result = await confirmFloorPlan(eid, vid, rid, key);
      setFloorPlanUrl(result.floor_plan_url);
    } catch (err) {
      setUploadErr(err.response?.data?.error?.message ?? 'Upload failed.');
    } finally { setUploading(false); }
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  };

  /* ── Drop artifact from palette onto floor plan ── */
  const handleDragOver = (e) => {
    if (e.dataTransfer.types.includes('application/kcr-artifact')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  };
  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!isAdmin) return;

    const raw = e.dataTransfer.getData('application/kcr-artifact');
    if (!raw) return;

    const artifact = JSON.parse(raw);
    const rect = containerRef.current.getBoundingClientRect();
    const x_pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width)  * 100));
    const y_pct = Math.max(0, Math.min(100, ((e.clientY - rect.top)  / rect.height) * 100));

    try {
      const p = await createPlacement(eid, vid, rid, { artifact_id: artifact.id, x_pct, y_pct });
      setPlacements((prev) => [...prev, p]);
      setSelected(p.id);
    } catch { /* ignore */ }
  };

  /* ── Drag existing marker to reposition ── */
  const handleMarkerMove = useCallback(async (placementId, x_pct, y_pct) => {
    setPlacements((prev) =>
      prev.map((p) => p.id === placementId ? { ...p, x_pct, y_pct } : p)
    );
    try {
      await updatePlacement(eid, vid, rid, placementId, { x_pct, y_pct });
    } catch { /* optimistic; ignore */ }
  }, [eid, vid, rid]);

  const handleMarkerDelete = async (placementId) => {
    if (!confirm('Remove this artifact from the floor plan?')) return;
    try {
      await deletePlacement(eid, vid, rid, placementId);
      setPlacements((prev) => prev.filter((p) => p.id !== placementId));
      if (selected === placementId) setSelected(null);
    } catch { /* ignore */ }
  };

  const handleNotesUpdate = async (placementId, notes) => {
    try {
      const updated = await updatePlacement(eid, vid, rid, placementId, { notes });
      setPlacements((prev) => prev.map((p) => p.id === placementId ? updated : p));
    } catch { /* ignore */ }
  };

  if (loading) return (
    <div className="loading-screen" style={{ flex: 1, flexDirection: 'column', gap: 10 }}>
      <div className="spinner" />
      <span>Loading room…</span>
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div className="floor-plan-toolbar">
        <div className="floor-plan-toolbar-title" />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em' }}>
            {placements.length} artifact{placements.length !== 1 ? 's' : ''} placed
          </span>
          {isAdmin && (
            <label className="btn btn-ghost" style={{ cursor: 'pointer' }} title="Upload floor plan image">
              {uploading ? 'Uploading…' : floorPlanUrl ? '↑ Replace Floor Plan' : '↑ Upload Floor Plan'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileInput} disabled={uploading} />
            </label>
          )}
        </div>
        {uploadErr && <span className="err-msg">{uploadErr}</span>}
      </div>

      {/* Canvas area */}
      <div
        className="floor-plan-canvas-area"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => setSelected(null)}
      >
        {floorPlanUrl ? (
          <div
            ref={containerRef}
            className="floor-plan-container"
            style={{
              outline: isDragOver ? '2px dashed var(--cyan)' : undefined,
              boxShadow: isDragOver ? 'var(--glow-cyan)' : undefined,
            }}
          >
            <img
              src={floorPlanUrl}
              alt="Floor plan"
              className="floor-plan-img"
              draggable={false}
              style={{ maxHeight: 'calc(100vh - 180px)' }}
            />
            {/* Artifact markers */}
            {placements.map((p) => (
              <ArtifactMarker
                key={p.id}
                placement={p}
                artifact={p.artifact}
                color={TYPE_COLORS[p.artifact?.type] ?? 'var(--cyan)'}
                isSelected={selected === p.id}
                isAdmin={isAdmin}
                containerRef={containerRef}
                onSelect={() => setSelected(p.id)}
                onMove={handleMarkerMove}
                onDelete={handleMarkerDelete}
                onNotesUpdate={handleNotesUpdate}
              />
            ))}
            {isDragOver && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,212,255,0.06)',
                border: '2px dashed var(--cyan)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--cyan)', letterSpacing: '0.15em' }}>
                  DROP TO PLACE ARTIFACT
                </span>
              </div>
            )}
          </div>
        ) : (
          <label
            className={`floor-plan-no-image upload-zone${isDragOver ? ' drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file && isAdmin) handleFileUpload(file);
            }}
            style={{ cursor: isAdmin ? 'pointer' : 'default' }}
          >
            <span style={{ fontSize: 32 }}>🗺️</span>
            <div className="floor-plan-no-image-label">
              {isAdmin ? 'Click or drag an image to upload the floor plan' : 'No floor plan uploaded yet'}
            </div>
            {isAdmin && (
              <input type="file" accept="image/*" onChange={handleFileInput} disabled={uploading} />
            )}
          </label>
        )}
      </div>

      {/* Status bar */}
      <div className="status-bar">
        <div className="status-bar-item">
          <div className={`status-dot ${floorPlanUrl ? 'online' : 'offline'}`} />
          {floorPlanUrl ? 'Floor plan loaded' : 'No floor plan'}
        </div>
        {isAdmin && floorPlanUrl && (
          <div className="status-bar-item" style={{ color: 'var(--cyan)', opacity: 0.7 }}>
            Drag artifacts from the palette → drop to place
          </div>
        )}
        {selected && (() => {
          const p = placements.find((x) => x.id === selected);
          return p ? (
            <div className="status-bar-item" style={{ marginLeft: 'auto', color: 'var(--bright)' }}>
              Selected: {p.artifact?.name}
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
}
