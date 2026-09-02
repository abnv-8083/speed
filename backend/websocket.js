/**
 * WebSocket Server for SpeedNet
 * 
 * Provides real-time data updates via channel-based pub/sub.
 * 
 * Channels:
 *   - "products"       — product CRUD
 *   - "invoices"       — invoice CRUD
 *   - "quickbill"      — quick bill CRUD
 *   - "works"          — work CRUD + issues/documents/notes
 *   - "customers"      — customer CRUD + documents/passwords
 *   - "expenses"       — expense CRUD
 *   - "loans"          — loan CRUD
 *   - "loan-payments"  — loan payment CRUD
 *   - "print-logs"     — print log CRUD
 *   - "printer-configs" — printer config CRUD
 *   - "notifications"  — notification CRUD
 *   - "cv-saves"       — CV save CRUD
 *   - "vault"          — vault CRUD
 *   - "website"        — website settings updates
 *   - "agent"          — spooler agent status
 * 
 * Client → Server messages:
 *   { type: "subscribe",   channel: "products" }
 *   { type: "unsubscribe", channel: "products" }
 *   { type: "ping" }
 * 
 * Server → Client messages:
 *   { type: "subscribed",   channel: "products" }
 *   { type: "unsubscribed", channel: "products" }
 *   { type: "update",       channel: "products", event: "created|updated|deleted", data: {...} }
 *   { type: "pong" }
 *   { type: "error",        message: "..." }
 */

const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');

// ── Valid channels ────────────────────────────────────────────
const VALID_CHANNELS = new Set([
  'products',
  'invoices',
  'quickbill',
  'works',
  'customers',
  'expenses',
  'loans',
  'loan-payments',
  'print-logs',
  'printer-configs',
  'notifications',
  'cv-saves',
  'vault',
  'website',
  'agent',
]);

// ── State ─────────────────────────────────────────────────────
// Map<channel, Set<ws>>
const channels = new Map();

// ── Initialize WebSocket server ──────────────────────────────
function initWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // ── Authenticate via token query param ────────────────────
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
      ws.close(4001, 'No token provided');
      return;
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token' }));
      ws.close(4001, 'Invalid token');
      return;
    }

    ws.isAlive = true;
    ws.user = user;
    ws.subscribedChannels = new Set();

    console.log(`🔌  WebSocket connected: ${user.email || user.id || 'user'}`);

    // ── Heartbeat (ping/pong) ────────────────────────────────
    ws.on('pong', () => { ws.isAlive = true; });

    // ── Handle messages ──────────────────────────────────────
    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        return;
      }

      switch (msg.type) {
        case 'subscribe': {
          const ch = msg.channel;
          if (!ch || !VALID_CHANNELS.has(ch)) {
            ws.send(JSON.stringify({ type: 'error', message: `Invalid channel: ${ch}` }));
            return;
          }
          if (!channels.has(ch)) channels.set(ch, new Set());
          channels.get(ch).add(ws);
          ws.subscribedChannels.add(ch);
          ws.send(JSON.stringify({ type: 'subscribed', channel: ch }));
          break;
        }

        case 'unsubscribe': {
          const ch = msg.channel;
          if (channels.has(ch)) {
            channels.get(ch).delete(ws);
            if (channels.get(ch).size === 0) channels.delete(ch);
          }
          ws.subscribedChannels.delete(ch);
          ws.send(JSON.stringify({ type: 'unsubscribed', channel: ch }));
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }

        default:
          ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }));
      }
    });

    // ── Disconnect ───────────────────────────────────────────
    ws.on('close', () => {
      console.log(`🔌  WebSocket disconnected: ${user.email || user.id || 'user'}`);
      // Remove from all subscribed channels
      for (const ch of ws.subscribedChannels) {
        if (channels.has(ch)) {
          channels.get(ch).delete(ws);
          if (channels.get(ch).size === 0) channels.delete(ch);
        }
      }
      ws.subscribedChannels.clear();
    });

    ws.on('error', (err) => {
      console.error(`WebSocket error:`, err.message);
    });
  });

  // ── Heartbeat interval (every 30s) ─────────────────────────
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        ws.subscribedChannels?.forEach(ch => {
          if (channels.has(ch)) channels.get(ch).delete(ws);
        });
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));

  console.log('✅  WebSocket server initialized on /ws');
  return wss;
}

// ── Broadcast to a channel ────────────────────────────────────
// event: "created" | "updated" | "deleted" | "status" | "custom"
// data:  the payload to send
function broadcast(channel, event, data) {
  if (!channels.has(channel)) return;

  const message = JSON.stringify({
    type: 'update',
    channel,
    event,
    data,
    timestamp: new Date().toISOString(),
  });

  const subscribers = channels.get(channel);
  let sent = 0;

  for (const client of subscribers) {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(message);
        sent++;
      } catch (err) {
        console.warn(`WebSocket send error:`, err.message);
      }
    }
  }

  if (sent > 0) {
    console.log(`📡  [${channel}] ${event} → ${sent} client(s)`);
  }
}

// ── Broadcast to ALL connected clients (no channel filter) ────
function broadcastAll(event, data) {
  const message = JSON.stringify({
    type: 'update',
    channel: '*',
    event,
    data,
    timestamp: new Date().toISOString(),
  });

  for (const [, subscribers] of channels) {
    for (const client of subscribers) {
      if (client.readyState === 1) {
        try { client.send(message); } catch {}
      }
    }
  }
}

module.exports = { initWebSocket, broadcast, broadcastAll, VALID_CHANNELS };
