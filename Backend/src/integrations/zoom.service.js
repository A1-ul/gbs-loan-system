const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

async function createMeeting({ topic, startTime, duration, password }) {
  if (!config.zoom.apiKey || !config.zoom.apiSecret || !config.zoom.accountId) {
    const roomSuffix = crypto.randomBytes(5).toString('hex');
    const cleanTopic = String(topic || 'GBS-Meeting').replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 28);
    logger.info('Zoom OAuth keys absent — provisioning native WebRTC Jitsi room');
    return {
      id: `gbs-webrtc-${roomSuffix}`,
      join_url: `https://meet.jit.si/${cleanTopic}-${roomSuffix}`,
    };
  }

  const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await getZoomToken()}`,
    },
    body: JSON.stringify({
      topic,
      type: 2,
      start_time: startTime,
      duration,
      password,
      settings: { host_video: true, participant_video: true },
    }),
  });

  if (!response.ok) {
    throw new Error(`Zoom API responded with HTTP ${response.status}`);
  }
  return response.json();
}

async function cancelMeeting(meetingId) {
  if (!config.zoom.apiKey || String(meetingId).startsWith('gbs-webrtc-')) return;
  await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${await getZoomToken()}` },
  });
}

async function getZoomToken() {
  const credentials = Buffer.from(`${config.zoom.apiKey}:${config.zoom.apiSecret}`).toString('base64');
  const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${config.zoom.accountId}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}` },
  });
  const data = await response.json();
  return data.access_token;
}

module.exports = { createMeeting, cancelMeeting };
