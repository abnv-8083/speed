import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Receipt, DollarSign, Package,
  BarChart3, Download, Calendar, ArrowRight, Plus, Trash2,
  Edit2, Check, X, AlertTriangle, Wallet, PieChart, Activity,
  ChevronRight, Smartphone,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar,
  PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { api } from '../../api';
import Pagination from '../../components/Pagination';
import PremiumLoader from '../../components/PremiumLoader';
import AppModal from '../../components/AppModal';
import { useToast } from '../../components/ToastContext';
import './SalesReport.css';

// ── Constants ─────────────────────────────────────────────────
const EXPENSE_CATEGORIES = [
  'Rent','Utilities','Salaries','Supplies','Maintenance',
  'Marketing','Transport','Equipment','Taxes','Miscellaneous',
];

const CATEGORY_COLORS = {
  Rent:'#6366f1', Utilities:'#f59e0b', Salaries:'#ec4899',
  Supplies:'#10b981', Maintenance:'#f87171', Marketing:'#8b5cf6',
  Transport:'#0ea5e9', Equipment:'#14b8a6', Taxes:'#ef4444',
  Miscellaneous:'#94a3b8',
};

const PRESETS = [
  { label: 'Last 7 days',  days: 7  },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

const TABS = ['Overview', 'Expenses', 'P&L Report'];

// ── Custom chart tooltip ───────────────────────────────────────
function ChartTip({ active, payload, label, prefix = '₹' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="sr-tooltip glass-panel">
      <p className="sr-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="sr-tooltip-val" style={{ color: p.color || 'var(--secondary)' }}>
          {p.name}: {prefix}{Number(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  );
}

// ── Expense Form Modal ─────────────────────────────────────────
function ExpenseModal({ expense, onSave, onClose }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState({
    title: expense?.title || '',
    amount: expense?.amount || '',
    category: expense?.category || 'Miscellaneous',
    expense_date: expense?.expense_date || today,
    note: expense?.note || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.amount || !form.expense_date) return;
    setSaving(true);
    await onSave({ ...form, amount: parseFloat(form.amount) });
    setSaving(false);
  };

  return (
    <AppModal
      title={expense?.id ? 'Edit Expense' : 'Add Expense'}
      onClose={onClose}
      width="460px"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}
            disabled={saving || !form.title.trim() || !form.amount}>
            <Check size={14} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Title *</label>
        <input className="input-field" value={form.title}
          onChange={e => set('title', e.target.value)} placeholder="e.g. Monthly Rent" autoFocus />
      </div>
      <div className="sr-form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Amount (₹) *</label>
          <input type="number" className="input-field" value={form.amount}
            onChange={e => set('amount', e.target.value)} min="0" step="0.01" placeholder="0.00" />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Date *</label>
          <input type="date" className="input-field" value={form.expense_date}
            onChange={e => set('expense_date', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Category</label>
        <select className="input-field" value={form.category}
          onChange={e => set('category', e.target.value)}>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Note (optional)</label>
        <input className="input-field" value={form.note}
          onChange={e => set('note', e.target.value)} placeholder="Additional details…" />
      </div>
    </AppModal>
  );
}

// ── Main Component ─────────────────────────────────────────────
const SalesReport = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading]     = useState(true);

  // Date range
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  const [endDate, setEndDate]     = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activePreset, setActivePreset] = useState('Last 30 days');

  // Raw data
  const [salesData, setSalesData]   = useState([]);
  const [expenses, setExpenses]     = useState([]);

  // Expense modal
  const [expenseModal, setExpenseModal] = useState(null); // null | {} | expense obj
  const [deleteExpenseId, setDeleteExpenseId] = useState(null);

  // Profit drill-down modal
  const [showProfitModal, setShowProfitModal] = useState(false);

  // Transactions payment filter & pagination
  const [paymentFilter, setPaymentFilter] = useState('ALL'); // 'ALL' | 'UPI' | 'CASH'
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 10;

  // ── Load ─────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const startIso = startOfDay(new Date(startDate)).toISOString();
      const endIso   = endOfDay(new Date(endDate)).toISOString();
      const [invoices, exps] = await Promise.all([
        api.getInvoices({ start: startIso, end: endIso }),
        api.getExpenses({ start_date: startDate, end_date: endDate }),
      ]);
      setSalesData(invoices || []);
      setExpenses(exps || []);
    } catch (err) {
      toast.error('Failed to load report data');
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const applyPreset = (preset) => {
    setActivePreset(preset.label);
    setStartDate(format(subDays(new Date(), preset.days - 1), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
  };

  // ── Filtered Sales Data (by payment method) ──────────────────
  const filteredSalesData = useMemo(() => {
    if (paymentFilter === 'UPI') {
      return salesData.filter(inv => (inv.payment_method || '').toUpperCase() === 'UPI');
    }
    if (paymentFilter === 'CASH') {
      return salesData.filter(inv => (inv.payment_method || '').toUpperCase() !== 'UPI');
    }
    return salesData;
  }, [salesData, paymentFilter]);

  // ── Computed metrics ─────────────────────────────────────────
  const metrics = useMemo(() => {
    const revenue    = salesData.reduce((s, inv) => s + Number(inv.total_amount), 0);
    const discounts  = salesData.reduce((s, inv) => s + Number(inv.discount || 0), 0);
    const totalExp   = expenses.reduce((s, e) => s + Number(e.amount), 0);

    const upiInvoices  = salesData.filter(inv => (inv.payment_method || '').toUpperCase() === 'UPI');
    const upiRevenue   = upiInvoices.reduce((s, inv) => s + Number(inv.total_amount || 0), 0);
    const cashInvoices = salesData.filter(inv => (inv.payment_method || '').toUpperCase() !== 'UPI');
    const cashRevenue  = cashInvoices.reduce((s, inv) => s + Number(inv.total_amount || 0), 0);

    // Gross profit = sum of (selling_price - cost_price) × qty per item across all invoices
    let cogs = 0;
    const billProfits = []; // per-invoice breakdown for drill-down

    salesData.forEach(inv => {
      let invRevenue = 0;
      let invCogs    = 0;

      if (inv.invoice_items) {
        inv.invoice_items.forEach(item => {
          const sellPrice = Number(item.price_at_time);
          const costPrice = Number(item.products?.cost_price || 0);
          const qty       = item.quantity;
          invRevenue += sellPrice * qty;
          invCogs    += costPrice * qty;
          cogs       += costPrice * qty;
        });
      }

      const invProfit = invRevenue - invCogs;
      const isUpi = (inv.payment_method || '').toUpperCase() === 'UPI';
      billProfits.push({
        id:           inv.id,
        customer:     inv.customer_name || 'Walk-in',
        date:         inv.created_at,
        paymentMethod: isUpi ? 'UPI' : 'Cash',
        revenue:      invRevenue,
        cogs:         invCogs,
        profit:       invProfit,
        margin:       invRevenue > 0 ? (invProfit / invRevenue) * 100 : 0,
        itemCount:    inv.invoice_items?.length || 0,
      });
    });

    const grossProfit = revenue - cogs;
    const netProfit   = grossProfit - totalExp;
    const profitPct   = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    let itemsCount = 0;
    const productSales = {};
    const dailyMap     = {};

    salesData.forEach(inv => {
      const dateStr = format(new Date(inv.created_at), 'MMM dd');
      dailyMap[dateStr] = dailyMap[dateStr] || { date: dateStr, revenue: 0, expenses: 0 };
      dailyMap[dateStr].revenue += Number(inv.total_amount);

      if (inv.invoice_items) {
        inv.invoice_items.forEach(item => {
          itemsCount += item.quantity;
          const pName = item.products?.name || 'Unknown';
          if (!productSales[pName]) productSales[pName] = { qty: 0, revenue: 0 };
          productSales[pName].qty += item.quantity;
          productSales[pName].revenue += item.quantity * item.price_at_time;
        });
      }
    });

    expenses.forEach(exp => {
      const dateStr = format(new Date(exp.expense_date + 'T00:00:00'), 'MMM dd');
      if (dailyMap[dateStr]) {
        dailyMap[dateStr].expenses += Number(exp.amount);
      } else {
        dailyMap[dateStr] = { date: dateStr, revenue: 0, expenses: Number(exp.amount) };
      }
    });

    const chartData = Object.values(dailyMap).map(d => ({
      ...d,
      profit: d.revenue - d.expenses,
    }));

    const expByCategory = {};
    expenses.forEach(e => {
      expByCategory[e.category] = (expByCategory[e.category] || 0) + Number(e.amount);
    });
    const expPieData = Object.entries(expByCategory).map(([name, value]) => ({
      name, value, color: CATEGORY_COLORS[name] || '#94a3b8',
    }));

    const topProducts = Object.entries(productSales)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 7);

    return {
      revenue, discounts, totalExp, cogs, grossProfit, netProfit, profitPct,
      itemsCount, invoiceCount: salesData.length,
      upiRevenue, upiCount: upiInvoices.length,
      cashRevenue, cashCount: cashInvoices.length,
      avgOrder: salesData.length > 0 ? revenue / salesData.length : 0,
      chartData, expPieData, topProducts,
      billProfits: billProfits.sort((a, b) => new Date(b.date) - new Date(a.date)),
    };
  }, [salesData, expenses]);

  // ── Expense CRUD ─────────────────────────────────────────────
  const handleExpenseSave = async (data) => {
    try {
      if (expenseModal?.id) {
        const updated = await api.updateExpense(expenseModal.id, data);
        setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
        toast.success('Expense updated');
      } else {
        const created = await api.createExpense(data);
        setExpenses(prev => [created, ...prev]);
        toast.success('Expense added');
      }
      setExpenseModal(null);
    } catch (err) {
      toast.error('Failed to save expense: ' + err.message);
    }
  };

  const handleExpenseDelete = async () => {
    try {
      await api.deleteExpense(deleteExpenseId);
      setExpenses(prev => prev.filter(e => e.id !== deleteExpenseId));
      toast.success('Expense deleted');
    } catch (err) {
      toast.error('Failed to delete: ' + err.message);
    }
    setDeleteExpenseId(null);
  };

  // ── CSV export ────────────────────────────────────────────────
  const exportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'Type,Date,Reference,Customer,Payment Method,Discount,Amount\n';
    salesData.forEach(inv => {
      const pm = (inv.payment_method || '').toUpperCase() === 'UPI' ? 'UPI' : 'Cash';
      csv += `Revenue,${new Date(inv.created_at).toLocaleDateString()},INV-${String(inv.id).slice(-6)},${inv.customer_name || 'Walk-in'},${pm},${inv.discount || 0},${inv.total_amount}\n`;
    });
    expenses.forEach(e => {
      csv += `Expense,${e.expense_date},EXP,${e.title} (${e.category}),—,—,${e.amount}\n`;
    });
    const a = document.createElement('a');
    a.setAttribute('href', encodeURI(csv));
    a.setAttribute('download', `report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  // ── PDF export ────────────────────────────────────────────────
  const exportPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const isProfit = metrics.netProfit >= 0;

    // Build expense rows by category
    const expByCat = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    }, {});
    const expCatRows = Object.entries(expByCat).map(([cat, amt]) =>
      `<tr style="background:#fef9f9">
        <td style="padding:6px 12px 6px 28px;color:#64748b;font-size:12px">${cat}</td>
        <td style="padding:6px 12px;text-align:right;color:#f87171;font-size:12px">₹${amt.toFixed(2)}</td>
      </tr>`).join('');

    const topProductRows = metrics.topProducts.map((p, i) =>
      `<tr style="${i % 2 === 0 ? '' : 'background:#f8fafc'}">
        <td style="padding:6px 10px;font-size:12px">#${i + 1} ${p.name}</td>
        <td style="padding:6px 10px;text-align:center;font-size:12px;color:#64748b">${p.qty}</td>
        <td style="padding:6px 10px;text-align:right;font-size:12px;font-weight:700;color:#10b981">₹${p.revenue.toFixed(2)}</td>
      </tr>`).join('');

    const invoiceRows = salesData.slice(0, 50).map((inv, i) => {
      const isUpi = (inv.payment_method || '').toUpperCase() === 'UPI';
      return `<tr style="${i % 2 === 0 ? '' : 'background:#f8fafc'}">
        <td style="padding:5px 10px;font-size:11px;color:#64748b">${new Date(inv.created_at).toLocaleDateString()}</td>
        <td style="padding:5px 10px;font-size:11px;font-family:monospace;color:#6366f1">INV-${String(inv.id).slice(-6).padStart(6,'0')}</td>
        <td style="padding:5px 10px;font-size:11px">${inv.customer_name || 'Walk-in'}</td>
        <td style="padding:5px 10px;text-align:center;font-size:10px"><span style="background:${isUpi ? '#ede9fe' : '#dcfce7'};color:${isUpi ? '#7c3aed' : '#15803d'};font-weight:700;padding:1px 6px;border-radius:4px">${isUpi ? 'UPI' : 'Cash'}</span></td>
        <td style="padding:5px 10px;text-align:right;font-size:11px;color:#f87171">${inv.discount > 0 ? `-₹${Number(inv.discount).toFixed(2)}` : '—'}</td>
        <td style="padding:5px 10px;text-align:right;font-size:11px;font-weight:700;color:#10b981">₹${Number(inv.total_amount).toFixed(2)}</td>
      </tr>`;
    }).join('');

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;color:#111;padding:24px;background:#fff">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e2e8f0">
          <div>
            <h1 style="font-size:22px;font-weight:900;color:#1e1b4b;margin:0 0 4px">Sales & Analytics Report</h1>
            <p style="color:#64748b;font-size:13px;margin:0">Period: ${startDate} to ${endDate}</p>
          </div>
          <div style="text-align:right">
            <p style="font-size:11px;color:#94a3b8;margin:0">Generated by Speed@net</p>
            <p style="font-size:11px;color:#94a3b8;margin:2px 0 0">${format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
          </div>
        </div>

        <!-- P&L Summary -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
          ${[
            { label: 'Revenue', value: `₹${metrics.revenue.toFixed(2)}`, color: '#10b981' },
            { label: 'Total Expenses', value: `₹${metrics.totalExp.toFixed(2)}`, color: '#f87171' },
            { label: isProfit ? 'Net Profit' : 'Net Loss', value: `₹${Math.abs(metrics.netProfit).toFixed(2)}`, color: isProfit ? '#10b981' : '#f87171' },
            { label: 'Profit Margin', value: `${metrics.profitPct.toFixed(1)}%`, color: isProfit ? '#10b981' : '#f87171' },
          ].map(m => `
            <div style="background:#f8fafc;border-radius:8px;padding:12px;border-left:4px solid ${m.color}">
              <p style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;font-weight:700">${m.label}</p>
              <p style="font-size:18px;font-weight:900;color:${m.color};margin:0">${m.value}</p>
            </div>`).join('')}
        </div>

        <!-- Secondary metrics -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
          ${[
            { label: 'Invoices', value: metrics.invoiceCount },
            { label: 'UPI Payments', value: `₹${metrics.upiRevenue.toFixed(2)} (${metrics.upiCount})` },
            { label: 'Cash Payments', value: `₹${metrics.cashRevenue.toFixed(2)} (${metrics.cashCount})` },
            { label: 'Avg. Order', value: `₹${metrics.avgOrder.toFixed(2)}` },
          ].map(m => `
            <div style="background:#f8fafc;border-radius:8px;padding:10px 12px;border:1px solid #e2e8f0">
              <p style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 3px;font-weight:700">${m.label}</p>
              <p style="font-size:15px;font-weight:800;color:#1e293b;margin:0">${m.value}</p>
            </div>`).join('')}
        </div>

        <!-- Two-column: P&L breakdown + Top Products -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">

          <!-- P&L -->
          <div>
            <h2 style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;margin:0 0 8px">Income Statement</h2>
            <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
              <tr style="background:#f1f5f9"><td style="padding:8px 12px;font-weight:700;font-size:12px">Revenue (Gross)</td><td style="padding:8px 12px;text-align:right;font-weight:700;font-size:12px;color:#10b981">+₹${metrics.revenue.toFixed(2)}</td></tr>
              <tr><td style="padding:6px 12px 6px 24px;color:#64748b;font-size:12px">↳ Cash Sales</td><td style="padding:6px 12px;text-align:right;color:#10b981;font-size:12px">₹${metrics.cashRevenue.toFixed(2)}</td></tr>
              <tr><td style="padding:6px 12px 6px 24px;color:#64748b;font-size:12px">↳ UPI Sales</td><td style="padding:6px 12px;text-align:right;color:#7c3aed;font-size:12px">₹${metrics.upiRevenue.toFixed(2)}</td></tr>
              <tr><td style="padding:6px 12px 6px 24px;color:#64748b;font-size:12px">Discounts Given</td><td style="padding:6px 12px;text-align:right;color:#f87171;font-size:12px">-₹${metrics.discounts.toFixed(2)}</td></tr>
              <tr style="background:#fef9f9"><td style="padding:8px 12px;font-weight:700;font-size:12px">Total Expenses</td><td style="padding:8px 12px;text-align:right;font-weight:700;font-size:12px;color:#f87171">-₹${metrics.totalExp.toFixed(2)}</td></tr>
              ${expCatRows}
              <tr style="background:${isProfit ? '#f0fdf4' : '#fef2f2'}"><td style="padding:10px 12px;font-weight:900;font-size:13px">${isProfit ? 'Net Profit' : 'Net Loss'}</td><td style="padding:10px 12px;text-align:right;font-weight:900;font-size:13px;color:${isProfit ? '#10b981' : '#f87171'}">₹${Math.abs(metrics.netProfit).toFixed(2)}</td></tr>
            </table>
          </div>

          <!-- Top Products -->
          <div>
            <h2 style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;margin:0 0 8px">Top Products</h2>
            <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
              <tr style="background:#f1f5f9">
                <th style="padding:7px 10px;text-align:left;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase">Product</th>
                <th style="padding:7px 10px;text-align:center;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase">Units</th>
                <th style="padding:7px 10px;text-align:right;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase">Revenue</th>
              </tr>
              ${topProductRows || '<tr><td colspan="3" style="padding:12px;text-align:center;color:#94a3b8;font-size:12px">No sales data</td></tr>'}
            </table>
          </div>
        </div>

        <!-- Transactions -->
        <h2 style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;margin:0 0 8px">
          Sales Transactions ${salesData.length > 50 ? `(showing first 50 of ${salesData.length})` : ''}
        </h2>
        <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
          <tr style="background:#f1f5f9">
            <th style="padding:7px 10px;text-align:left;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase">Date</th>
            <th style="padding:7px 10px;text-align:left;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase">Invoice</th>
            <th style="padding:7px 10px;text-align:left;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase">Customer</th>
            <th style="padding:7px 10px;text-align:center;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase">Method</th>
            <th style="padding:7px 10px;text-align:right;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase">Discount</th>
            <th style="padding:7px 10px;text-align:right;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase">Amount</th>
          </tr>
          ${invoiceRows || '<tr><td colspan="6" style="padding:12px;text-align:center;color:#94a3b8;font-size:12px">No transactions</td></tr>'}
        </table>

        <p style="margin-top:20px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:12px">
          Generated by Speed@net CRM · ${format(new Date(), 'dd MMM yyyy')}
        </p>
      </div>`;

    const el = document.createElement('div');
    el.innerHTML = html;
    el.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;background:#fff';
    document.body.appendChild(el);

    await html2pdf()
      .set({
        margin:      [8, 8, 8, 8],
        filename:    `sales_report_${startDate}_to_${endDate}.pdf`,
        image:       { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 800, windowWidth: 800 },
        jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:   { mode: 'avoid-all' },
      })
      .from(el.firstElementChild)
      .save();

    document.body.removeChild(el);
    toast.success('PDF downloaded');
  };

  const isProfit = metrics.grossProfit >= 0;

  return (
    <div className="sr-root animate-fade-in">

      {/* ── Header ── */}
      <div className="sr-header glass-panel">
        <div className="sr-header-left">
          <h2>Sales &amp; Analytics</h2>
          <span className="sr-header-sub">
            {format(new Date(startDate), 'dd MMM')} – {format(new Date(endDate), 'dd MMM yyyy')}
          </span>
        </div>
        <div className="sr-header-right">
          {/* Presets */}
          <div className="sr-presets">
            {PRESETS.map(p => (
              <button key={p.label}
                className={`sr-preset-btn ${activePreset === p.label ? 'sr-preset-btn--active' : ''}`}
                onClick={() => applyPreset(p)}>
                {p.label}
              </button>
            ))}
          </div>
          {/* Date pill */}
          <div className="sr-date-pill">
            <Calendar size={13} className="sr-cal-icon" />
            <input type="date" className="sr-date-input" value={startDate} max={endDate}
              onChange={e => { setStartDate(e.target.value); setActivePreset(''); }} />
            <ArrowRight size={12} className="sr-date-sep" />
            <input type="date" className="sr-date-input" value={endDate} min={startDate}
              onChange={e => { setEndDate(e.target.value); setActivePreset(''); }} />
          </div>
          <button className="btn btn-secondary sr-export-btn" onClick={exportCSV}>
            <Download size={15} /> CSV
          </button>
          <button className="btn btn-primary sr-export-btn" onClick={exportPDF}>
            <Download size={15} /> PDF
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="sr-tabs">
        {TABS.map(tab => (
          <button key={tab}
            className={`sr-tab ${activeTab === tab ? 'sr-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="sr-loader"><PremiumLoader text="Crunching data…" /></div>
      ) : (
        <>
          {/* ═══ OVERVIEW TAB ═══ */}
          {activeTab === 'Overview' && (
            <div className="sr-content">

              {/* Metric cards — row 1 */}
              <div className="sr-metrics-grid">
                <MetricCard label="Revenue" value={`₹${metrics.revenue.toFixed(2)}`} accent="success" icon={<DollarSign size={18}/>} />
                <MetricCard label="Total Expenses" value={`₹${metrics.totalExp.toFixed(2)}`} accent="danger" icon={<TrendingDown size={18}/>} />
                <MetricCard
                  label={isProfit ? 'Gross Profit' : 'Gross Loss'}
                  value={`₹${Math.abs(metrics.grossProfit).toFixed(2)}`}
                  accent={isProfit ? 'success' : 'danger'}
                  icon={isProfit ? <TrendingUp size={18}/> : <TrendingDown size={18}/>}
                  highlight
                  clickable
                  onClick={() => setShowProfitModal(true)}
                  hint="Price − Cost per item · Click to see breakdown"
                />
                <MetricCard label="Profit Margin" value={`${metrics.profitPct.toFixed(1)}%`}
                  accent={metrics.profitPct >= 0 ? 'success' : 'danger'} icon={<PieChart size={18}/>} />
                <MetricCard label="UPI Payments" value={`₹${metrics.upiRevenue.toFixed(2)}`} accent="primary" icon={<Smartphone size={18}/>} hint={`${metrics.upiCount} transaction${metrics.upiCount !== 1 ? 's' : ''}`} />
                <MetricCard label="Cash Payments" value={`₹${metrics.cashRevenue.toFixed(2)}`} accent="success" icon={<Wallet size={18}/>} hint={`${metrics.cashCount} transaction${metrics.cashCount !== 1 ? 's' : ''}`} />
                <MetricCard label="Invoices" value={metrics.invoiceCount} accent="primary" icon={<Receipt size={18}/>} />
                <MetricCard label="Items Sold" value={metrics.itemsCount} accent="warning" icon={<Package size={18}/>} />
                <MetricCard label="Avg. Order" value={`₹${metrics.avgOrder.toFixed(2)}`} accent="neutral" icon={<Activity size={18}/>} />
                <MetricCard label="Discounts Given" value={`₹${metrics.discounts.toFixed(2)}`} accent="neutral" icon={<Wallet size={18}/>} />
              </div>

              {/* Revenue + Expenses + Profit chart */}
              <div className="sr-chart-card glass-panel">
                <div className="sr-chart-header">
                  <h3>Revenue vs Expenses vs Profit</h3>
                </div>
                <div style={{ height: 300 }}>
                  {metrics.chartData.length === 0 ? (
                    <div className="sr-chart-empty">No data in this range.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                        <Tooltip content={<ChartTip />} />
                        <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)' }} />
                        <Bar dataKey="revenue"  name="Revenue"  fill="#10b981" radius={[3,3,0,0]} maxBarSize={32}/>
                        <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[3,3,0,0]} maxBarSize={32}/>
                        <Bar dataKey="profit"   name="Profit"   fill="#8b5cf6" radius={[3,3,0,0]} maxBarSize={32}/>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Bottom grid: pie + top products */}
              <div className="sr-bottom-grid">

                {/* Expense breakdown pie */}
                <div className="sr-chart-card glass-panel">
                  <div className="sr-chart-header">
                    <h3><PieChart size={15}/> Expense Breakdown</h3>
                  </div>
                  {metrics.expPieData.length === 0 ? (
                    <div className="sr-chart-empty" style={{ height: 220 }}>No expenses recorded.</div>
                  ) : (
                    <div style={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie data={metrics.expPieData} dataKey="value" nameKey="name"
                            cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}>
                            {metrics.expPieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => `₹${Number(v).toFixed(2)}`} />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Top products bar */}
                <div className="sr-chart-card glass-panel">
                  <div className="sr-chart-header">
                    <h3><BarChart3 size={15}/> Top Products by Revenue</h3>
                  </div>
                  {metrics.topProducts.length === 0 ? (
                    <div className="sr-chart-empty" style={{ height: 220 }}>No sales data.</div>
                  ) : (
                    <div style={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.topProducts} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                          <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={v => `₹${v}`} />
                          <YAxis type="category" dataKey="name" width={90}
                            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                            tickFormatter={v => v.length > 12 ? v.slice(0, 12) + '…' : v} />
                          <Tooltip content={<ChartTip />} />
                          <Bar dataKey="revenue" name="Revenue" fill="#8b5cf6" radius={[0,3,3,0]} maxBarSize={18}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Revenue line over time */}
              <div className="sr-chart-card glass-panel">
                <div className="sr-chart-header">
                  <h3>Revenue Trend</h3>
                </div>
                <div style={{ height: 240 }}>
                  {metrics.chartData.length === 0 ? (
                    <div className="sr-chart-empty">No data.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metrics.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                        <Tooltip content={<ChartTip />} />
                        <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2.5}
                          dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f87171" strokeWidth={2}
                          dot={{ r: 3, fill: '#f87171', strokeWidth: 0 }} activeDot={{ r: 5 }} strokeDasharray="5 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ═══ EXPENSES TAB ═══ */}
          {activeTab === 'Expenses' && (
            <div className="sr-content">
              <div className="sr-expense-toolbar glass-panel">
                <span className="sr-expense-count">{expenses.length} expenses · Total ₹{metrics.totalExp.toFixed(2)}</span>
                <button className="btn btn-primary" onClick={() => setExpenseModal({})}>
                  <Plus size={15} /> Add Expense
                </button>
              </div>

              {expenses.length === 0 ? (
                <div className="sr-empty glass-panel">
                  <Wallet size={40}/>
                  <h3>No expenses yet</h3>
                  <p>Add expenses to track your P&L accurately.</p>
                  <button className="btn btn-primary" onClick={() => setExpenseModal({})}>
                    <Plus size={14}/> Add First Expense
                  </button>
                </div>
              ) : (
                <div className="sr-expense-list glass-panel">
                  <div className="sr-expense-header-row">
                    <span>Date</span>
                    <span>Title</span>
                    <span>Category</span>
                    <span className="text-right">Amount</span>
                    <span></span>
                  </div>
                  {expenses.map(exp => (
                    <div key={exp.id} className="sr-expense-row">
                      <span className="sr-exp-date">{exp.expense_date}</span>
                      <div className="sr-exp-title-wrap">
                        <span className="sr-exp-title">{exp.title}</span>
                        {exp.note && <span className="sr-exp-note">{exp.note}</span>}
                      </div>
                      <span className="sr-exp-cat" style={{ background: `${CATEGORY_COLORS[exp.category]}18`, color: CATEGORY_COLORS[exp.category] }}>
                        {exp.category}
                      </span>
                      <span className="sr-exp-amount">₹{Number(exp.amount).toFixed(2)}</span>
                      <div className="sr-exp-actions">
                        <button className="sr-exp-btn" onClick={() => setExpenseModal(exp)} title="Edit"><Edit2 size={13}/></button>
                        <button className="sr-exp-btn sr-exp-btn--del" onClick={() => setDeleteExpenseId(exp.id)} title="Delete"><Trash2 size={13}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ P&L REPORT TAB ═══ */}
          {activeTab === 'P&L Report' && (
            <div className="sr-content">
              <div className="sr-pl-grid">

                {/* P&L summary card */}
                <div className={`sr-pl-summary glass-panel ${isProfit ? 'sr-pl-profit' : 'sr-pl-loss'}`}>
                  <div className="sr-pl-summary-icon">
                    {isProfit ? <TrendingUp size={28}/> : <TrendingDown size={28}/>}
                  </div>
                  <div>
                    <h3>{isProfit ? 'Net Profit' : 'Net Loss'}</h3>
                    <p className="sr-pl-value">₹{Math.abs(metrics.netProfit).toFixed(2)}</p>
                    <p className="sr-pl-pct">{Math.abs(metrics.profitPct).toFixed(1)}% {isProfit ? 'profit margin' : 'loss margin'}</p>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="sr-pl-breakdown glass-panel">
                  <h3 className="sr-pl-section-title">Income Statement</h3>

                  <div className="sr-pl-line sr-pl-line--header">
                    <span>Revenue (Gross Sales)</span>
                    <span className="sr-pl-green">+₹{metrics.revenue.toFixed(2)}</span>
                  </div>
                  <div className="sr-pl-line sr-pl-line--sub">
                    <span>↳ Cash Sales</span>
                    <span className="sr-pl-green">₹{metrics.cashRevenue.toFixed(2)}</span>
                  </div>
                  <div className="sr-pl-line sr-pl-line--sub">
                    <span>↳ UPI Sales</span>
                    <span style={{ color: '#a78bfa', fontWeight: 600 }}>₹{metrics.upiRevenue.toFixed(2)}</span>
                  </div>
                  <div className="sr-pl-line sr-pl-line--sub">
                    <span>Discounts Given</span>
                    <span className="sr-pl-red">-₹{metrics.discounts.toFixed(2)}</span>
                  </div>
                  <div className="sr-pl-line sr-pl-line--subtotal">
                    <span>Net Revenue</span>
                    <span className="sr-pl-green">₹{(metrics.revenue).toFixed(2)}</span>
                  </div>

                  <div className="sr-pl-divider" />

                  <div className="sr-pl-line sr-pl-line--header">
                    <span>Total Expenses</span>
                    <span className="sr-pl-red">-₹{metrics.totalExp.toFixed(2)}</span>
                  </div>
                  {Object.entries(
                    expenses.reduce((acc, e) => {
                      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
                      return acc;
                    }, {})
                  ).map(([cat, amt]) => (
                    <div key={cat} className="sr-pl-line sr-pl-line--sub">
                      <span>{cat}</span>
                      <span className="sr-pl-red">-₹{amt.toFixed(2)}</span>
                    </div>
                  ))}

                  <div className="sr-pl-divider" />

                  <div className={`sr-pl-line sr-pl-line--total ${isProfit ? 'sr-pl-total-profit' : 'sr-pl-total-loss'}`}>
                    <span>{isProfit ? 'Net Profit' : 'Net Loss'}</span>
                    <span>₹{Math.abs(metrics.netProfit).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Transactions table */}
              <div className="sr-chart-card glass-panel">
                <div className="sr-chart-header sr-tx-header">
                  <h3>Sales Transactions</h3>
                  <div className="sr-pay-filters">
                    <button
                      className={`sr-pay-pill ${paymentFilter === 'ALL' ? 'sr-pay-pill--active' : ''}`}
                      onClick={() => { setPaymentFilter('ALL'); setTablePage(1); }}
                    >
                      All ({salesData.length})
                    </button>
                    <button
                      className={`sr-pay-pill ${paymentFilter === 'UPI' ? 'sr-pay-pill--active' : ''}`}
                      onClick={() => { setPaymentFilter('UPI'); setTablePage(1); }}
                    >
                      UPI ({metrics.upiCount})
                    </button>
                    <button
                      className={`sr-pay-pill ${paymentFilter === 'CASH' ? 'sr-pay-pill--active' : ''}`}
                      onClick={() => { setPaymentFilter('CASH'); setTablePage(1); }}
                    >
                      Cash ({metrics.cashCount})
                    </button>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Invoice</th>
                        <th>Customer</th>
                        <th style={{ textAlign: 'center' }}>Method</th>
                        <th className="text-right">Discount</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSalesData.length === 0 ? (
                        <tr><td colSpan="6" className="table-empty-cell">No transactions found.</td></tr>
                      ) : (
                        filteredSalesData
                          .slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE)
                          .map((inv, idx) => {
                            const isUpi = (inv.payment_method || '').toUpperCase() === 'UPI';
                            return (
                              <tr key={inv.id} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                                <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                                <td className="inv-id-cell">INV-{String(inv.id).slice(-6).padStart(6,'0')}</td>
                                <td>{inv.customer_name || 'Walk-in'}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className={`sr-pay-badge ${isUpi ? 'sr-pay-badge--upi' : 'sr-pay-badge--cash'}`}>
                                    {isUpi ? 'UPI' : 'Cash'}
                                  </span>
                                </td>
                                <td className="text-right text-error">{inv.discount > 0 ? `-₹${Number(inv.discount).toFixed(2)}` : '—'}</td>
                                <td className="text-right text-success font-bold">₹{Number(inv.total_amount).toFixed(2)}</td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                  <Pagination currentPage={tablePage} totalItems={filteredSalesData.length}
                    itemsPerPage={TABLE_PAGE_SIZE} onPageChange={setTablePage} />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Expense modal ── */}
      {expenseModal !== null && (
        <ExpenseModal expense={expenseModal} onSave={handleExpenseSave} onClose={() => setExpenseModal(null)} />
      )}

      {/* ── Delete confirm ── */}
      {deleteExpenseId && (
        <AppModal title="Delete Expense?" onClose={() => setDeleteExpenseId(null)} width="340px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setDeleteExpenseId(null)}>Cancel</button>
              <button className="btn" style={{ background:'#ef4444', color:'#fff', fontWeight:700 }} onClick={handleExpenseDelete}>
                <Trash2 size={13}/> Delete
              </button>
            </>
          }>
          <p style={{ color:'var(--text-muted)', fontSize:'0.875rem' }}>This expense record will be permanently removed.</p>
        </AppModal>
      )}

      {/* ── Profit drill-down modal ── */}
      {showProfitModal && (
        <AppModal
          title={`Gross Profit Breakdown — ${metrics.billProfits.length} bills`}
          onClose={() => setShowProfitModal(false)}
          width="760px"
          noPadding
        >
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', background: 'var(--background)' }}>
            {[
              { label: 'Total Revenue', value: `₹${metrics.revenue.toFixed(2)}`, color: 'var(--secondary)' },
              { label: 'Total COGS', value: `₹${metrics.cogs.toFixed(2)}`, color: '#f87171' },
              { label: 'Gross Profit', value: `₹${metrics.grossProfit.toFixed(2)}`, color: metrics.grossProfit >= 0 ? 'var(--secondary)' : '#f87171' },
              { label: 'Margin', value: `${metrics.profitPct.toFixed(1)}%`, color: 'var(--primary)' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>{s.label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--background)', position: 'sticky', top: 0 }}>
                  {['Date', 'Invoice', 'Customer', 'Method', 'Revenue', 'COGS', 'Profit', 'Margin'].map(h => (
                    <th key={h} style={{ padding: '0.55rem 0.85rem', textAlign: h === 'Date' || h === 'Invoice' || h === 'Customer' ? 'left' : h === 'Method' ? 'center' : 'right', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.billProfits.map((b, i) => {
                  const isPos = b.profit >= 0;
                  const isUpi = b.paymentMethod === 'UPI';
                  return (
                    <tr key={b.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-muted)' }}>{format(new Date(b.date), 'dd MMM yy')}</td>
                      <td style={{ padding: '0.6rem 0.85rem', fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700 }}>INV-{String(b.id).slice(-6).padStart(6,'0')}</td>
                      <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text)' }}>{b.customer}</td>
                      <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center' }}>
                        <span className={`sr-pay-badge ${isUpi ? 'sr-pay-badge--upi' : 'sr-pay-badge--cash'}`}>
                          {b.paymentMethod}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right', color: 'var(--secondary)', fontWeight: 600 }}>₹{b.revenue.toFixed(2)}</td>
                      <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right', color: '#f87171' }}>₹{b.cogs.toFixed(2)}</td>
                      <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right', color: isPos ? 'var(--secondary)' : '#f87171', fontWeight: 700 }}>
                        {isPos ? '+' : ''}₹{b.profit.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right', color: isPos ? 'var(--secondary)' : '#f87171' }}>
                        {b.margin.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
                {metrics.billProfits.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No invoices in this date range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </AppModal>
      )}
    </div>
  );
};

// ── Metric card sub-component ─────────────────────────────────
function MetricCard({ label, value, accent, icon, highlight, clickable, onClick, hint }) {
  const accentColors = {
    success: 'var(--secondary)',
    danger:  '#f87171',
    primary: 'var(--primary)',
    warning: '#f59e0b',
    neutral: '#64748b',
  };
  const color = accentColors[accent] || accentColors.neutral;
  return (
    <div
      className={`sr-metric glass-panel ${highlight ? 'sr-metric--highlight' : ''} ${clickable ? 'sr-metric--clickable' : ''}`}
      style={{ borderLeftColor: color, cursor: clickable ? 'pointer' : 'default' }}
      onClick={clickable ? onClick : undefined}
      title={hint || ''}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e => e.key === 'Enter' && onClick?.()) : undefined}
    >
      <div className="sr-metric-icon" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div className="sr-metric-info">
        <span className="sr-metric-label">{label}</span>
        <span className="sr-metric-value" style={highlight ? { color } : {}}>{value}</span>
        {hint && clickable && (
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <ChevronRight size={10} /> {hint}
          </span>
        )}
      </div>
    </div>
  );
}

export default SalesReport;
