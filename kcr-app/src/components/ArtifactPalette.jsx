import { useState } from 'react';

const TYPE_COLORS = {
  physical:  'var(--physical)',
  digital:   'var(--digital)',
  personnel: 'var(--personnel)',
  inject:    'var(--inject)',
};

const TYPE_ICONS = {
  physical:  '🔩',
  digital:   '💾',
  personnel: '👤',
  inject:    '⚡',
};

const TYPES = ['physical', 'digital', 'personnel', 'inject'];

export default function ArtifactPalette({ artifacts, isAdmin, onDeleteArtifact, onAddArtifact }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = artifacts.filter((a) => {
    const matchType   = filter === 'all' || a.type === filter;
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const grouped = TYPES.reduce((acc, t) => {
    const items = filtered.filter((a) => a.type === t);
    if (items.length) acc[t] = items;
    return acc;
  }, {});

  const handleDragStart = (e, artifact) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/kcr-artifact', JSON.stringify(artifact));
  };

  return (
    <div className="artifact-palette">
      <div className="palette-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="palette-header-title">Artifact Catalog</div>
          {isAdmin && (
            <button
              className="btn btn-ghost"
              style={{ padding: '2px 8px', fontSize: 11 }}
              onClick={onAddArtifact}
            >+ Add</button>
          )}
        </div>
        <input
          className="palette-search"
          placeholder="Search artifacts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
          {['all', ...TYPES].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                background: filter === t ? (t === 'all' ? 'var(--cyan-md)' : TYPE_COLORS[t] + '22') : 'transparent',
                border: `1px solid ${filter === t ? (t === 'all' ? 'var(--cyan)' : TYPE_COLORS[t]) : 'var(--border)'}`,
                color: filter === t ? (t === 'all' ? 'var(--cyan)' : TYPE_COLORS[t]) : 'var(--muted)',
                borderRadius: 3,
                padding: '2px 7px',
                fontSize: 9,
                fontFamily: 'var(--mono)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="palette-body">
        {Object.keys(grouped).length === 0 && (
          <div className="palette-empty">
            {artifacts.length === 0
              ? 'No artifacts defined. Add artifacts to start placing them on floor plans.'
              : 'No artifacts match your search.'}
          </div>
        )}

        {TYPES.map((type) => {
          const items = grouped[type];
          if (!items) return null;
          return (
            <div key={type}>
              <div className="palette-type-label" style={{ color: TYPE_COLORS[type] }}>
                <div className="palette-type-dot" style={{ background: TYPE_COLORS[type] }} />
                {TYPE_ICONS[type]} {type}
              </div>
              {items.map((artifact) => (
                <PaletteItem
                  key={artifact.id}
                  artifact={artifact}
                  color={TYPE_COLORS[artifact.type]}
                  isAdmin={isAdmin}
                  onDelete={onDeleteArtifact}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaletteItem({ artifact, color, isAdmin, onDelete, onDragStart }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="palette-item"
      draggable
      onDragStart={(e) => onDragStart(e, artifact)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`Drag onto a floor plan to place ${artifact.name}`}
    >
      <div className="palette-item-marker" style={{ background: color }}>
        <span className="palette-item-marker-label">
          {artifact.icon_label || artifact.name.slice(0, 3).toUpperCase()}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="palette-item-name">{artifact.name}</div>
        {artifact.description && (
          <div className="palette-item-desc" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {artifact.description}
          </div>
        )}
      </div>
      {isAdmin && hovered && (
        <button
          className="btn-logout"
          style={{ fontSize: 11, flexShrink: 0 }}
          title="Remove artifact"
          onClick={(e) => { e.stopPropagation(); onDelete(artifact); }}
        >✕</button>
      )}
    </div>
  );
}
