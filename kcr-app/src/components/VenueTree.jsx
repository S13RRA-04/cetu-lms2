import { useState } from 'react';

export default function VenueTree({
  venues, activeVid, activeRid,
  isAdmin, onSelectVenue, onSelectRoom,
  onAddRoom, onDeleteVenue, onDeleteRoom,
}) {
  const [expanded, setExpanded] = useState({});
  const [hovered,  setHovered]  = useState(null);

  const toggle = (vid) => setExpanded((prev) => ({ ...prev, [vid]: !prev[vid] }));

  return (
    <div className="sidebar" style={{ width: 220, borderRight: '1px solid var(--border)', borderLeft: 'none' }}>
      <div className="sidebar-header" style={{ padding: '12px 14px 10px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Venues & Rooms
        </div>
      </div>

      <div className="sidebar-body">
        {venues.length === 0 && (
          <div style={{ padding: '16px 14px', fontSize: 11, color: 'var(--muted)' }}>
            No venues yet.
          </div>
        )}
        {venues.map((venue) => {
          const isOpen = expanded[venue.id] !== false; // default expanded
          const rooms  = venue.rooms ?? [];

          return (
            <div key={venue.id} className="venue-section">
              <div
                className={`venue-row${activeVid === venue.id && !activeRid ? ' active' : ''}`}
                onMouseEnter={() => setHovered(venue.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => { onSelectVenue(venue.id); toggle(venue.id); }}
              >
                <button
                  className="tree-expand-btn"
                  onClick={(e) => { e.stopPropagation(); toggle(venue.id); }}
                >
                  {isOpen ? '▾' : '▸'}
                </button>
                <span style={{ fontSize: 13 }}>🏢</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                  {venue.name}
                </span>
                {isAdmin && hovered === venue.id && (
                  <button
                    className="btn-logout"
                    style={{ fontSize: 10 }}
                    title="Delete venue"
                    onClick={(e) => { e.stopPropagation(); onDeleteVenue(venue); }}
                  >✕</button>
                )}
              </div>

              {isOpen && (
                <>
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className={`room-row${activeRid === room.id ? ' active' : ''}`}
                      onMouseEnter={() => setHovered(room.id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => onSelectRoom(venue.id, room.id)}
                    >
                      <span style={{ fontSize: 11 }}>📐</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {room.name}
                      </span>
                      {!room.floor_plan_key && (
                        <span className="no-floor-plan-badge">no map</span>
                      )}
                      {isAdmin && hovered === room.id && (
                        <button
                          className="btn-logout"
                          style={{ fontSize: 10 }}
                          title="Delete room"
                          onClick={(e) => { e.stopPropagation(); onDeleteRoom(venue, room); }}
                        >✕</button>
                      )}
                    </div>
                  ))}

                  {isAdmin && (
                    <div
                      className="room-row"
                      style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: 11 }}
                      onClick={() => onAddRoom(venue.id)}
                    >
                      <span style={{ fontSize: 10 }}>＋</span>
                      Add room
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
