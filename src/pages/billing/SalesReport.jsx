import React, { useState, useEffect } from 'react';
import { TrendingUp, Receipt, DollarSign, Package, BarChart3, Download, Calendar, ArrowRight } from 'lucide-react';
import { api } from '../../api';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Pagination from '../../components/Pagination';
import PremiumLoader from '../../components/PremiumLoader';
import './SalesReport.css';

const SalesReport = () => {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);

  // Date Filters
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Metrics
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [totalItemsSold, setTotalItemsSold] = useState(0);
  const [topProducts, setTopProducts] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 10;

  useEffect(() => {
    fetchSalesData();
  }, [startDate, endDate]);

  const fetchSalesData = async () => {
    setLoading(true);
    const startIso = startOfDay(new Date(startDate)).toISOString();
    const endIso   = endOfDay(new Date(endDate)).toISOString();

    try {
      const data = await api.getInvoices({ start: startIso, end: endIso });
      // API returns newest-first; chart needs oldest-first so reverse a copy
      const ascending = [...data].reverse();
      setSalesData(data);
      calculateMetrics(ascending);
    } catch (err) {
      console.error('Failed to load sales data:', err.message);
    }
    setLoading(false);
  };

  const calculateMetrics = (data) => {
    let rev = 0;
    let itemsCount = 0;
    const productSales = {};
    const dailySales = {};

    data.forEach(invoice => {
      const amount = Number(invoice.total_amount);
      rev += amount;

      const dateStr = format(new Date(invoice.created_at), 'MMM dd');
      dailySales[dateStr] = (dailySales[dateStr] || 0) + amount;

      if (invoice.invoice_items) {
        invoice.invoice_items.forEach(item => {
          itemsCount += item.quantity;
          const pName = item.products?.name || 'Unknown Product';
          if (!productSales[pName]) productSales[pName] = { qty: 0, revenue: 0 };
          productSales[pName].qty += item.quantity;
          productSales[pName].revenue += item.quantity * item.price_at_time;
        });
      }
    });

    setTotalRevenue(rev);
    setTotalInvoices(data.length);
    setTotalItemsSold(itemsCount);
    setChartData(Object.keys(dailySales).map(date => ({ date, revenue: dailySales[date] })));
    setTopProducts(
      Object.entries(productSales)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
    );
  };

  const exportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Date,Invoice ID,Customer,Total Amount (INR),Discount (INR)\n';
    salesData.forEach(inv => {
      csvContent += `${new Date(inv.created_at).toLocaleDateString()},INV-${inv.id},${inv.customer_name || 'Walk-in'},${inv.total_amount},${inv.discount || 0}\n`;
    });
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `sales_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip glass-panel">
          <p className="chart-tooltip-label">{label}</p>
          <p className="chart-tooltip-value">₹{payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="report-layout animate-fade-in">

      {/* ── Sticky Header ── */}
      <header className="report-header glass-panel">
        <div className="report-header-left">
          <h2>Sales &amp; Analytics</h2>
          <p className="report-subtitle">
            {format(new Date(startDate), 'MMM d')} – {format(new Date(endDate), 'MMM d, yyyy')}
          </p>
        </div>

        <div className="report-header-right">
          {/* Date filter pill */}
          <div className="date-filter-pill">
            <Calendar size={14} className="date-pill-icon" />
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="date-pill-input"
              aria-label="Start date"
            />
            <ArrowRight size={13} className="date-pill-sep" />
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="date-pill-input"
              aria-label="End date"
            />
          </div>

          <button className="btn btn-primary" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="report-main">
        {loading ? (
          <div className="report-loader">
            <PremiumLoader text="Crunching Data..." />
          </div>
        ) : (
          <>
            {/* ── Metric Cards ── */}
            <div className="metrics-grid">
              <div className="metric-card glass-panel metric-success">
                <div className="metric-icon-wrap">
                  <DollarSign size={20} />
                </div>
                <div className="metric-info">
                  <p className="metric-label">Revenue</p>
                  <h3 className="metric-value">₹{totalRevenue.toFixed(2)}</h3>
                </div>
              </div>

              <div className="metric-card glass-panel metric-primary">
                <div className="metric-icon-wrap">
                  <Receipt size={20} />
                </div>
                <div className="metric-info">
                  <p className="metric-label">Invoices</p>
                  <h3 className="metric-value">{totalInvoices}</h3>
                </div>
              </div>

              <div className="metric-card glass-panel metric-warning">
                <div className="metric-icon-wrap">
                  <TrendingUp size={20} />
                </div>
                <div className="metric-info">
                  <p className="metric-label">Avg. Order</p>
                  <h3 className="metric-value">
                    ₹{totalInvoices > 0 ? (totalRevenue / totalInvoices).toFixed(2) : '0.00'}
                  </h3>
                </div>
              </div>

              <div className="metric-card glass-panel metric-neutral">
                <div className="metric-icon-wrap">
                  <Package size={20} />
                </div>
                <div className="metric-info">
                  <p className="metric-label">Items Sold</p>
                  <h3 className="metric-value">{totalItemsSold}</h3>
                </div>
              </div>
            </div>

            {/* ── Revenue Chart ── */}
            <div className="report-section glass-panel mb-4">
              <div className="section-header">
                <h3>Revenue Over Time</h3>
              </div>
              <div style={{ width: '100%', height: '280px' }}>
                {chartData.length === 0 ? (
                  <div className="chart-empty">No data for this date range.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                      <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                      <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={v => `₹${v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="var(--primary)"
                        strokeWidth={3}
                        dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ── Bottom grid: top products + transactions table ── */}
            <div className="report-content-grid">

              {/* Top Products */}
              <div className="report-section glass-panel">
                <div className="section-header">
                  <h3><BarChart3 size={17} /> Top Products</h3>
                </div>
                {topProducts.length === 0 ? (
                  <p className="text-muted">No sales data yet.</p>
                ) : (
                  <div className="top-products-list">
                    {topProducts.map((p, idx) => (
                      <div key={idx} className="tp-row">
                        <span className="tp-rank">#{idx + 1}</span>
                        <div className="tp-info">
                          <span className="tp-name">{p.name}</span>
                          <span className="tp-units">{p.qty} units sold</span>
                        </div>
                        <span className="tp-revenue">₹{p.revenue.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Transactions Table */}
              <div className="report-section glass-panel">
                <div className="section-header">
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
                        <tr>
                          <td colSpan="5" className="table-empty-cell">No transactions found.</td>
                        </tr>
                      ) : (
                        salesData
                          .slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE)
                          .map((inv, rowIdx) => (
                            <tr key={inv.id} className={rowIdx % 2 === 0 ? 'row-even' : 'row-odd'}>
                              <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                              <td className="inv-id-cell">INV-{inv.id.toString().padStart(6, '0')}</td>
                              <td>{inv.customer_name || 'Walk-in'}</td>
                              <td className="text-right text-error">
                                {inv.discount > 0 ? `-₹${Number(inv.discount).toFixed(2)}` : '—'}
                              </td>
                              <td className="text-right text-success font-bold">
                                ₹{Number(inv.total_amount).toFixed(2)}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                  <Pagination
                    currentPage={tablePage}
                    totalItems={salesData.length}
                    itemsPerPage={TABLE_PAGE_SIZE}
                    onPageChange={setTablePage}
                  />
                </div>
              </div>

            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default SalesReport;
