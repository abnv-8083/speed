/**
 * SpeedNet Local OS Print Spooler Bridge Agent (Windows / Node.js)
 *
 * WHY IS THIS AGENT NEEDED?
 * Web browsers run inside a strict sandbox that forbids calling native Win32 APIs
 * (EnumJobs, GetPrinter) or reading C:\Windows\System32\spool directly.
 *
 * HOW IT WORKS:
 * 1. Run locally: node backend/printSpoolerAgent.js
 * 2. Every 5 s, polls Windows WMI (Win32_PrintJob) via PowerShell.
 * 3. On a new job it POSTs to the Express API (/api/print-logs) and
 *    PATCHes the matching product stock (/api/products/:id).
 *
 * REQUIREMENTS:
 *   MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD must be set in ../.env
 *   OR set API_URL + AGENT_TOKEN directly below.
 */

require('dotenv').config({ path: '../.env' });
const { exec }  = require('child_process');
const https     = require('https');
const http      = require('http');

// ── Config ────────────────────────────────────────────────────
const API_URL = process.env.API_URL || 'http://localhost:5000';

// The agent logs in once on startup to get a JWT, then reuses it.
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@speednet.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SpeedNet@2025';

let authToken      = null;
const processedJobs = new Set();

console.log('====================================================');
console.log('🖨️  SpeedNet Windows Print Spooler Bridge Daemon');
console.log('====================================================');
console.log(`API endpoint: ${API_URL}`);
console.log('Polling Windows Print Spooler every 5 seconds...\n');

// ── HTTP helper ───────────────────────────────────────────────
function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url      = new URL(API_URL + path);
    const isHttps  = url.protocol === 'https:';
    const lib      = isHttps ? https : http;
    const payload  = body ? JSON.stringify(body) : null;

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

// ── Login to get JWT ──────────────────────────────────────────
async function authenticate() {
  try {
    const res = await apiRequest('POST', '/api/auth/login', {
      email:    ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    if (res.token) {
      authToken = res.token;
      console.log('✅  Authenticated with SpeedNet API\n');
    } else {
      throw new Error('No token in response');
    }
  } catch (err) {
    console.error('❌  Authentication failed:', err.message);
    process.exit(1);
  }
}

// ── Fetch all print products ───────────────────────────────────
async function getPrintProducts() {
  try {
    return await apiRequest('GET', '/api/products?is_print=true');
  } catch {
    return [];
  }
}

// ── Poll Windows Print Spooler ────────────────────────────────
function checkPrintQueue() {
  const psCommand = `Get-WmiObject -Class Win32_PrintJob | Select-Object JobId, Document, TotalPages, Color, PaperSize, Name | ConvertTo-Json`;

  exec(`powershell -NoProfile -Command "${psCommand.replace(/"/g, '\\"')}"`, async (error, stdout) => {
    if (error || !stdout || stdout.trim() === '' || stdout.trim() === '""') return;

    try {
      let jobs = JSON.parse(stdout.trim());
      if (!Array.isArray(jobs)) jobs = [jobs];

      for (const job of jobs) {
        const jobIdKey = `${job.Name}_${job.JobId}_${job.Document}`;
        if (processedJobs.has(jobIdKey)) continue;
        processedJobs.add(jobIdKey);

        console.log(`\n🖨️  New Print Job: [ID: ${job.JobId}] "${job.Document}"`);

        // Determine paper size
        let paperSize = 'A4';
        if (job.PaperSize === 8  || (job.Document && job.Document.toUpperCase().includes('A3'))) paperSize = 'A3';
        if (job.PaperSize === 11 || (job.Document && job.Document.toUpperCase().includes('A5'))) paperSize = 'A5';

        // Determine color mode
        let colorMode = 'B&W';
        if (job.Color === 'Color' || job.Color === 2 ||
            (job.Document && job.Document.toUpperCase().includes('COLOR'))) {
          colorMode = 'Color';
        }

        const quantity = parseInt(job.TotalPages) || 1;
        console.log(`   └─ Size: ${paperSize} | Color: ${colorMode} | Pages: ${quantity}`);

        await syncJobToAPI(job.Document || `OS Print #${job.JobId}`, paperSize, colorMode, quantity);
      }
    } catch {
      // Non-fatal parse issue (no active jobs)
    }
  });
}

// ── Sync job to SpeedNet API ──────────────────────────────────
async function syncJobToAPI(jobName, paperSize, colorMode, quantity) {
  try {
    // 1. Insert print log
    await apiRequest('POST', '/api/print-logs', {
      job_name:   jobName,
      paper_size: paperSize,
      color_mode: colorMode,
      quantity,
      status:     'Completed',
      source:     'Windows Print Spooler',
    });
    console.log('   ✅  Logged to SpeedNet print_logs');

    // 2. Deduct matching product stock
    const products = await getPrintProducts();
    const modeKey  = colorMode === 'Color' ? 'color' : 'b&w';
    const target   = products.find(p =>
      p.name.toLowerCase().includes(paperSize.toLowerCase()) &&
      p.name.toLowerCase().includes(modeKey)
    );

    if (target) {
      const newStock = Math.max(0, target.stock - quantity);
      await apiRequest('PATCH', `/api/products/${target.id}`, { stock: newStock });
      console.log(`   📉  Deducted ${quantity} sheets from "${target.name}" (New Stock: ${newStock})`);
    } else {
      console.log(`   ⚠️   No matching product found for "${paperSize} ${colorMode}"`);
    }
  } catch (err) {
    console.error('   ❌  Error syncing with SpeedNet API:', err.message);
  }
}

// ── Boot ──────────────────────────────────────────────────────
(async () => {
  await authenticate();
  setInterval(checkPrintQueue, 5000);
  checkPrintQueue();
})();
