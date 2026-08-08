import React, { useState, useEffect, useRef } from 'react';
import {
  Search, X, Check, Plus, Edit2, Trash2,
  ShoppingBag, Receipt, TrendingUp, Hash, Clock,
  History, Loader2, FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { api } from '../../api';
import { useToast } from '../../components/ToastContext';
import AppModal from '../../components/AppModal';
import PremiumLoader from '../../components/PremiumLoader';
import './QuickBill.css';

// ── Midnight reset helper ─────────────────────────────────────
function isToday(billedDate) {
  return billedDate === format(new Date(), 'yyyy-MM-dd');
}

// ── Edit Bill Item Modal ───────────────────────────────────────
function EditItemModal({ item, onSave, onClose }) {
  const [qty, setQty]           = useState(item.quantity);
  const [discount, setDiscount] = useState(item.discount || 0);

  const lineTotal = Math.max(0, (qty * Number(item.price)) - (parseFloat(discount) || 0));

  return (
    <AppModal
      title={`Edit — ${item.product_name}`}
      onClose={onClose}
      width="340px"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(qty, parseFloat(discount) || 0)} disabled={qty < 1}>
            <Check size={14} /> Update
          </button>
        </>
      }
    >
      <div className="qb-qty-modal-body">
        <div className="qb-qty-stepper">
          <button className="qb-qty-step-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>-</button>
          <input
            type="number"
            className="input-field qb-qty-input"
            value={qty}
            min={1}
            onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            autoFocus
          />
          <button className="qb-qty-step-btn" onClick={() => setQty(q => q + 1)}>+</button>
        </div>

        <div className="qb-qty-note-wrap">
          <label htmlFor="edit-discount-input" className="qb-qty-note-label">
            Discount (Optional)
          </label>
          <div className="qb-currency-input-wrap">
            <span className="qb-currency-symbol">₹</span>
            <input
              id="edit-discount-input"
              type="number"
              step="0.01"
              min="0"
              className="input-field qb-inline-input qb-currency-input"
              placeholder="0.00"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (qty >= 1) onSave(qty, parseFloat(discount) || 0);
                }
              }}
            />
          </div>
        </div>

        <div className="qb-qty-line-total">
          Line total: <strong>₹{lineTotal.toFixed(2)}</strong>
        </div>
      </div>
    </AppModal>
  );
}

// ── Generate invoice PDF for a Quick Bill ─────────────────────
async function downloadBillPDF(bill) {
  const html2pdf = (await import('html2pdf.js')).default;

  const invNumber = `QB-${String(bill.bill_number).padStart(4, '0')}`;
  const dateStr   = new Date(bill.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr   = new Date(bill.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const total     = Number(bill.total).toFixed(2);

  const rows = bill.items.map(item => `
    <tr>
      <td style="text-align:left;padding:7px 10px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#0f172a">
        ${item.product_name}
        ${item.discount ? `<div style="font-size:8.5px;color:#16a34a;font-style:italic;margin-top:2px">Discount: ₹${Number(item.discount).toFixed(2)}</div>` : ''}
      </td>
      <td style="text-align:center;padding:7px 4px;border-bottom:1px solid #f1f5f9;color:#64748b">${item.quantity}</td>
      <td style="text-align:right;padding:7px 8px;border-bottom:1px solid #f1f5f9;color:#64748b">₹${Number(item.price).toFixed(2)}</td>
      <td style="text-align:right;padding:7px 10px;border-bottom:1px solid #f1f5f9;font-weight:700;color:#0f172a">₹${Number(item.line_total).toFixed(2)}</td>
    </tr>`).join('');

  const html = `
    <div style="width:559px;min-height:794px;background:#fff;color:#111827;font-family:Inter,Arial,sans-serif;font-size:11px;box-sizing:border-box;display:flex;flex-direction:column">
      <div style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95);padding:20px 28px 18px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:38px;height:38px;background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.35);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;color:#fff">S@N</div>
          <div>
            <div style="font-size:15px;font-weight:800;color:#fff">Speed@net</div>
            <div style="font-size:9px;color:rgba(255,255,255,0.55)">CRM &amp; Business Portal</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:26px;font-weight:900;letter-spacing:5px;color:rgba(255,255,255,0.88)">INVOICE</div>
          <div style="font-size:9px;color:rgba(255,255,255,0.45);letter-spacing:1.5px;margin-top:3px">${invNumber}</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:16px 28px 14px;border-bottom:1px solid #e2e8f0">
        <div>
          <div style="font-size:7.5px;font-weight:700;letter-spacing:0.1em;color:#94a3b8;text-transform:uppercase;margin-bottom:4px">BILLED TO</div>
          <div style="font-size:14px;font-weight:700;color:#0f172a">Walk-in Customer</div>
        </div>
        <div style="text-align:right">
          <div style="display:flex;justify-content:flex-end;gap:10px;margin-bottom:3px;font-size:9px">
            <span style="color:#94a3b8">Date</span><span style="color:#0f172a;font-weight:600">${dateStr}</span>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:10px;margin-bottom:3px;font-size:9px">
            <span style="color:#94a3b8">Time</span><span style="color:#0f172a;font-weight:600">${timeStr}</span>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:10px;font-size:9px;align-items:center">
            <span style="color:#94a3b8">Status</span>
            <span style="background:#dcfce7;color:#15803d;font-size:7.5px;font-weight:700;padding:1px 8px;border-radius:999px;text-transform:uppercase">Paid</span>
          </div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th style="text-align:left;padding:7px 10px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0">Description</th>
            <th style="text-align:center;padding:7px 4px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;width:12%">Qty</th>
            <th style="text-align:right;padding:7px 8px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;width:22%">Unit Price</th>
            <th style="text-align:right;padding:7px 10px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;width:19%">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div style="flex:1;min-height:20px"></div>

      <div style="display:flex;justify-content:flex-end;padding:0 28px 16px">
        <div style="width:196px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
          <div style="display:flex;justify-content:space-between;padding:7px 10px 4px;font-size:9.5px;color:#64748b">
            <span>Subtotal</span><span>₹${total}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 10px;font-size:9.5px;color:#64748b">
            <span>Tax (0%)</span><span>₹0.00</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px 7px;background:linear-gradient(135deg,#1e1b4b,#4c1d95);font-size:11.5px;font-weight:800;color:#fff">
            <span>Total Amount</span><span>₹${total}</span>
          </div>
        </div>
      </div>

      <div style="padding:12px 28px 16px;border-top:1px solid #f1f5f9;text-align:center">
        <div style="font-size:10.5px;font-weight:700;color:#1e293b;margin-bottom:4px">Thank you for your business!</div>
        <div style="font-size:7.5px;color:#94a3b8;line-height:1.5">Goods once sold will not be taken back or exchanged. Subject to local jurisdiction.</div>
        <div style="font-size:7.5px;color:#cbd5e1;margin-top:4px">Speed@net · contact@speednet.com · +91 98765 43210</div>
      </div>
    </div>`;

  const el = document.createElement('div');
  el.innerHTML = html;
  el.style.cssText = 'position:fixed;left:-9999px;top:0;width:559px';
  document.body.appendChild(el);

  await html2pdf()
    .set({
      margin:      0,
      filename:    `${invNumber}.pdf`,
      image:       { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 559, windowWidth: 559 },
      jsPDF:       { unit: 'mm', format: 'a5', orientation: 'portrait' },
    })
    .from(el.firstElementChild)
    .save();

  document.body.removeChild(el);
}

// ── Bill Row ───────────────────────────────────────────────────
function BillRow({ bill, onDelete, onEditItem }) {
  const timeStr = format(new Date(bill.created_at), 'hh:mm a');

  return (
    <div className="qb-bill-container">
      {bill.items.map((item, idx) => (
        <div key={idx} className="qb-single-bill-row">
          <span className="qb-bill-badge">#{bill.bill_number}</span>

          <div className="qb-bill-item-info">
            <span className="qb-bill-item-name">{item.product_name}</span>
            {item.discount > 0 && (
              <span className="qb-bill-item-disc-text" title={`Discount: ₹${item.discount}`}>
                Discount: ₹{Number(item.discount).toFixed(2)}
              </span>
            )}
          </div>

          <span className="qb-bill-item-qty">×{item.quantity}</span>
          <span className="qb-bill-item-price">₹{Number(item.price).toFixed(2)}</span>
          <span className="qb-bill-item-total">₹{Number(item.line_total).toFixed(2)}</span>

          <span className="qb-bill-time-text">
            <Clock size={11} /> {timeStr}
          </span>

          <div className="qb-bill-actions">
            <button
              className="qb-bill-action-btn qb-btn-edit"
              onClick={() => onEditItem(bill, idx)}
              title="Edit quantity and discount"
            >
              <Edit2 size={13} />
            </button>
            <button
              className="qb-bill-action-btn qb-btn-pdf"
              onClick={() => downloadBillPDF(bill)}
              title="Download Invoice PDF"
            >
              <FileText size={13} />
            </button>
            <button
              className="qb-bill-action-btn qb-btn-delete"
              onClick={() => onDelete(bill.id)}
              title="Delete bill"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function QuickBill() {
  const toast    = useToast();
  const navigate = useNavigate();

  // Products from DB
  const [products, setProducts]               = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Today's bills
  const [bills, setBills]                     = useState([]);
  const [loadingBills, setLoadingBills]       = useState(true);
  const [summary, setSummary]                 = useState({ totalAmount: 0, billCount: 0, itemCount: 0 });

  // ── Inline Entry Row State ─────────────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery]         = useState('');
  const [sellingPrice, setSellingPrice]       = useState('');
  const [quantity, setQuantity]               = useState(1);
  const [discount, setDiscount]               = useState('');
  const [totalAmount, setTotalAmount]         = useState('');

  // Dropdown search state
  const [showDropdown, setShowDropdown]       = useState(false);
  const [dropdownResults, setDropdownResults] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Refs for focusing & clicking outside
  const searchRef        = useRef(null);
  const dropdownRef      = useRef(null);
  const searchInputRef   = useRef(null);
  const priceInputRef    = useRef(null);
  const qtyInputRef      = useRef(null);
  const discountInputRef = useRef(null);
  const totalInputRef    = useRef(null);

  // Saving
  const [saving, setSaving]           = useState(false);

  // Edit item modal
  const [editTarget, setEditTarget]   = useState(null); // { bill, itemIdx }

  // Delete confirm
  const [deleteId, setDeleteId]       = useState(null);

  // ── Load data ─────────────────────────────────────────────────
  useEffect(() => {
    loadProducts();
    loadTodayBills();
  }, []);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await api.getProducts({ is_blocked: 'false' });
      setProducts(data || []);
    } catch (err) { toast.error('Failed to load products'); }
    setLoadingProducts(false);
  };

  const loadTodayBills = async () => {
    setLoadingBills(true);
    try {
      const [billsData, summaryData] = await Promise.all([
        api.getQuickBills(),
        api.getQuickBillSummary(),
      ]);
      setBills(billsData || []);
      setSummary(summaryData || { totalAmount: 0, billCount: 0, itemCount: 0 });
    } catch (err) { toast.error('Failed to load today\'s bills'); }
    setLoadingBills(false);
  };

  // ── Product Search Dropdown ───────────────────────────────────
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || (selectedProduct && searchQuery === selectedProduct.name)) {
      setDropdownResults([]);
      setShowDropdown(false);
      return;
    }
    const results = products
      .filter(p => p.name.toLowerCase().includes(q) || p.id.toString().includes(q))
      .slice(0, 10);
    setDropdownResults(results);
    setHighlightedIndex(0);
    setShowDropdown(results.length > 0);
  }, [searchQuery, products, selectedProduct]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Select product from dropdown ──────────────────────────────
  const selectProduct = (product) => {
    setSelectedProduct(product);
    setSearchQuery(product.name);
    setShowDropdown(false);
    const p = Number(product.price) || 0;
    setSellingPrice(p);
    setQuantity(1);
    setDiscount('');
    setTotalAmount(p);
    setTimeout(() => {
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
    }, 50);
  };

  // ── Auto Calculations ─────────────────────────────────────────
  const handlePriceChange = (val) => {
    setSellingPrice(val);
    const p = parseFloat(val) || 0;
    const q = parseFloat(quantity) || 0;
    const d = parseFloat(discount) || 0;
    setTotalAmount(Math.max(0, (p * q) - d).toFixed(2));
  };

  const handleQtyChange = (val) => {
    setQuantity(val);
    const q = parseFloat(val) || 0;
    const p = parseFloat(sellingPrice) || 0;
    const d = parseFloat(discount) || 0;
    setTotalAmount(Math.max(0, (p * q) - d).toFixed(2));
  };

  const handleDiscountChange = (val) => {
    setDiscount(val);
    const d = parseFloat(val) || 0;
    const p = parseFloat(sellingPrice) || 0;
    const q = parseFloat(quantity) || 0;
    setTotalAmount(Math.max(0, (p * q) - d).toFixed(2));
  };

  const handleTotalChange = (val) => {
    setTotalAmount(val);
    const tot = parseFloat(val) || 0;
    const d = parseFloat(discount) || 0;
    const q = parseFloat(quantity) || 1;
    if (q > 0) {
      setSellingPrice(Math.max(0, (tot + d) / q).toFixed(2));
    }
  };

  // ── Keyboard handling for Product Search field ────────────────
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') { setShowDropdown(false); return; }

    if (showDropdown && e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, dropdownResults.length - 1));
      return;
    }

    if (showDropdown && e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
      return;
    }

    // Enter in Search field -> select highlighted product if dropdown open, else submit if product selected
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showDropdown && dropdownResults.length > 0) {
        const target = dropdownResults[highlightedIndex] ?? dropdownResults[0];
        if (target && target.stock > 0) selectProduct(target);
      } else if (selectedProduct) {
        handleInlineSubmit();
      } else {
        toast.error('Please select a product first');
      }
    }
  };

  // ── Submit Inline Row ─────────────────────────────────────────
  const handleInlineSubmit = (e) => {
    if (e) e.preventDefault();

    if (!selectedProduct) {
      toast.error('Please select a product first');
      searchInputRef.current?.focus();
      return;
    }

    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum < 1) {
      toast.error('Quantity is mandatory and must be at least 1');
      qtyInputRef.current?.focus();
      return;
    }

    const priceNum = parseFloat(sellingPrice) || 0;
    const discNum  = parseFloat(discount) || 0;
    const totalNum = parseFloat(totalAmount) || Math.max(0, (priceNum * qtyNum) - discNum);

    const newItem = {
      product_id:   selectedProduct.id,
      product_name: selectedProduct.name,
      price:        priceNum,
      quantity:     qtyNum,
      line_total:   totalNum,
      discount:     discNum,
      note:         discNum > 0 ? `Discount ₹${discNum.toFixed(2)}` : '',
    };

    createBill([newItem]);

    // Reset inline entry row
    setSelectedProduct(null);
    setSearchQuery('');
    setSellingPrice('');
    setQuantity(1);
    setDiscount('');
    setTotalAmount('');
    setShowDropdown(false);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  // ── Create bill in DB ─────────────────────────────────────────
  const createBill = async (items) => {
    if (!items || items.length === 0) return;
    setSaving(true);
    try {
      const total = items.reduce((s, i) => s + i.line_total, 0);
      const newBill = await api.createQuickBill({ items, total });
      setBills(prev => [newBill, ...prev]);
      setSummary(prev => ({
        totalAmount: prev.totalAmount + total,
        billCount:   prev.billCount + 1,
        itemCount:   prev.itemCount + items.reduce((s, i) => s + i.quantity, 0),
      }));
      toast.success(`Bill #${newBill.bill_number} created — ₹${total.toFixed(2)}`);
    } catch (err) {
      toast.error('Failed to create bill: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete bill ───────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deleteQuickBill(deleteId);
      const deleted = bills.find(b => b.id === deleteId);
      setBills(prev => prev.filter(b => b.id !== deleteId));
      if (deleted) {
        setSummary(prev => ({
          totalAmount: prev.totalAmount - deleted.total,
          billCount:   prev.billCount - 1,
          itemCount:   prev.itemCount - deleted.items.reduce((s, i) => s + i.quantity, 0),
        }));
      }
      toast.success('Bill deleted');
    } catch (err) { toast.error('Failed to delete: ' + err.message); }
    setDeleteId(null);
  };

  // ── Edit item quantity / discount ──────────────────────────────
  const openEditItem = (bill, itemIdx) => setEditTarget({ bill, itemIdx });

  const handleEditItemSave = async (newQty, newDiscount = 0) => {
    const { bill, itemIdx } = editTarget;
    const updatedItems = bill.items.map((item, i) => {
      if (i !== itemIdx) return item;
      const gross = newQty * item.price;
      const net = Math.max(0, gross - newDiscount);
      return {
        ...item,
        quantity: newQty,
        discount: newDiscount,
        line_total: net,
        note: newDiscount > 0 ? `Discount ₹${newDiscount.toFixed(2)}` : '',
      };
    });
    const newTotal = updatedItems.reduce((s, i) => s + i.line_total, 0);
    try {
      const updated = await api.updateQuickBill(bill.id, { items: updatedItems, total: newTotal });
      setBills(prev => prev.map(b => b.id === bill.id ? updated : b));
      // Refresh summary
      const [summaryData] = await Promise.all([api.getQuickBillSummary()]);
      setSummary(summaryData || summary);
      toast.success('Updated');
    } catch (err) { toast.error('Failed to update: ' + err.message); }
    setEditTarget(null);
  };

  // ── Today string ──────────────────────────────────────────────
  const todayLabel = format(new Date(), 'EEEE, dd MMM yyyy');

  return (
    <div className="qb-root animate-fade-in">

      {/* ── LEFT: Inline Bar + Bill list ── */}
      <div className="qb-left">

        {/* ── Inline Quick Entry Bar ── */}
        <div className="qb-inline-entry-bar glass-panel" ref={searchRef}>
          <div className="qb-inline-fields">

            {/* 1. Product Search */}
            <div className="qb-inline-field qb-field-search">
              <label className="qb-inline-label">
                <Search size={12} /> Product <span className="qb-req">*</span>
              </label>
              <div className="qb-input-with-clear">
                <input
                  ref={searchInputRef}
                  className="input-field qb-inline-input"
                  placeholder="Search product..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    if (selectedProduct && e.target.value !== selectedProduct.name) {
                      setSelectedProduct(null);
                    }
                  }}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => searchQuery && setShowDropdown(dropdownResults.length > 0)}
                  autoComplete="off"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="qb-inline-clear-btn"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedProduct(null);
                      setSellingPrice('');
                      setQuantity(1);
                      setDiscount('');
                      setTotalAmount('');
                      setShowDropdown(false);
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && (
                <div className="qb-dropdown" ref={dropdownRef}>
                  {dropdownResults.map((product, idx) => {
                    const oos = product.stock <= 0;
                    return (
                      <div
                        key={product.id}
                        className={`qb-dropdown-item ${oos ? 'qb-dropdown-item--oos' : ''} ${idx === highlightedIndex ? 'qb-dropdown-item--highlighted' : ''}`}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onClick={() => !oos && selectProduct(product)}
                      >
                        <div className="qb-drop-info">
                          <span className="qb-drop-name">{product.name}</span>
                          <span className="qb-drop-sub">
                            {oos ? 'Out of stock' : `${product.stock} in stock`}
                          </span>
                        </div>
                        <span className="qb-drop-price">₹{Number(product.price).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Selling Price (Editable) */}
            <div className="qb-inline-field qb-field-price">
              <label className="qb-inline-label">Selling Price</label>
              <div className="qb-currency-input-wrap">
                <span className="qb-currency-symbol">₹</span>
                <input
                  ref={priceInputRef}
                  type="number"
                  step="0.01"
                  className="input-field qb-inline-input qb-currency-input"
                  placeholder="0.00"
                  value={sellingPrice}
                  onChange={e => handlePriceChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInlineSubmit(e)}
                />
              </div>
            </div>

            {/* 3. Quantity */}
            <div className="qb-inline-field qb-field-qty">
              <label className="qb-inline-label">Qty <span className="qb-req">*</span></label>
              <input
                ref={qtyInputRef}
                type="number"
                min="1"
                className="input-field qb-inline-input qb-qty-num-input"
                value={quantity}
                onChange={e => handleQtyChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInlineSubmit(e)}
              />
            </div>

            {/* 4. Discount (Optional) */}
            <div className="qb-inline-field qb-field-discount">
              <label className="qb-inline-label">Discount (Optional)</label>
              <div className="qb-currency-input-wrap">
                <span className="qb-currency-symbol">₹</span>
                <input
                  ref={discountInputRef}
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field qb-inline-input qb-currency-input"
                  placeholder="0.00"
                  value={discount}
                  onChange={e => handleDiscountChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInlineSubmit(e)}
                />
              </div>
            </div>

            {/* 5. Total Amount (Editable) */}
            <div className="qb-inline-field qb-field-total">
              <label className="qb-inline-label">Total Amount</label>
              <div className="qb-currency-input-wrap">
                <span className="qb-currency-symbol">₹</span>
                <input
                  ref={totalInputRef}
                  type="number"
                  step="0.01"
                  className="input-field qb-inline-input qb-currency-input"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={e => handleTotalChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInlineSubmit(e)}
                />
              </div>
            </div>

            {/* Submit button */}
            <div className="qb-inline-action">
              <button
                type="button"
                className="btn btn-primary qb-inline-add-btn"
                onClick={handleInlineSubmit}
                disabled={!selectedProduct}
              >
                <Plus size={15} /> Add Bill
              </button>
            </div>

          </div>
        </div>

        {/* Today's bill list */}
        <div className="qb-bill-list-wrap glass-panel">
          <div className="qb-bill-list-header">
            <div>
              <h3>Today's Bills</h3>
              <span className="qb-bill-list-date">{todayLabel}</span>
            </div>
            <button
              className="qb-history-btn"
              onClick={() => navigate('/billing/quickbill/history')}
            >
              <History size={14} /> History
            </button>
          </div>

          {loadingBills ? (
            <div className="qb-center-loader"><PremiumLoader text="Loading bills…" /></div>
          ) : bills.length === 0 ? (
            <div className="qb-empty-bills">
              <ShoppingBag size={36} />
              <p>No bills yet today</p>
              <span>Search &amp; add a product above to get started</span>
            </div>
          ) : (
            <div className="qb-bill-list">
              {bills.map(bill => (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  onDelete={id => setDeleteId(id)}
                  onEditItem={openEditItem}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Daily summary ── */}
      <div className="qb-right">
        <div className="qb-summary glass-panel">
          <div className="qb-summary-header">
            <Receipt size={18} className="qb-summary-icon" />
            <div>
              <h3>Today's Summary</h3>
              <span className="qb-summary-date">{todayLabel}</span>
            </div>
          </div>

          <div className="qb-summary-stats">
            <div className="qb-stat-card qb-stat-revenue">
              <TrendingUp size={18} />
              <div>
                <span className="qb-stat-label">Total Revenue</span>
                <span className="qb-stat-value">₹{Number(summary.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="qb-stat-card qb-stat-bills">
              <Receipt size={18} />
              <div>
                <span className="qb-stat-label">Bills Created</span>
                <span className="qb-stat-value">{summary.billCount || 0}</span>
              </div>
            </div>
            <div className="qb-stat-card qb-stat-items">
              <ShoppingBag size={18} />
              <div>
                <span className="qb-stat-label">Items Sold</span>
                <span className="qb-stat-value">{summary.itemCount || 0}</span>
              </div>
            </div>
            <div className="qb-stat-card qb-stat-avg">
              <Hash size={18} />
              <div>
                <span className="qb-stat-label">Avg. Bill Value</span>
                <span className="qb-stat-value">
                  {summary.billCount > 0
                    ? `₹${(summary.totalAmount / summary.billCount).toFixed(2)}`
                    : '—'
                  }
                </span>
              </div>
            </div>
          </div>

          <div className="qb-summary-divider" />

          {/* Recent bills mini-list */}
          <div className="qb-summary-recent-header">
            <span>Recent Bills</span>
            <span className="qb-summary-reset-note">
              <Clock size={10} /> Resets at midnight
            </span>
          </div>
          <div className="qb-summary-recent">
            {bills.length === 0 ? (
              <span className="qb-summary-no-bills">No bills yet</span>
            ) : (
              bills.slice(0, 6).map(bill => (
                <div key={bill.id} className="qb-summary-bill-row">
                  <span className="qb-summary-bill-num">#{bill.bill_number}</span>
                  <span className="qb-summary-bill-items">
                    {bill.items.length} item{bill.items.length !== 1 ? 's' : ''}
                  </span>
                  <span className="qb-summary-bill-time">
                    {format(new Date(bill.created_at), 'hh:mm a')}
                  </span>
                  <span className="qb-summary-bill-total">₹{Number(bill.total).toFixed(2)}</span>
                </div>
              ))
            )}
            {bills.length > 6 && (
              <span className="qb-summary-more">+{bills.length - 6} more bills</span>
            )}
          </div>

          <button className="qb-view-history-btn" onClick={() => navigate('/billing/quickbill/history')}>
            <History size={14} /> View Full History
          </button>
        </div>
      </div>

      {/* ── Edit item modal ── */}
      {editTarget && (
        <EditItemModal
          item={editTarget.bill.items[editTarget.itemIdx]}
          onSave={handleEditItemSave}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* ── Delete confirm ── */}
      {deleteId && (
        <AppModal
          title="Delete Bill?"
          onClose={() => setDeleteId(null)}
          width="340px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button
                className="btn"
                style={{ background: '#ef4444', color: '#fff', fontWeight: 700 }}
                onClick={handleDelete}
              >
                <Trash2 size={13} /> Delete
              </button>
            </>
          }
        >
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            This bill will be permanently removed from today's records.
          </p>
        </AppModal>
      )}

      {/* ── Saving overlay ── */}
      {saving && (
        <div className="qb-saving-overlay">
          <Loader2 size={22} className="spin" />
          <span>Creating bill…</span>
        </div>
      )}
    </div>
  );
}
