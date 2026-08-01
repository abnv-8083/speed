/**
 * SpeedNet Local OS Print Spooler Bridge Agent (Windows / Node.js)
 *
 * HOW IT WORKS:
 * 1. Run locally on the Windows machine:  node backend/printSpoolerAgent.js
 * 2. Authenticates with the SpeedNet API once on startup (JWT).
 * 3. Fetches all printer→variant mappings from /api/printer-configs.
 * 4. Every 5 s, polls Windows WMI (Win32_PrintJob) via PowerShell.
 * 5. For each new job:
 *    a. Looks up the printer name in the loaded config map.
 *    b. If a mapping exists  → uses it, logs as Completed.
 *    c. If no mapping found  → tries to guess from WMI Color/PaperSize fields.
 *    d. If the guess is uncertain → sets needs_review=true and review_note.
 * 6. POSTs to /api/print-logs and PATCHes product stock accordingly.
 *
 * REQUIREMENTS (.env in project root):
 *   MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
 *   API_URL (defaults to http://localhost:5000)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const dns   = require('dns');
const { exec } = require('child_process');
const https = require('https');
const http  = require('http');

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

// ── Config ────────────────────────────────────────────────────
const API_URL        = process.env.API_URL        || 'http://localhost:5000';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@speednet.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SpeedNet@2025';
const POLL_INTERVAL  = 5000; // ms

let authToken      = null;
let printerConfigs = {};   // { "HP LaserJet M404dn": { paper_size: "A4", color_mode: "B&W" }, ... }
const processedJobs = new Set();

console.log('====================================================');
console.log('🖨️  SpeedNet Windows Print Spooler Bridge Daemon');
console.log('====================================================');
console.log(`API endpoint : ${API_URL}`);
console.log(`Poll interval: ${POLL_INTERVAL / 1000}s\n`);

// ── HTTP helper ───────────────────────────────────────────────
function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url     = new URL(API_URL + path);
    const isHttps = url.protocol === 'https:';
    const lib     = isHttps ? https : http;
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port:     url.port || (isHttps ? 443 : 80),
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(payload   ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Authenticate ──────────────────────────────────────────────
async function authenticate() {
  console.log('🔐  Authenticating with SpeedNet API…');
  try {
    const res = await apiRequest('POST', '/api/auth/login', {
      email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
    });
    if (!res.token) throw new Error('No token in response: ' + JSON.stringify(res));
    authToken = res.token;
    console.log('✅  Authenticated\n');
  } catch (err) {
    throw new Error(`Authentication failed — ${err.message}\n\n  Check that API_URL is reachable: ${API_URL}\n  Current API_URL is set to: ${API_URL}`);
  }
}

// ── Load printer configs ──────────────────────────────────────
async function loadPrinterConfigs() {
  try {
    const configs = await apiRequest('GET', '/api/printer-configs');
    printerConfigs = {};
    if (Array.isArray(configs)) {
      configs.forEach(c => {
        printerConfigs[c.printer_name.trim().toLowerCase()] = {
          paper_size: c.paper_size,
          color_mode: c.color_mode,
        };
      });
      console.log(`📋  Loaded ${configs.length} printer mapping(s):`);
      configs.forEach(c => console.log(`    • "${c.printer_name}" → ${c.paper_size} ${c.color_mode}`));
    }
    console.log('');
  } catch (err) {
    console.warn('⚠️   Could not load printer configs:', err.message);
  }
}

// ── Fetch all print products ──────────────────────────────────
async function getPrintProducts() {
  try {
    return await apiRequest('GET', '/api/products?is_print=true');
  } catch { return []; }
}

// ── Determine paper variant for a job ─────────────────────────
// Returns { paper_size, color_mode, needs_review, review_note }
function resolveVariant(job) {
  const printerKey = (job.Name || '').trim().toLowerCase();

  // 1. Check printer config map first (most reliable)
  if (printerKey && printerConfigs[printerKey]) {
    const cfg = printerConfigs[printerKey];
    console.log(`   📋  Matched printer config: "${job.Name}" → ${cfg.paper_size} ${cfg.color_mode}`);
    return { ...cfg, needs_review: false, review_note: '' };
  }

  // 2. Try to guess from WMI fields — track confidence
  const uncertainReasons = [];
  let paper_size = 'A4';
  let color_mode = 'B&W';

  // Paper size from WMI PaperSize code or document name
  const docUpper = (job.Document || '').toUpperCase();
  if (job.PaperSize === 8 || docUpper.includes('A3')) {
    paper_size = 'A3';
  } else if (job.PaperSize === 11 || docUpper.includes('A5')) {
    paper_size = 'A5';
  } else if (!job.PaperSize && !docUpper.includes('A4')) {
    // PaperSize not reported by driver — we're guessing A4
    uncertainReasons.push('paper size not reported by driver (guessed A4)');
  }

  // Color mode from WMI Color field (driver-dependent)
  if (job.Color === 'Color' || job.Color === 2 || docUpper.includes('COLOR')) {
    color_mode = 'Color';
  } else if (job.Color === null || job.Color === undefined || job.Color === '') {
    // Color field not reported
    uncertainReasons.push('color mode not reported by driver (guessed B&W)');
  }

  // No printer mapping registered
  if (printerKey) {
    uncertainReasons.push(`no mapping configured for printer "${job.Name}"`);
  }

  const needs_review = uncertainReasons.length > 0;
  const review_note  = needs_review
    ? 'Auto-detected — ' + uncertainReasons.join('; ')
    : '';

  if (needs_review) {
    console.log(`   ⚠️   Uncertain variant: ${uncertainReasons.join(' | ')}`);
  }

  return { paper_size, color_mode, needs_review, review_note };
}

// ── Deduct stock for confirmed/best-guess job ─────────────────
async function deductStock(paper_size, color_mode, quantity) {
  const products  = await getPrintProducts();
  const modeKey   = color_mode === 'Color' ? 'color' : 'b&w';
  const target    = products.find(p =>
    p.name.toLowerCase().includes(paper_size.toLowerCase()) &&
    p.name.toLowerCase().includes(modeKey)
  );

  if (target) {
    const newStock = Math.max(0, target.stock - quantity);
    await apiRequest('PATCH', `/api/products/${target.id}`, { stock: newStock });
    console.log(`   📉  Stock: "${target.name}" ${target.stock} → ${newStock}`);
  } else {
    console.log(`   ⚠️   No product found for ${paper_size} ${color_mode} — stock not deducted`);
  }
}

// ── Sync one job to the API ───────────────────────────────────
async function syncJobToAPI(job) {
  const docName  = job.Document || `OS Print #${job.JobId}`;
  const quantity = Math.max(1, parseInt(job.TotalPages) || 1);
  const variant  = resolveVariant(job);

  try {
    // 1. Log the job
    await apiRequest('POST', '/api/print-logs', {
      job_name:     docName,
      paper_size:   variant.paper_size,
      color_mode:   variant.color_mode,
      quantity,
      status:       'Completed',
      source:       'Windows Print Spooler',
      printer_name: job.Name || '',
      needs_review: variant.needs_review,
      review_note:  variant.review_note,
    });

    const reviewFlag = variant.needs_review ? ' [NEEDS REVIEW]' : '';
    console.log(`   ✅  Logged${reviewFlag}: ${quantity}× ${variant.paper_size} ${variant.color_mode}`);

    // 2. Always deduct stock with best-guess variant
    //    (staff can correct it later via the Resolve workflow)
    await deductStock(variant.paper_size, variant.color_mode, quantity);

  } catch (err) {
    console.error('   ❌  Sync failed:', err.message);
  }
}

// ── Send heartbeat to API ─────────────────────────────────────
// Called every 4 s so the frontend can show "Connected" status
async function sendHeartbeat() {
  try {
    await apiRequest('POST', '/api/agent/heartbeat');
  } catch {
    // Non-fatal — just means the API is temporarily unreachable
  }
}

// ── Poll Windows Print Spooler via PowerShell ─────────────────
function pollPrintQueue() {
  const ps = `Get-WmiObject -Class Win32_PrintJob | ` +
             `Select-Object JobId, Document, TotalPages, Color, PaperSize, Name | ` +
             `ConvertTo-Json`;

  exec(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"')}"`, async (err, stdout) => {
    if (err || !stdout || stdout.trim() === '' || stdout.trim() === '""') return;

    try {
      let jobs = JSON.parse(stdout.trim());
      if (!Array.isArray(jobs)) jobs = [jobs];

      for (const job of jobs) {
        const key = `${job.Name}_${job.JobId}_${job.Document}`;
        if (processedJobs.has(key)) continue;
        processedJobs.add(key);

        console.log(`\n🖨️  New job: [${job.JobId}] "${job.Document}" on "${job.Name}"`);
        await syncJobToAPI(job);
      }
    } catch {
      // No active jobs or parse error — non-fatal
    }
  });
}

// ── Reload printer configs every 5 minutes ────────────────────
//    so changes made in the UI take effect without restarting
function scheduleConfigReload() {
  setInterval(async () => {
    console.log('🔄  Reloading printer configs…');
    await loadPrinterConfigs();
  }, 5 * 60 * 1000);
}

// ── Boot ──────────────────────────────────────────────────────
(async () => {
  try {
    await authenticate();
    await loadPrinterConfigs();
    scheduleConfigReload();
    setInterval(pollPrintQueue, POLL_INTERVAL);
    setInterval(sendHeartbeat, 4000);   // keep-alive ping every 4 s
    pollPrintQueue();
    sendHeartbeat();                    // ping immediately on start
    console.log(`🟢  Spooler agent running — polling every ${POLL_INTERVAL / 1000}s\n`);
  } catch (err) {
    console.error('❌  Fatal startup error:', err.message);
    process.exit(1);
  }
})();
