import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Check, X, Loader2, Trash2, Ban, Unlock } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import Pagination from '../../components/Pagination';
import './Products.css';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  
  const [editingStockId, setEditingStockId] = useState(null);
  const [newStockValue, setNewStockValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const paginatedProducts = products.slice(
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
      } else {
        alert('Error adding product: ' + error.message);
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
        alert('Failed to update stock');
        fetchProducts();
      }
    }
    setEditingStockId(null);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        alert('Error deleting product: ' + error.message);
      } else {
        setProducts(products.filter(p => p.id !== id));
      }
    }
  };

  const handleToggleBlock = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    const { error } = await supabase.from('products').update({ is_blocked: newStatus }).eq('id', id);
    if (error) {
      alert('Error updating status: ' + error.message);
    } else {
      setProducts(products.map(p => p.id === id ? { ...p, is_blocked: newStatus } : p));
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
          <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={18} /> Add New Product
          </button>
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
          <div className="loading-state">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Product Name</th>
                    <th>Price</th>
                    <th>Current Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-4">No products found.</td>
                    </tr>
                  ) : (
                    paginatedProducts.map(product => (
                      <tr key={product.id}>
                        <td className="text-muted">#{product.id}</td>
                        <td className="font-medium">{product.name}</td>
                        <td>₹{Number(product.price).toFixed(2)}</td>
                        <td>
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
                            <span className={product.stock < 10 ? 'text-error font-medium' : ''}>
                              {product.stock}
                            </span>
                          )}
                        </td>
                        <td>
                          {product.is_blocked ? (
                            <span className="status-badge status-error">Blocked</span>
                          ) : product.stock > 10 ? (
                            <span className="status-badge status-good">In Stock</span>
                          ) : product.stock > 0 ? (
                            <span className="status-badge status-warning">Low Stock</span>
                          ) : (
                            <span className="status-badge status-error">Out of Stock</span>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons-row">
                            {editingStockId !== product.id && (
                              <button className="btn-icon" title="Update Stock" onClick={() => startStockEdit(product)}>
                                <Edit2 size={16} />
                              </button>
                            )}
                            <button 
                              className={`btn-icon ${product.is_blocked ? 'success-text' : 'warning-text'}`}
                              title={product.is_blocked ? "Unblock Product" : "Block Product"}
                              onClick={() => handleToggleBlock(product.id, product.is_blocked)}
                            >
                              {product.is_blocked ? <Unlock size={16} /> : <Ban size={16} />}
                            </button>
                            <button 
                              className="btn-icon danger-text"
                              title="Delete Product"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalItems={products.length}
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
