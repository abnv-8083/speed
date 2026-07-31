import React, { useRef } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import './InvoiceTemplate.css';

/**
 * Shared invoice template used by both POS (after checkout) and Invoices (history view).
 *
 * Props:
 *  invoice — { id, customer_name | customerName, total_amount | total,
 *               discount, created_at | date, invoice_items | items }
 *  onBack  — callback for the Back button
 *  backLabel — button label (default "Back")
 */
const InvoiceTemplate = ({ invoice, onBack, backLabel = 'Back' }) => {
  const printRef = useRef(null);

  // ── Normalise data shape from both POS and Invoices ───────────
  const id           = invoice.id;
  const customerName = invoice.customer_name || invoice.customerName || 'Walk-in Customer';
  const totalAmount  = Number(invoice.total_amount ?? invoice.total ?? 0);
  const discount     = Number(invoice.discount || 0);
  const subtotal     = invoice.subtotal != null ? Number(invoice.subtotal) : totalAmount + discount;
  const createdAt    = invoice.created_at ? new Date(invoice.created_at) : (invoice.date || new Date());

  // Items can be either POS cart items or DB invoice_items
  const items = (invoice.invoice_items || invoice.items || []).map(item => {
    if (item.product) {
      // POS cart item shape
      return {
        name:      item.product.name,
        qty:       item.quantity,
        unitPrice: Number(item.product.price),
        total:     Number(item.total),
      };
    }
    // DB invoice_item shape
    return {
      name:      item.products?.name || '—',
      qty:       item.quantity,
      unitPrice: Number(item.price_at_time),
      total:     item.quantity * Number(item.price_at_time),
    };
  });

  const invNumber = `INV-${String(id).slice(-6).padStart(6, '0')}`;

  // ── PDF download via html2pdf.js ──────────────────────────────
  const handleDownloadPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const element  = printRef.current;
    if (!element) return;

    const opt = {
      margin:      [8, 8, 8, 8],          // mm
      filename:    `${invNumber}.pdf`,
      image:       { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF:       { unit: 'mm', format: 'a5', orientation: 'portrait' },
      pagebreak:   { mode: 'avoid-all' },
    };

    await html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="inv-tpl-root animate-fade-in">
      {/* Action bar */}
      <div className="inv-tpl-actions no-print">
        <button className="inv-tpl-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> {backLabel}
        </button>
        <button className="inv-tpl-dl-btn" onClick={handleDownloadPDF}>
          <Download size={16} /> Download PDF
        </button>
      </div>

      {/* Paper */}
      <div className="inv-tpl-paper-wrap">
        <div className="inv-tpl-paper" ref={printRef}>

          {/* ── Header band ── */}
          <div className="inv-tpl-header-band">
            <div className="inv-tpl-logo-block">
              <div className="inv-tpl-logo">S@N</div>
              <div>
                <div className="inv-tpl-company-name">Speed@net</div>
                <div className="inv-tpl-company-sub">CRM &amp; Business Portal</div>
              </div>
            </div>
            <div className="inv-tpl-title-block">
              <div className="inv-tpl-title-word">INVOICE</div>
              <div className="inv-tpl-inv-number">{invNumber}</div>
            </div>
          </div>

          {/* ── Bill-to + meta ── */}
          <div className="inv-tpl-meta-row">
            <div className="inv-tpl-bill-to">
              <div className="inv-tpl-section-label">Billed To</div>
              <div className="inv-tpl-customer">{customerName}</div>
            </div>
            <div className="inv-tpl-dates">
              <div className="inv-tpl-date-row">
                <span className="inv-tpl-date-label">Date</span>
                <span className="inv-tpl-date-val">{createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="inv-tpl-date-row">
                <span className="inv-tpl-date-label">Time</span>
                <span className="inv-tpl-date-val">{createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="inv-tpl-date-row">
                <span className="inv-tpl-date-label">Status</span>
                <span className="inv-tpl-status-chip">Paid</span>
              </div>
            </div>
          </div>

          {/* ── Items table ── */}
          <table className="inv-tpl-table">
            <thead>
              <tr>
                <th className="inv-tpl-th inv-tpl-th-desc">Description</th>
                <th className="inv-tpl-th inv-tpl-th-qty">Qty</th>
                <th className="inv-tpl-th inv-tpl-th-price">Unit Price</th>
                <th className="inv-tpl-th inv-tpl-th-total">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'inv-tpl-tr-even' : 'inv-tpl-tr-odd'}>
                  <td className="inv-tpl-td inv-tpl-td-desc">{item.name}</td>
                  <td className="inv-tpl-td inv-tpl-td-qty">{item.qty}</td>
                  <td className="inv-tpl-td inv-tpl-td-price">₹{item.unitPrice.toFixed(2)}</td>
                  <td className="inv-tpl-td inv-tpl-td-total">₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Summary ── */}
          <div className="inv-tpl-summary-wrap">
            <div className="inv-tpl-summary">
              <div className="inv-tpl-sum-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="inv-tpl-sum-row inv-tpl-sum-discount">
                  <span>Discount</span>
                  <span>− ₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="inv-tpl-sum-row">
                <span>Tax</span>
                <span>₹0.00</span>
              </div>
              <div className="inv-tpl-sum-total">
                <span>Total Amount</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="inv-tpl-footer">
            <div className="inv-tpl-thankyou">Thank you for your business!</div>
            <div className="inv-tpl-terms">
              Terms &amp; Conditions: Goods once sold will not be taken back or exchanged. Subject to local jurisdiction.
            </div>
            <div className="inv-tpl-footer-brand">Speed@net · contact@speednet.com · +91 98765 43210</div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplate;
