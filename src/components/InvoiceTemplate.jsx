import React, { useRef } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import './InvoiceTemplate.css';

/**
 * Shared invoice template — POS (after checkout) and Invoices (history).
 *
 * Props:
 *  invoice   — normalised invoice object (POS or DB shape)
 *  onBack    — callback for Back button
 *  backLabel — button label (default "Back")
 */
const InvoiceTemplate = ({ invoice, onBack, backLabel = 'Back' }) => {
  const paperRef = useRef(null);

  // ── Normalise from POS cart shape or DB shape ─────────────────
  const id           = invoice.id;
  const customerName = invoice.customer_name || invoice.customerName || 'Walk-in Customer';
  const totalAmount  = Number(invoice.total_amount ?? invoice.total ?? 0);
  const discount     = Number(invoice.discount || 0);
  const subtotal     = invoice.subtotal != null
    ? Number(invoice.subtotal)
    : totalAmount + discount;
  const createdAt    = invoice.created_at
    ? new Date(invoice.created_at)
    : (invoice.date instanceof Date ? invoice.date : new Date());

  const items = (invoice.invoice_items || invoice.items || []).map(item => {
    if (item.product) {
      return {
        name:      item.product.name,
        qty:       item.quantity,
        unitPrice: Number(item.product.price),
        lineTotal: Number(item.total),
      };
    }
    return {
      name:      item.products?.name || '—',
      qty:       item.quantity,
      unitPrice: Number(item.price_at_time),
      lineTotal: item.quantity * Number(item.price_at_time),
    };
  });

  const invNumber = `INV-${String(id).slice(-6).toUpperCase()}`;
  const dateStr   = createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr   = createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ── PDF via html2pdf.js ───────────────────────────────────────
  const handleDownloadPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const el = paperRef.current;
    if (!el) return;

    // Temporarily force the exact pixel width html2pdf will render at
    // A5 = 148 x 210 mm  →  at 96 dpi scale=2: 559 × 794 px
    el.style.width = '559px';

    await html2pdf()
      .set({
        margin:      0,
        filename:    `${invNumber}.pdf`,
        image:       { type: 'jpeg', quality: 1 },
        html2canvas: {
          scale:           2,
          useCORS:         true,
          backgroundColor: '#ffffff',
          width:           559,
          windowWidth:     559,
        },
        jsPDF: {
          unit:        'mm',
          format:      'a5',
          orientation: 'portrait',
        },
      })
      .from(el)
      .save();

    el.style.width = '';   // restore
  };

  return (
    <div className="inv-root animate-fade-in">

      {/* ── Action bar ── */}
      <div className="inv-actions no-print">
        <button className="inv-back-btn" onClick={onBack}>
          <ArrowLeft size={15} /> {backLabel}
        </button>
        <button className="inv-dl-btn" onClick={handleDownloadPDF}>
          <Download size={15} /> Download PDF
        </button>
      </div>

      {/* ── A5 paper ── */}
      <div className="inv-shadow-wrap">
        <div className="inv-paper" ref={paperRef}>

          {/* Header */}
          <div className="inv-header">
            <div className="inv-brand">
              <div className="inv-logo">S@N</div>
              <div className="inv-brand-text">
                <div className="inv-brand-name">Speed@net</div>
                <div className="inv-brand-sub">CRM &amp; Business Portal</div>
              </div>
            </div>
            <div className="inv-title-block">
              <div className="inv-title-word">INVOICE</div>
              <div className="inv-title-num">{invNumber}</div>
            </div>
          </div>

          {/* Bill-to + meta */}
          <div className="inv-meta">
            <div className="inv-billed-to">
              <div className="inv-meta-label">BILLED TO</div>
              <div className="inv-customer">{customerName}</div>
            </div>
            <div className="inv-meta-right">
              <div className="inv-meta-row">
                <span className="inv-meta-key">Date</span>
                <span className="inv-meta-val">{dateStr}</span>
              </div>
              <div className="inv-meta-row">
                <span className="inv-meta-key">Time</span>
                <span className="inv-meta-val">{timeStr}</span>
              </div>
              <div className="inv-meta-row">
                <span className="inv-meta-key">Status</span>
                <span className="inv-paid-chip">Paid</span>
              </div>
            </div>
          </div>

          {/* Items table */}
          <table className="inv-table">
            <thead>
              <tr>
                <th className="inv-th inv-th-desc">Description</th>
                <th className="inv-th inv-th-qty">Qty</th>
                <th className="inv-th inv-th-up">Unit Price</th>
                <th className="inv-th inv-th-tot">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? 'inv-tr-even' : 'inv-tr-odd'}>
                  <td className="inv-td inv-td-desc">{item.name}</td>
                  <td className="inv-td inv-td-qty">{item.qty}</td>
                  <td className="inv-td inv-td-up">₹{item.unitPrice.toFixed(2)}</td>
                  <td className="inv-td inv-td-tot">₹{item.lineTotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Spacer pushes summary to bottom */}
          <div className="inv-spacer" />

          {/* Summary */}
          <div className="inv-summary-wrap">
            <div className="inv-summary">
              <div className="inv-sum-row">
                <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="inv-sum-row inv-sum-disc">
                  <span>Discount</span><span>−₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="inv-sum-row">
                <span>Tax (0%)</span><span>₹0.00</span>
              </div>
              <div className="inv-sum-total">
                <span>Total Amount</span><span>₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="inv-footer">
            <div className="inv-thankyou">Thank you for your business!</div>
            <div className="inv-terms">
              Goods once sold will not be taken back or exchanged. Subject to local jurisdiction.
            </div>
            <div className="inv-footer-contact">
              Speed@net · contact@speednet.com · +91 98765 43210
            </div>
          </div>

        </div>{/* /inv-paper */}
      </div>

    </div>
  );
};

export default InvoiceTemplate;
