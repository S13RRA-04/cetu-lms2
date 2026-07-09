import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StreamChat } from 'stream-chat';
import { Chat, Channel, Window, ChannelHeader, MessageList, MessageComposer } from 'stream-chat-react';
import { getChatToken } from '../api/pact.js';
import 'stream-chat-react/dist/css/index.css';

export default function ChatDrawer() {
  const [open, setOpen]         = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [client, setClient]     = useState(null);
  const [channels, setChannels] = useState([]);
  const [activeType, setActiveType] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const clientRef = useRef(null);

  const load = useCallback(() => {
    if (loaded || loading) return;
    setLoading(true);
    setError('');
    getChatToken()
      .then(async ({ apiKey, userToken, userId, channelType, channels: chans }) => {
        const c = StreamChat.getInstance(apiKey);
        clientRef.current = c;
        await c.connectUser({ id: userId }, userToken);
        setClient(c);
        setChannels(chans);
        if (chans.length > 0) {
          const first = c.channel(channelType, chans[0].channelId);
          await first.watch();
          setActiveType(chans[0].type);
          setActiveChannel(first);
        }
        setLoaded(true);
      })
      .catch(() => setError('Could not connect to chat. Try again shortly.'))
      .finally(() => setLoading(false));
  }, [loaded, loading]);

  const selectChannel = useCallback(async (chan) => {
    if (!clientRef.current) return;
    setActiveType(chan.type);
    const ch = clientRef.current.channel('messaging', chan.channelId);
    await ch.watch();
    setActiveChannel(ch);
  }, []);

  // Disconnect only when the app unmounts entirely — not on every drawer close,
  // so the connection (and unread state) persists while browsing other pages.
  useEffect(() => () => { clientRef.current?.disconnectUser(); }, []);

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      if (next) load();
      return next;
    });
  };

  return (
    <>
      <button className="chd-tab" onClick={toggle} title="Squad and cohort chat">
        <span className="chd-tab-icon">◈</span>
        <span className="chd-tab-label">CHAT</span>
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
                  <div className="evd-eyebrow">SQUAD &amp; COHORT COMMS</div>
                  <div className="evd-title">Chat</div>
                </div>
                <button className="evd-close" onClick={() => setOpen(false)} title="Close">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {channels.length > 1 && (
                <div className="chd-tabs">
                  {channels.map((c) => (
                    <button
                      key={c.channelId}
                      className={`chd-chan-tab${activeType === c.type ? ' chd-chan-tab-active' : ''}`}
                      onClick={() => selectChannel(c)}
                    >
                      {c.type === 'squad' ? 'SQUAD' : 'COHORT'}
                    </button>
                  ))}
                </div>
              )}

              <div className="chd-body">
                {loading && <div className="evd-loading">CONNECTING...</div>}
                {!loading && error && <div className="evd-empty">{error}</div>}
                {!loading && !error && channels.length === 0 && loaded && (
                  <div className="evd-empty">No chat channels available yet — you may not be assigned to a squad or cohort.</div>
                )}
                {!loading && client && activeChannel && (
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
