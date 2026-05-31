import React, { useState, useEffect } from 'react';
import { TrendingUp, Receipt, DollarSign, Package, BarChart3, Download, Calendar } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Pagination from '../../components/Pagination';
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
    
    // Convert to ISO with start/end of day to capture full boundaries
    const startIso = startOfDay(new Date(startDate)).toISOString();
    const endIso = endOfDay(new Date(endDate)).toISOString();

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (
          quantity,
          price_at_time,
          product_id,
          products (name)
        )
      `)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: true }); // Ascending so chart goes left-to-right

    if (!error && data) {
      setSalesData([...data].reverse()); // reverse for table display
      calculateMetrics(data);
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
      
      // Aggregate daily sales for chart
      const dateStr = format(new Date(invoice.created_at), 'MMM dd');
      if (!dailySales[dateStr]) {
        dailySales[dateStr] = 0;
      }
      dailySales[dateStr] += amount;

      if (invoice.invoice_items) {
        invoice.invoice_items.forEach(item => {
          itemsCount += item.quantity;
          
          const pName = item.products?.name || 'Unknown Product';
          if (!productSales[pName]) {
            productSales[pName] = { qty: 0, revenue: 0 };
          }
          productSales[pName].qty += item.quantity;
          productSales[pName].revenue += (item.quantity * item.price_at_time);
        });
      }
    });

    setTotalRevenue(rev);
    setTotalInvoices(data.length);
    setTotalItemsSold(itemsCount);

    // Format chart data
    const chartArray = Object.keys(dailySales).map(date => ({
      date,
      revenue: dailySales[date]
    }));
    setChartData(chartArray);

    // Sort products by revenue
    const sortedProducts = Object.entries(productSales)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5); // Top 5
      
    setTopProducts(sortedProducts);
  };

  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Invoice ID,Customer,Total Amount (INR),Discount (INR)\n";
    
    salesData.forEach(inv => {
      const date = new Date(inv.created_at).toLocaleDateString();
      const id = `INV-${inv.id}`;
      const customer = inv.customer_name || 'Walk-in';
      const amount = inv.total_amount;
      const discount = inv.discount || 0;
      csvContent += `${date},${id},${customer},${amount},${discount}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip glass-panel">
          <p className="label">{`${label}`}</p>
          <p className="intro font-bold text-success">
            {`₹${payload[0].value.toFixed(2)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="report-layout animate-fade-in">
      <header className="report-header glass-panel">
        <div className="header-left">
          <h2>Sales & Analytics Report</h2>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="date-filters">
            <div className="date-input-wrap">
              <Calendar size={16} className="text-muted" />
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="input-field date-input"
              />
            </div>
            <span className="text-muted">to</span>
            <div className="date-input-wrap">
              <Calendar size={16} className="text-muted" />
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="input-field date-input"
              />
            </div>
          </div>
          <button className="btn btn-primary" onClick={exportCSV}>
            <Download size={18} /> Export CSV
          </button>
        </div>
      </header>

      <main className="report-main">
        {loading ? (
          <div className="flex-center" style={{ height: '50vh' }}>
            <div className="loader"></div>
          </div>
        ) : (
          <>
            <div className="metrics-grid">
              <div className="metric-card glass-panel">
                <div className="metric-icon success">
                  <DollarSign size={24} />
                </div>
                <div className="metric-info">
                  <p className="metric-label">Filtered Revenue</p>
                  <h3 className="metric-value">₹{totalRevenue.toFixed(2)}</h3>
                </div>
              </div>

              <div className="metric-card glass-panel">
                <div className="metric-icon">
                  <Receipt size={24} />
                </div>
                <div className="metric-info">
                  <p className="metric-label">Invoices Count</p>
                  <h3 className="metric-value">{totalInvoices}</h3>
                </div>
              </div>
              
              <div className="metric-card glass-panel">
                <div className="metric-icon warning">
                  <TrendingUp size={24} />
                </div>
                <div className="metric-info">
                  <p className="metric-label">Average Order Value</p>
                  <h3 className="metric-value">
                    ₹{totalInvoices > 0 ? (totalRevenue / totalInvoices).toFixed(2) : '0.00'}
                  </h3>
                </div>
              </div>

              <div className="metric-card glass-panel">
                <div className="metric-icon primary">
                  <Package size={24} />
                </div>
                <div className="metric-info">
                  <p className="metric-label">Items Sold</p>
                  <h3 className="metric-value">{totalItemsSold}</h3>
                </div>
              </div>
            </div>

            {/* CHART SECTION */}
            <div className="report-section glass-panel mb-4">
              <div className="section-header">
                <h3>Revenue Over Time</h3>
              </div>
              <div className="chart-container" style={{ width: '100%', height: '300px' }}>
                {chartData.length === 0 ? (
                  <div className="flex-center text-muted h-100">No data available for this date range.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis dataKey="date" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
                      <YAxis stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} tickFormatter={(value) => `₹${value}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="report-content-grid">
              <div className="report-section glass-panel">
                <div className="section-header">
                  <h3><BarChart3 size={20} /> Top Selling Products</h3>
                </div>
                {topProducts.length === 0 ? (
                  <p className="text-muted">No sales data yet.</p>
                ) : (
                  <div className="top-products-list">
                    {topProducts.map((p, idx) => (
                      <div key={idx} className="top-product-item">
                        <div className="tp-info">
                          <h4>{p.name}</h4>
                          <p>{p.qty} units sold</p>
                        </div>
                        <div className="tp-revenue">
                          ₹{p.revenue.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="report-section glass-panel">
                <div className="section-header">
                  <h3>Filtered Sales Transactions</h3>
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
                        <tr><td colSpan="5" className="text-center text-muted">No transactions found</td></tr>
                      ) : (
                        salesData
                          .slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE)
                          .map(inv => (
                          <tr key={inv.id}>
                            <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                            <td className="font-medium">INV-{inv.id.toString().padStart(6, '0')}</td>
                            <td>{inv.customer_name || 'Walk-in'}</td>
                            <td className="text-right text-error">{inv.discount > 0 ? `-₹${inv.discount.toFixed(2)}` : '-'}</td>
                            <td className="text-right font-medium text-success">₹{Number(inv.total_amount).toFixed(2)}</td>
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
