const express     = require('express');
const path        = require('path');
const requireAuth = require('../middleware/auth');
const { broadcast } = require('../websocket');

const router = express.Router();

// ── In-memory heartbeat store ─────────────────────────────────
// The spooler agent POSTs to /api/agent/heartbeat every 4 s.
// We store the last-seen timestamp; if it's older than 15 s
// the agent is considered disconnected.

let lastHeartbeat = null;     // Date object or null
const TIMEOUT_MS  = 15000;    // 15 s

// POST /api/agent/heartbeat — called by printSpoolerAgent.js
// No auth required so the agent doesn't need to re-login on every ping
router.post('/heartbeat', (req, res) => {
  lastHeartbeat = new Date();
  broadcast('agent', 'heartbeat', { connected: true, last_seen: lastHeartbeat.toISOString() });
  res.json({ received: true });
});

// GET /api/agent/status — polled by the frontend
router.get('/status', requireAuth, (req, res) => {
  if (!lastHeartbeat) {
    return res.json({ connected: false, last_seen: null });
  }
  const age       = Date.now() - lastHeartbeat.getTime();
  const connected = age < TIMEOUT_MS;
  res.json({
    connected,
    last_seen: lastHeartbeat.toISOString(),
    age_ms: age,
  });
});

// GET /api/agent/download/start — serve StartSpoolerAgent.bat
router.get('/download/start', requireAuth, (req, res) => {
  const filePath = path.join(__dirname, '../../StartSpoolerAgent.bat');
  res.download(filePath, 'StartSpoolerAgent.bat', err => {
    if (err) res.status(404).json({ error: 'File not found' });
  });
});

// GET /api/agent/download/install — serve InstallSpoolerAgent.bat
router.get('/download/install', requireAuth, (req, res) => {
  const filePath = path.join(__dirname, '../../InstallSpoolerAgent.bat');
  res.download(filePath, 'InstallSpoolerAgent.bat', err => {
    if (err) res.status(404).json({ error: 'File not found' });
  });
});

module.exports = router;
