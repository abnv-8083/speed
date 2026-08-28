import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Search, Download, FileText,
  ChevronDown, ChevronRight, TrendingUp, Receipt, ShoppingBag,
  X, Loader2, AlertTriangle, Smartphone,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { api } from '../../api';
import { useToast } from '../../components/ToastContext';
import PremiumLoader from '../../components/PremiumLoader';
import './QuickBillHistory.css';

// ── Quick date presets ────────────────────────────────────────
const PRESETS = [
  { label: 'Today',      start: () => format(new Date(), 'yyyy-MM-dd'),        end: () => format(new Date(), 'yyyy-MM-dd') },
  { label: 'Yesterday',  start: () => format(subDays(new Date(), 1), 'yyyy-MM-dd'), end: () => format(subDays(new Date(), 1), 'yyyy-MM-dd') },
  { label: 'Last 7 days',start: () => format(subDays(new Date(), 6), 'yyyy-MM-dd'), end: () => format(new Date(), 'yyyy-MM-dd') },
  { label: 'Last 30 days',start: () => format(subDays(new Date(), 29), 'yyyy-MM-dd'), end: () => format(new Date(), 'yyyy-MM-dd') },
];

// ── Expandable bill row ───────────────────────────────────────
function BillHistoryRow({ bill }) {
  const [open, setOpen] = useState(false);
  const pm = (bill.payment_method || 'Cash');
  const payBadgeClass = pm === 'UPI' ? 'qb-pay-badge--upi' : pm === 'UPI - Bank' ? 'qb-pay-badge--upi-bank' : pm === 'Cash - Bank' ? 'qb-pay-badge--cash-bank' : 'qb-pay-badge--cash';
  return (
    <div className={`qbh-row ${open ? 'qbh-row--open' : ''}`}>
      <div className="qbh-row-header" onClick={() => setOpen(v => !v)}>
        <span className="qbh-row-num">#{bill.bill_number}</span>
        <span className={`qb-pay-badge ${payBadgeClass}`}>
          {pm}
        </span>
        <span className="qbh-row-date">{format(new Date(bill.created_at), 'dd MMM yyyy')}</span>
        <span className="qbh-row-time">{format(new Date(bill.created_at), 'hh:mm a')}</span>
        <span className="qbh-row-items">
          {bill.items.length} item{bill.items.length !== 1 ? 's' : ''}
        </span>
        <span className="qbh-row-total">₹{Number(bill.total).toFixed(2)}</span>
        <ChevronRight size={14} className={`qbh-chevron ${open ? 'rotated' : ''}`} />
      </div>
      {open && (
        <div className="qbh-items animate-fade-in">
          <div className="qbh-items-header">
            <span>Product</span>
            <span>Qty</span>
            <span>Service Price</span>
            <span>Service Charge</span>
            <span>Line Total</span>
          </div>
          {bill.items.map((item, i) => {
            const isService = Number(item.cost_price) > 0;
            return (
              <div key={i} className="qbh-item-row">
                <span className="qbh-item-name">
                  {item.product_name}
                  {item.note && (
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '1px' }}>
                      Note: {item.note}
                    </span>
                  )}
                </span>
                <span className="qbh-item-qty">×{item.quantity}</span>
                <span className="qbh-item-price" style={{ color: isService ? '#f59e0b' : 'var(--text-muted)' }}>
                  {isService ? `₹${Number(item.cost_price).toFixed(2)}` : '—'}
                </span>
                <span className="qbh-item-price" style={{ color: isService ? '#8b5cf6' : 'var(--text-muted)', fontWeight: isService ? 700 : 400 }}>
                  ₹{Number(item.price).toFixed(2)}
                </span>
                <span className="qbh-item-total">₹{Number(item.line_total).toFixed(2)}</span>
              </div>
            );
          })}
          <div className="qbh-items-total-row">
            <span>Bill Total</span>
            <span>₹{Number(bill.total).toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Day group ─────────────────────────────────────────────────
function DayGroup({ date, bills }) {
  const dayTotal = bills.reduce((s, b) => s + Number(b.total), 0);
  return (
    <div className="qbh-day-group">
      <div className="qbh-day-header">
        <div className="qbh-day-label">
          <Calendar size={13} />
          {format(new Date(date + 'T00:00:00'), 'EEEE, dd MMMM yyyy')}
        </div>
        <div className="qbh-day-meta">
          <span>{bills.length} bill{bills.length !== 1 ? 's' : ''}</span>
          <span className="qbh-day-total">₹{dayTotal.toFixed(2)}</span>
        </div>
      </div>
      <div className="qbh-day-bills">
        {bills.map(bill => (
          <BillHistoryRow key={bill.id} bill={bill} />
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function QuickBillHistory() {
  const navigate = useNavigate();
  const toast    = useToast();

  const [startDate, setStartDate] = useState(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [endDate, setEndDate]     = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bills, setBills]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [activePreset, setActivePreset] = useState('Last 7 days');
  const [searchTerm, setSearchTerm]     = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL'); // ALL | Cash | UPI | UPI - Bank | Cash - Bank
  const [exporting, setExporting]       = useState('');  // 'csv' | 'pdf' | ''

  useEffect(() => { fetchBills(); }, [startDate, endDate]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const data = await api.getQuickBills({ start_date: startDate, end_date: endDate });
      setBills(data || []);
    } catch (err) {
      toast.error('Failed to load history: ' + err.message);
    }
    setLoading(false);
  };

  const applyPreset = (preset) => {
    setActivePreset(preset.label);
    setStartDate(preset.start());
    setEndDate(preset.end());
  };

  // ── Filter by search + payment method ────────────────────────
  const filteredBills = useMemo(() => {
    let result = bills;
    if (paymentFilter !== 'ALL') {
      result = result.filter(b => (b.payment_method || 'Cash') === paymentFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(b =>
        String(b.bill_number).includes(q) ||
        b.items.some(i => i.product_name.toLowerCase().includes(q))
      );
    }
    return result;
  }, [bills, searchTerm, paymentFilter]);

  // ── Group by billed_date ──────────────────────────────────────
  const grouped = useMemo(() => {
    const map = {};
    filteredBills.forEach(b => {
      if (!map[b.billed_date]) map[b.billed_date] = [];
      map[b.billed_date].push(b);
    });
    // Sort dates descending
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredBills]);

  // ── Summary stats ──────────────────────────────────────────────
  const totalRevenue = filteredBills.reduce((s, b) => s + Number(b.total), 0);
  const totalItems   = filteredBills.reduce((s, b) => s + b.items.reduce((si, i) => si + i.quantity, 0), 0);
  const totalUPI     = filteredBills.filter(b => (b.payment_method || '').toUpperCase() === 'UPI').reduce((s, b) => s + Number(b.total), 0);
  const totalUPIBank = filteredBills.filter(b => b.payment_method === 'UPI - Bank').reduce((s, b) => s + Number(b.total), 0);
  const totalCashBank = filteredBills.filter(b => b.payment_method === 'Cash - Bank').reduce((s, b) => s + Number(b.total), 0);

  // ── CSV export ────────────────────────────────────────────────
  const exportCSV = () => {
    setExporting('csv');
    try {
      let csv = 'Date,Bill #,Payment Method,Product,Quantity,Service Price,Service Charge,Line Total,Bill Total\n';
      filteredBills.forEach(bill => {
        const payMethod = bill.payment_method || 'Cash';
        bill.items.forEach((item, idx) => {
          csv += [
            bill.billed_date,
            bill.bill_number,
            payMethod,
            `"${item.product_name.replace(/"/g, '""')}"`,
            item.quantity,
            item.cost_price ? Number(item.cost_price).toFixed(2) : '',
            Number(item.price).toFixed(2),
            Number(item.line_total).toFixed(2),
            idx === 0 ? Number(bill.total).toFixed(2) : '',
          ].join(',') + '\n';
        });
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `quickbill_${startDate}_to_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch (err) {
      toast.error('CSV export failed: ' + err.message);
    }
    setExporting('');
  };

  // ── PDF export via html2pdf ───────────────────────────────────
  const exportPDF = async () => {
    setExporting('pdf');
    try {
      const html2pdf = (await import('html2pdf.js')).default;

      // Build a printable HTML string
      let rows = '';
      filteredBills.forEach(bill => {
        bill.items.forEach((item, idx) => {
          const payMethod = bill.payment_method || 'Cash';
          const hasCost = Number(item.cost_price) > 0;
          rows += `<tr>
            <td>${idx === 0 ? bill.billed_date : ''}</td>
            <td>${idx === 0 ? '#' + bill.bill_number : ''}</td>
            <td>${item.product_name}</td>
            <td style="text-align:center">${item.quantity}</td>
            <td style="text-align:right;color:${hasCost ? '#d97706' : '#999'}">${hasCost ? '₹' + Number(item.cost_price).toFixed(2) : '—'}</td>
            <td style="text-align:right;font-weight:600;color:#7c3aed">₹${Number(item.price).toFixed(2)}</td>
            <td style="text-align:right">₹${Number(item.line_total).toFixed(2)}</td>
            <td style="text-align:center;font-weight:700;${payMethod === 'UPI' ? 'color:#7c3aed' : payMethod === 'UPI - Bank' ? 'color:#6366f1' : payMethod === 'Cash - Bank' ? 'color:#059669' : 'color:#16a34a'}">${idx === 0 ? (bill.payment_method || 'Cash') : ''}</td>
            <td style="text-align:right;font-weight:700">${idx === 0 ? '₹' + Number(bill.total).toFixed(2) : ''}</td>
          </tr>`;
        });
      });

      const html = `
        <div style="font-family:Inter,Arial,sans-serif;color:#111;padding:20px">
          <h2 style="margin-bottom:4px">Quick Bill History</h2>
          <p style="color:#64748b;font-size:13px;margin-bottom:16px">
            ${startDate} to ${endDate} &nbsp;·&nbsp;
            ${filteredBills.length} bills &nbsp;·&nbsp;
            Total: ₹${totalRevenue.toFixed(2)}
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="background:#f1f5f9">
                <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #e2e8f0">Date</th>
                <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #e2e8f0">Bill #</th>
                <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #e2e8f0">Product</th>
                <th style="text-align:center;padding:6px 8px;border-bottom:2px solid #e2e8f0">Qty</th>
                <th style="text-align:right;padding:6px 8px;border-bottom:2px solid #e2e8f0">Service Price</th>
                <th style="text-align:right;padding:6px 8px;border-bottom:2px solid #e2e8f0">Service Charge</th>
                <th style="text-align:right;padding:6px 8px;border-bottom:2px solid #e2e8f0">Line Total</th>
                <th style="text-align:center;padding:6px 8px;border-bottom:2px solid #e2e8f0">Payment</th>
                <th style="text-align:right;padding:6px 8px;border-bottom:2px solid #e2e8f0">Bill Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr style="background:#f8fafc;font-weight:700">
                <td colspan="7" style="padding:8px;border-top:2px solid #e2e8f0">Grand Total</td>
                <td style="padding:8px;border-top:2px solid #e2e8f0;text-align:right">
                  ₹${filteredBills.reduce((s,b) => s + b.items.reduce((si,i) => si + Number(i.line_total),0), 0).toFixed(2)}
                </td>
                <td style="padding:8px;border-top:2px solid #e2e8f0;text-align:right">
                  ₹${totalRevenue.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>`;

      const el = document.createElement('div');
      el.innerHTML = html;
      document.body.appendChild(el);

      await html2pdf()
        .set({
          margin:      10,
          filename:    `quickbill_${startDate}_to_${endDate}.pdf`,
          image:       { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF:       { unit: 'mm', format: 'a4', orientation: 'landscape' },
        })
        .from(el)
        .save();

      document.body.removeChild(el);
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error('PDF export failed: ' + err.message);
    }
    setExporting('');
  };

  return (
    <div className="qbh-root animate-fade-in">

      {/* ── Header ── */}
      <div className="qbh-header glass-panel">
        <div className="qbh-header-left">
          <button className="qbh-back-btn" onClick={() => navigate('/admin/billing/quickbill')}>
            <ArrowLeft size={16} /> Quick Bill
          </button>
          <div>
            <h2>Bill History</h2>
            <span className="qbh-header-sub">
              {filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''} · ₹{totalRevenue.toFixed(2)} · {totalItems} items
            </span>
          </div>
        </div>
        <div className="qbh-header-right">
          <button
            className="qbh-export-btn qbh-export-csv"
            onClick={exportCSV}
            disabled={filteredBills.length === 0 || exporting !== ''}
          >
            {exporting === 'csv' ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
            CSV
          </button>
          <button
            className="qbh-export-btn qbh-export-pdf"
            onClick={exportPDF}
            disabled={filteredBills.length === 0 || exporting !== ''}
          >
            {exporting === 'pdf' ? <Loader2 size={14} className="spin" /> : <FileText size={14} />}
            PDF
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="qbh-filters glass-panel">
        {/* Presets */}
        <div className="qbh-presets">
          {PRESETS.map(p => (
            <button
              key={p.label}
              className={`qbh-preset-btn ${activePreset === p.label ? 'qbh-preset-btn--active' : ''}`}
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date range inputs */}
        <div className="qbh-date-range">
          <Calendar size={14} className="qbh-cal-icon" />
          <input
            type="date"
            className="qbh-date-input"
            value={startDate}
            max={endDate}
            onChange={e => { setStartDate(e.target.value); setActivePreset(''); }}
          />
          <span className="qbh-date-sep">→</span>
          <input
            type="date"
            className="qbh-date-input"
            value={endDate}
            min={startDate}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={e => { setEndDate(e.target.value); setActivePreset(''); }}
          />
        </div>

        {/* Payment method filter */}
        <div className="qbh-pay-filters">
          {['ALL', 'Cash', 'UPI', 'UPI - Bank', 'Cash - Bank'].map(m => (
            <button
              key={m}
              className={`qbh-pay-pill ${paymentFilter === m ? 'qbh-pay-pill--active' : ''}`}
              onClick={() => setPaymentFilter(m)}
            >
              {m === 'ALL' ? 'All' : m}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="qbh-search-wrap">
          <Search size={14} className="qbh-search-icon" />
          <input
            type="text"
            className="qbh-search-input"
            placeholder="Search bill # or product…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="qbh-search-clear" onClick={() => setSearchTerm('')}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Summary strip ── */}
      {!loading && filteredBills.length > 0 && (
        <div className="qbh-summary-strip">
          <div className="qbh-strip-stat">
            <TrendingUp size={15} />
            <div>
              <span className="qbh-strip-label">Total Revenue</span>
              <span className="qbh-strip-value">₹{totalRevenue.toFixed(2)}</span>
            </div>
          </div>
          <div className="qbh-strip-stat">
            <Receipt size={15} />
            <div>
              <span className="qbh-strip-label">Bills</span>
              <span className="qbh-strip-value">{filteredBills.length}</span>
            </div>
          </div>
          <div className="qbh-strip-stat">
            <ShoppingBag size={15} />
            <div>
              <span className="qbh-strip-label">Items Sold</span>
              <span className="qbh-strip-value">{totalItems}</span>
            </div>
          </div>
          <div className="qbh-strip-stat">
            <Calendar size={15} />
            <div>
              <span className="qbh-strip-label">Days with Sales</span>
              <span className="qbh-strip-value">{grouped.length}</span>
            </div>
          </div>
          <div className="qbh-strip-stat">
            <Smartphone size={15} />
            <div>
              <span className="qbh-strip-label">UPI Total</span>
              <span className="qbh-strip-value" style={{ color: '#a78bfa' }}>₹{totalUPI.toFixed(2)}</span>
            </div>
          </div>
          <div className="qbh-strip-stat">
            <TrendingUp size={15} />
            <div>
              <span className="qbh-strip-label">Avg. Bill</span>
              <span className="qbh-strip-value">
                ₹{(totalRevenue / filteredBills.length).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Bill groups ── */}
      <div className="qbh-content">
        {loading ? (
          <div className="qbh-loader">
            <PremiumLoader text="Loading history…" />
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="qbh-empty glass-panel">
            <Receipt size={44} strokeWidth={1.3} />
            <h3>{searchTerm ? 'No matching bills' : 'No bills in this date range'}</h3>
            <p>
              {searchTerm
                ? 'Try a different search term.'
                : 'Try selecting a wider date range or a different period.'
              }
            </p>
          </div>
        ) : (
          <div className="qbh-groups">
            {grouped.map(([date, dayBills]) => (
              <DayGroup key={date} date={date} bills={dayBills} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
