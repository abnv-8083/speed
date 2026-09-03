import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Ban, Unlock, Search, Package, ChevronRight, LayoutGrid, LayoutList, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square, X as XIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useWs } from '../../contexts/WebSocketContext';
import Pagination from '../../components/Pagination';
import PremiumLoader from '../../components/PremiumLoader';
import { useToast } from '../../components/ToastContext';
import { useModal } from '../../components/ModalContext';
import AppModal from '../../components/AppModal';
import './Products.css';

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'price', label: 'Price' },
  { value: 'stock', label: 'Stock' },
  { value: 'status', label: 'Status' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'product', label: 'Products Only' },
  { value: 'service', label: 'Services Only' },
];

const STOCK_OPTIONS = [
  { value: 'all', label: 'All Stock' },
  { value: 'in_stock', label: 'In Stock (>10)' },
  { value: 'low', label: 'Low Stock (1–10)' },
  { value: 'out', label: 'Out of Stock' },
];

const Products = () => {
  const toast    = useToast();
  const modal    = useModal();
  const navigate = useNavigate();

  const [products, setProducts]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showAddForm, setShowAddForm]     = useState(false);
  const [newProdName, setNewProdName]     = useState('');
  const [newProdType, setNewProdType]     = useState('product'); // 'product' | 'service'
  const [newProdCost, setNewProdCost]     = useState('');
  const [newProdPrice, setNewProdPrice]   = useState('');
  const [newProdStock, setNewProdStock]   = useState('');
  const [searchTerm, setSearchTerm]       = useState('');
  const [currentPage, setCurrentPage]     = useState(1);
  const [viewMode, setViewMode]           = useState('list'); // 'list' | 'card'
  const ITEMS_PER_PAGE = 12;

  // ── Sort & Filter state ────────────────────────────────────────
  const [sortBy, setSortBy]         = useState('name');   // 'name' | 'price' | 'stock' | 'status'
  const [sortDir, setSortDir]       = useState('asc');    // 'asc' | 'desc'
  const [filterType, setFilterType] = useState('all');    // 'all' | 'product' | 'service'
  const [filterStock, setFilterStock] = useState('all');  // 'all' | 'in_stock' | 'low' | 'out'
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // ── Bulk edit state ────────────────────────────────────────────
  const [selectedIds, setSelectedIds]       = useState(new Set());
  const [bulkUpdating, setBulkUpdating]     = useState(false);

  // ── Derived: filtered + sorted + paginated products ────────────
  const getStockStatus = (p) => {
    if (p.type === 'service') return 'service';
    if (p.stock === 0) return 'out';
    if (p.stock <= 10) return 'low';
    return 'in_stock';
  };

  const getStatusOrder = (p) => {
    if (p.is_blocked) return 4;
    if (p.type === 'service') return 3;
    if (p.stock === 0) return 2;
    if (p.stock <= 10) return 1;
    return 0;
  };

  const filteredProducts = products
    .filter(p => {
      // Search filter
      if (!p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !p.id.toString().includes(searchTerm)) return false;
      // Type filter
      if (filterType !== 'all' && p.type !== filterType) return false;
      // Stock filter
      if (filterStock !== 'all' && getStockStatus(p) !== filterStock) return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':  cmp = a.name.localeCompare(b.name); break;
        case 'price': cmp = (a.price || 0) - (b.price || 0); break;
        case 'stock': cmp = (a.stock || 0) - (b.stock || 0); break;
        case 'status': cmp = getStatusOrder(a) - getStatusOrder(b); break;
        default: cmp = 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      toast.error('Failed to load products: ' + err.message);
    }
    setLoading(false);
  }, []);

  // Real-time product updates via WebSocket
  const { on } = useWs();
  useEffect(() => {
    const unsub = on('products', (event, data) => {
      switch (event) {
        case 'created':
          setProducts(prev => {
            if (prev.some(p => p.id === data.id)) return prev;
            return [...prev, data];
          });
          break;
        case 'updated':
          setProducts(prev => prev.map(p => p.id === data.id ? data : p));
          break;
        case 'deleted':
          setProducts(prev => prev.filter(p => p.id !== data.id));
          break;
        default:
          fetchProducts();
      }
    });
    return unsub;
  }, [on, fetchProducts]);

  useEffect(() => { fetchProducts(); }, []);

  const handleAddProduct = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newProdName) return;
    if (newProdType === 'product' && (!newProdPrice || !newProdStock)) {
      toast.error('Selling Price and Stock are required for products');
      return;
    }
    try {
      const data = await api.createProduct({
        name:       newProdName,
        type:       newProdType,
        cost_price: parseFloat(newProdCost) || 0,
        price:      newProdType === 'service' ? 0 : parseFloat(newProdPrice),
        stock:      newProdType === 'product' ? parseInt(newProdStock, 10) || 0 : 0,
        is_print:   false,
      });
      setProducts([...products, data]);
      setNewProdName(''); setNewProdType('product'); setNewProdCost(''); setNewProdPrice(''); setNewProdStock('');
      setShowAddForm(false);
      toast.success(`${newProdType === 'service' ? 'Service' : 'Product'} added successfully`);
    } catch (err) {
      toast.error('Error adding item: ' + err.message);
    }
  };

  const handleDeleteProduct = async (e, product) => {
    e.stopPropagation();
    if (await modal.confirm('Delete Product', `Are you sure you want to delete ${product.name}?`)) {
      try {
        await api.deleteProduct(product.id);
        setProducts(products.filter(p => p.id !== product.id));
        toast.success('Product deleted successfully');
      } catch (err) {
        if (err.message?.includes('foreign key constraint')) {
          try {
            await api.updateProduct(product.id, { is_blocked: true, name: `[DELETED] ${product.name}` });
            setProducts(products.filter(p => p.id !== product.id));
            toast.success('Product was soft-deleted (It has past invoices).');
          } catch (archiveErr) {
            toast.error('Failed to archive product: ' + archiveErr.message);
          }
        } else {
          toast.error('Error deleting product: ' + err.message);
        }
      }
    }
  };

  const handleToggleBlock = async (e, id, currentStatus) => {
    e.stopPropagation();
    const newStatus = !currentStatus;
    try {
      await api.updateProduct(id, { is_blocked: newStatus });
      setProducts(products.map(p => p.id === id ? { ...p, is_blocked: newStatus } : p));
      toast.success(`Product ${newStatus ? 'blocked' : 'unblocked'} successfully`);
    } catch (err) {
      toast.error('Error updating status: ' + err.message);
    }
  };

  const getStatusBadge = (product) => {
    if (product.is_blocked) return <span className="status-badge status-error">Blocked</span>;
    if (product.type === 'service') return <span className="status-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>Service</span>;
    if (product.stock > 10)  return <span className="status-badge status-good">In Stock</span>;
    if (product.stock > 0)   return <span className="status-badge status-warning">Low Stock</span>;
    return <span className="status-badge status-error">Out of Stock</span>;
  };

  // Truncate MongoDB ObjectId to last 6 chars for display
  const shortId = (id) => `…${String(id).slice(-6)}`;

  // ── Bulk edit handlers ─────────────────────────────────────────
  const isAllSelected = paginatedProducts.length > 0 &&
    paginatedProducts.every(p => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedProducts.forEach(p => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedProducts.forEach(p => next.add(p.id));
        return next;
      });
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (await modal.confirm('Bulk Delete', `Are you sure you want to delete ${selectedIds.size} item(s)?`)) {
      setBulkUpdating(true);
      let deleted = 0;
      let failed = 0;
      for (const id of selectedIds) {
        try {
          await api.deleteProduct(id);
          deleted++;
        } catch {
          failed++;
        }
      }
      setProducts(prev => prev.filter(p => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      setBulkUpdating(false);
      if (failed === 0) toast.success(`${deleted} item(s) deleted`);
      else toast.success(`${deleted} deleted, ${failed} failed`);
    }
  };

  const handleBulkBlock = async (block) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    let updated = 0;
    for (const id of selectedIds) {
      try {
        await api.updateProduct(id, { is_blocked: block });
        updated++;
      } catch {}
    }
    setProducts(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, is_blocked: block } : p));
    setSelectedIds(new Set());
    setBulkUpdating(false);
    toast.success(`${updated} item(s) ${block ? 'blocked' : 'unblocked'}`);
  };

  // ── Sort toggle ────────────────────────────────────────────────
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="sort-icon-inactive" />;
    return sortDir === 'asc' ? <ArrowUp size={12} className="sort-icon-active" /> : <ArrowDown size={12} className="sort-icon-active" />;
  };

  // ── Filter badge count ─────────────────────────────────────────
  const activeFilterCount = (filterType !== 'all' ? 1 : 0) + (filterStock !== 'all' ? 1 : 0);

  return (
    <div className="products-layout animate-fade-in">
      <div className="glass-panel products-container">

        {/* Header */}
        <div className="products-header">
          <div>
            <h2>Inventory Management</h2>
            <p className="text-muted">Manage your store products and stock levels.</p>
          </div>
          <div className="products-header-actions">
            <div className="prod-search-box">
              <Search size={16} className="prod-search-icon" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="prod-search-input"
              />
            </div>
            {/* View toggle */}
            <div className="prod-view-toggle">
              <button
                className={`prod-view-btn ${viewMode === 'list' ? 'prod-view-btn--active' : ''}`}
                onClick={() => setViewMode('list')} title="List view"
              >
                <LayoutList size={16} />
              </button>
              <button
                className={`prod-view-btn ${viewMode === 'card' ? 'prod-view-btn--active' : ''}`}
                onClick={() => setViewMode('card')} title="Card view"
              >
                <LayoutGrid size={16} />
              </button>
            </div>

            {/* Sort dropdown */}
            <div className="prod-sort-dropdown">
              <button className="prod-filter-btn" onClick={() => handleSort(sortBy)} title={`Sort by ${sortBy}`}>
                <ArrowUpDown size={15} />
                <span className="prod-filter-btn-label">{SORT_OPTIONS.find(s => s.value === sortBy)?.label}</span>
                {sortDir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
              </button>
              <div className="prod-sort-menu">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`prod-sort-option ${sortBy === opt.value ? 'prod-sort-option--active' : ''}`}
                    onClick={() => handleSort(opt.value)}
                  >
                    {opt.label}
                    {sortBy === opt.value && (sortDir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter dropdown */}
            <div className="prod-filter-dropdown">
              <button
                className={`prod-filter-btn ${activeFilterCount > 0 ? 'prod-filter-btn--active' : ''}`}
                onClick={() => setShowFilterMenu(m => !m)}
              >
                <span className="prod-filter-btn-icon">⬡</span>
                <span className="prod-filter-btn-label">Filter</span>
                {activeFilterCount > 0 && <span className="prod-filter-badge">{activeFilterCount}</span>}
              </button>
              {showFilterMenu && (
                <>
                  <div className="prod-filter-backdrop" onClick={() => setShowFilterMenu(false)} />
                  <div className="prod-filter-menu">
                    <div className="prod-filter-section">
                      <span className="prod-filter-section-title">Type</span>
                      {TYPE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          className={`prod-filter-option ${filterType === opt.value ? 'prod-filter-option--active' : ''}`}
                          onClick={() => { setFilterType(opt.value); setCurrentPage(1); }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="prod-filter-divider" />
                    <div className="prod-filter-section">
                      <span className="prod-filter-section-title">Stock Status</span>
                      {STOCK_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          className={`prod-filter-option ${filterStock === opt.value ? 'prod-filter-option--active' : ''}`}
                          onClick={() => { setFilterStock(opt.value); setCurrentPage(1); }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {activeFilterCount > 0 && (
                      <button
                        className="prod-filter-clear"
                        onClick={() => { setFilterType('all'); setFilterStock('all'); setCurrentPage(1); setShowFilterMenu(false); }}
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus size={18} /> Add Product
            </button>
          </div>
        </div>

        {/* ── Bulk Action Bar ───────────────────────────────────── */}
        {selectedIds.size > 0 && (
          <div className="bulk-action-bar animate-fade-in">
            <div className="bulk-action-left">
              <button className="bulk-deselect-btn" onClick={() => setSelectedIds(new Set())} title="Clear selection">
                <XIcon size={14} />
              </button>
              <span className="bulk-count">{selectedIds.size} selected</span>
            </div>
            <div className="bulk-action-right">
              <button
                className="bulk-action-btn bulk-action-unblock"
                disabled={bulkUpdating}
                onClick={() => handleBulkBlock(false)}
              >
                <Unlock size={14} /> Unblock
              </button>
              <button
                className="bulk-action-btn bulk-action-block"
                disabled={bulkUpdating}
                onClick={() => handleBulkBlock(true)}
              >
                <Ban size={14} /> Block
              </button>
              <button
                className="bulk-action-btn bulk-action-delete"
                disabled={bulkUpdating}
                onClick={handleBulkDelete}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        )}

        {/* Add Product Modal */}
        {showAddForm && (
          <AppModal
            title="Add New Inventory Item"
            onClose={() => setShowAddForm(false)}
            width="460px"
            footer={
              <>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleAddProduct}>Save {newProdType === 'service' ? 'Service' : 'Product'}</button>
              </>
            }
          >
            <div className="form-group">
              <label>Item Type</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="radio"
                    name="itemType"
                    value="product"
                    checked={newProdType === 'product'}
                    onChange={() => setNewProdType('product')}
                  />
                  Physical Product (with Stock)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="radio"
                    name="itemType"
                    value="service"
                    checked={newProdType === 'service'}
                    onChange={() => setNewProdType('service')}
                  />
                  Service (No Stock needed)
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>{newProdType === 'service' ? 'Service Name' : 'Product Name'}</label>
              <input type="text" className="input-field" value={newProdName}
                onChange={e => setNewProdName(e.target.value)} required placeholder={newProdType === 'service' ? 'e.g. Color Xerox / Lamination' : 'e.g. A4 Paper Bundle'} autoFocus />
            </div>
            {newProdType === 'product' && (
              <div className="form-group">
                <label>Cost Price (₹) <span style={{fontSize:'0.72rem',color:'var(--text-muted)',fontWeight:400}}>— your expense</span></label>
                <input type="number" className="input-field" value={newProdCost}
                  onChange={e => setNewProdCost(e.target.value)} min="0" step="0.01" placeholder="0.00" />
              </div>
            )}
            {newProdType === 'product' && (
              <div className="form-group">
                <label>Selling Price (₹) <span style={{fontSize:'0.72rem',color:'var(--text-muted)',fontWeight:400}}>— what you charge</span></label>
                <input type="number" className="input-field" value={newProdPrice}
                  onChange={e => setNewProdPrice(e.target.value)} required min="0" step="0.01" placeholder="0.00" />
              </div>
            )}

            {newProdType === 'product' && (
              <div className="form-group">
                <label>Initial Stock Level</label>
                <input type="number" className="input-field" value={newProdStock}
                  onChange={e => setNewProdStock(e.target.value)} required min="0" placeholder="e.g. 50" />
              </div>
            )}
          </AppModal>
        )}

        {/* Column labels — list view only */}
        {!loading && filteredProducts.length > 0 && viewMode === 'list' && (
          <div className="prod-list-header">
            <span className="prod-col-checkbox" style={{ width: 36, flexShrink: 0 }}>
              <button className="prod-select-all-btn" onClick={toggleSelectAll} title={isAllSelected ? 'Deselect all' : 'Select all'}>
                {isAllSelected ? <CheckSquare size={16} /> : <Square size={16} />}
              </button>
            </span>
            <span className="prod-col-identity">Product / Service</span>
            <span className="prod-col-price prod-col-sortable" onClick={() => handleSort('price')}>
              Price <SortIcon field="price" />
            </span>
            <span className="prod-col-stock prod-col-sortable" onClick={() => handleSort('stock')}>
              Stock / Type <SortIcon field="stock" />
            </span>
            <span className="prod-col-status prod-col-sortable" onClick={() => handleSort('status')}>
              Status <SortIcon field="status" />
            </span>
            <span className="prod-col-actions">Actions</span>
          </div>
        )}

        {/* List / Card */}
        {loading ? (
          <div style={{ padding: '3rem 0' }}>
            <PremiumLoader text="Loading Inventory..." />
          </div>
        ) : (
          <>
            {/* ── LIST VIEW ── */}
            {viewMode === 'list' && (
              <div className="inventory-list">
                {filteredProducts.length === 0 ? (
                  <div className="empty-inventory">
                    <Package size={40} className="text-muted" />
                    <p className="text-muted">No items found.</p>
                  </div>
                ) : (
                  paginatedProducts.map(product => (
                    <div
                      key={product.id}
                      className={`prod-row ${product.is_blocked ? 'prod-row-blocked' : ''} ${selectedIds.has(product.id) ? 'prod-row--selected' : ''}`}
                      onClick={() => navigate(`/admin/billing/products/${product.id}`)}
                      role="button" tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && navigate(`/admin/billing/products/${product.id}`)}
                    >
                      <div className="prod-col-checkbox" style={{ width: 36, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button className="prod-select-btn" onClick={() => toggleSelect(product.id)}>
                          {selectedIds.has(product.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </div>
                      <div className="prod-col-identity">
                        <span className="prod-id-badge" title={product.id}>{shortId(product.id)}</span>
                        <span className="prod-name" title={product.name}>{product.name}</span>
                      </div>
                      <div className="prod-col-price">
                        <span className="prod-price">
                          {product.type === 'service' ? (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Varies</span>
                          ) : (
                            `₹${Number(product.price).toFixed(2)}`
                          )}
                        </span>
                        {product.cost_price > 0 && <span className="prod-cost-price">{product.type === 'service' ? 'S.Price' : 'Cost'}: ₹{Number(product.cost_price).toFixed(2)}</span>}
                      </div>
                      <div className="prod-col-stock">
                        {product.type === 'service' ? (
                          <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 500 }}>Service (No Stock)</span>
                        ) : (
                          <span className={`prod-stock-val ${product.stock === 0 ? 'stock-zero' : product.stock < 10 ? 'stock-low' : ''}`}>
                            {product.stock} <span className="stock-unit">units</span>
                          </span>
                        )}
                      </div>
                      <div className="prod-col-status">{getStatusBadge(product)}</div>
                      <div className="prod-col-actions" onClick={e => e.stopPropagation()}>
                        <button className={`prod-action-btn ${product.is_blocked ? 'action-success' : 'action-warning'}`}
                          title={product.is_blocked ? 'Unblock' : 'Block'}
                          onClick={e => handleToggleBlock(e, product.id, product.is_blocked)}>
                          {product.is_blocked ? <Unlock size={14} /> : <Ban size={14} />}
                        </button>
                        <button className="prod-action-btn action-danger" title="Delete"
                          onClick={e => handleDeleteProduct(e, product)}>
                          <Trash2 size={14} />
                        </button>
                        <button className="prod-action-btn action-primary" title="View Details"
                          onClick={e => { e.stopPropagation(); navigate(`/admin/billing/products/${product.id}`); }}>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── CARD VIEW ── */}
            {viewMode === 'card' && (
              <div className="inventory-card-grid">
                {filteredProducts.length === 0 ? (
                  <div className="empty-inventory" style={{ gridColumn: '1/-1' }}>
                    <Package size={40} className="text-muted" />
                    <p className="text-muted">No products found.</p>
                  </div>
                ) : (
                  paginatedProducts.map(product => (
                    <div
                      key={product.id}
                      className={`prod-card ${product.is_blocked ? 'prod-card--blocked' : ''} ${selectedIds.has(product.id) ? 'prod-card--selected' : ''}`}
                      onClick={() => navigate(`/admin/billing/products/${product.id}`)}
                      role="button" tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && navigate(`/admin/billing/products/${product.id}`)}
                    >
                      {/* Card top bar color */}
                      <div className={`prod-card-bar ${product.stock === 0 ? 'prod-card-bar--oos' : product.stock < 10 ? 'prod-card-bar--low' : 'prod-card-bar--ok'}`} />

                      <div className="prod-card-body">
                        {/* Icon + status */}
                        <div className="prod-card-head">
                          <div className="prod-card-icon">
                            <Package size={22} />
                          </div>
                          <div className="prod-card-head-right">
                            <button className="prod-card-select-btn" onClick={e => { e.stopPropagation(); toggleSelect(product.id); }}>
                              {selectedIds.has(product.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                            {getStatusBadge(product)}
                          </div>
                        </div>

                        {/* Name */}
                        <h4 className="prod-card-name" title={product.name}>{product.name}</h4>
                        <span className="prod-card-id" title={product.id}>{shortId(product.id)}</span>

                        {/* Prices */}
                        <div className="prod-card-prices">
                          {product.type === 'service' ? (
                            <div className="prod-card-price-row">
                              <span className="prod-card-price-label">S.Price</span>
                              <span className="prod-card-cost-price">{product.cost_price > 0 ? `₹${Number(product.cost_price).toFixed(2)}` : '—'}</span>
                            </div>
                          ) : (
                            <>
                              <div className="prod-card-price-row">
                                <span className="prod-card-price-label">Sell</span>
                                <span className="prod-card-sell-price">₹{Number(product.price).toFixed(2)}</span>
                              </div>
                              {product.cost_price > 0 && (
                                <div className="prod-card-price-row">
                                  <span className="prod-card-price-label">Cost</span>
                                  <span className="prod-card-cost-price">₹{Number(product.cost_price).toFixed(2)}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Stock */}
                        <div className="prod-card-stock-row">
                          {product.type === 'service' ? (
                            <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600 }}>
                              Service Item
                            </span>
                          ) : (
                            <>
                              <span className={`prod-card-stock ${product.stock === 0 ? 'stock-zero' : product.stock < 10 ? 'stock-low' : ''}`}>
                                {product.stock}
                              </span>
                              <span className="prod-card-stock-label">units in stock</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="prod-card-actions" onClick={e => e.stopPropagation()}>
                        <button className={`prod-action-btn ${product.is_blocked ? 'action-success' : 'action-warning'}`}
                          title={product.is_blocked ? 'Unblock' : 'Block'}
                          onClick={e => handleToggleBlock(e, product.id, product.is_blocked)}>
                          {product.is_blocked ? <Unlock size={13} /> : <Ban size={13} />}
                        </button>
                        <button className="prod-action-btn action-danger" title="Delete"
                          onClick={e => handleDeleteProduct(e, product)}>
                          <Trash2 size={13} />
                        </button>
                        <button className="prod-action-btn action-primary" title="View Details"
                          onClick={e => { e.stopPropagation(); navigate(`/admin/billing/products/${product.id}`); }}
                          style={{ marginLeft: 'auto' }}>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalItems={filteredProducts.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Products;
