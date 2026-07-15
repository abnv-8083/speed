/**
 * SpeedNet Local OS Print Spooler Bridge Agent (Windows / Node.js)
 * 
 * WHY IS THIS AGENT NEEDED?
 * Web applications running in Chrome, Edge, or Firefox run inside a strict browser sandbox.
 * For security reasons, JavaScript running in a web browser is strictly forbidden from directly
 * querying OS-level Win32 APIs (like `EnumJobs`, `GetPrinter`), monitoring `C:\Windows\System32\spool\PRINTERS`,
 * or communicating with the Windows Print Spooler service directly.
 * 
 * HOW THIS BRIDGE WORKS:
 * 1. Run this script locally on your shop computer: `node printSpoolerAgent.js`
 * 2. This background daemon executes native Windows PowerShell commands (`Get-PrintJob` / `Win32_PrintJob`) every 5 seconds.
 * 3. When a new print job is detected in the OS queue, it extracts:
 *    - Document / Job Name
 *    - Pages Printed (TotalPages)
 *    - Paper Size (A4, A3, A5 based on PaperSize / Document settings)
 *    - Color Mode (Color or B&W)
 * 4. It automatically pushes the print record to your SpeedNet Supabase `print_logs` table AND
 *    deducts the corresponding A4, A3, or A5 stock automatically!
 */

require('dotenv').config({ path: '../.env' });
const { exec } = require('child_process');
const https = require('https');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in ../.env file.');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
  process.exit(1);
}

const processedJobs = new Set();
console.log('====================================================');
console.log('🖨️  SpeedNet Windows Print Spooler Bridge Daemon');
console.log('====================================================');
console.log(`Connected to Supabase: ${SUPABASE_URL}`);
console.log('Polling Windows Print Spooler every 5 seconds...');
console.log('Waiting for print jobs from local printers...\n');

/**
 * Execute PowerShell to query Windows Print Spooler jobs
 */
function checkPrintQueue() {
  // PowerShell script to get recent print jobs
  const psCommand = `Get-WmiObject -Class Win32_PrintJob | Select-Object JobId, Document, TotalPages, Color, PaperSize, Name | ConvertTo-Json`;

  exec(`powershell -NoProfile -Command "${psCommand.replace(/"/g, '\\"')}"`, async (error, stdout, stderr) => {
    if (error) {
      // If WMI fails or returns empty (no active jobs), that's normal when idle
      return;
    }

    if (!stdout || stdout.trim() === '' || stdout.trim() === '""') {
      return;
    }

    try {
      let jobs = JSON.parse(stdout.trim());
      if (!Array.isArray(jobs)) {
        jobs = [jobs];
      }

      for (const job of jobs) {
        const jobIdKey = `${job.Name}_${job.JobId}_${job.Document}`;
        if (processedJobs.has(jobIdKey)) {
          continue;
        }

        processedJobs.add(jobIdKey);
        console.log(`\n🖨️  New Print Job Detected: [ID: ${job.JobId}] "${job.Document}"`);

        // Determine paper size from WMI codes or default to A4
        // WMI PaperSize codes: 9 = A4, 8 = A3, 11 = A5
        let paperSize = 'A4';
        if (job.PaperSize === 8 || (job.Document && job.Document.toUpperCase().includes('A3'))) {
          paperSize = 'A3';
        } else if (job.PaperSize === 11 || (job.Document && job.Document.toUpperCase().includes('A5'))) {
          paperSize = 'A5';
        }

        // Determine color mode from WMI Color code or document name
        // WMI Color codes: 1 = Monochrome (B&W), 2 = Color
        let colorMode = 'B&W';
        if (job.Color === 'Color' || job.Color === 2 || (job.Document && job.Document.toUpperCase().includes('COLOR'))) {
          colorMode = 'Color';
        }

        const quantity = parseInt(job.TotalPages) || 1;

        console.log(`   └─ Size: ${paperSize} | Color: ${colorMode} | Pages: ${quantity}`);
        
        // Push job to Supabase print_logs and update stock
        await syncJobToSpeedNet(job.Document || `OS Print #${job.JobId}`, paperSize, colorMode, quantity);
      }
    } catch (parseErr) {
      // Non-fatal parse issue when no JSON output
    }
  });
}

/**
 * Push log to Supabase print_logs table and deduct products stock
 */
async function syncJobToSpeedNet(jobName, paperSize, colorMode, quantity) {
  try {
    // 1. Insert into print_logs
    await supabaseRestRequest('/rest/v1/print_logs', 'POST', {
      job_name: jobName,
      paper_size: paperSize,
      color_mode: colorMode,
      quantity: quantity,
      status: 'Completed',
      source: 'Windows Print Spooler'
    });

    console.log('   ✅ Logged to SpeedNet print_logs history');

    // 2. Query products for matching stock
    const products = await supabaseRestRequest(`/rest/v1/products?is_print=eq.true&name=ilike.*${paperSize}*&name=ilike.*${colorMode === 'Color' ? 'Color' : 'B%W'}*`, 'GET');

    if (products && products.length > 0) {
      const targetProduct = products[0];
      const newStock = Math.max(0, targetProduct.stock - quantity);

      await supabaseRestRequest(`/rest/v1/products?id=eq.${targetProduct.id}`, 'PATCH', {
        stock: newStock
      });

      console.log(`   📉 Deducted ${quantity} sheets from "${targetProduct.name}" (New Stock: ${newStock})`);
    } else {
      console.log(`   ⚠️ Could not find exact matching product for "${paperSize} Print (${colorMode})" to deduct stock.`);
    }
  } catch (err) {
    console.error('   ❌ Error syncing with SpeedNet Supabase:', err.message);
  }
}

/**
 * Helper for Supabase REST requests via built-in HTTPS
 */
function supabaseRestRequest(endpoint, method, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + endpoint);
    const options = {
      method: method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(data ? JSON.parse(data) : null);
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Check every 5 seconds
setInterval(checkPrintQueue, 5000);
checkPrintQueue();
