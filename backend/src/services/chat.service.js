'use strict';
const { StreamChat } = require('stream-chat');

const CHANNEL_TYPE = process.env.STREAM_CHAT_CHANNEL_TYPE || 'messaging';

let _client = null;
function getClient() {
  if (!_client) {
    if (!process.env.STREAM_API_KEY || !process.env.STREAM_API_SECRET) {
      throw new Error('Stream Chat is not configured (STREAM_API_KEY / STREAM_API_SECRET missing)');
    }
    _client = StreamChat.getInstance(process.env.STREAM_API_KEY, process.env.STREAM_API_SECRET);
  }
  return _client;
}

/* Create-if-missing + add the requesting user as a member — idempotent, safe
   to call on every token request. Other members join the same way when they
   open their own chat popout, so no roster sync job is needed. */
async function ensureChannel(client, channelId, userId, name) {
  const channel = client.channel(CHANNEL_TYPE, channelId, {
    created_by_id: userId,
    name,
  });
  await channel.create();
  await channel.addMembers([userId]);
  return channel;
}

async function getCredentials(user, enrollment) {
  const client = getClient();

  await client.upsertUser({
    id:   user.id,
    name: `${user.first_name} ${user.last_name}`.trim(),
  });

  const userToken = client.createToken(user.id);
  const channels  = [];

  if (enrollment.squad_id) {
    const channelId = `squad-${enrollment.squad_id}`;
    const label = enrollment.squad?.name || `Squad ${enrollment.squad?.number ?? ''}`.trim();
    await ensureChannel(client, channelId, user.id, label);
    channels.push({ type: 'squad', channelId, name: label });
  }

  if (enrollment.cohort_id) {
    const channelId = `cohort-${enrollment.cohort_id}`;
    const label = enrollment.cohort?.name ?? 'Cohort';
    await ensureChannel(client, channelId, user.id, label);
    channels.push({ type: 'cohort', channelId, name: label });
  }

  return {
    apiKey: process.env.STREAM_API_KEY,
    userToken,
    userId: user.id,
    channelType: CHANNEL_TYPE,
    channels,
  };
}

module.exports = { getCredentials };
