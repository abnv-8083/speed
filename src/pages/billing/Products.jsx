import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Check, X, Loader2, Trash2, Ban, Unlock } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import Pagination from '../../components/Pagination';
import PremiumLoader from '../../components/PremiumLoader';
import { useToast } from '../../components/ToastContext';
import { useModal } from '../../components/ModalContext';
import './Products.css';

const Products = () => {
  const toast = useToast();
  const modal = useModal();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  
  const [editingStockId, setEditingStockId] = useState(null);
  const [newStockValue, setNewStockValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.toString().includes(searchTerm)
  );

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .not('name', 'ilike', '[DELETED]%')
      .order('id', { ascending: true });
      
    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (newProdName && newProdPrice && newProdStock) {
      const newProduct = {
        name: newProdName,
        price: parseFloat(newProdPrice),
        stock: parseInt(newProdStock),
        is_print: false
      };
      
      const { data, error } = await supabase
        .from('products')
        .insert([newProduct])
        .select();
        
      if (!error && data) {
        setProducts([...products, data[0]]);
        setNewProdName('');
        setNewProdPrice('');
        setNewProdStock('');
        setShowAddForm(false);
        toast.success("Product added successfully");
      } else {
        toast.error('Error adding product: ' + error.message);
      }
    }
  };

  const startStockEdit = (product) => {
    setEditingStockId(product.id);
    setNewStockValue(product.stock.toString());
  };

  const saveStockEdit = async (id) => {
    const val = parseInt(newStockValue);
    if (!isNaN(val) && val >= 0) {
      setProducts(products.map(p => p.id === id ? { ...p, stock: val } : p));
      
      const { error } = await supabase
        .from('products')
        .update({ stock: val })
        .eq('id', id);
        
      if (error) {
        toast.error('Failed to update stock');
        fetchProducts();
      } else {
        toast.success("Stock updated successfully");
      }
    }
    setEditingStockId(null);
  };

  const handleDeleteProduct = async (product) => {
    if (await modal.confirm("Delete Product", `Are you sure you want to delete ${product.name}?`)) {
      const { error } = await supabase.from('products').delete().eq('id', product.id);
      
      if (error && error.message.includes('foreign key constraint')) {
        // Soft delete workaround: rename and block so it hides from UI but keeps invoice history
        const archivedName = `[DELETED] ${product.name}`;
        const { error: archiveError } = await supabase
          .from('products')
          .update({ is_blocked: true, name: archivedName })
          .eq('id', product.id);
          
        if (archiveError) {
          toast.error('Failed to archive product: ' + archiveError.message);
        } else {
          setProducts(products.filter(p => p.id !== product.id));
          toast.success("Product was soft-deleted (It has past invoices).");
        }
      } else if (error) {
        toast.error('Error deleting product: ' + error.message);
      } else {
        setProducts(products.filter(p => p.id !== product.id));
        toast.success("Product deleted successfully");
      }
    }
  };

  const handleToggleBlock = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    const { error } = await supabase.from('products').update({ is_blocked: newStatus }).eq('id', id);
    if (error) {
      toast.error('Error updating status: ' + error.message);
    } else {
      setProducts(products.map(p => p.id === id ? { ...p, is_blocked: newStatus } : p));
      toast.success(`Product ${newStatus ? 'blocked' : 'unblocked'} successfully`);
    }
  };

  return (
    <div className="products-layout animate-fade-in">
      <div className="glass-panel products-container">
        <div className="products-header">
          <div>
            <h2>Inventory Management</h2>
            <p className="text-muted">Manage your store products and stock levels.</p>
          </div>
          <div className="products-header-actions">
            <input 
              type="text" 
              placeholder="🔍 Search products..." 
              value={searchTerm} 
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="inventory-search-input"
            />
            <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus size={18} /> Add New Product
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="add-product-card animate-fade-in">
            <h3>Create Product</h3>
            <form onSubmit={handleAddProduct} className="add-form">
              <div className="form-group">
                <label>Name</label>
                <input type="text" className="input-field" value={newProdName} onChange={e => setNewProdName(e.target.value)} required placeholder="e.g. A4 Paper Bundle" />
              </div>
              <div className="form-group">
                <label>Price (₹)</label>
                <input type="number" className="input-field" value={newProdPrice} onChange={e => setNewProdPrice(e.target.value)} required min="0" step="0.01" placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>Initial Stock</label>
                <input type="number" className="input-field" value={newProdStock} onChange={e => setNewProdStock(e.target.value)} required min="0" placeholder="0" />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '3rem 0' }}>
            <PremiumLoader text="Loading Inventory..." />
          </div>
        ) : (
          <>
            <div className="inventory-cards-grid">
              {filteredProducts.length === 0 ? (
                <div className="empty-inventory-cards">
                  <p className="text-muted">No products found matching your search.</p>
                </div>
              ) : (
                paginatedProducts.map(product => (
                  <div key={product.id} className={`inventory-grid-card ${product.is_blocked ? 'card-blocked' : ''}`}>
                    {/* Top Row: ID + Status Badge on Left, Action Buttons on Right */}
                    <div className="grid-card-top">
                      <div className="grid-card-badges">
                        <span className="card-prod-id">#{product.id}</span>
                        {product.is_blocked ? (
                          <span className="status-badge status-error">Blocked</span>
                        ) : product.stock > 10 ? (
                          <span className="status-badge status-good">In Stock</span>
                        ) : product.stock > 0 ? (
                          <span className="status-badge status-warning">Low Stock</span>
                        ) : (
                          <span className="status-badge status-error">Out of Stock</span>
                        )}
                      </div>
                      <div className="grid-card-actions action-buttons-row">
                        {editingStockId !== product.id && (
                          <button className="btn-icon" title="Update Stock" onClick={() => startStockEdit(product)}>
                            <Edit2 size={15} />
                          </button>
                        )}
                        <button 
                          className={`btn-icon ${product.is_blocked ? 'success-text' : 'warning-text'}`}
                          title={product.is_blocked ? "Unblock Product" : "Block Product"}
                          onClick={() => handleToggleBlock(product.id, product.is_blocked)}
                        >
                          {product.is_blocked ? <Unlock size={15} /> : <Ban size={15} />}
                        </button>
                        <button 
                          className="btn-icon danger-text"
                          title="Delete Product"
                          onClick={() => handleDeleteProduct(product)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: Product Title & Price */}
                    <div className="grid-card-body">
                      <h4 className="grid-prod-title" title={product.name}>{product.name}</h4>
                      <div className="grid-prod-price">₹{Number(product.price).toFixed(2)}</div>
                    </div>

                    {/* Bottom Row: Stock readout or editor */}
                    <div className="grid-card-footer">
                      <div className="card-stock-display">
                        <span className="stock-label">Stock Level:</span>
                        {editingStockId === product.id ? (
                          <div className="stock-edit-inline">
                            <input 
                              type="number" 
                              className="input-field small-input" 
                              value={newStockValue} 
                              onChange={(e) => setNewStockValue(e.target.value)}
                            />
                            <button className="icon-btn success" onClick={() => saveStockEdit(product.id)}><Check size={16} /></button>
                            <button className="icon-btn danger" onClick={() => setEditingStockId(null)}><X size={16} /></button>
                          </div>
                        ) : (
                          <span className={`stock-val ${product.stock < 10 ? 'text-error font-bold' : 'font-bold'}`}>
                            {product.stock}
                          </span>
                        )}
                      </div>
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
