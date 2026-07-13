import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StreamChat } from 'stream-chat';
import { Chat, Channel, Window, ChannelHeader, MessageList, MessageComposer } from 'stream-chat-react';
import { getChatToken, getChatUsers, startChatDM } from '../api/pact.js';
import 'stream-chat-react/dist/css/index.css';

// Backend already gives every channel a distinguishing name (e.g. "Squad 1",
// or "PACT July 26 · Squad 1" for management accounts watching multiple
// cohorts) — this used to be discarded in favor of a generic "SQUAD"/"COHORT"
// label, which made every tab identical once there was more than one of a
// given type (any admin/instructor account watching several cohorts).
function channelName(chan) {
  if (chan.name) return chan.name;
  if (chan.type === 'squad')  return 'Squad';
  if (chan.type === 'cohort') return 'Cohort';
  return 'DM';
}

const SECTION_LABEL = { cohort: 'COHORT', squad: 'SQUAD', dm: 'DIRECT MESSAGES' };
const TYPE_ICON     = { cohort: '◈', squad: '◆', dm: '●' };

export default function ChatDrawer() {
  const [open, setOpen]         = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [client, setClient]     = useState(null);
  const [channelType, setChannelType] = useState('messaging');
  const [channels, setChannels] = useState([]);       // squad/cohort, from getChatToken
  const [dmChannels, setDmChannels] = useState([]);   // opened this session
  const [activeKey, setActiveKey] = useState(null);   // channelId of the active tab
  const [activeChannel, setActiveChannel] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const [switcherOpen, setSwitcherOpen]     = useState(false);
  const [directoryOpen, setDirectoryOpen]   = useState(false);
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryQuery, setDirectoryQuery] = useState('');

  const clientRef = useRef(null);

  const watchChannel = useCallback(async (channelId, key) => {
    if (!clientRef.current) return;
    const ch = clientRef.current.channel(channelType, channelId);
    await ch.watch({ presence: true });
    setActiveKey(key);
    setActiveChannel(ch);
    setSwitcherOpen(false);
    // Viewing a channel clears its contribution to the unread badge
    ch.markRead().catch(() => {});
  }, [channelType]);

  // Connect as soon as the app mounts (not on first drawer open) so the
  // unread badge on the floating tab works even before the student opens
  // chat — matches how Slack/Discord-style unread badges behave.
  useEffect(() => {
    setLoading(true);
    getChatToken()
      .then(async ({ apiKey, userToken, userId, channelType: ct, channels: chans }) => {
        const c = StreamChat.getInstance(apiKey);
        clientRef.current = c;
        const connectResponse = await c.connectUser({ id: userId }, userToken);
        setUnreadCount(connectResponse?.me?.total_unread_count ?? 0);
        c.on((event) => {
          if (typeof event.total_unread_count === 'number') setUnreadCount(event.total_unread_count);
        });
        setClient(c);
        setChannelType(ct);
        setChannels(chans);
        setLoaded(true);
      })
      .catch(() => setError('Could not connect to chat. Try again shortly.'))
      .finally(() => setLoading(false));

    return () => { clientRef.current?.disconnectUser(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Once connected, load the first channel's messages the first time the
  // drawer is actually opened — no need to fetch message history just to
  // show the unread badge.
  useEffect(() => {
    if (open && loaded && !activeChannel && channels.length > 0) {
      watchChannel(channels[0].channelId, channels[0].channelId);
    }
  }, [open, loaded, activeChannel, channels, watchChannel]);

  const toggle = () => setOpen((o) => !o);

  const openDirectory = () => {
    setSwitcherOpen(false);
    setDirectoryOpen(true);
    if (directoryUsers.length === 0 && !directoryLoading) {
      setDirectoryLoading(true);
      getChatUsers()
        .then((users) => setDirectoryUsers(Array.isArray(users) ? users : []))
        .catch(() => {})
        .finally(() => setDirectoryLoading(false));
    }
  };

  const openDM = async (user) => {
    setDirectoryOpen(false);
    const existing = dmChannels.find((d) => d.userId === user.id);
    if (existing) {
      await watchChannel(existing.channelId, existing.channelId);
      return;
    }
    try {
      const { channelId, name } = await startChatDM(user.id);
      const entry = { type: 'dm', channelId, name, userId: user.id };
      setDmChannels((prev) => [...prev, entry]);
      await watchChannel(channelId, channelId);
    } catch {
      setError('Could not start that conversation.');
    }
  };

  const closeDM = (chan) => {
    setDmChannels((prev) => prev.filter((d) => d.channelId !== chan.channelId));
    if (activeKey !== chan.channelId) return;
    // Closing the active tab — fall back to the first remaining one, or none
    const remaining = [...channels, ...dmChannels.filter((d) => d.channelId !== chan.channelId)];
    if (remaining.length > 0) {
      watchChannel(remaining[0].channelId, remaining[0].channelId);
    } else {
      setActiveChannel(null);
      setActiveKey(null);
    }
  };

  const allTabs   = [...channels, ...dmChannels];
  const activeTab = allTabs.find((c) => c.channelId === activeKey);
  const grouped   = {
    cohort: channels.filter((c) => c.type === 'cohort'),
    squad:  channels.filter((c) => c.type === 'squad'),
    dm:     dmChannels,
  };
  const filteredUsers = directoryUsers.filter((u) =>
    u.name.toLowerCase().includes(directoryQuery.trim().toLowerCase())
  );

  return (
    <>
      <button className="chd-tab" onClick={toggle} title="Squad, cohort, and direct messages">
        <span className="chd-tab-icon">◈</span>
        <span className="chd-tab-label">CHAT</span>
        {unreadCount > 0 && <span className="chd-tab-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="evd-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="evd-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <div className="evd-header">
                <div>
                  <div className="evd-eyebrow">SQUAD, COHORT &amp; DIRECT</div>
                  <div className="evd-title">Chat</div>
                </div>
                <button className="evd-close" onClick={() => setOpen(false)} title="Close">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {loaded && !directoryOpen && (
                <div className="chd-switcher">
                  <div className="chd-switcher-bar">
                    <button
                      className={`chd-switcher-current${switcherOpen ? ' chd-switcher-current-open' : ''}`}
                      onClick={() => setSwitcherOpen((o) => !o)}
                      disabled={allTabs.length === 0}
                    >
                      <span className="chd-switcher-icon">{TYPE_ICON[activeTab?.type] ?? '◈'}</span>
                      <span className="chd-switcher-name">{activeTab ? channelName(activeTab) : 'Select a channel'}</span>
                      {unreadCount > 0 && (
                        <span className="chd-switcher-unread">{unreadCount > 9 ? '9+' : unreadCount}</span>
                      )}
                      {allTabs.length > 0 && (
                        <svg className={`chd-switcher-chevron${switcherOpen ? ' chd-switcher-chevron-open' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      )}
                    </button>
                    <button className="chd-switcher-dm-btn" onClick={openDirectory} title="Start a direct message">
                      + DM
                    </button>
                  </div>

                  <AnimatePresence>
                    {switcherOpen && (
                      <motion.div
                        className="chd-switcher-list"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        {['cohort', 'squad', 'dm'].map((groupKey) => {
                          const items = grouped[groupKey];
                          if (items.length === 0) return null;
                          return (
                            <div key={groupKey} className="chd-switcher-group">
                              <div className="chd-switcher-section">{SECTION_LABEL[groupKey]}</div>
                              {items.map((c) => (
                                <div
                                  key={c.channelId}
                                  className={`chd-switcher-row${activeKey === c.channelId ? ' chd-switcher-row-active' : ''}`}
                                >
                                  <button className="chd-switcher-row-btn" onClick={() => watchChannel(c.channelId, c.channelId)}>
                                    <span className="chd-switcher-row-icon">{TYPE_ICON[groupKey]}</span>
                                    <span className="chd-switcher-row-name">{channelName(c)}</span>
                                  </button>
                                  {groupKey === 'dm' && (
                                    <button className="chd-switcher-row-x" onClick={() => closeDM(c)} title="Close conversation">×</button>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="chd-body">
                {loading && <div className="evd-loading">CONNECTING...</div>}
                {!loading && error && <div className="evd-empty">{error}</div>}

                {!loading && directoryOpen && (
                  <div className="chd-directory">
                    <div className="form-group" style={{ padding: '0 18px' }}>
                      <input
                        placeholder="Search cohort-mates…"
                        value={directoryQuery}
                        onChange={(e) => setDirectoryQuery(e.target.value)}
                        autoFocus
                      />
                    </div>
                    {directoryLoading && <div className="evd-loading">LOADING...</div>}
                    {!directoryLoading && filteredUsers.length === 0 && (
                      <div className="evd-empty">No cohort-mates found.</div>
                    )}
                    {!directoryLoading && filteredUsers.map((u) => (
                      <button key={u.id} className="evd-row" style={{ margin: '0 18px 6px' }} onClick={() => openDM(u)}>
                        <span className="evd-row-title">{u.name}</span>
                        <span className="evd-row-arrow">▶</span>
                      </button>
                    ))}
                    <button className="chd-back-btn" onClick={() => setDirectoryOpen(false)}>← Back to channels</button>
                  </div>
                )}

                {!loading && !directoryOpen && !error && allTabs.length === 0 && loaded && (
                  <div className="evd-empty">No chat channels available yet — you may not be assigned to a squad or cohort.</div>
                )}
                {!loading && !directoryOpen && client && activeChannel && (
                  <Chat client={client} theme="str-chat__theme-dark">
                    <Channel channel={activeChannel}>
                      <Window hideOnThread>
                        <ChannelHeader />
                        <MessageList />
                        <MessageComposer />
                      </Window>
                    </Channel>
                  </Chat>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
