import { useEffect, useState, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import {
  listVenues, createVenue, deleteVenue,
  listRooms,  createRoom,  deleteRoom,
  listArtifacts, createArtifact, deleteArtifact,
} from '../api/kcr.js';
import VenueTree      from '../components/VenueTree.jsx';
import FloorPlanEditor from '../components/FloorPlanEditor.jsx';
import ArtifactPalette from '../components/ArtifactPalette.jsx';
import Modal          from '../components/Modal.jsx';

export default function EnvironmentPage() {
  const { eid, vid: urlVid, rid: urlRid } = useParams();
  const { envs, isAdmin } = useOutletContext();

  const env = envs.find((e) => e.id === eid);

  const [venues,    setVenues]    = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [loading,   setLoading]   = useState(true);

  // Selected venue/room
  const [activeVid, setActiveVid] = useState(urlVid ?? null);
  const [activeRid, setActiveRid] = useState(urlRid ?? null);

  // Modals
  const [venueModal, setVenueModal] = useState(false);
  const [roomModal,  setRoomModal]  = useState(null); // vid to create room under
  const [artModal,   setArtModal]   = useState(false);

  const [venueForm, setVenueForm]  = useState({ name: '', address: '', description: '' });
  const [roomForm,  setRoomForm]   = useState({ name: '', description: '' });
  const [artForm,   setArtForm]    = useState({ type: 'physical', name: '', description: '', icon_label: '' });
  const [saving,    setSaving]     = useState(false);
  const [err,       setErr]        = useState('');

  const load = useCallback(async () => {
    if (!eid) return;
    setLoading(true);
    try {
      const [vs, as] = await Promise.all([listVenues(eid), listArtifacts(eid)]);
      setVenues(vs);
      setArtifacts(as);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [eid]);

  useEffect(() => { load(); }, [load]);

  /* Keep URL params in sync */
  useEffect(() => {
    if (urlVid) setActiveVid(urlVid);
    if (urlRid) setActiveRid(urlRid);
  }, [urlVid, urlRid]);

  const activeVenue = venues.find((v) => v.id === activeVid);
  const activeRoom  = activeVenue?.rooms?.find((r) => r.id === activeRid);

  /* ── Venue CRUD ── */
  const handleCreateVenue = async (e) => {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      const v = await createVenue(eid, venueForm);
      setVenues((prev) => [...prev, { ...v, rooms: [] }]);
      setVenueModal(false);
      setVenueForm({ name: '', address: '', description: '' });
      setActiveVid(v.id);
      setActiveRid(null);
    } catch (ex) { setErr(ex.response?.data?.error?.message ?? 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteVenue = async (v) => {
    if (!confirm(`Delete venue "${v.name}" and all its rooms?`)) return;
    await deleteVenue(eid, v.id);
    setVenues((prev) => prev.filter((x) => x.id !== v.id));
    if (activeVid === v.id) { setActiveVid(null); setActiveRid(null); }
  };

  /* ── Room CRUD ── */
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      const r = await createRoom(eid, roomModal, roomForm);
      setVenues((prev) => prev.map((v) =>
        v.id === roomModal ? { ...v, rooms: [...(v.rooms ?? []), r] } : v
      ));
      setRoomModal(null);
      setRoomForm({ name: '', description: '' });
      setActiveVid(roomModal);
      setActiveRid(r.id);
    } catch (ex) { setErr(ex.response?.data?.error?.message ?? 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteRoom = async (v, r) => {
    if (!confirm(`Delete room "${r.name}"?`)) return;
    await deleteRoom(eid, v.id, r.id);
    setVenues((prev) => prev.map((venue) =>
      venue.id === v.id ? { ...venue, rooms: venue.rooms.filter((x) => x.id !== r.id) } : venue
    ));
    if (activeRid === r.id) setActiveRid(null);
  };

  /* ── Artifact CRUD ── */
  const handleCreateArtifact = async (e) => {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      const a = await createArtifact(eid, artForm);
      setArtifacts((prev) => [...prev, a]);
      setArtModal(false);
      setArtForm({ type: 'physical', name: '', description: '', icon_label: '' });
    } catch (ex) { setErr(ex.response?.data?.error?.message ?? 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteArtifact = async (a) => {
    if (!confirm(`Remove artifact "${a.name}" from catalog? This also removes all its placements.`)) return;
    try {
      await deleteArtifact(eid, a.id);
      setArtifacts((prev) => prev.filter((x) => x.id !== a.id));
    } catch { /* ignore */ }
  };

  if (loading) return (
    <div className="loading-screen" style={{ flexDirection: 'column', gap: 12 }}>
      <div className="spinner" />
      <span>Loading environment…</span>
    </div>
  );

  return (
    <div className="floor-plan-page" style={{ flexDirection: 'column', height: '100%' }}>
      {/* ── Top bar ── */}
      <div className="page-header">
        <div>
          <div className="page-title">{env?.name ?? 'Environment'}</div>
          <div className="page-title-mono">
            {activeVenue ? `${activeVenue.name}${activeRoom ? ` / ${activeRoom.name}` : ''}` : 'Select a room to view its floor plan'}
          </div>
        </div>
        {isAdmin && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => { setArtModal(true); setErr(''); }}>
              + Artifact
            </button>
            <button className="btn btn-primary" onClick={() => { setVenueModal(true); setErr(''); }}>
              + Venue
            </button>
          </div>
        )}
      </div>

      {/* ── Three-pane layout ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: venue/room tree */}
        <VenueTree
          venues={venues}
          activeVid={activeVid}
          activeRid={activeRid}
          isAdmin={isAdmin}
          onSelectVenue={(vid) => { setActiveVid(vid); setActiveRid(null); }}
          onSelectRoom={(vid, rid) => { setActiveVid(vid); setActiveRid(rid); }}
          onAddRoom={(vid) => { setRoomModal(vid); setErr(''); }}
          onDeleteVenue={handleDeleteVenue}
          onDeleteRoom={handleDeleteRoom}
        />

        {/* Centre: floor plan editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeRid && activeVid ? (
            <FloorPlanEditor
              eid={eid}
              vid={activeVid}
              rid={activeRid}
              isAdmin={isAdmin}
              artifacts={artifacts}
            />
          ) : (
            <div className="empty-state" style={{ flex: 1 }}>
              <div className="empty-state-icon">🗺️</div>
              <div className="empty-state-title">No room selected</div>
              <div className="empty-state-sub">
                Pick a room from the tree on the left to view its floor plan and artifact placements.
              </div>
            </div>
          )}
        </div>

        {/* Right: artifact palette */}
        <ArtifactPalette
          artifacts={artifacts}
          isAdmin={isAdmin}
          onDeleteArtifact={handleDeleteArtifact}
          onAddArtifact={() => { setArtModal(true); setErr(''); }}
        />
      </div>

      {/* ── Modals ── */}
      {venueModal && (
        <Modal title="New Venue" onClose={() => setVenueModal(false)}>
          <form onSubmit={handleCreateVenue}>
            <div className="modal-field">
              <label>Venue Name</label>
              <input value={venueForm.name} onChange={(e) => setVenueForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Building A — Ops Floor" required autoFocus />
            </div>
            <div className="modal-field">
              <label>Address / Location</label>
              <input value={venueForm.address} onChange={(e) => setVenueForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Room 201, Bldg 12" />
            </div>
            <div className="modal-field">
              <label>Description</label>
              <textarea value={venueForm.description} onChange={(e) => setVenueForm((f) => ({ ...f, description: e.target.value }))}
                rows={2} placeholder="Brief description of this venue…" />
            </div>
            {err && <div className="err-msg" style={{ marginBottom: 12 }}>{err}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setVenueModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Venue'}</button>
            </div>
          </form>
        </Modal>
      )}

      {roomModal && (
        <Modal title="New Room" onClose={() => setRoomModal(null)}>
          <form onSubmit={handleCreateRoom}>
            <div className="modal-field">
              <label>Room Name</label>
              <input value={roomForm.name} onChange={(e) => setRoomForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Server Room 1A" required autoFocus />
            </div>
            <div className="modal-field">
              <label>Description</label>
              <textarea value={roomForm.description} onChange={(e) => setRoomForm((f) => ({ ...f, description: e.target.value }))}
                rows={2} placeholder="What happens in this room during the scenario?" />
            </div>
            {err && <div className="err-msg" style={{ marginBottom: 12 }}>{err}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setRoomModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Room'}</button>
            </div>
          </form>
        </Modal>
      )}

      {artModal && (
        <Modal title="New Artifact" onClose={() => setArtModal(false)}>
          <form onSubmit={handleCreateArtifact}>
            <div className="modal-select-row">
              <div className="modal-field">
                <label>Type</label>
                <select value={artForm.type} onChange={(e) => setArtForm((f) => ({ ...f, type: e.target.value }))}>
                  <option value="physical">Physical</option>
                  <option value="digital">Digital</option>
                  <option value="personnel">Personnel</option>
                  <option value="inject">Inject</option>
                </select>
              </div>
              <div className="modal-field">
                <label>Call Sign (max 4 chars)</label>
                <input value={artForm.icon_label}
                  onChange={(e) => setArtForm((f) => ({ ...f, icon_label: e.target.value.slice(0, 4).toUpperCase() }))}
                  placeholder="e.g. SRV1" maxLength={4} />
              </div>
            </div>
            <div className="modal-field">
              <label>Name</label>
              <input value={artForm.name} onChange={(e) => setArtForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Compromised Laptop" required autoFocus />
            </div>
            <div className="modal-field">
              <label>Description</label>
              <textarea value={artForm.description} onChange={(e) => setArtForm((f) => ({ ...f, description: e.target.value }))}
                rows={3} placeholder="Role in the scenario, what to look for, setup notes…" />
            </div>
            {err && <div className="err-msg" style={{ marginBottom: 12 }}>{err}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setArtModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Add Artifact'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
