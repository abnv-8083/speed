import React, { useState, useEffect, useRef } from 'react';
import {
  Search, X, Check, Plus, Edit2, Trash2,
  ShoppingBag, Receipt, TrendingUp, Hash, Clock,
  History, Loader2, FileText, Smartphone,
  Coins, CheckSquare, Square, ArrowRight, Users, ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { api } from '../../api';
import { useToast } from '../../components/ToastContext';
import AppModal from '../../components/AppModal';
import PremiumLoader from '../../components/PremiumLoader';
import InvoiceTemplate from '../../components/InvoiceTemplate';
import './QuickBill.css';

// ── Midnight reset helper ─────────────────────────────────────
function isToday(billedDate) {
  return billedDate === format(new Date(), 'yyyy-MM-dd');
}

// ── Edit Bill Item Modal ───────────────────────────────────────
function EditItemModal({ item, bill, onSave, onClose }) {
  const [qty, setQty]           = useState(item.quantity);
  const [discount, setDiscount] = useState(item.discount || 0);
  const [payMethod, setPayMethod] = useState((bill.payment_method || 'Cash').toUpperCase() === 'UPI' ? 'UPI' : 'Cash');

  const lineTotal = Math.max(0, (qty * Number(item.price)) - (parseFloat(discount) || 0));

  return (
    <AppModal
      title={`Edit — ${item.product_name}`}
      onClose={onClose}
      width="340px"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(qty, parseFloat(discount) || 0, payMethod)} disabled={qty < 1}>
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
                  if (qty >= 1) onSave(qty, parseFloat(discount) || 0, payMethod);
                }
              }}
            />
          </div>
        </div>

        <div className="qb-qty-pay-row">
          <label className="qb-qty-note-label">Payment Method</label>
          <div className="qb-qty-pay-options">
            <button type="button" className={`qb-qty-pay-btn ${payMethod === 'Cash' ? 'active cash' : ''}`} onClick={() => setPayMethod('Cash')}>💵 Cash</button>
            <button type="button" className={`qb-qty-pay-btn ${payMethod === 'UPI' ? 'active upi' : ''}`} onClick={() => setPayMethod('UPI')}>📱 UPI</button>
          </div>
        </div>

        <div className="qb-qty-line-total">
          Line total: <strong>₹{lineTotal.toFixed(2)}</strong>
        </div>
      </div>
    </AppModal>
  );
}

// ── Manage Advance Modal ───────────────────────────────────────
function ManageAdvanceModal({ bill, onSave, onDelete, onClose }) {
  const [amount, setAmount] = useState(bill.advance ? String(bill.advance) : '');
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    const val = Math.max(0, parseFloat(amount) || 0);
    setSubmitting(true);
    await onSave(bill.id, val);
    setSubmitting(false);
    onClose();
  };

  const handleDelete = async () => {
    setSubmitting(true);
    await onDelete(bill.id);
    setSubmitting(false);
    onClose();
  };

  return (
    <AppModal
      title={`Advance Payment — Bill #${bill.bill_number}`}
      onClose={onClose}
      width="360px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          {Number(bill.advance) > 0 ? (
            <button
              type="button"
              className="btn"
              style={{ background: '#ef4444', color: '#fff', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              onClick={handleDelete}
              disabled={submitting}
            >
              <Trash2 size={13} /> Remove
            </button>
          ) : <div />}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Advance'}
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Bill Total: <strong style={{ color: 'var(--text)' }}>₹{Number(bill.total).toFixed(2)}</strong>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Advance Amount (₹)
          </label>
          <div className="qb-currency-input-wrap">
            <span className="qb-currency-symbol">₹</span>
            <input
              type="number"
              step="0.01"
              min="0"
              max={bill.total}
              autoFocus
              className="input-field qb-inline-input qb-currency-input"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
        </div>
      </form>
    </AppModal>
  );
}

// ── Bill Row ───────────────────────────────────────────────────
function BillRow({
  bill,
  onDelete,
  onEditItem,
  onManageAdvance,
  selectionMode,
  isSelected,
  onToggleSelect,
}) {
  const timeStr = format(new Date(bill.created_at), 'hh:mm a');
  const isUpi = (bill.payment_method || '').toUpperCase() === 'UPI';
  const hasAdvance = Number(bill.advance) > 0;

  return (
    <div
      className={`qb-bill-container ${selectionMode ? 'qb-bill-container--selectable' : ''} ${isSelected ? 'qb-bill-container--selected' : ''}`}
      onClick={selectionMode ? onToggleSelect : undefined}
    >
      {selectionMode && (
        <div className="qb-select-checkbox-col" onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}>
          <input
            type="checkbox"
            className="qb-bill-checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
          />
        </div>
      )}

      <div className="qb-bill-items-flow">
        {bill.items.map((item, idx) => (
          <div key={idx} className="qb-single-bill-row">
            <div className="qb-bill-badge-group">
              <span className="qb-bill-badge">#{bill.bill_number}</span>
              <span className={`qb-pay-badge ${isUpi ? 'qb-pay-badge--upi' : 'qb-pay-badge--cash'}`}>
                {bill.payment_method || 'Cash'}
              </span>
              {hasAdvance && idx === 0 && (
                <span className="qb-advance-badge" title={`Advance Paid: ₹${Number(bill.advance).toFixed(2)}`}>
                  <Coins size={11} /> Adv: ₹{Number(bill.advance).toFixed(2)}
                </span>
              )}
            </div>

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

            {!selectionMode && (
              <div className="qb-bill-actions" onClick={e => e.stopPropagation()}>
                <button
                  className={`qb-bill-action-btn qb-btn-advance ${hasAdvance ? 'qb-btn-advance--active' : ''}`}
                  onClick={() => onManageAdvance(bill)}
                  title="Manage Advance Payment"
                >
                  <Coins size={13} />
                </button>
                <button
                  className="qb-bill-action-btn qb-btn-edit"
                  onClick={() => onEditItem(bill, idx)}
                  title="Edit quantity and discount"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  className="qb-bill-action-btn qb-btn-delete"
                  onClick={() => onDelete(bill.id)}
                  title="Delete bill"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
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
  const [summary, setSummary]                 = useState({ totalAmount: 0, billCount: 0, itemCount: 0, upiAmount: 0, upiCount: 0 });

  // ── Multi-Bill Selection & Invoice State ───────────────────────
  const [selectionMode, setSelectionMode]             = useState(false);
  const [selectedBillIds, setSelectedBillIds]         = useState(new Set());
  const [showAddressModal, setShowAddressModal]       = useState(false);
  const [customerNameInput, setCustomerNameInput]     = useState('');
  const [customerAddressInput, setCustomerAddressInput] = useState('');
  const [previewInvoice, setPreviewInvoice]           = useState(null);

  // ── Customer list for dropdown ─────────────────────────────────
  const [customers, setCustomers]                     = useState([]);
  const [selectedCustomerId, setSelectedCustomerId]   = useState(null);
  const [customerSearch, setCustomerSearch]           = useState('');
  const [showCustDropdown, setShowCustDropdown]       = useState(false);
  const custSearchRef = useRef(null);
  const custDropdownRef = useRef(null);

  // ── Manage Advance Modal State ─────────────────────────────────
  const [advanceTargetBill, setAdvanceTargetBill]     = useState(null);

  // ── Inline Entry Row State ─────────────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery]         = useState('');
  const [sellingPrice, setSellingPrice]       = useState('');
  const [quantity, setQuantity]               = useState(1);
  const [discount, setDiscount]               = useState('');
  const [totalAmount, setTotalAmount]         = useState('');
  const [payMethod, setPayMethod]              = useState('Cash');

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
    loadCustomers();
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
      setSummary(summaryData || { totalAmount: 0, billCount: 0, itemCount: 0, upiAmount: 0, upiCount: 0 });
    } catch (err) { toast.error('Failed to load today\'s bills'); }
    setLoadingBills(false);
  };

  const loadCustomers = async () => {
    try {
      const data = await api.getCustomers();
      setCustomers(data || []);
    } catch (err) { /* silent — customers are optional */ }
  };

  // Close customer dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (custDropdownRef.current && !custDropdownRef.current.contains(e.target) &&
          custSearchRef.current && !custSearchRef.current.contains(e.target)) {
        setShowCustDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.toLowerCase();
    if (!q) return true;
    return (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
  });

  const selectCustomer = (cust) => {
    setSelectedCustomerId(cust.id);
    setCustomerNameInput(cust.name || '');
    setCustomerAddressInput(
      [cust.address, cust.phone, cust.email].filter(Boolean).join(' • ') || ''
    );
    setCustomerSearch('');
    setShowCustDropdown(false);
  };

  const clearSelectedCustomer = () => {
    setSelectedCustomerId(null);
    setCustomerNameInput('');
    setCustomerAddressInput('');
  };

  // ── Selection helpers ──────────────────────────────────────────
  const toggleSelectBill = (id) => {
    setSelectedBillIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedBillIds.size === bills.length) {
      setSelectedBillIds(new Set());
    } else {
      setSelectedBillIds(new Set(bills.map(b => b.id)));
    }
  };

  // ── Generate Combined Invoice Preview ─────────────────────────
  const handleGenerateInvoicePreview = () => {
    const selectedBills = bills.filter(b => selectedBillIds.has(b.id));
    if (selectedBills.length === 0) return;

    // Combine all items
    const combinedItems = [];
    selectedBills.forEach(b => {
      (b.items || []).forEach(item => {
        combinedItems.push({
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          price_at_time: item.price,
          line_total: item.line_total,
          discount: item.discount || 0,
        });
      });
    });

    const totalDiscount = combinedItems.reduce((s, i) => s + Number(i.discount || 0), 0);
    const subtotal = combinedItems.reduce((s, i) => s + Number(i.line_total || 0), 0) + totalDiscount;
    const totalAmount = combinedItems.reduce((s, i) => s + Number(i.line_total || 0), 0);
    const totalAdvance = selectedBills.reduce((s, b) => s + Number(b.advance || 0), 0);

    const invoiceObj = {
      id: selectedBills.map(b => b.bill_number).join(', '),
      customer_name: customerNameInput.trim() || 'Walk-in Customer',
      customer_address: customerAddressInput.trim(),
      items: combinedItems,
      subtotal: subtotal,
      discount: totalDiscount,
      advance: totalAdvance,
      total_amount: totalAmount,
      created_at: new Date(),
    };

    setShowAddressModal(false);
    setSelectionMode(false);
    setSelectedBillIds(new Set());
    setCustomerNameInput('');
    setCustomerAddressInput('');
    setPreviewInvoice(invoiceObj);
  };

  // ── Advance Management Handlers ────────────────────────────────
  const handleSaveAdvance = async (billId, advanceAmount) => {
    try {
      await api.updateQuickBill(billId, { advance: advanceAmount });
      setBills(prev => prev.map(b => b.id === billId ? { ...b, advance: advanceAmount } : b));
      toast.success(advanceAmount > 0 ? `Advance of ₹${advanceAmount.toFixed(2)} saved` : 'Advance removed');
    } catch (err) {
      toast.error('Failed to update advance: ' + err.message);
    }
  };

  const handleDeleteAdvance = async (billId) => {
    try {
      await api.updateQuickBill(billId, { advance: 0 });
      setBills(prev => prev.map(b => b.id === billId ? { ...b, advance: 0 } : b));
      toast.success('Advance payment removed');
    } catch (err) {
      toast.error('Failed to remove advance: ' + err.message);
    }
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
      qtyInputRef.current?.focus();
      qtyInputRef.current?.select();
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
        const canSelect = target && (target.type === 'service' || target.stock > 0);
        if (canSelect) selectProduct(target);
      } else if (selectedProduct) {
        handleInlineSubmit();
      } else {
        toast.error('Please select a product or service first');
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
      const newBill = await api.createQuickBill({ items, total, payment_method: payMethod });
      setBills(prev => [newBill, ...prev]);
      setSummary(prev => ({
        totalAmount: prev.totalAmount + total,
        billCount:   prev.billCount + 1,
        itemCount:   prev.itemCount + items.reduce((s, i) => s + i.quantity, 0),
        upiAmount:   (prev.upiAmount || 0) + (payMethod === 'UPI' ? total : 0),
        upiCount:    (prev.upiCount || 0) + (payMethod === 'UPI' ? 1 : 0),
      }));
      toast.success(`Bill #${newBill.bill_number} (${payMethod}) created — ₹${total.toFixed(2)}`);
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
        const wasUpi = (deleted.payment_method || '').toUpperCase() === 'UPI';
        setSummary(prev => ({
          totalAmount: prev.totalAmount - deleted.total,
          billCount:   prev.billCount - 1,
          itemCount:   prev.itemCount - deleted.items.reduce((s, i) => s + i.quantity, 0),
          upiAmount:   Math.max(0, (prev.upiAmount || 0) - (wasUpi ? deleted.total : 0)),
          upiCount:    Math.max(0, (prev.upiCount || 0) - (wasUpi ? 1 : 0)),
        }));
      }
      toast.success('Bill deleted');
    } catch (err) { toast.error('Failed to delete: ' + err.message); }
    setDeleteId(null);
  };

  // ── Edit item quantity / discount ──────────────────────────────
  const openEditItem = (bill, itemIdx) => setEditTarget({ bill, itemIdx });

  const handleEditItemSave = async (newQty, newDiscount = 0, newPayMethod) => {
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
    const payload = { items: updatedItems, total: newTotal };
    if (newPayMethod) payload.payment_method = newPayMethod;
    try {
      const updated = await api.updateQuickBill(bill.id, payload);
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

  // ── Invoice / Preview View ─────────────────────────────────────
  if (previewInvoice) {
    return (
      <InvoiceTemplate
        invoice={previewInvoice}
        onBack={() => setPreviewInvoice(null)}
        backLabel="Back to Quick Bill"
      />
    );
  }

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
                    const isService = product.type === 'service';
                    const oos = !isService && product.stock <= 0;
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
                            {isService ? '⚡ Service' : oos ? 'Out of stock' : `${product.stock} in stock`}
                          </span>
                        </div>
                        <span className="qb-drop-price">₹{Number(product.price).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Quantity */}
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

            {/* 3. Payment Method */}
            <div className="qb-inline-field qb-field-method">
              <label className="qb-inline-label">Method</label>
              <select
                className="input-field qb-inline-input qb-method-select"
                value={payMethod}
                onChange={e => setPayMethod(e.target.value)}
              >
                <option value="Cash">💵 Cash</option>
                <option value="UPI">📱 UPI</option>
                <option value="Card">💳 Card</option>
                <option value="Bank Transfer">🏦 Bank Transfer</option>
              </select>
            </div>

            {/* 4. Selling Price (Editable) */}
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

            {/* 5. Discount (Optional) */}
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

            {/* 6. Total Amount (Editable) */}
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
            <div className="qb-list-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {bills.length > 0 && !selectionMode && (
                <button
                  type="button"
                  className="qb-invoice-mode-btn"
                  onClick={() => {
                    setSelectionMode(true);
                    setSelectedBillIds(new Set());
                  }}
                  title="Select multiple bills to create an invoice"
                >
                  <FileText size={14} /> Create Invoice
                </button>
              )}
              <button
                className="qb-history-btn"
                onClick={() => navigate('/admin/billing/quickbill/history')}
              >
                <History size={14} /> History
              </button>
            </div>
          </div>

          {/* Selection mode floating bar */}
          {selectionMode && (
            <div className="qb-selection-bar animate-fade-in">
              <div className="qb-selection-left">
                <button
                  type="button"
                  className="qb-select-all-btn"
                  onClick={handleSelectAll}
                >
                  {selectedBillIds.size === bills.length && bills.length > 0 ? (
                    <CheckSquare size={16} />
                  ) : (
                    <Square size={16} />
                  )}
                  <span>{selectedBillIds.size === bills.length && bills.length > 0 ? 'Deselect All' : 'Select All'}</span>
                </button>
                <span className="qb-selection-count">
                  <strong>{selectedBillIds.size}</strong> of {bills.length} selected
                </span>
              </div>
              <div className="qb-selection-right">
                <button
                  type="button"
                  className="btn btn-secondary qb-selection-cancel-btn"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedBillIds(new Set());
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary qb-selection-next-btn"
                  disabled={selectedBillIds.size === 0}
                  onClick={() => setShowAddressModal(true)}
                >
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

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
                  selectionMode={selectionMode}
                  isSelected={selectedBillIds.has(bill.id)}
                  onToggleSelect={() => toggleSelectBill(bill.id)}
                  onDelete={id => setDeleteId(id)}
                  onEditItem={openEditItem}
                  onManageAdvance={b => setAdvanceTargetBill(b)}
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
            <div className="qb-stat-card qb-stat-upi">
              <Smartphone size={18} />
              <div>
                <span className="qb-stat-label">UPI Payments</span>
                <span className="qb-stat-value">
                  ₹{Number(summary.upiAmount || 0).toFixed(2)}
                </span>
                <span className="qb-stat-sub">
                  {summary.upiCount || 0} bill{(summary.upiCount || 0) !== 1 ? 's' : ''}
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
              bills.slice(0, 6).map(bill => {
                const isUpi = (bill.payment_method || '').toUpperCase() === 'UPI';
                return (
                  <div key={bill.id} className="qb-summary-bill-row">
                    <div className="qb-summary-bill-num-wrap">
                      <span className="qb-summary-bill-num">#{bill.bill_number}</span>
                      <span className={`qb-pay-badge-sm ${isUpi ? 'qb-pay-badge--upi' : 'qb-pay-badge--cash'}`}>
                        {bill.payment_method || 'Cash'}
                      </span>
                    </div>
                    <span className="qb-summary-bill-items">
                      {bill.items.length} item{bill.items.length !== 1 ? 's' : ''}
                    </span>
                    <span className="qb-summary-bill-time">
                      {format(new Date(bill.created_at), 'hh:mm a')}
                    </span>
                    <span className="qb-summary-bill-total">₹{Number(bill.total).toFixed(2)}</span>
                  </div>
                );
              })
            )}
            {bills.length > 6 && (
              <span className="qb-summary-more">+{bills.length - 6} more bills</span>
            )}
          </div>

          <button className="qb-view-history-btn" onClick={() => navigate('/admin/billing/quickbill/history')}>
            <History size={14} /> View Full History
          </button>
        </div>
      </div>

      {/* ── Manage Advance Modal ── */}
      {advanceTargetBill && (
        <ManageAdvanceModal
          bill={advanceTargetBill}
          onSave={handleSaveAdvance}
          onDelete={handleDeleteAdvance}
          onClose={() => setAdvanceTargetBill(null)}
        />
      )}

      {/* ── Address / Customer Details Modal for Invoice ── */}
      {showAddressModal && (
        <AppModal
          title="Create Invoice — Customer Details"
          onClose={() => { setShowAddressModal(false); clearSelectedCustomer(); }}
          width="460px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => { setShowAddressModal(false); clearSelectedCustomer(); }}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleGenerateInvoicePreview}
              >
                <FileText size={14} /> Preview Invoice
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Bill summary */}
            <div style={{ background: 'var(--surface-hover)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.25rem' }}>
                {selectedBillIds.size} Bill{selectedBillIds.size !== 1 ? 's' : ''} Selected
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                Total Items: {bills.filter(b => selectedBillIds.has(b.id)).reduce((s, b) => s + b.items.length, 0)} •
                Grand Total: ₹{bills.filter(b => selectedBillIds.has(b.id)).reduce((s, b) => s + Number(b.total || 0), 0).toFixed(2)}
                {bills.filter(b => selectedBillIds.has(b.id)).reduce((s, b) => s + Number(b.advance || 0), 0) > 0 && (
                  <span> • Total Advance: ₹{bills.filter(b => selectedBillIds.has(b.id)).reduce((s, b) => s + Number(b.advance || 0), 0).toFixed(2)}</span>
                )}
              </div>
            </div>

            {/* Customer selector dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                <Users size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.25rem' }} />
                Select Customer (Optional)
              </label>
              <div className="qb-cust-select-wrap" ref={custSearchRef}>
                <input
                  type="text"
                  className="input-field qb-cust-select-input"
                  placeholder={selectedCustomerId ? '' : 'Search customers or leave blank for Walk-in...'}
                  value={customerSearch || customerNameInput}
                  onChange={e => {
                    setCustomerSearch(e.target.value);
                    setShowCustDropdown(true);
                    if (selectedCustomerId) clearSelectedCustomer();
                  }}
                  onFocus={() => { if (customers.length > 0) setShowCustDropdown(true); }}
                />
                {selectedCustomerId && (
                  <button type="button" className="qb-cust-select-clear" onClick={clearSelectedCustomer}>
                    <X size={14} />
                  </button>
                )}

                {showCustDropdown && filteredCustomers.length > 0 && (
                  <div className="qb-cust-dropdown" ref={custDropdownRef}>
                    {filteredCustomers.slice(0, 8).map(cust => (
                      <div
                        key={cust.id}
                        className={`qb-cust-dropdown-item ${selectedCustomerId === cust.id ? 'qb-cust-dropdown-item--active' : ''}`}
                        onClick={() => selectCustomer(cust)}
                      >
                        <div className="qb-cust-dropdown-avatar">
                          {(cust.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="qb-cust-dropdown-info">
                          <span className="qb-cust-dropdown-name">{cust.name}</span>
                          <span className="qb-cust-dropdown-sub">
                            {cust.phone}{cust.address ? ` • ${cust.address}` : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                    {customers.length > 8 && filteredCustomers.length === 0 && (
                      <div className="qb-cust-dropdown-hint">Type to search customers...</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Name (manual override) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Customer / To Name {selectedCustomerId ? '' : '(Optional)'}
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Walk-in Customer"
                value={customerNameInput}
                onChange={e => {
                  setCustomerNameInput(e.target.value);
                  if (selectedCustomerId) setSelectedCustomerId(null);
                }}
              />
            </div>

            {/* Customer Address */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Customer Address / Details (Optional)
              </label>
              <textarea
                className="input-field"
                rows="2"
                placeholder="Customer Address / Contact (optional)"
                value={customerAddressInput}
                onChange={e => setCustomerAddressInput(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
        </AppModal>
      )}

      {/* ── Edit item modal ── */}
      {editTarget && (
        <EditItemModal
          item={editTarget.bill.items[editTarget.itemIdx]}
          bill={editTarget.bill}
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
