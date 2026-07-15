import { useEffect, useState } from 'react';
import { createDropPuzzle, deleteDropPuzzle, getDropPuzzles, reorderDropPuzzles, updateDropPuzzle } from '../api/pact.js';

const EMPTY = { puzzle_type: 'cipher_wheel', enabled: true, prompt: '', answer: '', config: { method: 'caesar', shift: 13, cipherText: '' } };
const NAMES = { cipher_wheel: 'Cipher Wheel', log_grep: 'Log Grep', hash_match: 'Hash Match' };

function blank(type) {
  if (type === 'log_grep') return { ...EMPTY, puzzle_type: type, config: { lineFormat: 'auth', logLines: [] } };
  if (type === 'hash_match') return { ...EMPTY, puzzle_type: type, prompt: '', answer: '', config: { algorithm: 'sha256', inputText: '' } };
  return structuredClone(EMPTY);
}

export default function DropPuzzleManager({ drop, onChanged = null }) {
  const [puzzles, setPuzzles] = useState([]);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => getDropPuzzles(drop.id).then((items) => { setPuzzles(items); onChanged?.(items); return items; }).catch(() => setError('Could not load puzzles.'));
  useEffect(load, [drop.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setBusy(true); setError('');
    try {
      const payload = { ...draft, prompt: draft.prompt?.trim() || null, answer: draft.puzzle_type === 'hash_match' ? null : draft.answer?.trim() };
      if (draft.id) await updateDropPuzzle(drop.id, draft.id, payload);
      else await createDropPuzzle(drop.id, payload);
      setDraft(null); await load();
    } catch (e) { setError(e.response?.data?.error?.message ?? 'Puzzle could not be saved.'); }
    finally { setBusy(false); }
  };

  const move = async (index, delta) => {
    const next = [...puzzles];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPuzzles(next);
    try { const items = await reorderDropPuzzles(drop.id, next.map((item) => item.id)); setPuzzles(items); onChanged?.(items); }
    catch { setError('Could not reorder puzzles.'); load(); }
  };

  return <div className="drop-puzzle-manager">
    <p style={{ marginTop: 0, fontSize: 12, color: 'var(--muted)' }}>These server-verified gates run after Signal Hunt and Vault Lock, in the order shown.</p>
    {puzzles.map((puzzle, index) => <div key={puzzle.id} className="admin-content-box" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--primary)' }}>{index + 1}</span>
      <div style={{ flex: 1 }}><strong>{NAMES[puzzle.puzzle_type]}</strong><div style={{ fontSize: 11, color: 'var(--muted)' }}>{puzzle.enabled ? 'Enabled' : 'Disabled'} · {puzzle.prompt || 'Default tasking'}</div></div>
      <button className="btn-secondary" onClick={() => move(index, -1)} disabled={index === 0}>↑</button>
      <button className="btn-secondary" onClick={() => move(index, 1)} disabled={index === puzzles.length - 1}>↓</button>
      <button className="btn-secondary" onClick={() => setDraft(structuredClone(puzzle))}>Edit</button>
      <button className="btn-secondary" onClick={async () => { if (!window.confirm(`Delete ${NAMES[puzzle.puzzle_type]}?`)) return; await deleteDropPuzzle(drop.id, puzzle.id); load(); }}>Delete</button>
    </div>)}
    {!puzzles.length && <div style={{ padding: 18, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No additional puzzle gates configured.</div>}
    {!draft && <button className="btn-submit" style={{ width: 'auto' }} onClick={() => setDraft(blank('cipher_wheel'))}>Add Puzzle</button>}
    {draft && <PuzzleEditor value={draft} onChange={setDraft} onSave={save} onCancel={() => setDraft(null)} busy={busy} />}
    {error && <div className="err-msg">{error}</div>}
  </div>;
}

function PuzzleEditor({ value, onChange, onSave, onCancel, busy }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  const config = (key, next) => set('config', { ...value.config, [key]: next });
  return <div className="publish-form" style={{ marginTop: 12 }}>
    <label className="admin-grade-label">Puzzle type</label>
    <select value={value.puzzle_type} disabled={!!value.id} onChange={(e) => onChange(blank(e.target.value))}>{Object.entries(NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
    <label style={{ display: 'flex', gap: 7, margin: '10px 0', fontSize: 12 }}><input type="checkbox" checked={value.enabled !== false} onChange={(e) => set('enabled', e.target.checked)} /> Enabled</label>
    <label className="admin-grade-label">Learner prompt{value.puzzle_type === 'hash_match' ? ' (optional)' : ' *'}</label>
    <textarea rows="2" value={value.prompt ?? ''} onChange={(e) => set('prompt', e.target.value)} />
    {value.puzzle_type === 'cipher_wheel' && <>
      <label className="admin-grade-label">Cipher method</label><select value={value.config.method} onChange={(e) => config('method', e.target.value)}><option value="caesar">Caesar</option><option value="rot13">ROT13</option><option value="atbash">Atbash</option></select>
      {value.config.method === 'caesar' && <><label className="admin-grade-label">Shift (1-25)</label><input type="number" min="1" max="25" value={value.config.shift ?? 13} onChange={(e) => config('shift', Number(e.target.value))} /></>}
      <label className="admin-grade-label">Ciphertext *</label><textarea rows="3" value={value.config.cipherText ?? ''} onChange={(e) => config('cipherText', e.target.value)} />
    </>}
    {value.puzzle_type === 'log_grep' && <>
      <label className="admin-grade-label">Log style</label><select value={value.config.lineFormat} onChange={(e) => config('lineFormat', e.target.value)}><option value="auth">Authentication</option><option value="firewall">Firewall</option><option value="vpn">VPN</option></select>
      <label className="admin-grade-label">Log lines (one per line) *</label><textarea rows="8" value={(value.config.logLines ?? []).join('\n')} onChange={(e) => config('logLines', e.target.value.split(/\r?\n/))} />
    </>}
    {value.puzzle_type === 'hash_match' && <>
      <label className="admin-grade-label">Algorithm</label><select value={value.config.algorithm} onChange={(e) => config('algorithm', e.target.value)}><option value="md5">MD5</option><option value="sha1">SHA-1</option><option value="sha256">SHA-256</option></select>
      <label className="admin-grade-label">Evidence text *</label><textarea rows="5" value={value.config.inputText ?? ''} onChange={(e) => config('inputText', e.target.value)} />
    </>}
    {value.puzzle_type !== 'hash_match' && <><label className="admin-grade-label">Expected answer (server-only) *</label><input autoComplete="off" maxLength="255" value={value.answer ?? ''} onChange={(e) => set('answer', e.target.value)} /></>}
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}><button className="btn-submit" style={{ width: 'auto' }} disabled={busy} onClick={onSave}>{busy ? 'Saving...' : 'Save Puzzle'}</button><button className="btn-secondary" onClick={onCancel}>Cancel</button></div>
  </div>;
}
