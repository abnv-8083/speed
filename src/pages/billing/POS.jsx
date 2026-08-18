import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, X, FileText, Loader2, Search } from 'lucide-react';
import { api } from '../../api';
import PremiumLoader from '../../components/PremiumLoader';
import InvoiceTemplate from '../../components/InvoiceTemplate';
import { useToast } from '../../components/ToastContext';
import AppModal from '../../components/AppModal';
import './POS.css';

const POS = () => {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // 'Cash' | 'UPI'

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts({ is_blocked: 'false' });
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err.message);
    }
    setLoading(false);
  };

  const addToCart = (product) => {
    if (product.stock <= 0) { toast.warning('Out of stock!'); return; }
    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) { toast.warning('Cannot add more than available stock!'); return; }
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * product.price }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1, total: product.price }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    const product = products.find(p => p.id === productId);
    if (newQuantity > product.stock) { toast.warning('Cannot exceed available stock!'); return; }
    setCart(cart.map(item =>
      item.product.id === productId
        ? { ...item, quantity: newQuantity, total: newQuantity * item.product.price }
        : item
    ));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const cartTotal = Math.max(0, cartSubtotal - discount);

  const checkout = async (overrideName) => {
    if (cart.length === 0) return;
    setSubmittingInvoice(true);
    const finalName = (overrideName && overrideName.trim()) ? overrideName : 'Walk-in Customer';

    try {
      // 1. Create invoice
      const invoice = await api.createInvoice({
        total_amount:   cartTotal,
        discount:       discount,
        customer_name:  finalName,
        payment_method: paymentMethod,
      });

      // 2. Insert invoice items
      const itemsToInsert = cart.map(item => ({
        invoice_id:    invoice.id,
        product_id:    item.product.id,
        quantity:      item.quantity,
        price_at_time: item.product.price,
      }));
      await api.createInvoiceItems(itemsToInsert);

      // 3. Deduct stock for each cart item
      for (const item of cart) {
        const currentProduct = products.find(p => p.id === item.product.id);
        await api.updateProduct(currentProduct.id, {
          stock: currentProduct.stock - item.quantity,
        });
      }

      setLastInvoice({
        id: invoice.id,
        items: [...cart],
        subtotal: cartSubtotal,
        discount: discount,
        total: cartTotal,
        customerName: finalName,
        paymentMethod: paymentMethod,
        date: new Date(),
      });

      await fetchProducts();
      setCart([]);
      setDiscount(0);
      setCustomerName('Walk-in Customer');
      setPaymentMethod('Cash');
      setShowInvoice(true);
    } catch (err) {
      toast.error('Error creating invoice: ' + err.message);
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const handlePrintInvoice = () => window.print();

  // ── Invoice / Print View ─────────────────────────────────────────────────
  if (showInvoice && lastInvoice) {
    return (
      <InvoiceTemplate
        invoice={lastInvoice}
        onBack={() => setShowInvoice(false)}
        backLabel="New Sale"
      />
    );
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Main POS View ────────────────────────────────────────────────────────
  return (
    <div className="pos-layout animate-fade-in">

      {/* ── LEFT: Product List Panel ── */}
      <div className="pos-products glass-panel">
        {/* Header */}
        <div className="pos-products-header">
          <div>
            <h2>Products</h2>
            <p className="pos-products-subtitle">{filteredProducts.length} available</p>
          </div>
          <div className="pos-search-box">
            <Search size={15} className="pos-search-icon" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pos-search-input"
            />
          </div>
        </div>

        {/* Product list */}
        {loading ? (
          <div className="pos-loader-wrap">
            <PremiumLoader text="Loading Products..." />
          </div>
        ) : (
          <div className="pos-product-list">
            {filteredProducts.length === 0 ? (
              <div className="pos-empty-products">
                <ShoppingCart size={36} className="text-muted" />
                <p>No products found.</p>
              </div>
            ) : (
              filteredProducts.map(product => {
                const inCart = cart.find(i => i.product.id === product.id);
                const outOfStock = product.stock <= 0;
                return (
                  <div
                    key={product.id}
                    className={`pos-product-row ${outOfStock ? 'pos-product-oos' : ''} ${inCart ? 'pos-product-incart' : ''}`}
                    onClick={() => !outOfStock && addToCart(product)}
                    role="button"
                    tabIndex={outOfStock ? -1 : 0}
                    onKeyDown={e => e.key === 'Enter' && !outOfStock && addToCart(product)}
                    aria-disabled={outOfStock}
                  >
                    {/* Name + price */}
                    <div className="pos-product-info">
                      <span className="pos-product-name">{product.name}</span>
                      <span className="pos-product-price">₹{Number(product.price).toFixed(2)}</span>
                    </div>

                    {/* Right: stock badge + add button */}
                    <div className="pos-product-right">
                      <span className={`pos-stock-badge ${outOfStock ? 'oos' : product.stock < 10 ? 'low' : 'ok'}`}>
                        {outOfStock ? 'Out of stock' : `${product.stock} left`}
                      </span>
                      {!outOfStock && (
                        <button
                          className="pos-add-btn"
                          onClick={e => { e.stopPropagation(); addToCart(product); }}
                          title={`Add ${product.name} to cart`}
                          aria-label={`Add ${product.name}`}
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>

                    {/* In-cart quantity indicator */}
                    {inCart && (
                      <span className="pos-incart-indicator">{inCart.quantity} in order</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: Cart / Receipt Panel ── */}
      <div className="pos-cart glass-panel">

        {/* Cart header */}
        <div className="cart-header">
          <div className="cart-header-left">
            <ShoppingCart size={18} />
            <h2>Current Order</h2>
          </div>
          {cart.length > 0 && (
            <span className="cart-count-badge">{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Cart items */}
        <div className="cart-items-list">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <ShoppingCart size={40} />
              <p>No items yet</p>
              <span>Tap a product to add it</span>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="cart-item">
                {/* Remove button */}
                <button
                  className="cart-item-remove"
                  onClick={() => removeFromCart(item.product.id)}
                  aria-label={`Remove ${item.product.name}`}
                >
                  <X size={14} />
                </button>

                {/* Name + unit price */}
                <div className="cart-item-info">
                  <span className="cart-item-name">{item.product.name}</span>
                  <span className="cart-item-unit">₹{Number(item.product.price).toFixed(2)} / ea</span>
                </div>

                {/* Qty stepper + line total */}
                <div className="cart-item-right">
                  <div className="qty-stepper">
                    <button
                      className="qty-btn"
                      onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <span className="cart-line-total">₹{item.total.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart footer / order summary */}
        <div className="cart-footer">
          {/* Subtotal */}
          <div className="cart-summary-row">
            <span className="cart-summary-label">Subtotal</span>
            <span className="cart-summary-value">₹{cartSubtotal.toFixed(2)}</span>
          </div>

          {/* Discount */}
          <div className="cart-summary-row">
            <span className="cart-summary-label">Discount (₹)</span>
            <input
              type="number"
              className="cart-discount-input"
              min="0"
              step="0.01"
              value={discount || ''}
              onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              aria-label="Discount amount"
            />
          </div>

          {/* Total */}
          <div className="cart-total-row">
            <span className="cart-total-label">Total</span>
            <span className="cart-total-value">₹{cartTotal.toFixed(2)}</span>
          </div>

          {/* Checkout button */}
          <button
            className="checkout-btn"
            disabled={cart.length === 0 || submittingInvoice}
            onClick={() => setShowCustomerModal(true)}
            aria-label="Proceed to checkout"
          >
            {submittingInvoice ? (
              <><Loader2 className="spin" size={18} /> Processing...</>
            ) : (
              <><FileText size={18} /> Checkout &amp; Print</>
            )}
          </button>
        </div>
      </div>

      {/* ── Customer Name Modal ── */}
      {showCustomerModal && (
        <AppModal
          title="Customer Details"
          onClose={() => { setShowCustomerModal(false); setCustomerName('Walk-in Customer'); }}
          width="400px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => { setShowCustomerModal(false); setCustomerName('Walk-in Customer'); }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => { setShowCustomerModal(false); checkout(customerName); }} disabled={submittingInvoice}>
                {submittingInvoice ? 'Processing...' : 'Complete Checkout'}
              </button>
            </>
          }
        >
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            Enter a name for the invoice (optional).
          </p>
          <div className="pos-modal-field">
            <label>Customer Name</label>
            <input
              type="text"
              className="input-field"
              value={customerName === 'Walk-in Customer' ? '' : customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Walk-in Customer"
              autoFocus
            />
          </div>
          <div className="pos-modal-field" style={{ marginTop: '0.75rem' }}>
            <label>Payment Method</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                className={`btn ${paymentMethod === 'Cash' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '0.45rem' }}
                onClick={() => setPaymentMethod('Cash')}
              >
                Cash
              </button>
              <button
                type="button"
                className={`btn ${paymentMethod === 'UPI' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '0.45rem' }}
                onClick={() => setPaymentMethod('UPI')}
              >
                UPI
              </button>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
};

export default POS;
