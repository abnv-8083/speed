import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Receipt, DollarSign, Package,
  BarChart3, Download, Calendar, ArrowRight, Plus, Trash2,
  Edit2, Check, X, AlertTriangle, Wallet, PieChart, Activity,
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

  // Transactions pagination
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

  // ── Computed metrics ─────────────────────────────────────────
  const metrics = useMemo(() => {
    const revenue    = salesData.reduce((s, inv) => s + Number(inv.total_amount), 0);
    const discounts  = salesData.reduce((s, inv) => s + Number(inv.discount || 0), 0);
    const totalExp   = expenses.reduce((s, e) => s + Number(e.amount), 0);

    // COGS from invoice items (price_at_time is selling price; we don't store cost in items)
    // Gross profit = revenue (after discounts)
    const grossProfit = revenue;   // no COGS data at item level
    const netProfit   = grossProfit - totalExp;
    const profitPct   = revenue > 0 ? (netProfit / revenue) * 100 : 0;

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
      revenue, discounts, totalExp, grossProfit, netProfit, profitPct,
      itemsCount, invoiceCount: salesData.length,
      avgOrder: salesData.length > 0 ? revenue / salesData.length : 0,
      chartData, expPieData, topProducts,
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
    csv += 'Type,Date,Reference,Description,Amount\n';
    salesData.forEach(inv => {
      csv += `Revenue,${new Date(inv.created_at).toLocaleDateString()},INV-${String(inv.id).slice(-6)},${inv.customer_name || 'Walk-in'},${inv.total_amount}\n`;
    });
    expenses.forEach(e => {
      csv += `Expense,${e.expense_date},EXP,${e.title} (${e.category}),${e.amount}\n`;
    });
    const a = document.createElement('a');
    a.setAttribute('href', encodeURI(csv));
    a.setAttribute('download', `report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const isProfit = metrics.netProfit >= 0;

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
            <Download size={15} /> Export
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
                  label={isProfit ? 'Net Profit' : 'Net Loss'}
                  value={`₹${Math.abs(metrics.netProfit).toFixed(2)}`}
                  accent={isProfit ? 'success' : 'danger'}
                  icon={isProfit ? <TrendingUp size={18}/> : <TrendingDown size={18}/>}
                  highlight
                />
                <MetricCard label="Profit Margin" value={`${metrics.profitPct.toFixed(1)}%`}
                  accent={metrics.profitPct >= 0 ? 'success' : 'danger'} icon={<PieChart size={18}/>} />
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
                <div className="sr-chart-header">
                  <h3>Sales Transactions</h3>
                </div>
                <div className="table-responsive">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Invoice</th>
                        <th>Customer</th>
                        <th className="text-right">Discount</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.length === 0 ? (
                        <tr><td colSpan="5" className="table-empty-cell">No transactions found.</td></tr>
                      ) : (
                        salesData
                          .slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE)
                          .map((inv, idx) => (
                            <tr key={inv.id} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                              <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                              <td className="inv-id-cell">INV-{String(inv.id).slice(-6).padStart(6,'0')}</td>
                              <td>{inv.customer_name || 'Walk-in'}</td>
                              <td className="text-right text-error">{inv.discount > 0 ? `-₹${Number(inv.discount).toFixed(2)}` : '—'}</td>
                              <td className="text-right text-success font-bold">₹{Number(inv.total_amount).toFixed(2)}</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                  <Pagination currentPage={tablePage} totalItems={salesData.length}
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
    </div>
  );
};

// ── Metric card sub-component ─────────────────────────────────
function MetricCard({ label, value, accent, icon, highlight }) {
  const accentColors = {
    success: 'var(--secondary)',
    danger:  '#f87171',
    primary: 'var(--primary)',
    warning: '#f59e0b',
    neutral: '#64748b',
  };
  const color = accentColors[accent] || accentColors.neutral;
  return (
    <div className={`sr-metric glass-panel ${highlight ? 'sr-metric--highlight' : ''}`}
      style={{ borderLeftColor: color }}>
      <div className="sr-metric-icon" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div className="sr-metric-info">
        <span className="sr-metric-label">{label}</span>
        <span className="sr-metric-value" style={highlight ? { color } : {}}>{value}</span>
      </div>
    </div>
  );
}

export default SalesReport;
