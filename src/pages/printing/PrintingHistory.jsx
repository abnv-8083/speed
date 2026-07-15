import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, Search, Filter, RefreshCw, Plus, Check, AlertTriangle, 
  Terminal, ArrowLeft, ArrowRight, Layers, FileText, Download, HelpCircle, Package 
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useToast } from '../../components/ToastContext';
import './PrintingHistory.css';

const DEFAULT_STOCKS = [
  { name: 'A4 Print (B&W)', price: 2.00, stock: 5000, is_print: true, size: 'A4', mode: 'B&W' },
  { name: 'A4 Print (Color)', price: 10.00, stock: 2000, is_print: true, size: 'A4', mode: 'Color' },
  { name: 'A3 Print (B&W)', price: 5.00, stock: 1000, is_print: true, size: 'A3', mode: 'B&W' },
  { name: 'A3 Print (Color)', price: 20.00, stock: 500, is_print: true, size: 'A3', mode: 'Color' },
  { name: 'A5 Print (B&W)', price: 1.00, stock: 3000, is_print: true, size: 'A5', mode: 'B&W' },
  { name: 'A5 Print (Color)', price: 5.00, stock: 1500, is_print: true, size: 'A5', mode: 'Color' }
];

export default function PrintingHistory() {
  const toast = useToast();
  const [stocks, setStocks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spoolerModalOpen, setSpoolerModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);

  // Custom stock quantities for the restore / replenish modal
  const [customStocks, setCustomStocks] = useState({});
  const [savingStocks, setSavingStocks] = useState(false);

  // Form State for Manual Logging
  const [jobName, setJobName] = useState('');
  const [paperSize, setPaperSize] = useState('A4');
  const [colorMode, setColorMode] = useState('Color');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Filter, Sort, & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSize, setFilterSize] = useState('All');
  const [filterColor, setFilterColor] = useState('All');
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchStocks(), fetchLogs()]);
    setLoading(false);
  };

  const fetchStocks = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_print', true);

      if (error || !data) {
        setStocks([]);
      } else {
        // Map database products to UI badges
        const mapped = data.map(p => {
          let size = 'A4';
          if (p.name.toUpperCase().includes('A3')) size = 'A3';
          else if (p.name.toUpperCase().includes('A5')) size = 'A5';

          let mode = 'B&W';
          if (p.name.toUpperCase().includes('COLOR')) mode = 'Color';

          return { ...p, size, mode };
        });
        setStocks(mapped);
      }
    } catch (err) {
      console.error('Error fetching print stocks:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('print_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        const local = localStorage.getItem('speednet_print_logs');
        setLogs(local ? JSON.parse(local) : []);
      } else {
        setLogs(data || []);
      }
    } catch (err) {
      const local = localStorage.getItem('speednet_print_logs');
      setLogs(local ? JSON.parse(local) : []);
    }
  };

  // Open Restore / Replenish modal and pre-fill current values
  const openRestoreModal = () => {
    const initialValues = {};
    DEFAULT_STOCKS.forEach(def => {
      const found = stocks.find(s => s.size === def.size && s.mode === def.mode);
      const key = `${def.size}_${def.mode}`;
      initialValues[key] = found ? found.stock : def.stock;
    });
    setCustomStocks(initialValues);
    setRestoreModalOpen(true);
  };

  // Quick adjust sheet count in modal
  const adjustCustomStock = (key, delta, isAbsolute = false) => {
    setCustomStocks(prev => {
      const current = prev[key] || 0;
      const nextVal = isAbsolute ? delta : Math.max(0, current + delta);
      return { ...prev, [key]: nextVal };
    });
  };

  // Save exact requested stock counts to Supabase
  const handleSaveCustomStocks = async () => {
    setSavingStocks(true);
    let updatedCount = 0;

    try {
      for (const def of DEFAULT_STOCKS) {
        const key = `${def.size}_${def.mode}`;
        const targetCount = parseInt(customStocks[key]) || 0;
        const exists = stocks.find(s => s.size === def.size && s.mode === def.mode);

        if (exists) {
          await supabase
            .from('products')
            .update({ stock: targetCount })
            .eq('id', exists.id);
          updatedCount++;
        } else {
          await supabase
            .from('products')
            .insert([{
              name: def.name,
              price: def.price,
              stock: targetCount,
              is_print: true
            }]);
          updatedCount++;
        }
      }

      toast.success(`Successfully set and replenished ${updatedCount} paper stock inventories!`);
      await fetchStocks();
      setRestoreModalOpen(false);
    } catch (err) {
      toast.error('Error saving custom stock counts');
    } finally {
      setSavingStocks(false);
    }
  };

  // Log Print Job & Deduct Stock
  const handleLogPrint = async (e) => {
    e.preventDefault();
    if (!jobName.trim()) {
      toast.warning('Please enter a job or document name');
      return;
    }
    if (quantity < 1) {
      toast.warning('Quantity must be at least 1');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Deduct Stock from matching size + color product
      const matchingProduct = stocks.find(s => s.size === paperSize && s.mode === colorMode);
      if (matchingProduct) {
        if (matchingProduct.stock < quantity) {
          toast.warning(`Warning: Low stock for ${paperSize} ${colorMode} (${matchingProduct.stock} left)`);
        }
        const newStock = Math.max(0, matchingProduct.stock - quantity);
        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', matchingProduct.id);
      } else {
        toast.info(`Note: No product initialized for ${paperSize} ${colorMode} yet. Click 'Restore Stock' to track inventory.`);
      }

      // 2. Insert into print_logs
      const newLog = {
        job_name: jobName,
        paper_size: paperSize,
        color_mode: colorMode,
        quantity: parseInt(quantity),
        status: 'Completed',
        source: 'Manual Log',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('print_logs').insert([newLog]).select();

      if (error) {
        const updatedLocal = [newLog, ...logs];
        localStorage.setItem('speednet_print_logs', JSON.stringify(updatedLocal));
        setLogs(updatedLocal);
      } else if (data && data[0]) {
        setLogs([data[0], ...logs]);
      }

      toast.success(`Logged ${quantity}x ${paperSize} (${colorMode}) & deducted stock!`);
      setJobName('');
      setQuantity(1);
      await fetchStocks();
    } catch (err) {
      toast.error('Failed to log print job');
    } finally {
      setSubmitting(false);
    }
  };

  // Simulate an OS Print Spooler job from backend daemon
  const simulateSpoolerJob = async () => {
    const randomSizes = ['A4', 'A3', 'A5'];
    const randomModes = ['Color', 'B&W'];
    const randomDocs = ['Client_Brochure_2026.pdf', 'Annual_Financial_Report.docx', 'Architecture_Plan_Final.pdf', 'Customer_ID_Copy.png', 'Invoice_Receipt_108.pdf'];

    const size = randomSizes[Math.floor(Math.random() * randomSizes.length)];
    const mode = randomModes[Math.floor(Math.random() * randomModes.length)];
    const doc = randomDocs[Math.floor(Math.random() * randomDocs.length)];
    const qty = Math.floor(Math.random() * 8) + 1;

    // Deduct stock
    const matchingProduct = stocks.find(s => s.size === size && s.mode === mode);
    if (matchingProduct) {
      const newStock = Math.max(0, matchingProduct.stock - qty);
      await supabase.from('products').update({ stock: newStock }).eq('id', matchingProduct.id);
    }

    // Insert log
    const spoolLog = {
      job_name: doc,
      paper_size: size,
      color_mode: mode,
      quantity: qty,
      status: 'Completed',
      source: 'Windows Print Spooler',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('print_logs').insert([spoolLog]).select();
    if (error) {
      const updatedLocal = [spoolLog, ...logs];
      localStorage.setItem('speednet_print_logs', JSON.stringify(updatedLocal));
      setLogs(updatedLocal);
    } else if (data && data[0]) {
      setLogs([data[0], ...logs]);
    }

    toast.success(`🖥️ Spooler captured: "${doc}" (${qty}x ${size} ${mode}) & updated stock!`);
    await fetchStocks();
  };

  // Filtered and Sorted Logs
  const filteredAndSortedLogs = useMemo(() => {
    let result = [...logs];

    // Filter by Search Term
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(l => 
        l.job_name?.toLowerCase().includes(lower) || 
        l.source?.toLowerCase().includes(lower)
      );
    }

    // Filter by Size
    if (filterSize !== 'All') {
      result = result.filter(l => l.paper_size === filterSize);
    }

    // Filter by Color
    if (filterColor !== 'All') {
      result = result.filter(l => l.color_mode === filterColor);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'date_asc') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'qty_desc') return b.quantity - a.quantity;
      if (sortBy === 'qty_asc') return a.quantity - b.quantity;
      return 0;
    });

    return result;
  }, [logs, searchTerm, filterSize, filterColor, sortBy]);

  // Pagination Calculation
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedLogs.length / itemsPerPage));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedLogs.slice(start, start + itemsPerPage);
  }, [filteredAndSortedLogs, currentPage, itemsPerPage]);

  const getStockCount = (size, mode) => {
    const found = stocks.find(s => s.size === size && s.mode === mode);
    return found ? found.stock : 0;
  };

  return (
    <div className="printing-hub-container animate-fade-in">
      {/* Header */}
      <div className="printing-header">
        <div className="printing-header-title">
          <h1><Printer size={28} className="text-primary" /> A4 / A3 / A5 Printing & Stock Hub</h1>
          <p>Real-time inventory tracking and comprehensive printing history with OS Print Spooler bridge</p>
        </div>
        <div className="printing-header-actions">
          <button 
            className="btn" 
            onClick={openRestoreModal} 
            title="Set exact sheet quantity for each paper size"
            style={{ 
              background: '#10b981', 
              color: '#ffffff', 
              fontWeight: 700, 
              border: 'none', 
              padding: '10px 18px', 
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
            }}
          >
            <Package size={18} /> Replenish / Set Stock Levels
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setSpoolerModalOpen(true)} 
            style={{ 
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
              color: '#ffffff',
              fontWeight: 700,
              padding: '10px 18px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
            }}
          >
            <Terminal size={18} /> 🖥️ OS Print Spooler Bridge
          </button>
        </div>
      </div>

      {/* Stock Overview Cards with Solid Rich Backgrounds */}
      <div className="print-stocks-grid">
        {DEFAULT_STOCKS.map((def, idx) => {
          const count = getStockCount(def.size, def.mode);
          const isLow = count < 100;
          const cardClass = `card-${def.size.toLowerCase()}-${def.mode === 'Color' ? 'color' : 'bw'}`;
          return (
            <div key={idx} className={`stock-card ${cardClass}`}>
              <div className="stock-card-top">
                <span className="stock-card-title">
                  <span className={`paper-badge ${def.size.toLowerCase()}`}>{def.size}</span>
                  <span className={`mode-badge ${def.mode === 'Color' ? 'color' : 'bw'}`}>{def.mode}</span>
                </span>
                {isLow && <AlertTriangle size={18} className="text-error" title="Low stock warning!" />}
              </div>
              <div className={`stock-card-count ${isLow ? 'low' : ''}`} style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {loading ? '...' : count.toLocaleString()}
              </div>
              <div className="stock-card-sub" style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>Available sheets in inventory</div>
            </div>
          );
        })}
      </div>

      {/* Manual Print Logger & Stock Deductor Form */}
      <div className="print-logger-panel">
        <h3 className="print-logger-title">
          <Plus size={20} className="text-primary" /> Log Print Job & Deduct Paper Stock
        </h3>
        <form className="print-logger-form" onSubmit={handleLogPrint}>
          <div className="form-group-col">
            <label>Job / Document Name</label>
            <input 
              type="text" 
              placeholder="e.g. Resume.pdf or Customer Copy" 
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              required
            />
          </div>
          <div className="form-group-col">
            <label>Paper Size</label>
            <select value={paperSize} onChange={(e) => setPaperSize(e.target.value)}>
              <option value="A4">A4 (Standard)</option>
              <option value="A3">A3 (Large Poster)</option>
              <option value="A5">A5 (Half / Booklet)</option>
            </select>
          </div>
          <div className="form-group-col">
            <label>Color Mode</label>
            <select value={colorMode} onChange={(e) => setColorMode(e.target.value)}>
              <option value="Color">Color</option>
              <option value="B&W">Black & White (B&W)</option>
            </select>
          </div>
          <div className="form-group-col">
            <label>Pages / Copies</label>
            <input 
              type="number" 
              min="1" 
              max="10000"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ height: '42px', padding: '0 24px', fontWeight: 700 }}>
            <Check size={18} /> {submitting ? 'Logging...' : 'Log & Deduct Stock'}
          </button>
        </form>
      </div>

      {/* History Table & Filters */}
      <div className="history-section">
        <div className="history-controls">
          <div className="history-search">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search by job name or source..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className="history-filters">
            <Filter size={16} className="text-muted" />
            <select value={filterSize} onChange={(e) => { setFilterSize(e.target.value); setCurrentPage(1); }}>
              <option value="All">All Sizes</option>
              <option value="A4">A4 Only</option>
              <option value="A3">A3 Only</option>
              <option value="A5">A5 Only</option>
            </select>

            <select value={filterColor} onChange={(e) => { setFilterColor(e.target.value); setCurrentPage(1); }}>
              <option value="All">All Colors</option>
              <option value="Color">Color Only</option>
              <option value="B&W">B&W Only</option>
            </select>

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="qty_desc">Highest Quantity</option>
              <option value="qty_asc">Lowest Quantity</option>
            </select>
          </div>
        </div>

        <div className="printing-table-container">
          <table className="printing-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Job / Document</th>
                <th>Paper Size</th>
                <th>Mode</th>
                <th>Pages</th>
                <th>Source</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No printing logs found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log, index) => (
                  <tr key={log.id || index}>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td style={{ fontWeight: 500 }}>{log.job_name}</td>
                    <td><span className={`paper-badge ${log.paper_size.toLowerCase()}`}>{log.paper_size}</span></td>
                    <td><span className={`mode-badge ${log.color_mode === 'Color' ? 'color' : 'bw'}`}>{log.color_mode}</span></td>
                    <td style={{ fontWeight: 700 }}>{log.quantity}</td>
                    <td><span style={{ fontSize: '0.85rem', color: log.source === 'Windows Print Spooler' ? '#38bdf8' : 'var(--text-muted)' }}>{log.source || 'Manual Log'}</span></td>
                    <td>
                      <span className="status-badge status-good" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={14} /> {log.status || 'Completed'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination-container">
          <div className="pagination-info">
            Showing {filteredAndSortedLogs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedLogs.length)} of {filteredAndSortedLogs.length} entries
          </div>
          <div className="pagination-buttons">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ArrowLeft size={16} /> Prev
            </button>
            <span style={{ padding: '0 8px', fontSize: '0.9rem', color: 'var(--text-main)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Restore & Replenish Stock Modal */}
      {restoreModalOpen && (
        <div className="modal-overlay" onClick={() => setRestoreModalOpen(false)}>
          <div className="modal-content glass-panel animate-scale-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px', padding: '24px' }}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={22} style={{ color: '#10b981' }} /> Replenish & Set Exact Sheet Stock
              </h3>
              <button className="btn-close" onClick={() => setRestoreModalOpen(false)}>×</button>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Set exact quantities for each paper size and color mode in your inventory. You can type the total available sheets or use the quick buttons to replenish.
            </p>

            <div className="restore-modal-grid">
              {DEFAULT_STOCKS.map((def, idx) => {
                const key = `${def.size}_${def.mode}`;
                const val = customStocks[key] !== undefined ? customStocks[key] : def.stock;
                return (
                  <div key={idx} className="restore-stock-item">
                    <div className="restore-stock-header">
                      <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`paper-badge ${def.size.toLowerCase()}`}>{def.size}</span>
                        <span className={`mode-badge ${def.mode === 'Color' ? 'color' : 'bw'}`}>{def.mode}</span>
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Default: {def.stock.toLocaleString()}</span>
                    </div>

                    <div className="restore-stock-input-row">
                      <input 
                        type="number" 
                        min="0" 
                        value={val}
                        onChange={(e) => setCustomStocks({ ...customStocks, [key]: e.target.value })}
                      />
                    </div>

                    <div className="restore-quick-btns">
                      <button type="button" onClick={() => adjustCustomStock(key, def.stock, true)}>Reset Default</button>
                      <button type="button" onClick={() => adjustCustomStock(key, 500)}>+500 Sheets</button>
                      <button type="button" onClick={() => adjustCustomStock(key, 1000)}>+1,000 Sheets</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setRestoreModalOpen(false)} disabled={savingStocks}>Cancel</button>
              <button 
                className="btn" 
                onClick={handleSaveCustomStocks} 
                disabled={savingStocks}
                style={{ background: '#10b981', color: '#fff', fontWeight: 700, padding: '10px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                <Check size={18} /> {savingStocks ? 'Saving...' : 'Save & Update Stock Levels'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OS Spooler Bridge Modal */}
      {spoolerModalOpen && (
        <div className="modal-overlay" onClick={() => setSpoolerModalOpen(false)}>
          <div className="modal-content glass-panel animate-scale-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3><Terminal size={22} className="text-primary" /> Windows Print Spooler Bridge Guide</h3>
              <button className="btn-close" onClick={() => setSpoolerModalOpen(false)}>×</button>
            </div>
            <div className="spooler-modal-content">
              <p>
                <strong>Why doesn't the browser read Windows Print Spooler (`C:\Windows\System32\spool`) directly?</strong><br />
                Web browsers (Chrome, Edge) enforce strict security sandboxes that forbid JavaScript from calling native Win32 APIs (`EnumJobs`) or reading OS queues on the local computer.
              </p>
              <p>
                <strong>How to connect your real OS Print Spooler to SpeedNet:</strong><br />
                We have built a dedicated background daemon right inside your `backend/` folder (`printSpoolerAgent.js`). It queries Windows WMI (`Win32_PrintJob`), detects new documents, logs them here, and auto-deducts A4/A3/A5 stock!
              </p>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>1. Open your terminal in the backend directory and run:</label>
                <div className="spooler-code-box">
                  <code>cd backend && node printSpoolerAgent.js</code>
                  <button 
                    className="copy-btn-absolute" 
                    onClick={() => {
                      navigator.clipboard.writeText('cd backend && node printSpoolerAgent.js');
                      toast.success('Command copied to clipboard!');
                    }}
                  >
                    Copy Command
                  </button>
                </div>
              </div>

              <div style={{ padding: '14px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#60a5fa', marginBottom: '6px' }}>⚡ Want to test right now before running the Node daemon?</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Click the button below to simulate an OS print job arriving from the local Windows Spooler queue. Watch your table update and stock deduct instantly!
                </p>
                <button className="btn btn-primary" onClick={simulateSpoolerJob} style={{ width: '100%', fontWeight: 700 }}>
                  <Terminal size={18} /> Simulate OS Spooler Job Arrival
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button className="btn btn-secondary" onClick={() => setSpoolerModalOpen(false)}>Got it, Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
