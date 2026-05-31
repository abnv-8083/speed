import React, { useState, useEffect } from 'react';
import { Receipt, Search, Loader2, Printer, ArrowLeft, FileDown } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import Pagination from '../../components/Pagination';
import './Invoices.css';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (
          quantity,
          price_at_time,
          products ( name )
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvoices(data);
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
    setCurrentPage(1); // reset to page 1 on new search
  };

  const deductAndPrint = async (printType) => {
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('is_print', true)
      .ilike('name', `%${printType}%`);

    if (products && products.length > 0) {
      const printProduct = products[0];
      if (printProduct.stock > 0) {
        await supabase
          .from('products')
          .update({ stock: printProduct.stock - 1 })
          .eq('id', printProduct.id);
      }
    }
    
    window.print();
  };

  if (selectedInvoice) {
    // Calculate subtotal from total + discount
    const discount = selectedInvoice.discount || 0;
    const subtotal = selectedInvoice.total_amount + discount;

    return (
      <div className="pos-invoice-container animate-fade-in" style={{ height: '100%' }}>
        <div className="invoice-actions no-print">
          <button className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>
            <ArrowLeft size={18} /> Back to History
          </button>
          <button className="btn btn-primary" onClick={() => deductAndPrint('B&W')}>
            <Printer size={18} /> Print (B&W)
          </button>
          <button className="btn btn-primary" style={{ background: 'var(--secondary)' }} onClick={() => deductAndPrint('Color')}>
            <Printer size={18} /> Print (Color)
          </button>
        </div>
        
        <div className="a5-invoice-wrapper glass-panel">
          <div className="a5-invoice">
            <div className="invoice-header">
              <div className="invoice-branding">
                <div className="invoice-logo">S@N</div>
                <div className="invoice-company">
                  <h2>Speed@net CRM</h2>
                  <p>123 Business Avenue, Tech District</p>
                  <p>Phone: +1 234 567 8900 | Email: contact@speednet.com</p>
                </div>
              </div>
              <div className="invoice-title">
                <h1>INVOICE</h1>
              </div>
            </div>
            
            <div className="invoice-details">
              <div className="invoice-to">
                <h3>Billed To:</h3>
                <p>{selectedInvoice.customer_name || 'Walk-in Customer'}</p>
              </div>
              <div className="invoice-meta">
                <div className="meta-row">
                  <span className="meta-label">Invoice No:</span>
                  <span className="meta-value">INV-{selectedInvoice.id.toString().padStart(6, '0')}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Date:</span>
                  <span className="meta-value">{new Date(selectedInvoice.created_at).toLocaleDateString()}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Time:</span>
                  <span className="meta-value">{new Date(selectedInvoice.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
            </div>
            
            <table className="invoice-table">
              <thead>
                <tr>
                  <th className="text-left">Description</th>
                  <th className="text-center">Qty</th>
                  <th className="text-right">Unit Price</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.invoice_items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="text-left font-medium">{item.products?.name}</td>
                    <td className="text-center text-muted">{item.quantity}</td>
                    <td className="text-right text-muted">₹{Number(item.price_at_time).toFixed(2)}</td>
                    <td className="text-right font-medium">₹{(item.quantity * item.price_at_time).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="invoice-summary-box">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="summary-row">
                  <span>Discount</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Tax (0%)</span>
                <span>₹0.00</span>
              </div>
              <div className="summary-row total-row">
                <span>Total Amount</span>
                <span>₹{Number(selectedInvoice.total_amount).toFixed(2)}</span>
              </div>
            </div>
            
            <div className="invoice-footer">
              <p className="thank-you">Thank you for your business!</p>
              <p className="terms">Terms & Conditions: Goods once sold will not be taken back. Subject to local jurisdiction.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="invoices-layout animate-fade-in">
      <div className="glass-panel invoices-container">
        <div className="invoices-header">
          <div>
            <h2>Invoice History</h2>
            <p className="text-muted">View all past transactions and receipts.</p>
          </div>
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by ID or Customer..." 
              className="input-field" 
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : (
          <>
            <div className="invoices-grid">
              {filteredInvoices.length === 0 ? (
                <div className="empty-invoices">
                  <Receipt size={48} className="text-muted" />
                  <p>No invoices found.</p>
                </div>
              ) : (
                paginatedInvoices.map(invoice => (
                  <div key={invoice.id} className="invoice-card">
                    <div className="invoice-card-header">
                      <div className="inv-title">
                        <h4>INV-{invoice.id.toString().padStart(6, '0')}</h4>
                        {invoice.customer_name && <p className="inv-customer">{invoice.customer_name}</p>}
                      </div>
                      <span className="date">{new Date(invoice.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="invoice-items-summary">
                      <p>{invoice.invoice_items?.length || 0} items purchased</p>
                      <ul className="items-preview">
                        {invoice.invoice_items?.slice(0, 2).map((item, idx) => (
                          <li key={idx}>{item.quantity}x {item.products?.name}</li>
                        ))}
                        {invoice.invoice_items?.length > 2 && (
                          <li>...and {invoice.invoice_items.length - 2} more</li>
                        )}
                      </ul>
                    </div>

                    <div className="invoice-card-footer">
                      <div className="amount-col">
                        <span className="amount-label">Total Amount</span>
                        <span className="total-amount">₹{Number(invoice.total_amount).toFixed(2)}</span>
                      </div>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <Printer size={16} /> Print / PDF
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
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
