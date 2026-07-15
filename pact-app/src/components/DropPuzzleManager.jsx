import { useEffect, useState } from 'react';
import { createDropPuzzle, deleteDropPuzzle, getDropPuzzles, reorderDropPuzzles, updateDropPuzzle } from '../api/pact.js';

const EMPTY = { puzzle_type: 'cipher_wheel', enabled: true, prompt: '', answer: '', config: { method: 'caesar', shift: 13, cipherText: '' } };
const NAMES = { cipher_wheel: 'Cipher Wheel', log_grep: 'Log Grep', hash_match: 'Hash Match' };
const GAME_OPTIONS = [
  { id: 'signal_hunt', type: 'signal_hunt', label: 'Signal Hunt', config: { signalCode: '' } },
  { id: 'vault_lock', type: 'vault_lock', label: 'Vault Lock', config: {} },
  { id: 'cipher_caesar', type: 'cipher_wheel', label: 'Cipher Wheel — Caesar', config: { method: 'caesar', shift: 13, cipherText: '' } },
  { id: 'cipher_rot13', type: 'cipher_wheel', label: 'Cipher Wheel — ROT13', config: { method: 'rot13', cipherText: '' } },
  { id: 'cipher_atbash', type: 'cipher_wheel', label: 'Cipher Wheel — Atbash', config: { method: 'atbash', cipherText: '' } },
  { id: 'log_auth', type: 'log_grep', label: 'Log Grep — Authentication', config: { lineFormat: 'auth', logLines: [] } },
  { id: 'log_firewall', type: 'log_grep', label: 'Log Grep — Firewall', config: { lineFormat: 'firewall', logLines: [] } },
  { id: 'log_vpn', type: 'log_grep', label: 'Log Grep — VPN', config: { lineFormat: 'vpn', logLines: [] } },
  { id: 'hash_md5', type: 'hash_match', label: 'Hash Match — MD5', config: { algorithm: 'md5', inputText: '' } },
  { id: 'hash_sha1', type: 'hash_match', label: 'Hash Match — SHA-1', config: { algorithm: 'sha1', inputText: '' } },
  { id: 'hash_sha256', type: 'hash_match', label: 'Hash Match — SHA-256', config: { algorithm: 'sha256', inputText: '' } },
];

function optionForPuzzle(puzzle) {
  if (puzzle.puzzle_type === 'signal_hunt' || puzzle.puzzle_type === 'vault_lock') return puzzle.puzzle_type;
  if (puzzle.puzzle_type === 'cipher_wheel') return `cipher_${puzzle.config?.method ?? 'caesar'}`;
  if (puzzle.puzzle_type === 'log_grep') return `log_${puzzle.config?.lineFormat ?? 'auth'}`;
  if (puzzle.puzzle_type === 'hash_match') return `hash_${puzzle.config?.algorithm ?? 'sha256'}`;
  return '';
}

function blank(optionId) {
  const option = GAME_OPTIONS.find((item) => item.id === optionId) ?? GAME_OPTIONS[0];
  return { ...EMPTY, puzzle_type: option.type, prompt: '', answer: '', config: structuredClone(option.config) };
}

function gameName(puzzle) {
  return GAME_OPTIONS.find((item) => item.id === optionForPuzzle(puzzle))?.label ?? NAMES[puzzle.puzzle_type] ?? puzzle.puzzle_type;
}

export default function DropPuzzleManager({ drop, onChanged = null }) {
  const [puzzles, setPuzzles] = useState([]);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => getDropPuzzles(drop.id).then((items) => { setPuzzles(items); onChanged?.(items); return items; }).catch(() => setError('Could not load puzzles.'));
  useEffect(() => { load(); }, [drop.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    setBusy(true); setError('');
    try {
      const payload = {
        ...draft,
        prompt: draft.prompt?.trim() || null,
        answer: draft.puzzle_type === 'hash_match' ? null : draft.puzzle_type === 'signal_hunt' ? draft.config.signalCode?.trim() : draft.answer?.trim(),
      };
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
    <p style={{ marginTop: 0, fontSize: 12, color: 'var(--muted)' }}>Add and layer games in any order. Every layer can be edited, enabled, reordered, or removed independently.</p>
    {puzzles.map((puzzle, index) => <div key={puzzle.id} className="admin-content-box" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--primary)' }}>{index + 1}</span>
      <div style={{ flex: 1 }}><strong>{gameName(puzzle)}</strong><div style={{ fontSize: 11, color: 'var(--muted)' }}>{puzzle.enabled ? 'Enabled' : 'Disabled'} · {puzzle.prompt || 'Default tasking'}</div></div>
      <button className="btn-secondary" onClick={() => move(index, -1)} disabled={index === 0}>↑</button>
      <button className="btn-secondary" onClick={() => move(index, 1)} disabled={index === puzzles.length - 1}>↓</button>
      <button className="btn-secondary" onClick={() => setDraft(structuredClone(puzzle))}>Edit</button>
      <button className="btn-secondary" onClick={async () => { if (!window.confirm(`Delete ${gameName(puzzle)}?`)) return; await deleteDropPuzzle(drop.id, puzzle.id); load(); }}>Delete</button>
    </div>)}
    {!puzzles.length && <div style={{ padding: 18, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No additional puzzle gates configured.</div>}
    {!draft && <button className="btn-submit" style={{ width: 'auto' }} onClick={() => setDraft(blank(GAME_OPTIONS[0].id))}>Add Game Layer</button>}
    {draft && <PuzzleEditor value={draft} onChange={setDraft} onSave={save} onCancel={() => setDraft(null)} busy={busy} />}
    {error && <div className="err-msg">{error}</div>}
  </div>;
}

function PuzzleEditor({ value, onChange, onSave, onCancel, busy }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  const config = (key, next) => set('config', { ...value.config, [key]: next });
  return <div className="publish-form" style={{ marginTop: 12 }}>
    <label className="admin-grade-label" htmlFor="drop-game-type">Game type</label>
    <select id="drop-game-type" value={optionForPuzzle(value)} disabled={!!value.id} onChange={(e) => onChange(blank(e.target.value))}>
      {GAME_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>
    <label style={{ display: 'flex', gap: 7, margin: '10px 0', fontSize: 12 }}><input type="checkbox" checked={value.enabled !== false} onChange={(e) => set('enabled', e.target.checked)} /> Enabled</label>
    <label className="admin-grade-label">Learner prompt{value.puzzle_type === 'hash_match' ? ' (optional)' : ' *'}</label>
    <textarea rows="2" value={value.prompt ?? ''} onChange={(e) => set('prompt', e.target.value)} />
    {value.puzzle_type === 'signal_hunt' && <>
      <label className="admin-grade-label">Signal code *</label>
      <input autoComplete="off" maxLength="255" value={value.config.signalCode ?? ''} onChange={(e) => config('signalCode', e.target.value)} placeholder="BRAVO-7-TANGO" />
      <p style={{ fontSize: 11, color: 'var(--muted)' }}>The code is embedded in the learner page source and verified by the backend.</p>
    </>}
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
    {value.puzzle_type !== 'hash_match' && value.puzzle_type !== 'signal_hunt' && <><label className="admin-grade-label">Expected answer (server-only) *</label><input autoComplete="off" maxLength="255" value={value.answer ?? ''} onChange={(e) => set('answer', e.target.value)} /></>}
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}><button className="btn-submit" style={{ width: 'auto' }} disabled={busy} onClick={onSave}>{busy ? 'Saving...' : 'Save Puzzle'}</button><button className="btn-secondary" onClick={onCancel}>Cancel</button></div>
  </div>;
}
