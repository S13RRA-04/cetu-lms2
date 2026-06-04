import { useRef, useState, useEffect, useCallback } from 'react';

export default function ArtifactMarker({
  placement, artifact, color,
  isSelected, isAdmin, containerRef,
  onSelect, onMove, onDelete, onNotesUpdate,
}) {
  const markerRef  = useRef(null);
  const dragState  = useRef(null); // { startX, startY, origXpct, origYpct }
  const [isDragging, setIsDragging] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editNotes,  setEditNotes]  = useState(false);
  const [notesVal,   setNotesVal]   = useState(placement.notes ?? '');

  /* Keep notes in sync if placement updates externally */
  useEffect(() => setNotesVal(placement.notes ?? ''), [placement.notes]);

  const label = artifact?.icon_label || artifact?.name?.slice(0, 4).toUpperCase() || '?';

  /* ── Pointer drag (repositioning) ── */
  const handlePointerDown = useCallback((e) => {
    if (!isAdmin) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = containerRef.current.getBoundingClientRect();
    dragState.current = {
      startX:    e.clientX,
      startY:    e.clientY,
      origXpct:  placement.x_pct,
      origYpct:  placement.y_pct,
      containerW: rect.width,
      containerH: rect.height,
    };
    setIsDragging(false); // reset until actual movement
  }, [isAdmin, placement.x_pct, placement.y_pct, containerRef]);

  const handlePointerMove = useCallback((e) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return; // dead zone

    setIsDragging(true);
    setShowDetail(false);

    const newXpct = Math.max(0, Math.min(100,
      dragState.current.origXpct + (dx / dragState.current.containerW) * 100
    ));
    const newYpct = Math.max(0, Math.min(100,
      dragState.current.origYpct + (dy / dragState.current.containerH) * 100
    ));
    onMove(placement.id, newXpct, newYpct);
  }, [onMove, placement.id]);

  const handlePointerUp = useCallback((e) => {
    if (!dragState.current) return;
    const wasDragging = isDragging;
    dragState.current = null;
    setIsDragging(false);
    if (!wasDragging) {
      // treat as click
      onSelect();
      setShowDetail((prev) => !prev);
    }
  }, [isDragging, onSelect]);

  const handleSaveNotes = () => {
    onNotesUpdate(placement.id, notesVal);
    setEditNotes(false);
  };

  return (
    <>
      <div
        ref={markerRef}
        className={`artifact-marker${isSelected ? ' selected' : ''}`}
        style={{
          left:   `${placement.x_pct}%`,
          top:    `${placement.y_pct}%`,
          cursor: isAdmin ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="artifact-marker-pin"
          style={{ background: color }}
          title={artifact?.name}
        >
          <span className="artifact-marker-label">{label}</span>
        </div>
      </div>

      {/* Detail popover */}
      {showDetail && !isDragging && (
        <PlacementPopover
          placement={placement}
          artifact={artifact}
          color={color}
          x_pct={placement.x_pct}
          y_pct={placement.y_pct}
          isAdmin={isAdmin}
          editNotes={editNotes}
          notesVal={notesVal}
          onNotesChange={setNotesVal}
          onEditNotes={() => setEditNotes(true)}
          onSaveNotes={handleSaveNotes}
          onDelete={() => { setShowDetail(false); onDelete(placement.id); }}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
}

function PlacementPopover({
  placement, artifact, color, x_pct, y_pct,
  isAdmin, editNotes, notesVal,
  onNotesChange, onEditNotes, onSaveNotes, onDelete, onClose,
}) {
  const popoverRef = useRef(null);

  // close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [onClose]);

  const typeLabel = artifact?.type ? artifact.type.toUpperCase() : '—';

  return (
    <div
      ref={popoverRef}
      className="placement-popover"
      style={{
        position: 'absolute',
        left:  `${Math.min(x_pct, 70)}%`,
        top:   `calc(${y_pct}% - 8px)`,
        transform: 'translateY(-100%)',
        zIndex: 50,
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="placement-popover-name">{artifact?.name ?? 'Unknown'}</div>
      <div className="placement-popover-type" style={{ color }}>
        {typeLabel}
      </div>

      {artifact?.description && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
          {artifact.description}
        </div>
      )}

      {/* Notes section */}
      {editNotes ? (
        <div style={{ marginBottom: 10 }}>
          <textarea
            value={notesVal}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={3}
            placeholder="Placement notes…"
            style={{
              width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 4, color: 'var(--bright)', fontSize: 11, padding: '6px 8px', outline: 'none', resize: 'vertical',
            }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <button className="btn btn-primary" style={{ fontSize: 10, padding: '4px 10px' }} onClick={onSaveNotes}>Save</button>
            <button className="btn btn-ghost"   style={{ fontSize: 10, padding: '4px 8px' }}  onClick={() => onNotesChange(placement.notes ?? '')}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="placement-popover-notes">
          {placement.notes
            ? placement.notes
            : <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No placement notes</span>
          }
        </div>
      )}

      {/* Metadata from artifact */}
      {artifact?.metadata && Object.keys(artifact.metadata).length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {Object.entries(artifact.metadata).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 8, fontSize: 11, marginBottom: 2 }}>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', minWidth: 80 }}>{k}</span>
              <span style={{ color: 'var(--text)' }}>{String(v)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="placement-popover-actions">
        {isAdmin && !editNotes && (
          <button className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 8px' }} onClick={onEditNotes}>
            ✏️ Notes
          </button>
        )}
        {isAdmin && (
          <button className="btn btn-danger" style={{ fontSize: 10, padding: '4px 8px', marginLeft: 'auto' }} onClick={onDelete}>
            Remove
          </button>
        )}
        {!isAdmin && (
          <button className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 8px', marginLeft: 'auto' }} onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}
