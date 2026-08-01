import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer, Search, RefreshCw, Plus, AlertTriangle, Check,
  Terminal, Package, Settings, ChevronDown, X, Trash2,
} from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../components/ToastContext';
import PremiumLoader from '../../components/PremiumLoader';
import './PrintingHistory.css';

// ── Paper variant definitions ─────────────────────────────────
const VARIANTS = [
  { size: 'A4', mode: 'B&W',   label: 'A4 Black & White', key: 'A4_BW',    colorClass: 'v-a4-bw'    },
  { size: 'A4', mode: 'Color', label: 'A4 Color',          key: 'A4_Color', colorClass: 'v-a4-color' },
  { size: 'A3', mode: 'B&W',   label: 'A3 Black & White', key: 'A3_BW',    colorClass: 'v-a3-bw'    },
  { size: 'A3', mode: 'Color', label: 'A3 Color',          key: 'A3_Color', colorClass: 'v-a3-color' },
  { size: 'A5', mode: 'B&W',   label: 'A5 Black & White', key: 'A5_BW',    colorClass: 'v-a5-bw'    },
  { size: 'A5', mode: 'Color', label: 'A5 Color',          key: 'A5_Color', colorClass: 'v-a5-color' },
];

const DEFAULT_STOCKS = {
  A4: { BW: { name: 'A4 Print (B&W)',    price: 2   },
        Color: { name: 'A4 Print (Color)', price: 10  } },
  A3: { BW: { name: 'A3 Print (B&W)',    price: 5   },
        Color: { name: 'A3 Print (Color)', price: 20  } },
  A5: { BW: { name: 'A5 Print (B&W)',    price: 1   },
        Color: { name: 'A5 Print (Color)', price: 5   } },
};

const TABS = ['Stock Overview', 'Log a Job', 'Print History', 'Printer Setup'];

export default function PrintingHistory() {
  const toast = useToast();

  const [activeTab, setActiveTab]       = useState('Stock Overview');
  const [stocks, setStocks]             = useState([]);
  const [logs, setLogs]                 = useState([]);
  const [printerConfigs, setPrinterConfigs] = useState([]);
  const [loading, setLoading]           = useState(true);

  // Log-a-Job state
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [jobName, setJobName]           = useState('');
  const [quantity, setQuantity]         = useState(1);
  const [submitting, setSubmitting]     = useState(false);

  // History filters
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterSize, setFilterSize]     = useState('All');
  const [filterColor, setFilterColor]   = useState('All');
  const [showReviewOnly, setShowReviewOnly] = useState(false);
  const [currentPage, setCurrentPage]   = useState(1);
  const PER_PAGE = 12;

  // Resolve modal
  const [resolveLog, setResolveLog]     = useState(null);
  const [resolveSize, setResolveSize]   = useState('A4');
  const [resolveMode, setResolveMode]   = useState('B&W');
  const [resolving, setResolving]       = useState(false);

  // Replenish modal
  const [replenishOpen, setReplenishOpen]   = useState(false);
  const [replenishValues, setReplenishValues] = useState({});
  const [replenishing, setReplenishing]     = useState(false);

  // Printer setup
  const [printerName, setPrinterName]   = useState('');
  const [printerSize, setPrinterSize]   = useState('A4');
  const [printerMode, setPrinterMode]   = useState('B&W');
  const [printerNotes, setPrinterNotes] = useState('');
  const [savingPrinter, setSavingPrinter] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchStocks(), fetchLogs(), fetchPrinterConfigs()]);
    setLoading(false);
  };

  const fetchStocks = async () => {
    try {
      const data = await api.getProducts({ is_print: 'true' });
      const mapped = (data || []).map(p => {
        let size = 'A4';
        if (p.name.toUpperCase().includes('A3')) size = 'A3';
        else if (p.name.toUpperCase().includes('A5')) size = 'A5';
        const mode = p.name.toUpperCase().includes('COLOR') ? 'Color' : 'B&W';
        return { ...p, size, mode };
      });
      setStocks(mapped);
    } catch { setStocks([]); }
  };

  const fetchLogs = async () => {
    try {
      const data = await api.getPrintLogs();
      setLogs(data || []);
    } catch {
      const local = localStorage.getItem('speednet_print_logs');
      setLogs(local ? JSON.parse(local) : []);
    }
  };

  const fetchPrinterConfigs = async () => {
    try {
      const data = await api.getPrinterConfigs();
      setPrinterConfigs(data || []);
    } catch { setPrinterConfigs([]); }
  };

  const getStock = (size, mode) => {
    const found = stocks.find(s => s.size === size && s.mode === mode);
    return found ? found.stock : 0;
  };

  // ── Log a Job ─────────────────────────────────────────────────
  const handleLogJob = async (e) => {
    e.preventDefault();
    if (!selectedVariant) { toast.warning('Select a paper type first'); return; }
    if (!jobName.trim())  { toast.warning('Enter a job or document name'); return; }
    if (quantity < 1)     { toast.warning('Quantity must be at least 1'); return; }

    setSubmitting(true);
    try {
      const { size, mode } = selectedVariant;
      const product = stocks.find(s => s.size === size && s.mode === mode);
      if (product) {
        if (product.stock < quantity)
          toast.warning(`Low stock: only ${product.stock} sheets of ${size} ${mode} left`);
        await api.updateProduct(product.id, { stock: Math.max(0, product.stock - quantity) });
      } else {
        toast.info(`No stock product found for ${size} ${mode}. Use Replenish to initialise.`);
      }
      const saved = await api.createPrintLog({
        job_name: jobName, paper_size: size, color_mode: mode,
        quantity: parseInt(quantity), status: 'Completed', source: 'Manual Log',
      });
      setLogs(prev => [saved, ...prev]);
      toast.success(`Logged ${quantity}× ${size} ${mode} — stock deducted`);
      setJobName(''); setQuantity(1); setSelectedVariant(null);
      await fetchStocks();
    } catch (err) {
      toast.error('Failed to log job: ' + err.message);
    } finally { setSubmitting(false); }
  };

  // ── Resolve needs_review log ──────────────────────────────────
  const openResolve = (log) => {
    setResolveLog(log);
    setResolveSize(log.paper_size);
    setResolveMode(log.color_mode);
  };

  const handleResolve = async () => {
    if (!resolveLog) return;
    setResolving(true);
    try {
      // Adjust stock: remove old deduction, apply corrected one
      const oldProduct = stocks.find(s => s.size === resolveLog.paper_size && s.mode === resolveLog.color_mode);
      const newProduct = stocks.find(s => s.size === resolveSize && s.mode === resolveMode);
      if (oldProduct) await api.updateProduct(oldProduct.id, { stock: oldProduct.stock + resolveLog.quantity });
      if (newProduct) await api.updateProduct(newProduct.id, { stock: Math.max(0, newProduct.stock - resolveLog.quantity) });
      const updated = await api.resolvePrintLog(resolveLog.id, { paper_size: resolveSize, color_mode: resolveMode });
      setLogs(prev => prev.map(l => l.id === updated.id ? updated : l));
      toast.success('Job resolved and stock corrected');
      setResolveLog(null);
      await fetchStocks();
    } catch (err) {
      toast.error('Failed to resolve: ' + err.message);
    } finally { setResolving(false); }
  };

  // ── Replenish modal ───────────────────────────────────────────
  const openReplenish = () => {
    const vals = {};
    VARIANTS.forEach(v => { vals[v.key] = getStock(v.size, v.mode); });
    setReplenishValues(vals);
    setReplenishOpen(true);
  };

  const handleReplenish = async () => {
    setReplenishing(true);
    try {
      for (const v of VARIANTS) {
        const newQty = parseInt(replenishValues[v.key]) || 0;
        const modeKey = v.mode === 'B&W' ? 'BW' : 'Color';
        const def = DEFAULT_STOCKS[v.size][modeKey];
        const existing = stocks.find(s => s.size === v.size && s.mode === v.mode);
        if (existing) {
          await api.updateProduct(existing.id, { stock: newQty });
        } else {
          await api.createProduct({ name: def.name, price: def.price, stock: newQty, is_print: true });
        }
      }
      toast.success('Stock levels updated');
      await fetchStocks();
      setReplenishOpen(false);
    } catch (err) {
      toast.error('Failed to update stock: ' + err.message);
    } finally { setReplenishing(false); }
  };

  // ── Printer config save ───────────────────────────────────────
  const handleSavePrinter = async (e) => {
    e.preventDefault();
    if (!printerName.trim()) return;
    setSavingPrinter(true);
    try {
      const saved = await api.upsertPrinterConfig({ printer_name: printerName, paper_size: printerSize, color_mode: printerMode, notes: printerNotes });
      setPrinterConfigs(prev => {
        const exists = prev.find(p => p.id === saved.id);
        return exists ? prev.map(p => p.id === saved.id ? saved : p) : [saved, ...prev];
      });
      toast.success('Printer mapping saved');
      setPrinterName(''); setPrinterNotes('');
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally { setSavingPrinter(false); }
  };

  const handleDeletePrinter = async (id) => {
    try {
      await api.deletePrinterConfig(id);
      setPrinterConfigs(prev => prev.filter(p => p.id !== id));
      toast.success('Printer mapping removed');
    } catch (err) {
      toast.error('Failed to delete: ' + err.message);
    }
  };

  // ── Filtered logs ────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    let r = [...logs];
    if (showReviewOnly) r = r.filter(l => l.needs_review);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      r = r.filter(l => l.job_name?.toLowerCase().includes(q) || l.source?.toLowerCase().includes(q) || l.printer_name?.toLowerCase().includes(q));
    }
    if (filterSize !== 'All')  r = r.filter(l => l.paper_size === filterSize);
    if (filterColor !== 'All') r = r.filter(l => l.color_mode === filterColor);
    return r;
  }, [logs, searchTerm, filterSize, filterColor, showReviewOnly]);

  const totalPages    = Math.max(1, Math.ceil(filteredLogs.length / PER_PAGE));
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const reviewCount   = logs.filter(l => l.needs_review).length;

  if (loading) return <div className="ph-loading"><PremiumLoader text="Loading Printing Hub..." /></div>;

  return (
    <div className="ph-root animate-fade-in">
      {/* ── Header ── */}
      <div className="ph-header glass-panel">
        <div className="ph-header-left">
          <Printer size={22} className="ph-header-icon" />
          <div>
            <h2>Printing Hub</h2>
            <p>Paper stock tracking · Print job logging · OS Spooler bridge</p>
          </div>
        </div>
        <div className="ph-header-right">
          {reviewCount > 0 && (
            <button className="ph-review-alert" onClick={() => { setActiveTab('Print History'); setShowReviewOnly(true); }}>
              <AlertTriangle size={15} /> {reviewCount} job{reviewCount !== 1 ? 's' : ''} need review
            </button>
          )}
          <button className="ph-btn ph-btn-replenish" onClick={openReplenish}>
            <Package size={15} /> Replenish Stock
          </button>
          <button className="ph-btn ph-btn-refresh" onClick={fetchAll} title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="ph-tabs">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`ph-tab ${activeTab === tab ? 'ph-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === 'Print History' && reviewCount > 0 && (
              <span className="ph-tab-badge">{reviewCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="ph-content">
        {activeTab === 'Stock Overview'  && <StockOverview variants={VARIANTS} getStock={getStock} loading={loading} />}
        {activeTab === 'Log a Job'       && <LogAJob variants={VARIANTS} selectedVariant={selectedVariant} setSelectedVariant={setSelectedVariant} jobName={jobName} setJobName={setJobName} quantity={quantity} setQuantity={setQuantity} submitting={submitting} handleLogJob={handleLogJob} getStock={getStock} />}
        {activeTab === 'Print History'   && <PrintHistoryTab logs={paginatedLogs} allLogs={filteredLogs} searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterSize={filterSize} setFilterSize={setFilterSize} filterColor={filterColor} setFilterColor={setFilterColor} showReviewOnly={showReviewOnly} setShowReviewOnly={setShowReviewOnly} reviewCount={reviewCount} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} PER_PAGE={PER_PAGE} openResolve={openResolve} />}
        {activeTab === 'Printer Setup'   && <PrinterSetup configs={printerConfigs} printerName={printerName} setPrinterName={setPrinterName} printerSize={printerSize} setPrinterSize={setPrinterSize} printerMode={printerMode} setPrinterMode={setPrinterMode} printerNotes={printerNotes} setPrinterNotes={setPrinterNotes} saving={savingPrinter} onSave={handleSavePrinter} onDelete={handleDeletePrinter} />}
      </div>

      {/* ── Replenish modal ── */}
      {replenishOpen && <ReplenishModal variants={VARIANTS} values={replenishValues} setValues={setReplenishValues} saving={replenishing} onSave={handleReplenish} onClose={() => setReplenishOpen(false)} />}

      {/* ── Resolve modal ── */}
      {resolveLog && <ResolveModal log={resolveLog} resolveSize={resolveSize} setResolveSize={setResolveSize} resolveMode={resolveMode} setResolveMode={setResolveMode} resolving={resolving} onResolve={handleResolve} onClose={() => setResolveLog(null)} />}
    </div>
  );
}

// ── Stock Overview Tab ────────────────────────────────────────
function StockOverview({ variants, getStock }) {
  return (
    <div className="ph-stock-grid">
      {variants.map(v => {
        const count = getStock(v.size, v.mode);
        const isLow = count < 100;
        return (
          <div key={v.key} className={`ph-stock-card ${v.colorClass}`}>
            <div className="ph-stock-card-top">
              <div className="ph-stock-badges">
                <span className={`ph-size-badge ph-size-${v.size.toLowerCase()}`}>{v.size}</span>
                <span className={`ph-mode-badge ${v.mode === 'Color' ? 'ph-mode-color' : 'ph-mode-bw'}`}>{v.mode}</span>
              </div>
              {isLow && <AlertTriangle size={16} className="ph-low-icon" />}
            </div>
            <div className={`ph-stock-count ${isLow ? 'ph-stock-low' : ''}`}>
              {count.toLocaleString()}
            </div>
            <div className="ph-stock-label">sheets available</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Log a Job Tab ────────────────────────────────────────────
function LogAJob({ variants, selectedVariant, setSelectedVariant, jobName, setJobName, quantity, setQuantity, submitting, handleLogJob, getStock }) {
  return (
    <div className="ph-log-root">
      <p className="ph-log-hint">Select the paper type you printed on, then fill in the job details.</p>
      <div className="ph-variant-grid">
        {variants.map(v => {
          const stock = getStock(v.size, v.mode);
          const isSelected = selectedVariant?.key === v.key;
          return (
            <button
              key={v.key}
              type="button"
              className={`ph-variant-card ${v.colorClass} ${isSelected ? 'ph-variant-selected' : ''}`}
              onClick={() => setSelectedVariant(isSelected ? null : v)}
            >
              <div className="ph-variant-badges">
                <span className={`ph-size-badge ph-size-${v.size.toLowerCase()}`}>{v.size}</span>
                <span className={`ph-mode-badge ${v.mode === 'Color' ? 'ph-mode-color' : 'ph-mode-bw'}`}>{v.mode}</span>
              </div>
              <div className="ph-variant-label">{v.label}</div>
              <div className={`ph-variant-stock ${stock < 100 ? 'ph-stock-low' : ''}`}>{stock.toLocaleString()} sheets</div>
              {isSelected && <div className="ph-variant-check"><Check size={18} /></div>}
            </button>
          );
        })}
      </div>

      {selectedVariant && (
        <form className="ph-job-form glass-panel animate-fade-in" onSubmit={handleLogJob}>
          <h3 className="ph-job-form-title">
            Log job on <span className="ph-job-variant-label">{selectedVariant.label}</span>
          </h3>
          <div className="ph-job-fields">
            <div className="ph-job-field">
              <label>Job / Document Name</label>
              <input type="text" className="input-field" placeholder="e.g. Resume.pdf, Customer Invoice" value={jobName} onChange={e => setJobName(e.target.value)} required />
            </div>
            <div className="ph-job-field ph-job-field--sm">
              <label>Sheets / Pages</label>
              <input type="number" className="input-field" min="1" max="10000" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} required />
            </div>
          </div>
          <div className="ph-job-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setSelectedVariant(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Check size={15} /> {submitting ? 'Logging…' : 'Log & Deduct Stock'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Print History Tab ─────────────────────────────────────────
function PrintHistoryTab({ logs, allLogs, searchTerm, setSearchTerm, filterSize, setFilterSize, filterColor, setFilterColor, showReviewOnly, setShowReviewOnly, reviewCount, currentPage, setCurrentPage, totalPages, PER_PAGE, openResolve }) {
  return (
    <div className="ph-history-root">
      <div className="ph-history-controls glass-panel">
        <div className="ph-search-box">
          <Search size={15} />
          <input type="text" placeholder="Search job name, source…" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
        </div>
        <div className="ph-history-filters">
          <select value={filterSize} onChange={e => { setFilterSize(e.target.value); setCurrentPage(1); }}>
            <option value="All">All Sizes</option>
            <option value="A4">A4</option>
            <option value="A3">A3</option>
            <option value="A5">A5</option>
          </select>
          <select value={filterColor} onChange={e => { setFilterColor(e.target.value); setCurrentPage(1); }}>
            <option value="All">All Modes</option>
            <option value="Color">Color</option>
            <option value="B&W">B&W</option>
          </select>
          <button
            className={`ph-review-filter-btn ${showReviewOnly ? 'ph-review-filter-btn--active' : ''}`}
            onClick={() => { setShowReviewOnly(v => !v); setCurrentPage(1); }}
          >
            <AlertTriangle size={14} /> Needs Review {reviewCount > 0 && `(${reviewCount})`}
          </button>
        </div>
      </div>

      <div className="ph-table-wrap glass-panel">
        <table className="ph-table">
          <thead>
            <tr>
              <th>Job Name</th>
              <th>Size</th>
              <th>Mode</th>
              <th>Sheets</th>
              <th>Source</th>
              <th>Printer</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={8} className="ph-table-empty">No print jobs found.</td></tr>
            ) : logs.map((log, i) => (
              <tr key={log.id || i} className={log.needs_review ? 'ph-tr-review' : ''}>
                <td className="ph-td-name">{log.job_name}</td>
                <td><span className={`ph-size-badge ph-size-${(log.paper_size || '').toLowerCase()}`}>{log.paper_size}</span></td>
                <td><span className={`ph-mode-badge ${log.color_mode === 'Color' ? 'ph-mode-color' : 'ph-mode-bw'}`}>{log.color_mode}</span></td>
                <td>{log.quantity}</td>
                <td className="ph-td-source">{log.source || '—'}</td>
                <td className="ph-td-printer">{log.printer_name || '—'}</td>
                <td className="ph-td-date">{log.created_at ? new Date(log.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</td>
                <td>
                  {log.needs_review ? (
                    <button className="ph-resolve-btn" onClick={() => openResolve(log)} title={log.review_note || 'Needs review'}>
                      <AlertTriangle size={13} /> Resolve
                    </button>
                  ) : (
                    <span className="ph-status-done"><Check size={13} /> Done</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="ph-pagination">
          <span className="ph-page-info">
            {Math.min((currentPage - 1) * PER_PAGE + 1, allLogs.length)}–{Math.min(currentPage * PER_PAGE, allLogs.length)} of {allLogs.length}
          </span>
          <div className="ph-page-btns">
            <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>‹ Prev</button>
            <span>{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next ›</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Printer Setup Tab ─────────────────────────────────────────
function PrinterSetup({ configs, printerName, setPrinterName, printerSize, setPrinterSize, printerMode, setPrinterMode, printerNotes, setPrinterNotes, saving, onSave, onDelete }) {
  return (
    <div className="ph-setup-root">
      <div className="ph-setup-explain glass-panel">
        <Terminal size={18} />
        <div>
          <strong>Why set up printers?</strong>
          <p>The OS Print Spooler agent uses this mapping to automatically assign the correct paper variant (size + color mode) to each job. Without a mapping, jobs are flagged as "Needs Review".</p>
        </div>
      </div>

      <form className="ph-setup-form glass-panel" onSubmit={onSave}>
        <h3>Add / Update Printer Mapping</h3>
        <div className="ph-setup-fields">
          <div className="ph-setup-field ph-setup-field--wide">
            <label>Printer Name (exact Windows name)</label>
            <input type="text" className="input-field" placeholder="e.g. HP LaserJet M404dn" value={printerName} onChange={e => setPrinterName(e.target.value)} required />
          </div>
          <div className="ph-setup-field">
            <label>Default Paper Size</label>
            <select className="input-field" value={printerSize} onChange={e => setPrinterSize(e.target.value)}>
              <option value="A4">A4</option>
              <option value="A3">A3</option>
              <option value="A5">A5</option>
            </select>
          </div>
          <div className="ph-setup-field">
            <label>Default Color Mode</label>
            <select className="input-field" value={printerMode} onChange={e => setPrinterMode(e.target.value)}>
              <option value="B&W">B&amp;W (Black &amp; White)</option>
              <option value="Color">Color</option>
            </select>
          </div>
          <div className="ph-setup-field ph-setup-field--wide">
            <label>Notes (optional)</label>
            <input type="text" className="input-field" placeholder="e.g. Front desk printer" value={printerNotes} onChange={e => setPrinterNotes(e.target.value)} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Check size={15} /> {saving ? 'Saving…' : 'Save Mapping'}
        </button>
      </form>

      <div className="ph-setup-list">
        {configs.length === 0 ? (
          <div className="ph-setup-empty glass-panel">No printer mappings yet. Add one above.</div>
        ) : configs.map(c => (
          <div key={c.id} className="ph-setup-row glass-panel">
            <div className="ph-setup-row-left">
              <span className="ph-setup-printer-name">{c.printer_name}</span>
              {c.notes && <span className="ph-setup-notes">{c.notes}</span>}
            </div>
            <div className="ph-setup-row-right">
              <span className={`ph-size-badge ph-size-${c.paper_size.toLowerCase()}`}>{c.paper_size}</span>
              <span className={`ph-mode-badge ${c.color_mode === 'Color' ? 'ph-mode-color' : 'ph-mode-bw'}`}>{c.color_mode}</span>
              <button className="ph-delete-btn" onClick={() => onDelete(c.id)} title="Remove mapping">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Replenish Modal ───────────────────────────────────────────
function ReplenishModal({ variants, values, setValues, saving, onSave, onClose }) {
  return (
    <div className="ph-modal-overlay" onClick={() => !saving && onClose()}>
      <div className="ph-modal glass-panel" onClick={e => e.stopPropagation()}>
        <div className="ph-modal-header">
          <h3><Package size={17} /> Replenish Paper Stock</h3>
          <button className="ph-modal-close" onClick={onClose} disabled={saving}><X size={16} /></button>
        </div>
        <p className="ph-modal-sub">Set the exact number of sheets currently in stock for each variant.</p>
        <div className="ph-replenish-grid">
          {variants.map(v => (
            <div key={v.key} className="ph-replenish-row">
              <div className="ph-replenish-label">
                <span className={`ph-size-badge ph-size-${v.size.toLowerCase()}`}>{v.size}</span>
                <span className={`ph-mode-badge ${v.mode === 'Color' ? 'ph-mode-color' : 'ph-mode-bw'}`}>{v.mode}</span>
                <span className="ph-replenish-name">{v.label}</span>
              </div>
              <input type="number" className="input-field ph-replenish-input" min="0" value={values[v.key] ?? 0}
                onChange={e => setValues(prev => ({ ...prev, [v.key]: parseInt(e.target.value) || 0 }))} />
            </div>
          ))}
        </div>
        <div className="ph-modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            <Check size={15} /> {saving ? 'Saving…' : 'Save Stock Levels'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Resolve Modal ─────────────────────────────────────────────
function ResolveModal({ log, resolveSize, setResolveSize, resolveMode, setResolveMode, resolving, onResolve, onClose }) {
  return (
    <div className="ph-modal-overlay" onClick={() => !resolving && onClose()}>
      <div className="ph-modal glass-panel" onClick={e => e.stopPropagation()}>
        <div className="ph-modal-header">
          <h3><AlertTriangle size={17} /> Resolve Print Job</h3>
          <button className="ph-modal-close" onClick={onClose} disabled={resolving}><X size={16} /></button>
        </div>
        <p className="ph-modal-sub">
          The spooler could not determine the variant for <strong>{log.job_name}</strong>.<br />
          {log.review_note && <span className="ph-resolve-note">{log.review_note}</span>}
        </p>
        <div className="ph-resolve-fields">
          <div className="ph-setup-field">
            <label>Correct Paper Size</label>
            <select className="input-field" value={resolveSize} onChange={e => setResolveSize(e.target.value)}>
              <option value="A4">A4</option>
              <option value="A3">A3</option>
              <option value="A5">A5</option>
            </select>
          </div>
          <div className="ph-setup-field">
            <label>Correct Color Mode</label>
            <select className="input-field" value={resolveMode} onChange={e => setResolveMode(e.target.value)}>
              <option value="B&W">B&amp;W</option>
              <option value="Color">Color</option>
            </select>
          </div>
        </div>
        <div className="ph-modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={resolving}>Cancel</button>
          <button className="btn btn-primary" onClick={onResolve} disabled={resolving}>
            <Check size={15} /> {resolving ? 'Resolving…' : 'Confirm & Fix Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
