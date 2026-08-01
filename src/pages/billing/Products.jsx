import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Ban, Unlock, Search, Package, ChevronRight, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import Pagination from '../../components/Pagination';
import PremiumLoader from '../../components/PremiumLoader';
import { useToast } from '../../components/ToastContext';
import { useModal } from '../../components/ModalContext';
import './Products.css';

const Products = () => {
  const toast    = useToast();
  const modal    = useModal();
  const navigate = useNavigate();

  const [products, setProducts]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showAddForm, setShowAddForm]     = useState(false);
  const [newProdName, setNewProdName]     = useState('');
  const [newProdPrice, setNewProdPrice]   = useState('');
  const [newProdStock, setNewProdStock]   = useState('');
  const [searchTerm, setSearchTerm]       = useState('');
  const [currentPage, setCurrentPage]     = useState(1);
  const ITEMS_PER_PAGE = 12;

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toString().includes(searchTerm)
  );

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      toast.error('Failed to load products: ' + err.message);
    }
    setLoading(false);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice || !newProdStock) return;
    try {
      const data = await api.createProduct({
        name:     newProdName,
        price:    parseFloat(newProdPrice),
        stock:    parseInt(newProdStock),
        is_print: false,
      });
      setProducts([...products, data]);
      setNewProdName(''); setNewProdPrice(''); setNewProdStock('');
      setShowAddForm(false);
      toast.success('Product added successfully');
    } catch (err) {
      toast.error('Error adding product: ' + err.message);
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
    if (product.stock > 10)  return <span className="status-badge status-good">In Stock</span>;
    if (product.stock > 0)   return <span className="status-badge status-warning">Low Stock</span>;
    return <span className="status-badge status-error">Out of Stock</span>;
  };

  // Truncate MongoDB ObjectId to last 6 chars for display
  const shortId = (id) => `…${String(id).slice(-6)}`;

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
            <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus size={18} /> Add Product
            </button>
          </div>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="add-product-card animate-fade-in">
            <h3>Create Product</h3>
            <form onSubmit={handleAddProduct} className="add-form">
              <div className="form-group">
                <label>Name</label>
                <input type="text" className="input-field" value={newProdName}
                  onChange={e => setNewProdName(e.target.value)} required placeholder="e.g. A4 Paper Bundle" />
              </div>
              <div className="form-group">
                <label>Price (₹)</label>
                <input type="number" className="input-field" value={newProdPrice}
                  onChange={e => setNewProdPrice(e.target.value)} required min="0" step="0.01" placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>Initial Stock</label>
                <input type="number" className="input-field" value={newProdStock}
                  onChange={e => setNewProdStock(e.target.value)} required min="0" placeholder="0" />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        )}

        {/* Column labels */}
        {!loading && filteredProducts.length > 0 && (
          <div className="prod-list-header">
            <span className="prod-col-identity">Product</span>
            <span className="prod-col-price">Price</span>
            <span className="prod-col-stock">Stock</span>
            <span className="prod-col-status">Status</span>
            <span className="prod-col-actions">Actions</span>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ padding: '3rem 0' }}>
            <PremiumLoader text="Loading Inventory..." />
          </div>
        ) : (
          <>
            <div className="inventory-list">
              {filteredProducts.length === 0 ? (
                <div className="empty-inventory">
                  <Package size={40} className="text-muted" />
                  <p className="text-muted">No products found matching your search.</p>
                </div>
              ) : (
                paginatedProducts.map(product => (
                  <div
                    key={product.id}
                    className={`prod-row ${product.is_blocked ? 'prod-row-blocked' : ''}`}
                    onClick={() => navigate(`/billing/products/${product.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && navigate(`/billing/products/${product.id}`)}
                    title="View product details"
                  >
                    {/* Identity: short ID + name */}
                    <div className="prod-col-identity">
                      <span className="prod-id-badge" title={product.id}>{shortId(product.id)}</span>
                      <span className="prod-name" title={product.name}>{product.name}</span>
                    </div>

                    {/* Price */}
                    <div className="prod-col-price">
                      <span className="prod-price">₹{Number(product.price).toFixed(2)}</span>
                    </div>

                    {/* Stock */}
                    <div className="prod-col-stock">
                      <span className={`prod-stock-val ${product.stock === 0 ? 'stock-zero' : product.stock < 10 ? 'stock-low' : ''}`}>
                        {product.stock} <span className="stock-unit">units</span>
                      </span>
                    </div>

                    {/* Status */}
                    <div className="prod-col-status">
                      {getStatusBadge(product)}
                    </div>

                    {/* Actions — stop propagation so row click doesn't fire */}
                    <div className="prod-col-actions" onClick={e => e.stopPropagation()}>
                      <button
                        className={`prod-action-btn ${product.is_blocked ? 'action-success' : 'action-warning'}`}
                        title={product.is_blocked ? 'Unblock' : 'Block'}
                        onClick={e => handleToggleBlock(e, product.id, product.is_blocked)}
                      >
                        {product.is_blocked ? <Unlock size={14} /> : <Ban size={14} />}
                      </button>
                      <button
                        className="prod-action-btn action-danger"
                        title="Delete"
                        onClick={e => handleDeleteProduct(e, product)}
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        className="prod-action-btn action-primary"
                        title="View Details"
                        onClick={e => { e.stopPropagation(); navigate(`/billing/products/${product.id}`); }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

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
