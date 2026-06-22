import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getIntelBoard, saveIntelBoard } from '../api/pact.js';
import useAuthStore from '../store/authStore.js';
import DecryptText from '../components/DecryptText.jsx';

/* ── Constants ───────────────────────────────────────────────────────────── */
const NODE_CFG = {
  person:   { label: 'Person',   color: '#00b0ff', r: 30 },
  org:      { label: 'Org',      color: '#f59e0b', r: 30 },
  network:  { label: 'Network',  color: '#22c55e', r: 22 },
  artifact: { label: 'Artifact', color: '#a855f7', r: 28 },
};
const EDGE_COLOR = 'rgba(148,163,184,0.5)';
const uid = () => Math.random().toString(36).slice(2, 10);

/* ── SVG node shapes (centered at 0,0) ──────────────────────────────────── */
function NodeShape({ type, color, selected }) {
  const alpha = selected ? '33' : '15';
  const fill  = `${color}${alpha}`;
  const sw    = selected ? 2 : 1.5;
  switch (type) {
    case 'person':
      return (
        <>
          <circle r={30} fill={fill} stroke={color} strokeWidth={sw} />
          <circle r={8}  cy={-11}  fill={color} opacity={0.85} />
          <path d="M-12,18 Q0,6 12,18" fill={color} opacity={0.6} />
        </>
      );
    case 'org':
      return (
        <polygon
          points="26,-15 26,15 0,30 -26,15 -26,-15 0,-30"
          fill={fill} stroke={color} strokeWidth={sw}
        />
      );
    case 'network':
      return (
        <rect x={-42} y={-20} width={84} height={40} rx={20}
          fill={fill} stroke={color} strokeWidth={sw} />
      );
    case 'artifact':
      return (
        <>
          <path d="M-22,-28 L14,-28 L22,-20 L22,28 L-22,28 Z"
            fill={fill} stroke={color} strokeWidth={sw} />
          <polyline points="14,-28 14,-20 22,-20"
            fill="none" stroke={color} strokeWidth={sw} opacity={0.7} />
        </>
      );
    default: return null;
  }
}

/* ── Toolbar button ─────────────────────────────────────────────────────── */
function ToolBtn({ active, danger, onClick, title, label, children }) {
  return (
    <button
      className={`intel-tool-btn${active ? ' intel-tool-active' : ''}${danger ? ' intel-tool-danger' : ''}`}
      onClick={onClick}
      title={title}
    >
      {children}
      {label && <span className="intel-tool-label">{label}</span>}
    </button>
  );
}

/* ── SVG icons for toolbar ───────────────────────────────────────────────── */
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IcPointer  = () => <svg viewBox="0 0 24 24" {...S}><path d="M5 3l14 9-7 1-4 7z"/></svg>;
const IcLink     = () => <svg viewBox="0 0 24 24" {...S}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
const IcTrash    = () => <svg viewBox="0 0 24 24" {...S}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
const IcFit      = () => <svg viewBox="0 0 24 24" {...S}><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>;
const IcSave     = () => <svg viewBox="0 0 24 24" {...S}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IcPerson   = () => <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/></svg>;
const IcBuilding = () => <svg viewBox="0 0 24 24" {...S}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10"/></svg>;
const IcGlobe    = () => <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8M12 3a14.5 14.5 0 010 18"/></svg>;
const IcFile     = () => <svg viewBox="0 0 24 24" {...S}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IcPrint    = () => <svg viewBox="0 0 24 24" {...S}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;

/* ── Coordinate helpers ──────────────────────────────────────────────────── */
function edgePoints(src, tgt) {
  const dx = tgt.x - src.x, dy = tgt.y - src.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 2) return null;
  const ux = dx / dist, uy = dy / dist;
  const r1 = NODE_CFG[src.type]?.r ?? 30;
  const r2 = NODE_CFG[tgt.type]?.r ?? 30;
  return {
    x1: src.x + ux * (r1 + 4),
    y1: src.y + uy * (r1 + 4),
    x2: tgt.x - ux * (r2 + 14),
    y2: tgt.y - uy * (r2 + 14),
  };
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function IntelPage() {
  const { user } = useAuthStore();

  const [board,       setBoard]       = useState({ nodes: [], edges: [], notes: '' });
  const [loading,     setLoading]     = useState(true);
  const [noSquad,     setNoSquad]     = useState(false);
  const [mode,        setMode]        = useState('select'); // select | link | add-{type}
  const [selected,    setSelected]    = useState(null);     // { kind: 'node'|'edge', id }
  const [linkFrom,    setLinkFrom]    = useState(null);     // node id
  const [transform,   setTransform]   = useState({ x: 0, y: 0, scale: 1 });
  const [dirty,       setDirty]       = useState(false);
  const [saveStatus,  setSaveStatus]  = useState('idle');   // idle | saving | saved | error
  const [notesOpen,   setNotesOpen]   = useState(true);
  const [editLabel,   setEditLabel]   = useState('');
  const [editSub,     setEditSub]     = useState('');

  const svgRef       = useRef(null);
  const dragRef      = useRef(null);
  const boardRef     = useRef(board);
  const transformRef = useRef(transform);
  const saveTimer    = useRef(null);

  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { transformRef.current = transform; }, [transform]);

  /* Load board */
  useEffect(() => {
    getIntelBoard()
      .then((data) => {
        if (data?.noSquad) { setNoSquad(true); return; }
        setBoard({
          nodes: data.nodes ?? [],
          edges: data.edges ?? [],
          notes: data.notes ?? '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* Auto-save 1.5s after last change */
  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveStatus('saving');
      saveIntelBoard(boardRef.current)
        .then(() => { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); })
        .catch(() => setSaveStatus('error'));
    }, 1500);
  }, []);

  useEffect(() => { if (dirty) { scheduleSave(); setDirty(false); } }, [dirty, scheduleSave]);

  /* Poll squad changes every 30s */
  useEffect(() => {
    if (noSquad || loading) return;
    const id = setInterval(() => {
      getIntelBoard().then((data) => {
        if (!data || data.noSquad) return;
        if (!dragRef.current) {
          setBoard({ nodes: data.nodes ?? [], edges: data.edges ?? [], notes: data.notes ?? '' });
        }
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [noSquad, loading]);

  /* Global mouse handlers for drag/pan */
  useEffect(() => {
    const handleMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const t = transformRef.current;
      if (d.type === 'pan') {
        const newT = { ...t, x: d.origX + (e.clientX - d.startX), y: d.origY + (e.clientY - d.startY) };
        transformRef.current = newT;
        setTransform(newT);
      } else if (d.type === 'node') {
        const dx = (e.clientX - d.startX) / t.scale;
        const dy = (e.clientY - d.startY) / t.scale;
        setBoard(b => ({
          ...b,
          nodes: b.nodes.map(n => n.id === d.id
            ? { ...n, x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) }
            : n),
        }));
        d.moved = true;
      }
    };
    const handleUp = () => {
      if (dragRef.current?.type === 'node' && dragRef.current.moved) setDirty(true);
      dragRef.current = null;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup',   handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup',   handleUp);
    };
  }, []);

  /* Keyboard: Escape cancels, Delete removes selected */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { setMode('select'); setLinkFrom(null); }
      if ((e.key === 'Delete' || e.key === 'Backspace') &&
          selected && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  /* ── Coordinate helpers ── */
  function svgPos(clientX, clientY) {
    const rect = svgRef.current.getBoundingClientRect();
    const t = transformRef.current;
    return { x: (clientX - rect.left - t.x) / t.scale, y: (clientY - rect.top - t.y) / t.scale };
  }

  /* ── Canvas interactions ── */
  function handleSvgMouseDown(e) {
    if (e.target !== svgRef.current && !e.target.classList.contains('intel-bg')) return;
    const addMatch = mode.match(/^add-(.+)/);
    if (addMatch) {
      const pos = svgPos(e.clientX, e.clientY);
      const byName = user ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() : 'Unknown';
      const newNode = { id: uid(), type: addMatch[1], label: NODE_CFG[addMatch[1]]?.label ?? 'Node', sublabel: '', notes: '', x: Math.round(pos.x), y: Math.round(pos.y), addedBy: byName, addedAt: new Date().toISOString() };
      setBoard(b => ({ ...b, nodes: [...b.nodes, newNode] }));
      setSelected({ kind: 'node', id: newNode.id });
      setEditLabel(newNode.label);
      setEditSub('');
      setDirty(true);
      setMode('select');
      return;
    }
    setSelected(null);
    setLinkFrom(null);
    dragRef.current = { type: 'pan', startX: e.clientX, startY: e.clientY, origX: transformRef.current.x, origY: transformRef.current.y };
  }

  function handleNodeMouseDown(e, node) {
    e.stopPropagation();
    if (linkFrom) return;
    dragRef.current = { type: 'node', id: node.id, startX: e.clientX, startY: e.clientY, origX: node.x, origY: node.y, moved: false };
  }

  function handleNodeClick(e, node) {
    e.stopPropagation();
    if (dragRef.current?.moved) return; // was a drag, not a click
    if (mode === 'link') {
      if (!linkFrom) {
        setLinkFrom(node.id);
      } else if (linkFrom !== node.id) {
        const exists = boardRef.current.edges.some(e2 => e2.source === linkFrom && e2.target === node.id);
        if (!exists) {
          const byName = user ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() : 'Unknown';
          const newEdge = { id: uid(), source: linkFrom, target: node.id, label: '', addedBy: byName, addedAt: new Date().toISOString() };
          setBoard(b => ({ ...b, edges: [...b.edges, newEdge] }));
          setSelected({ kind: 'edge', id: newEdge.id });
          setDirty(true);
        }
        setLinkFrom(null);
      }
      return;
    }
    setSelected({ kind: 'node', id: node.id });
    setEditLabel(node.label);
    setEditSub(node.sublabel ?? '');
    setMode('select');
  }

  function handleEdgeClick(e, edgeId) {
    e.stopPropagation();
    setSelected({ kind: 'edge', id: edgeId });
    setLinkFrom(null);
  }

  function handleWheel(e) {
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    const t = transformRef.current;
    const factor = e.deltaY < 0 ? 1.12 : 0.9;
    const newScale = Math.max(0.15, Math.min(5, t.scale * factor));
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const newT = {
      scale: newScale,
      x: mx - (mx - t.x) * (newScale / t.scale),
      y: my - (my - t.y) * (newScale / t.scale),
    };
    transformRef.current = newT;
    setTransform(newT);
  }

  function handleExportPDF() {
    const nodes = board.nodes;
    if (!nodes.length) return;

    const pad = 120;
    const xs  = nodes.map(n => n.x);
    const ys  = nodes.map(n => n.y);
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const W    = Math.max(...xs) - minX + pad;
    const H    = Math.max(...ys) - minY + pad;

    const clone = svgRef.current.cloneNode(true);
    clone.setAttribute('viewBox', `${minX} ${minY} ${W} ${H}`);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.removeAttribute('class');
    clone.style.cssText = '';

    // Reset pan/zoom transform
    const tGroup = clone.querySelector('g[style]');
    if (tGroup) tGroup.removeAttribute('style');

    // Dark background behind everything
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', String(minX)); bg.setAttribute('y', String(minY));
    bg.setAttribute('width', String(W)); bg.setAttribute('height', String(H));
    bg.setAttribute('fill', '#03060a');
    clone.insertBefore(bg, clone.firstChild);

    const svgStr = new XMLSerializer().serializeToString(clone);
    const date   = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html><head>
  <meta charset="utf-8"/>
  <title>Intel Board — ${date}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#03060a;display:flex;align-items:center;justify-content:center;min-height:100vh}
    svg{width:100vw;height:100vh;max-width:100%;max-height:100%}
    #ctrl{position:fixed;top:12px;right:12px;display:flex;gap:8px;z-index:9}
    #ctrl button{padding:6px 14px;border:none;cursor:pointer;font-family:monospace;font-size:11px;letter-spacing:.1em;border-radius:3px}
    #pb{background:#00b0ff;color:#000}#cb{background:rgba(255,255,255,.08);color:#94a3b8;border:1px solid rgba(255,255,255,.12)}
    @media print{#ctrl{display:none}}
  </style>
</head><body>
  <div id="ctrl">
    <button id="pb" onclick="window.print()">PRINT / SAVE AS PDF</button>
    <button id="cb" onclick="window.close()">CLOSE</button>
  </div>
  ${svgStr}
</body></html>`);
    win.document.close();
  }

  function handleFit() {
    const nodes = boardRef.current.nodes;
    if (!nodes.length) { const t = { x: 0, y: 0, scale: 1 }; transformRef.current = t; setTransform(t); return; }
    const rect = svgRef.current.getBoundingClientRect();
    const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
    const minX = Math.min(...xs) - 80, maxX = Math.max(...xs) + 80;
    const minY = Math.min(...ys) - 80, maxY = Math.max(...ys) + 80;
    const scale = Math.min(rect.width / (maxX - minX), rect.height / (maxY - minY), 2) * 0.85;
    const t = {
      scale,
      x: (rect.width  - (maxX - minX) * scale) / 2 - minX * scale,
      y: (rect.height - (maxY - minY) * scale) / 2 - minY * scale,
    };
    transformRef.current = t;
    setTransform(t);
  }

  function handleDelete() {
    if (!selected) return;
    if (selected.kind === 'node') {
      setBoard(b => ({
        ...b,
        nodes: b.nodes.filter(n => n.id !== selected.id),
        edges: b.edges.filter(e => e.source !== selected.id && e.target !== selected.id),
      }));
    } else {
      setBoard(b => ({ ...b, edges: b.edges.filter(e => e.id !== selected.id) }));
    }
    setSelected(null);
    setDirty(true);
  }

  function handleLabelCommit() {
    if (!selected || selected.kind !== 'node') return;
    setBoard(b => ({
      ...b,
      nodes: b.nodes.map(n => n.id === selected.id ? { ...n, label: editLabel, sublabel: editSub } : n),
    }));
    setDirty(true);
  }

  function handleEdgeLabel(edgeId, label) {
    setBoard(b => ({ ...b, edges: b.edges.map(e => e.id === edgeId ? { ...e, label } : e) }));
    setDirty(true);
  }

  /* ── Derived ── */
  const selectedNode = selected?.kind === 'node' ? board.nodes.find(n => n.id === selected.id) : null;
  const selectedEdge = selected?.kind === 'edge' ? board.edges.find(e => e.id === selected.id) : null;
  const addType = mode.match(/^add-(.+)/)?.[1];

  if (loading) return (
    <div className="intel-loading">
      <DecryptText text="INITIALIZING INTEL WORKSTATION..." speed={22} hold={3} />
    </div>
  );

  if (noSquad) return (
    <div className="intel-loading">
      <div className="ops-empty-state">
        <div className="ops-empty-label">NO SQUAD ASSIGNED</div>
        <div className="ops-empty-sub">Contact your instructor to be assigned to a squad before accessing the Intel Board.</div>
      </div>
    </div>
  );

  const tfStr = `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`;

  return (
    <div className="intel-root">

      {/* ── Header strip ── */}
      <div className="intel-header">
        <span className="intel-header-eyebrow">
          <DecryptText text="INTEL WORKSTATION // LINK ANALYSIS" speed={18} hold={3} />
        </span>
        <span className="intel-header-squad">{user?.first_name ? `${user.first_name} ${user.last_name}` : ''}</span>
        <span className="intel-header-squad-badge">SQUAD BOARD · ALL MEMBERS CAN VIEW &amp; EDIT</span>
        <span className="intel-header-spacer" />
        <span className={`intel-save-status intel-save-${saveStatus}`}>
          {saveStatus === 'saving' && 'SAVING...'}
          {saveStatus === 'saved'  && '● SAVED'}
          {saveStatus === 'error'  && '! SAVE ERROR'}
          {saveStatus === 'idle' && dirty && '● UNSAVED'}
        </span>
        <button className="intel-save-btn" onClick={() => { setSaveStatus('saving'); saveIntelBoard(board).then(() => { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); }).catch(() => setSaveStatus('error')); }} title="Save now">
          <IcSave />
        </button>
      </div>

      {/* ── Main area ── */}
      <div className="intel-main">

        {/* Left toolbar */}
        <div className="intel-sidebar">
          <div className="intel-tool-group">
            <ToolBtn active={mode === 'select'} onClick={() => { setMode('select'); setLinkFrom(null); }} title="Select / Pan" label="SELECT">
              <IcPointer />
            </ToolBtn>
          </div>

          <div className="intel-tool-sep" />

          <div className="intel-sidebar-section-label">ADD NODE</div>
          <div className="intel-tool-group">
            <ToolBtn active={addType === 'person'}   onClick={() => setMode('add-person')}   title="Add Person"                   label="PERSON">
              <IcPerson />
            </ToolBtn>
            <ToolBtn active={addType === 'org'}      onClick={() => setMode('add-org')}      title="Add Organization"             label="ORG">
              <IcBuilding />
            </ToolBtn>
            <ToolBtn active={addType === 'network'}  onClick={() => setMode('add-network')}  title="Add Network / IP / Domain"    label="NETWORK">
              <IcGlobe />
            </ToolBtn>
            <ToolBtn active={addType === 'artifact'} onClick={() => setMode('add-artifact')} title="Add File / Artifact / Event"  label="ARTIFACT">
              <IcFile />
            </ToolBtn>
          </div>

          <div className="intel-tool-sep" />

          <div className="intel-sidebar-section-label">EDIT</div>
          <div className="intel-tool-group">
            <ToolBtn active={mode === 'link'} onClick={() => { setMode('link'); setSelected(null); }} title="Draw connection" label="LINK">
              <IcLink />
            </ToolBtn>
            <ToolBtn danger onClick={handleDelete} title="Delete selected (Del)" label="DELETE">
              <IcTrash />
            </ToolBtn>
          </div>

          <div className="intel-tool-sep" />

          <div className="intel-sidebar-section-label">VIEW</div>
          <div className="intel-tool-group">
            <ToolBtn onClick={handleFit} title="Fit all nodes to screen" label="FIT">
              <IcFit />
            </ToolBtn>
            <ToolBtn onClick={handleExportPDF} title="Export to PDF" label="EXPORT">
              <IcPrint />
            </ToolBtn>
          </div>

          {/* Node type legend */}
          <div className="intel-legend">
            {Object.entries(NODE_CFG).map(([type, cfg]) => (
              <div key={type} className="intel-legend-row">
                <span className="intel-legend-dot" style={{ background: cfg.color }} />
                <span className="intel-legend-label">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SVG canvas */}
        <div
          className={`intel-canvas-wrap${addType ? ` intel-cursor-crosshair` : mode === 'link' ? ' intel-cursor-link' : ''}`}
          onWheel={handleWheel}
        >
          {/* Mode hint */}
          <AnimatePresence>
            {(addType || mode === 'link') && (
              <motion.div className="intel-mode-hint"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {addType && `Click canvas to place ${NODE_CFG[addType]?.label ?? addType} — Esc to cancel`}
                {mode === 'link' && !linkFrom && 'Click source node — Esc to cancel'}
                {mode === 'link' && linkFrom  && 'Click target node to connect'}
              </motion.div>
            )}
          </AnimatePresence>

          <svg
            ref={svgRef}
            className="intel-svg"
            onMouseDown={handleSvgMouseDown}
          >
            <defs>
              {Object.values(NODE_CFG).map(({ color }) => (
                <marker key={color} id={`arrow-${color.slice(1)}`}
                  markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill={color} opacity={0.8} />
                </marker>
              ))}
              <marker id="arrow-edge" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill={EDGE_COLOR} />
              </marker>
            </defs>

            {/* Background rect — click target */}
            <rect className="intel-bg" x="-99999" y="-99999" width="199998" height="199998" fill="transparent" />

            {/* Transformed content group */}
            <g style={{ transform: tfStr, transformOrigin: '0 0' }}>

              {/* Grid dots */}
              <defs>
                <pattern id="intel-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="0" cy="0" r="1" fill="rgba(0,140,220,0.12)" />
                </pattern>
              </defs>
              <rect x="-9999" y="-9999" width="19998" height="19998" fill="url(#intel-grid)" pointerEvents="none" />

              {/* Edges */}
              {board.edges.map((edge) => {
                const src = board.nodes.find(n => n.id === edge.source);
                const tgt = board.nodes.find(n => n.id === edge.target);
                if (!src || !tgt) return null;
                const pts = edgePoints(src, tgt);
                if (!pts) return null;
                const isSelected = selected?.kind === 'edge' && selected.id === edge.id;
                const mx = (pts.x1 + pts.x2) / 2, my = (pts.y1 + pts.y2) / 2;
                return (
                  <g key={edge.id}>
                    {/* Wide hit target */}
                    <line {...pts} stroke="transparent" strokeWidth={18} style={{ cursor: 'pointer' }}
                      onClick={(e) => handleEdgeClick(e, edge.id)} />
                    <line {...pts}
                      stroke={isSelected ? '#00b0ff' : EDGE_COLOR}
                      strokeWidth={isSelected ? 2 : 1.2}
                      markerEnd={`url(#arrow-${isSelected ? '00b0ff' : 'edge'})`}
                      opacity={isSelected ? 1 : 0.7}
                    />
                    {edge.label && (
                      <>
                        <rect x={mx - edge.label.length * 3.4} y={my - 9} width={edge.label.length * 6.8} height={14}
                          fill="rgba(4,7,11,0.88)" rx={2} />
                        <text x={mx} y={my + 2} textAnchor="middle" fontSize={9} fill="rgba(148,163,184,0.9)"
                          fontFamily="monospace" letterSpacing="0.06em">
                          {edge.label.toUpperCase()}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}

              {/* Link-from indicator line (while linking) */}
              {linkFrom && (() => {
                const src = board.nodes.find(n => n.id === linkFrom);
                if (!src) return null;
                return (
                  <circle cx={src.x} cy={src.y} r={36}
                    fill="none" stroke="#00b0ff" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.7}>
                    <animateTransform attributeName="transform" type="rotate"
                      from={`0 ${src.x} ${src.y}`} to={`360 ${src.x} ${src.y}`} dur="4s" repeatCount="indefinite" />
                  </circle>
                );
              })()}

              {/* Nodes */}
              {board.nodes.map((node) => {
                const cfg = NODE_CFG[node.type] ?? NODE_CFG.artifact;
                const isSelected = selected?.kind === 'node' && selected.id === node.id;
                const isLinkFrom = linkFrom === node.id;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x},${node.y})`}
                    style={{ cursor: mode === 'link' ? 'crosshair' : 'pointer' }}
                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                    onClick={(e) => handleNodeClick(e, node)}
                  >
                    {/* Selection glow ring */}
                    {(isSelected || isLinkFrom) && (
                      <circle r={40} fill="none" stroke={cfg.color} strokeWidth={1}
                        strokeDasharray="4 4" opacity={0.5} />
                    )}
                    {isSelected && (
                      <circle r={40} fill={cfg.color} opacity={0.05} />
                    )}

                    <NodeShape type={node.type} color={cfg.color} selected={isSelected} />

                    {/* Label */}
                    <text dy={48} textAnchor="middle" fontSize={11} fill={isSelected ? cfg.color : 'rgba(220,232,244,0.85)'}
                      fontFamily="monospace" fontWeight={600} letterSpacing="0.04em" style={{ userSelect: 'none' }}>
                      {node.label || 'UNNAMED'}
                    </text>
                    {node.sublabel && (
                      <text dy={62} textAnchor="middle" fontSize={9} fill="rgba(148,163,184,0.55)"
                        fontFamily="monospace" style={{ userSelect: 'none' }}>
                        {node.sublabel.toUpperCase()}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Node edit panel */}
          <AnimatePresence>
            {selectedNode && (
              <motion.div
                className="intel-node-panel"
                initial={{ x: 260 }} animate={{ x: 0 }} exit={{ x: 260 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              >
                <div className="intel-panel-type" style={{ color: NODE_CFG[selectedNode.type]?.color }}>
                  {NODE_CFG[selectedNode.type]?.label?.toUpperCase()} NODE
                </div>

                <label className="intel-panel-label">LABEL</label>
                <input
                  className="intel-panel-input"
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onBlur={handleLabelCommit}
                  onKeyDown={e => e.key === 'Enter' && handleLabelCommit()}
                  placeholder="Entity name..."
                />

                <label className="intel-panel-label">IDENTIFIER</label>
                <input
                  className="intel-panel-input"
                  value={editSub}
                  onChange={e => setEditSub(e.target.value)}
                  onBlur={handleLabelCommit}
                  onKeyDown={e => e.key === 'Enter' && handleLabelCommit()}
                  placeholder="Role, IP, org, date..."
                />

                {selectedNode.addedBy && (
                  <>
                    <label className="intel-panel-label" style={{ marginTop: 10 }}>ADDED BY</label>
                    <div className="intel-panel-meta">
                      {selectedNode.addedBy}
                      {selectedNode.addedAt && (
                        <span className="intel-panel-meta-date">
                          {new Date(selectedNode.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </>
                )}

                <button className="intel-panel-delete" onClick={handleDelete}>
                  <IcTrash /> REMOVE NODE
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edge edit panel */}
          <AnimatePresence>
            {selectedEdge && (
              <motion.div
                className="intel-node-panel"
                initial={{ x: 260 }} animate={{ x: 0 }} exit={{ x: 260 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              >
                <div className="intel-panel-type" style={{ color: EDGE_COLOR }}>CONNECTION</div>

                <label className="intel-panel-label">RELATIONSHIP LABEL</label>
                <input
                  className="intel-panel-input"
                  value={selectedEdge.label}
                  onChange={e => handleEdgeLabel(selectedEdge.id, e.target.value)}
                  placeholder="e.g. employed at, controls..."
                />

                {selectedEdge.addedBy && (
                  <>
                    <label className="intel-panel-label" style={{ marginTop: 10 }}>ADDED BY</label>
                    <div className="intel-panel-meta">
                      {selectedEdge.addedBy}
                      {selectedEdge.addedAt && (
                        <span className="intel-panel-meta-date">
                          {new Date(selectedEdge.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </>
                )}

                <button className="intel-panel-delete" onClick={handleDelete}>
                  <IcTrash /> REMOVE CONNECTION
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Synthesis notes ── */}
      <div className={`intel-notes-section${notesOpen ? '' : ' intel-notes-collapsed'}`}>
        <button className="intel-notes-toggle" onClick={() => setNotesOpen(o => !o)}>
          <span className="intel-notes-toggle-label">SYNTHESIS NOTES</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points={notesOpen ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
          </svg>
        </button>
        {notesOpen && (
          <textarea
            className="intel-notes-textarea"
            value={board.notes}
            onChange={e => { setBoard(b => ({ ...b, notes: e.target.value })); setDirty(true); }}
            placeholder="Record your analysis, findings, and observations here..."
          />
        )}
      </div>

    </div>
  );
}
