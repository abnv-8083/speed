import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, X, Check, Plus, Minus, Edit2, Trash2,
  ShoppingBag, Receipt, TrendingUp, Hash, Clock,
  History, AlertTriangle, Loader2,
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

// ── Quantity Modal ─────────────────────────────────────────────
function QuantityModal({ product, onConfirm, onCancel, index, total }) {
  const [qty, setQty] = useState(1);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.select(), 50);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (qty >= 1) onConfirm(qty); }
    if (e.key === 'Escape') onCancel();
  };

  return (
    <AppModal
      title={`Set Quantity — ${product.name}`}
      onClose={onCancel}
      width="360px"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onCancel}>Skip</button>
          <button className="btn btn-primary" onClick={() => qty >= 1 && onConfirm(qty)} disabled={qty < 1}>
            <Check size={14} /> {index < total - 1 ? `Next (${index + 2}/${total})` : 'Add to Bill'}
          </button>
        </>
      }
    >
      <div className="qb-qty-modal-body">
        <div className="qb-qty-product-info">
          <span className="qb-qty-product-name">{product.name}</span>
          <span className="qb-qty-product-price">₹{Number(product.price).toFixed(2)} / unit</span>
        </div>
        {index < total - 1 && (
          <p className="qb-qty-hint">
            <Hash size={12} /> Product {index + 1} of {total} selected
          </p>
        )}
        <div className="qb-qty-stepper">
          <button className="qb-qty-step-btn" onClick={() => setQty(q => Math.max(1, q - 1))}><Minus size={16} /></button>
          <input
            ref={inputRef}
            type="number"
            className="input-field qb-qty-input"
            value={qty}
            min={1}
            max={product.stock}
            onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            onKeyDown={handleKeyDown}
          />
          <button className="qb-qty-step-btn" onClick={() => setQty(q => Math.min(product.stock, q + 1))}><Plus size={16} /></button>
        </div>
        <div className="qb-qty-line-total">
          Line total: <strong>₹{(qty * Number(product.price)).toFixed(2)}</strong>
        </div>
        {product.stock <= 10 && (
          <div className="qb-qty-stock-warn">
            <AlertTriangle size={12} /> Only {product.stock} in stock
          </div>
        )}
      </div>
    </AppModal>
  );
}

// ── Edit Bill Item Modal ───────────────────────────────────────
function EditItemModal({ item, onSave, onClose }) {
  const [qty, setQty] = useState(item.quantity);
  return (
    <AppModal
      title={`Edit — ${item.product_name}`}
      onClose={onClose}
      width="340px"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(qty)} disabled={qty < 1}>
            <Check size={14} /> Update
          </button>
        </>
      }
    >
      <div className="qb-qty-stepper">
        <button className="qb-qty-step-btn" onClick={() => setQty(q => Math.max(1, q - 1))}><Minus size={16} /></button>
        <input
          type="number"
          className="input-field qb-qty-input"
          value={qty}
          min={1}
          onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
          autoFocus
        />
        <button className="qb-qty-step-btn" onClick={() => setQty(q => q + 1)}><Plus size={16} /></button>
      </div>
      <div className="qb-qty-line-total" style={{ marginTop: '0.75rem' }}>
        Line total: <strong>₹{(qty * Number(item.price)).toFixed(2)}</strong>
      </div>
    </AppModal>
  );
}

// ── Bill Row ───────────────────────────────────────────────────
function BillRow({ bill, onDelete, onEditItem }) {
  return (
    <div className="qb-bill-row qb-bill-row--open">
      {/* Header */}
      <div className="qb-bill-row-header">
        <div className="qb-bill-row-left">
          <span className="qb-bill-num">#{bill.bill_number}</span>
          <span className="qb-bill-items-count">{bill.items.length} item{bill.items.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="qb-bill-row-right">
          <span className="qb-bill-time">
            <Clock size={11} /> {format(new Date(bill.created_at), 'hh:mm a')}
          </span>
          <span className="qb-bill-total">₹{Number(bill.total).toFixed(2)}</span>
          <button
            className="qb-bill-delete-btn"
            onClick={e => { e.stopPropagation(); onDelete(bill.id); }}
            title="Delete bill"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Always-visible items */}
      <div className="qb-bill-items">
        {bill.items.map((item, idx) => (
          <div key={idx} className="qb-bill-item-row">
            <span className="qb-bill-item-name">{item.product_name}</span>
            <span className="qb-bill-item-qty">×{item.quantity}</span>
            <span className="qb-bill-item-price">₹{Number(item.price).toFixed(2)}</span>
            <span className="qb-bill-item-total">₹{Number(item.line_total).toFixed(2)}</span>
            <button
              className="qb-bill-item-edit"
              onClick={() => onEditItem(bill, idx)}
              title="Edit quantity"
            >
              <Edit2 size={12} />
            </button>
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
  const [products, setProducts]       = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Today's bills
  const [bills, setBills]             = useState([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [summary, setSummary]         = useState({ totalAmount: 0, billCount: 0, itemCount: 0 });

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownResults, setDropdownResults] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]); // products staged for qty entry
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Qty modal queue
  const [qtyQueue, setQtyQueue]       = useState([]); // array of product objects
  const [qtyQueueIdx, setQtyQueueIdx] = useState(0);
  const [pendingItems, setPendingItems] = useState([]); // collected items before creating bill

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

  // ── Search dropdown ───────────────────────────────────────────
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) { setDropdownResults([]); setShowDropdown(false); return; }
    const results = products
      .filter(p => p.name.toLowerCase().includes(q) || p.id.toString().includes(q))
      .slice(0, 10);
    setDropdownResults(results);
    setShowDropdown(results.length > 0);
  }, [searchQuery, products]);

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
  const toggleSelect = (product) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, product];
    });
  };

  const isSelected = (product) => selectedProducts.some(p => p.id === product.id);

  // ── Keyboard: Ctrl+Enter to add selected, Enter to confirm ────
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') { setShowDropdown(false); setSearchQuery(''); return; }

    // Ctrl+Enter — toggle top result into selection
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (dropdownResults.length > 0) toggleSelect(dropdownResults[0]);
      return;
    }

    // Enter alone — if there are selected products, start qty flow
    // If nothing selected but results exist, select first then start
    if (e.key === 'Enter') {
      e.preventDefault();
      const toProcess = selectedProducts.length > 0
        ? selectedProducts
        : dropdownResults.length > 0
        ? [dropdownResults[0]]
        : [];
      if (toProcess.length > 0) startQtyFlow(toProcess);
    }
  };

  // ── Qty flow ──────────────────────────────────────────────────
  const startQtyFlow = (productsToProcess) => {
    setShowDropdown(false);
    setSearchQuery('');
    setSelectedProducts([]);
    setPendingItems([]);
    setQtyQueue(productsToProcess);
    setQtyQueueIdx(0);
  };

  const handleQtyConfirm = useCallback((qty) => {
    const product = qtyQueue[qtyQueueIdx];
    const newItem = {
      product_id:   product.id,
      product_name: product.name,
      price:        Number(product.price),
      quantity:     qty,
      line_total:   qty * Number(product.price),
    };
    const updatedItems = [...pendingItems, newItem];
    setPendingItems(updatedItems);

    const nextIdx = qtyQueueIdx + 1;
    if (nextIdx < qtyQueue.length) {
      setQtyQueueIdx(nextIdx);
    } else {
      // All done — create the bill
      setQtyQueue([]);
      setQtyQueueIdx(0);
      createBill(updatedItems);
    }
  }, [qtyQueue, qtyQueueIdx, pendingItems]);

  const handleQtyCancel = useCallback(() => {
    // Skip this product, continue with next
    const nextIdx = qtyQueueIdx + 1;
    if (nextIdx < qtyQueue.length) {
      setQtyQueueIdx(nextIdx);
    } else {
      // Create bill with whatever was collected so far
      if (pendingItems.length > 0) {
        createBill(pendingItems);
      }
      setQtyQueue([]);
      setQtyQueueIdx(0);
      setPendingItems([]);
    }
  }, [qtyQueue, qtyQueueIdx, pendingItems]);

  // ── Create bill ───────────────────────────────────────────────
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
      setPendingItems([]);
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

  // ── Edit item quantity ────────────────────────────────────────
  const openEditItem = (bill, itemIdx) => setEditTarget({ bill, itemIdx });

  const handleEditItemSave = async (newQty) => {
    const { bill, itemIdx } = editTarget;
    const updatedItems = bill.items.map((item, i) => {
      if (i !== itemIdx) return item;
      return { ...item, quantity: newQty, line_total: newQty * item.price };
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

      {/* ── LEFT: Search + Bill list ── */}
      <div className="qb-left">

        {/* Search bar */}
        <div className="qb-search-section glass-panel">
          <div className="qb-search-wrap" ref={searchRef}>
            <Search size={18} className="qb-search-icon" />
            <input
              className="qb-search-input"
              placeholder="Search product… Ctrl+Enter to multi-select, Enter to confirm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => searchQuery && setShowDropdown(dropdownResults.length > 0)}
              autoComplete="off"
              autoFocus
            />
            {searchQuery && (
              <button className="qb-search-clear" onClick={() => { setSearchQuery(''); setShowDropdown(false); }}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* Selected chips */}
          {selectedProducts.length > 0 && (
            <div className="qb-selected-chips">
              {selectedProducts.map(p => (
                <span key={p.id} className="qb-chip">
                  {p.name}
                  <button onClick={() => toggleSelect(p)}><X size={11} /></button>
                </span>
              ))}
              <button className="qb-chip-confirm" onClick={() => startQtyFlow(selectedProducts)}>
                <Check size={13} /> Add {selectedProducts.length} item{selectedProducts.length !== 1 ? 's' : ''}
              </button>
            </div>
          )}

          {/* Dropdown */}
          {showDropdown && (
            <div className="qb-dropdown" ref={dropdownRef}>
              {dropdownResults.map(product => {
                const sel = isSelected(product);
                const oos = product.stock <= 0;
                return (
                  <div
                    key={product.id}
                    className={`qb-dropdown-item ${sel ? 'qb-dropdown-item--selected' : ''} ${oos ? 'qb-dropdown-item--oos' : ''}`}
                    onClick={() => !oos && toggleSelect(product)}
                  >
                    <div className="qb-drop-check">
                      {sel ? <Check size={13} /> : null}
                    </div>
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
              <div className="qb-dropdown-hint">
                <kbd>Ctrl+Enter</kbd> to multi-select · <kbd>Enter</kbd> to confirm
              </div>
            </div>
          )}
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
              <span>Search a product above to get started</span>
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

      {/* ── Quantity modal queue ── */}
      {qtyQueue.length > 0 && qtyQueueIdx < qtyQueue.length && (
        <QuantityModal
          product={qtyQueue[qtyQueueIdx]}
          index={qtyQueueIdx}
          total={qtyQueue.length}
          onConfirm={handleQtyConfirm}
          onCancel={handleQtyCancel}
        />
      )}

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
