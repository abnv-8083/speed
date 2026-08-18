import React, { useRef } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { format } from 'date-fns';
import './InvoiceTemplate.css';

/**
 * Shared invoice/receipt template matching the Speed@Net Online Javasevana format.
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
        qty:       Number(item.quantity),
        unitPrice: Number(item.product.price),
        lineTotal: Number(item.total),
      };
    }
    return {
      name:      item.products?.name || item.product_name || '—',
      qty:       Number(item.quantity),
      unitPrice: Number(item.price_at_time ?? item.price ?? 0),
      lineTotal: Number(item.line_total ?? (Number(item.quantity) * Number(item.price_at_time ?? item.price ?? 0))),
    };
  });

  const invNumber = `INV-${String(id).slice(-6).padStart(6, '0')}`;
  let dateStr = '';
  try {
    dateStr = format(createdAt, 'dd-MMM-yyyy');
  } catch (e) {
    dateStr = createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const formatCurrency = (num) => {
    return Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // ── PDF via html2pdf.js ───────────────────────────────────────
  const handleDownloadPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const el = paperRef.current;
    if (!el) return;

    el.style.width = '559px';
    el.style.height = '790px';

    await html2pdf()
      .set({
        margin:      0,
        filename:    `Receipt_${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.pdf`,
        image:       { type: 'jpeg', quality: 1 },
        html2canvas: {
          scale:           2,
          useCORS:         true,
          backgroundColor: '#ffffff',
          width:           559,
          height:          790,
          windowWidth:     559,
          windowHeight:    790,
          scrollY:         0,
        },
        jsPDF: {
          unit:        'mm',
          format:      'a5',
          orientation: 'portrait',
        },
        pagebreak: { mode: 'avoid-all' },
      })
      .from(el)
      .save();

    el.style.width = '';
    el.style.height = '';
  };

  const advance      = Number(invoice.advance || 0);

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

      {/* ── A5 paper with global margin ── */}
      <div className="inv-shadow-wrap">
        <div className="rcpt-page" ref={paperRef}>
          <div className="rcpt-box">

            {/* ── Header ── */}
            <div className="rcpt-header">
              <div className="rcpt-brand">Speed@Net</div>
              <div className="rcpt-title">ONLINE JAVASEVANA</div>
              <div className="rcpt-address">Mullassery Building, GA College PO, Palazhi, Kozhikode 673014</div>
              <div className="rcpt-contact">Email: speedatnet328@gmail.com, Ph: 0495 3576610, 7356598850</div>
              <div className="rcpt-pill-wrap">
                <div className="rcpt-pill">Receipt</div>
              </div>
            </div>

            {/* ── Meta (Date & To) ── */}
            <div className="rcpt-meta-section">
              <div className="rcpt-date-row">
                <span className="rcpt-meta-label">Date:</span>
                <span className="rcpt-meta-value">{dateStr}</span>
              </div>
              <div className="rcpt-to-row">
                <span className="rcpt-meta-label rcpt-to-tag">To:</span>
                <span className="rcpt-to-name">{customerName.toUpperCase()}</span>
              </div>
            </div>

            {/* ── Table Container ── */}
            <div className="rcpt-table-container">
              {/* Continuous full-height vertical column guide lines */}
              <div className="rcpt-col-line rcpt-line-1" />
              <div className="rcpt-col-line rcpt-line-2" />
              <div className="rcpt-col-line rcpt-line-3" />
              <div className="rcpt-col-line rcpt-line-4" />

              <table className="rcpt-table">
                <thead>
                  <tr>
                    <th className="rcpt-th-sino">SI NO</th>
                    <th className="rcpt-th-desc">DISCRIPTION</th>
                    <th className="rcpt-th-price">UNIT PRICE</th>
                    <th className="rcpt-th-qty">QTY</th>
                    <th className="rcpt-th-amount">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="rcpt-tr-item">
                      <td className="rcpt-td-sino">{idx + 1}</td>
                      <td className="rcpt-td-desc">{item.name}</td>
                      <td className="rcpt-td-price">
                        <span className="rcpt-curr-sym">₹</span>
                        <span className="rcpt-val-text">{item.unitPrice.toFixed(2)}</span>
                      </td>
                      <td className="rcpt-td-qty">{item.qty.toFixed(2)}</td>
                      <td className="rcpt-td-amount">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Totals Section ── */}
            <div className="rcpt-totals-section">
              <div className="rcpt-totals-left"></div>
              <div className="rcpt-totals-right">
                <div className="rcpt-total-row">
                  <span className="rcpt-total-label">Total</span>
                  <span className="rcpt-total-sym">₹</span>
                  <span className="rcpt-total-val">{formatCurrency(subtotal)}</span>
                </div>
                <div className="rcpt-total-row">
                  <span className="rcpt-total-label">Advance</span>
                  <span className="rcpt-total-sym">₹</span>
                  <span className="rcpt-total-val">{advance > 0 ? formatCurrency(advance) : '-'}</span>
                </div>
                <div className="rcpt-total-row">
                  <span className="rcpt-total-label">Discount</span>
                  <span className="rcpt-total-sym">₹</span>
                  <span className="rcpt-total-val">{discount > 0 ? formatCurrency(discount) : '-'}</span>
                </div>
                <div className="rcpt-total-row rcpt-total-grand">
                  <span className="rcpt-total-label">Grand Total</span>
                  <span className="rcpt-total-sym">₹</span>
                  <span className="rcpt-total-val">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* ── Footer / Bank Details & Signatory ── */}
            <div className="rcpt-footer">
              <div className="rcpt-footer-left">
                <div className="rcpt-bank-row">
                  <span className="rcpt-bank-lbl">Google Pay</span>
                  <span className="rcpt-bank-sep">:</span>
                  <span className="rcpt-bank-val">9961206583</span>
                </div>
                <div className="rcpt-bank-row">
                  <span className="rcpt-bank-lbl">Account No</span>
                  <span className="rcpt-bank-sep">:</span>
                  <span className="rcpt-bank-val">38670402105</span>
                </div>
                <div className="rcpt-bank-row">
                  <span className="rcpt-bank-lbl">IFSC CODE</span>
                  <span className="rcpt-bank-sep">:</span>
                  <span className="rcpt-bank-val">SBIN0070576</span>
                </div>
              </div>
              <div className="rcpt-footer-right">
                <div className="rcpt-signatory-title">For authorised signatory</div>
                <div className="rcpt-signatory-space"></div>
              </div>
            </div>

          </div>{/* /rcpt-box */}
        </div>{/* /rcpt-page */}
      </div>

    </div>
  );
};

export default InvoiceTemplate;
