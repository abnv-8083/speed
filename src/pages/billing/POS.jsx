import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, X, FileText, Loader2, Printer, ArrowLeft, Search } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import './POS.css';

const POS = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [quickQty, setQuickQty] = useState(1);
  const [quickLoading, setQuickLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_blocked', false)
      .order('id', { ascending: true });
      
    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert('Out of stock!');
      return;
    }

    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        alert('Cannot add more than available stock!');
        return;
      }
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
    if (newQuantity > product.stock) {
      alert('Cannot exceed available stock!');
      return;
    }
    
    setCart(cart.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: newQuantity, total: newQuantity * item.product.price }
        : item
    ));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const cartTotal = Math.max(0, cartSubtotal - discount);

  const checkout = async () => {
    if (cart.length === 0) return;
    
    setSubmittingInvoice(true);

    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert([{ total_amount: cartTotal, discount: discount, customer_name: customerName }])
      .select();

    if (invoiceError) {
      alert('Error creating invoice: ' + invoiceError.message);
      setSubmittingInvoice(false);
      return;
    }

    const invoiceId = invoiceData[0].id;

    const itemsToInsert = cart.map(item => ({
      invoice_id: invoiceId,
      product_id: item.product.id,
      quantity: item.quantity,
      price_at_time: item.product.price
    }));

    await supabase.from('invoice_items').insert(itemsToInsert);

    for (const item of cart) {
      const currentProduct = products.find(p => p.id === item.product.id);
      const newStock = currentProduct.stock - item.quantity;
      await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', currentProduct.id);
    }

    setLastInvoice({
      id: invoiceId,
      items: [...cart],
      subtotal: cartSubtotal,
      discount: discount,
      total: cartTotal,
      customerName: customerName,
      date: new Date()
    });

    await fetchProducts();
    setCart([]);
    setDiscount(0);
    setCustomerName('Walk-in Customer');
    setSubmittingInvoice(false);
    setShowInvoice(true);
  };

  const deductAndPrint = async (printType) => {
    // Find the product corresponding to the print type
    const printProduct = products.find(p => p.is_print && p.name.includes(printType));
    
    if (printProduct && printProduct.stock > 0) {
      // Deduct 1 from stock for printing the invoice
      await supabase
        .from('products')
        .update({ stock: printProduct.stock - 1 })
        .eq('id', printProduct.id);
        
      await fetchProducts();
    }
    
    // Open the browser print dialog
    window.print();
  };

  const handleQuickSale = async (printType) => {
    if (quickQty < 1) return;
    setQuickLoading(true);

    const printProduct = products.find(p => p.is_print && p.name.includes(printType));
    
    if (printProduct) {
      if (quickQty > printProduct.stock) {
        alert('Not enough stock!');
        setQuickLoading(false);
        return;
      }

      const totalAmount = printProduct.price * quickQty;

      // 1. Create silent invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{ total_amount: totalAmount, customer_name: `Quick Print (${printType})` }])
        .select();

      if (!invoiceError) {
        const invoiceId = invoiceData[0].id;
        
        // 2. Insert invoice item
        await supabase.from('invoice_items').insert([{
          invoice_id: invoiceId,
          product_id: printProduct.id,
          quantity: quickQty,
          price_at_time: printProduct.price
        }]);

        // 3. Deduct stock
        await supabase
          .from('products')
          .update({ stock: printProduct.stock - quickQty })
          .eq('id', printProduct.id);

        await fetchProducts();
        setQuickQty(1);
        
        // Brief success feedback without interrupting workflow
        const btn = document.getElementById(`quick-btn-${printType}`);
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Logged!';
        btn.classList.add('success-flash');
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.classList.remove('success-flash');
        }, 1500);
      }
    }
    setQuickLoading(false);
  };

  if (showInvoice && lastInvoice) {
    return (
      <div className="pos-invoice-container animate-fade-in">
        <div className="invoice-actions no-print">
          <button className="btn btn-secondary" onClick={() => setShowInvoice(false)}>
            <ArrowLeft size={18} /> New Sale
          </button>
          <button className="btn btn-primary" onClick={() => deductAndPrint('B&W')}>
            <Printer size={18} /> Print (B&W)
          </button>
          <button className="btn btn-primary" style={{ background: 'var(--secondary)' }} onClick={() => deductAndPrint('Color')}>
            <Printer size={18} /> Print (Color)
          </button>
        </div>
        
        <div className="a5-invoice-wrapper glass-panel">
          <div className="a5-invoice">
            <div className="invoice-header">
              <div className="invoice-branding">
                <div className="invoice-logo">S@N</div>
                <div className="invoice-company">
                  <h2>Speed@net CRM</h2>
                  <p>123 Business Avenue, Tech District</p>
                  <p>Phone: +1 234 567 8900 | Email: contact@speednet.com</p>
                </div>
              </div>
              <div className="invoice-title">
                <h1>INVOICE</h1>
              </div>
            </div>
            
            <div className="invoice-details">
              <div className="invoice-to">
                <h3>Billed To:</h3>
                <p>{lastInvoice.customerName}</p>
              </div>
              <div className="invoice-meta">
                <div className="meta-row">
                  <span className="meta-label">Invoice No:</span>
                  <span className="meta-value">INV-{lastInvoice.id.toString().padStart(6, '0')}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Date:</span>
                  <span className="meta-value">{lastInvoice.date.toLocaleDateString()}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Time:</span>
                  <span className="meta-value">{lastInvoice.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
            </div>
            
            <table className="invoice-table">
              <thead>
                <tr>
                  <th className="text-left">Description</th>
                  <th className="text-center">Qty</th>
                  <th className="text-right">Unit Price</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {lastInvoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="text-left font-medium">{item.product.name}</td>
                    <td className="text-center text-muted">{item.quantity}</td>
                    <td className="text-right text-muted">₹{Number(item.product.price).toFixed(2)}</td>
                    <td className="text-right font-medium">₹{item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="invoice-summary-box">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{lastInvoice.subtotal.toFixed(2)}</span>
              </div>
              {lastInvoice.discount > 0 && (
                <div className="summary-row">
                  <span>Discount</span>
                  <span>-₹{lastInvoice.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Tax (0%)</span>
                <span>₹0.00</span>
              </div>
              <div className="summary-row total-row">
                <span>Total Amount</span>
                <span>₹{lastInvoice.total.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="invoice-footer">
              <p className="thank-you">Thank you for your business!</p>
              <p className="terms">Terms & Conditions: Goods once sold will not be taken back. Subject to local jurisdiction.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pos-layout animate-fade-in">
      <div className="pos-products glass-panel">
        <div className="pos-header" style={{ marginBottom: '1rem', borderBottom: 'none', paddingBottom: 0 }}>
          <h2>Select Products</h2>
          <div className="pos-search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pos-search-input"
            />
          </div>
        </div>

        <div className="quick-sale-bar">
          <div className="quick-sale-info">
            <h4>⚡ Quick Print Logger</h4>
            <p>Instantly log prints from WhatsApp/Email. Deducts stock & adds to revenue.</p>
          </div>
          <div className="quick-sale-actions">
            <input 
              type="number" 
              className="pos-discount-input" 
              style={{ width: '70px', textAlign: 'center' }}
              min="1" 
              value={quickQty}
              onChange={(e) => setQuickQty(parseInt(e.target.value) || 1)}
            />
            <span className="qty-label">pages</span>
            <button 
              id="quick-btn-B&W"
              className="btn btn-secondary btn-sm" 
              onClick={() => handleQuickSale('B&W')}
              disabled={quickLoading}
            >
              Log B&W
            </button>
            <button 
              id="quick-btn-Color"
              className="btn btn-primary btn-sm" 
              style={{ background: 'var(--secondary)' }}
              onClick={() => handleQuickSale('Color')}
              disabled={quickLoading}
            >
              Log Color
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex-center">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : (
          <div className="pos-grid">
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                className={`pos-card ${product.stock <= 0 ? 'out-of-stock' : ''}`}
                onClick={() => product.stock > 0 && addToCart(product)}
              >
                <div className="pos-card-info">
                  <h4>{product.name}</h4>
                  <p className="pos-price">₹{Number(product.price).toFixed(2)}</p>
                </div>
                <div className="pos-card-stock">
                  Stock: <span className={product.stock < 10 ? 'text-error' : ''}>{product.stock}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pos-cart glass-panel">
        <div className="pos-header">
          <h2>Current Bill</h2>
          <span className="badge">{cart.length} Items</span>
        </div>

        <div className="cart-list">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <ShoppingCart size={48} />
              <p>Select items to start bill</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="cart-item">
                <div className="cart-item-info">
                  <h5>{item.product.name}</h5>
                  <p>₹{Number(item.product.price).toFixed(2)} / ea</p>
                </div>
                <div className="cart-item-actions">
                  <div className="qty-picker">
                    <button onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}><Minus size={14}/></button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}><Plus size={14}/></button>
                  </div>
                  <div className="item-total">₹{item.total.toFixed(2)}</div>
                  <button className="remove-btn" onClick={() => removeFromCart(item.product.id)}><X size={16}/></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-discount-row">
            <span>Customer Name</span>
            <input 
              type="text" 
              className="pos-discount-input text-left" 
              style={{ width: '150px' }}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in Customer"
            />
          </div>
          <div className="cart-discount-row">
            <span>Discount (₹)</span>
            <input 
              type="number" 
              className="pos-discount-input" 
              min="0" 
              step="0.01" 
              value={discount || ''}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>
          <div className="cart-total-row">
            <span>Subtotal</span>
            <span className="total-val subtotal">₹{cartSubtotal.toFixed(2)}</span>
          </div>
          <div className="cart-total-row final-total">
            <span>Total</span>
            <span className="total-val">₹{cartTotal.toFixed(2)}</span>
          </div>
          <button 
            className="btn btn-primary checkout-btn"
            disabled={cart.length === 0 || submittingInvoice}
            onClick={checkout}
          >
            {submittingInvoice ? (
              <><Loader2 className="animate-spin" size={20} /> Processing...</>
            ) : (
              <><FileText size={20} /> Checkout & Print</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default POS;
