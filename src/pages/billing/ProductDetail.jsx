import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Check, X, Package, TrendingUp,
  Ban, Unlock, Trash2, Layers, Save,
} from 'lucide-react';
import { api } from '../../api';
import PremiumLoader from '../../components/PremiumLoader';
import { useToast } from '../../components/ToastContext';
import { useModal } from '../../components/ModalContext';
import AppModal from '../../components/AppModal';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const toast    = useToast();
  const modal    = useModal();

  const [product, setProduct]         = useState(null);
  const [loading, setLoading]         = useState(true);

  // ── Edit product modal state ─────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName]           = useState('');
  const [editCost, setEditCost]           = useState('');
  const [editPrice, setEditPrice]         = useState('');
  const [editSaving, setEditSaving]       = useState(false);

  // ── Stock update state ───────────────────────────────────────
  const [showStockModal, setShowStockModal] = useState(false);
  const [newStock, setNewStock]             = useState('');
  const [stockSaving, setStockSaving]       = useState(false);

  useEffect(() => { fetchProduct(); }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      // Reuse getProducts and find by id — no dedicated endpoint needed
      const all  = await api.getProducts();
      const found = all.find(p => p.id === id || p._id === id);
      if (!found) throw new Error('Product not found');
      setProduct(found);
    } catch (err) {
      toast.error('Failed to load product: ' + err.message);
      navigate('/billing/products');
    }
    setLoading(false);
  };

  // ── Open edit modal pre-filled ───────────────────────────────
  const openEditModal = () => {
    setEditName(product.name);
    setEditCost(String(product.cost_price || 0));
    setEditPrice(String(product.price));
    setShowEditModal(true);
  };

  // ── Save full edit ───────────────────────────────────────────
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editName || !editPrice) return;
    setEditSaving(true);
    try {
      const updated = await api.updateProduct(id, {
        name:       editName.trim(),
        cost_price: parseFloat(editCost) || 0,
        price:      parseFloat(editPrice),
      });
      setProduct(prev => ({ ...prev, ...updated }));
      setShowEditModal(false);
      toast.success('Product updated successfully');
    } catch (err) {
      toast.error('Failed to update product: ' + err.message);
    }
    setEditSaving(false);
  };

  // ── Save stock update ────────────────────────────────────────
  const handleSaveStock = async (e) => {
    e.preventDefault();
    const val = parseInt(newStock);
    if (isNaN(val) || val < 0) return;
    setStockSaving(true);
    try {
      const updated = await api.updateProduct(id, { stock: val });
      setProduct(prev => ({ ...prev, stock: updated.stock ?? val }));
      setShowStockModal(false);
      toast.success('Stock updated successfully');
    } catch (err) {
      toast.error('Failed to update stock: ' + err.message);
    }
    setStockSaving(false);
  };

  // ── Toggle block ─────────────────────────────────────────────
  const handleToggleBlock = async () => {
    const newStatus = !product.is_blocked;
    try {
      await api.updateProduct(id, { is_blocked: newStatus });
      setProduct(prev => ({ ...prev, is_blocked: newStatus }));
      toast.success(`Product ${newStatus ? 'blocked' : 'unblocked'} successfully`);
    } catch (err) {
      toast.error('Error updating status: ' + err.message);
    }
  };

  // ── Delete ───────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!await modal.confirm('Delete Product', `Are you sure you want to delete "${product.name}"?`)) return;
    try {
      await api.deleteProduct(id);
      toast.success('Product deleted');
      navigate('/billing/products');
    } catch (err) {
      if (err.message?.includes('foreign key constraint')) {
        try {
          await api.updateProduct(id, { is_blocked: true, name: `[DELETED] ${product.name}` });
          toast.success('Product soft-deleted (has past invoices).');
          navigate('/billing/products');
        } catch (ae) {
          toast.error('Failed to archive: ' + ae.message);
        }
      } else {
        toast.error('Error deleting product: ' + err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="pd-loading">
        <PremiumLoader text="Loading Product..." />
      </div>
    );
  }

  if (!product) return null;

  const stockStatus = product.is_blocked
    ? { label: 'Blocked',      cls: 'status-error'   }
    : product.stock > 10
    ? { label: 'In Stock',     cls: 'status-good'    }
    : product.stock > 0
    ? { label: 'Low Stock',    cls: 'status-warning' }
    : { label: 'Out of Stock', cls: 'status-error'   };

  const shortId = `…${String(product.id).slice(-6)}`;

  return (
    <div className="pd-root animate-fade-in">

      {/* ── Top bar ── */}
      <div className="pd-topbar glass-panel">
        <button className="pd-back-btn" onClick={() => navigate('/billing/products')}>
          <ArrowLeft size={17} /> Inventory
        </button>
        <div className="pd-topbar-actions">
          <button className="pd-btn pd-btn-stock" onClick={() => { setNewStock(String(product.stock)); setShowStockModal(true); }}>
            <Layers size={15} /> Update Stock
          </button>
          <button className="pd-btn pd-btn-edit" onClick={openEditModal}>
            <Edit2 size={15} /> Edit Product
          </button>
          <button
            className={`pd-btn ${product.is_blocked ? 'pd-btn-unblock' : 'pd-btn-block'}`}
            onClick={handleToggleBlock}
          >
            {product.is_blocked ? <Unlock size={15} /> : <Ban size={15} />}
            {product.is_blocked ? 'Unblock' : 'Block'}
          </button>
          <button className="pd-btn pd-btn-delete" onClick={handleDelete}>
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="pd-body">

        {/* Product card */}
        <div className="pd-card glass-panel">
          <div className="pd-card-header">
            <div className="pd-icon-wrap">
              <Package size={28} />
            </div>
            <div className="pd-card-info">
              <h1 className="pd-name">{product.name}</h1>
              <span className="pd-short-id" title={product.id}>{shortId}</span>
            </div>
            <span className={`status-badge ${stockStatus.cls} pd-status`}>{stockStatus.label}</span>
          </div>

          <div className="pd-stats-grid">
            <div className="pd-stat">
              <span className="pd-stat-label">Selling Price</span>
              <span className="pd-stat-value pd-stat-price">₹{Number(product.price).toFixed(2)}</span>
            </div>
            <div className="pd-stat">
              <span className="pd-stat-label">Cost Price</span>
              <span className="pd-stat-value" style={{ color: product.cost_price > 0 ? '#f87171' : 'var(--text-muted)' }}>
                {product.cost_price > 0 ? `₹${Number(product.cost_price).toFixed(2)}` : '—'}
              </span>
            </div>
            <div className="pd-stat">
              <span className="pd-stat-label">Margin</span>
              <span className="pd-stat-value" style={{ color: '#34d399' }}>
                {product.cost_price > 0
                  ? `${(((product.price - product.cost_price) / product.price) * 100).toFixed(1)}%`
                  : '—'}
              </span>
            </div>
            <div className="pd-stat">
              <span className="pd-stat-label">Profit / Unit</span>
              <span className="pd-stat-value" style={{ color: '#34d399' }}>
                {product.cost_price > 0
                  ? `₹${(product.price - product.cost_price).toFixed(2)}`
                  : '—'}
              </span>
            </div>
            <div className="pd-stat">
              <span className="pd-stat-label">Stock Level</span>
              <span className={`pd-stat-value ${product.stock === 0 ? 'stock-zero' : product.stock < 10 ? 'stock-low' : ''}`}>
                {product.stock} <small>units</small>
              </span>
            </div>
            <div className="pd-stat">
              <span className="pd-stat-label">Print Product</span>
              <span className="pd-stat-value">{product.is_print ? 'Yes' : 'No'}</span>
            </div>
            <div className="pd-stat">
              <span className="pd-stat-label">Created</span>
              <span className="pd-stat-value">
                {product.created_at ? new Date(product.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Full ID */}
        <div className="pd-id-card glass-panel">
          <span className="pd-id-label">Product ID</span>
          <span className="pd-id-value">{product.id}</span>
        </div>

      </div>

      {/* ── Edit Product Modal ── */}
      {showEditModal && (
        <AppModal
          title="Edit Product"
          onClose={() => !editSaving && setShowEditModal(false)}
          width="420px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)} disabled={editSaving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={editSaving}>
                <Save size={15} /> {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="pd-form-field">
            <label>Product Name</label>
            <input type="text" className="input-field" value={editName}
              onChange={e => setEditName(e.target.value)} required autoFocus disabled={editSaving} />
          </div>
          <div className="pd-form-field">
            <label>Cost Price (₹) <span style={{fontSize:'0.72rem',color:'var(--text-muted)',fontWeight:400}}>— what you paid</span></label>
            <input type="number" className="input-field" value={editCost}
              onChange={e => setEditCost(e.target.value)} min="0" step="0.01" disabled={editSaving} />
          </div>
          <div className="pd-form-field">
            <label>Selling Price (₹) <span style={{fontSize:'0.72rem',color:'var(--text-muted)',fontWeight:400}}>— what you charge</span></label>
            <input type="number" className="input-field" value={editPrice}
              onChange={e => setEditPrice(e.target.value)} required min="0" step="0.01" disabled={editSaving} />
          </div>
        </AppModal>
      )}

      {/* ── Update Stock Modal ── */}
      {showStockModal && (
        <AppModal
          title="Update Stock"
          onClose={() => !stockSaving && setShowStockModal(false)}
          width="380px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowStockModal(false)} disabled={stockSaving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveStock} disabled={stockSaving}>
                <Check size={15} /> {stockSaving ? 'Saving…' : 'Update Stock'}
              </button>
            </>
          }
        >
          <div className="pd-stock-current">
            Current stock: <strong>{product.stock} units</strong>
          </div>
          <div className="pd-form-field">
            <label>New Stock Level</label>
            <input type="number" className="input-field" value={newStock}
              onChange={e => setNewStock(e.target.value)} required min="0" autoFocus disabled={stockSaving} />
          </div>
        </AppModal>
      )}

    </div>
  );
};

export default ProductDetail;
