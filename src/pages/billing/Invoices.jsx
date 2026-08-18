import React, { useState, useEffect } from 'react';
import { Receipt, Search, Package, LayoutGrid, LayoutList, FileText } from 'lucide-react';
import { api } from '../../api';
import Pagination from '../../components/Pagination';
import PremiumLoader from '../../components/PremiumLoader';
import InvoiceTemplate from '../../components/InvoiceTemplate';
import './Invoices.css';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'card'
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await api.getInvoices();
      setInvoices(data);
    } catch (err) {
      console.error('Failed to load invoices:', err.message);
    }
    setLoading(false);
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.id.toString().includes(searchTerm) ||
    (inv.customer_name && inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // ── Detail / Download View ───────────────────────────────────────────────
  if (selectedInvoice) {
    return (
      <InvoiceTemplate
        invoice={selectedInvoice}
        onBack={() => setSelectedInvoice(null)}
        backLabel="Back to History"
      />
    );
  }

  // ── List View ────────────────────────────────────────────────────────────
  return (
    <div className="invoices-layout animate-fade-in">
      <div className="glass-panel invoices-container">

        {/* Header */}
        <div className="invoices-header">
          <div>
            <h2>Invoice History</h2>
            <p className="text-muted">View all past transactions and receipts.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <div className="inv-search-box">
              <Search size={16} className="inv-search-icon" />
              <input
                type="text"
                placeholder="Search by ID or Customer..."
                className="inv-search-input"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            {/* View toggle */}
            <div className="prod-view-toggle">
              <button className={`prod-view-btn ${viewMode === 'list' ? 'prod-view-btn--active' : ''}`}
                onClick={() => setViewMode('list')} title="List view">
                <LayoutList size={15} />
              </button>
              <button className={`prod-view-btn ${viewMode === 'card' ? 'prod-view-btn--active' : ''}`}
                onClick={() => setViewMode('card')} title="Card view">
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Column labels — list only */}
        {!loading && filteredInvoices.length > 0 && viewMode === 'list' && (
          <div className="inv-list-header">
            <span className="inv-col-id">Invoice</span>
            <span className="inv-col-items">Items</span>
            <span className="inv-col-date">Date</span>
            <span className="inv-col-amount">Amount</span>
            <span className="inv-col-action"></span>
          </div>
        )}

        {/* List / Card */}
        {loading ? (
          <div style={{ padding: '3rem 0' }}>
            <PremiumLoader text="Loading Invoices..." />
          </div>
        ) : (
          <>
            {/* ── LIST VIEW ── */}
            {viewMode === 'list' && (
              <div className="invoices-list">
                {filteredInvoices.length === 0 ? (
                  <div className="empty-invoices">
                    <Receipt size={48} className="text-muted" />
                    <p>No invoices found.</p>
                  </div>
                ) : (
                  paginatedInvoices.map(invoice => (
                    <div key={invoice.id} className="inv-row">
                      <div className="inv-col-id">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="inv-id-badge">INV-{invoice.id.toString().padStart(6, '0')}</span>
                          <span className={`qb-pay-badge-sm ${(invoice.payment_method || '').toUpperCase() === 'UPI' ? 'qb-pay-badge--upi' : 'qb-pay-badge--cash'}`}>
                            {(invoice.payment_method || '').toUpperCase() === 'UPI' ? 'UPI' : 'Cash'}
                          </span>
                        </div>
                        <span className="inv-customer-name">{invoice.customer_name || 'Walk-in Customer'}</span>
                      </div>
                      <div className="inv-col-items">
                        <span className="inv-items-chip">
                          <Package size={13} />
                          {invoice.invoice_items?.length || 0} item{invoice.invoice_items?.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="inv-col-date">
                        <span className="inv-date">{new Date(invoice.created_at).toLocaleDateString()}</span>
                        <span className="inv-time">{new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="inv-col-amount">
                        <span className="inv-total">₹{Number(invoice.total_amount).toFixed(2)}</span>
                        {invoice.discount > 0 && <span className="inv-discount-badge">-₹{Number(invoice.discount).toFixed(2)} off</span>}
                      </div>
                      <div className="inv-col-action">
                        <button className="inv-print-btn" onClick={() => setSelectedInvoice(invoice)} title="Download PDF">
                          <Package size={15} /><span>Download</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── CARD VIEW ── */}
            {viewMode === 'card' && (
              <div className="invoices-card-grid">
                {filteredInvoices.length === 0 ? (
                  <div className="empty-invoices" style={{ gridColumn: '1/-1' }}>
                    <Receipt size={48} className="text-muted" />
                    <p>No invoices found.</p>
                  </div>
                ) : (
                  paginatedInvoices.map(invoice => (
                    <div
                      key={invoice.id}
                      className="inv-card"
                      onClick={() => setSelectedInvoice(invoice)}
                      role="button" tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && setSelectedInvoice(invoice)}
                    >
                      <div className="inv-card-top-bar" />
                      <div className="inv-card-body">
                        <div className="inv-card-head">
                          <span className="inv-card-num">INV-{invoice.id.toString().padStart(6, '0')}</span>
                          <span className="inv-items-chip">
                            <Package size={11} />
                            {invoice.invoice_items?.length || 0}
                          </span>
                        </div>
                        <p className="inv-card-customer">{invoice.customer_name || 'Walk-in Customer'}</p>
                        <div className="inv-card-amount">₹{Number(invoice.total_amount).toFixed(2)}</div>
                        {invoice.discount > 0 && (
                          <span className="inv-discount-badge">-₹{Number(invoice.discount).toFixed(2)} off</span>
                        )}
                        <div className="inv-card-footer">
                          <span className="inv-card-date">
                            {new Date(invoice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="inv-card-time">
                            {new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="inv-card-action">
                        <FileText size={14} /> Download PDF
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalItems={filteredInvoices.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Invoices;
