const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

const files = {
  'types/index.ts': `
export interface Product {
  id: number;
  name: string;
  description: string;
  category_id: number;
  price: string;
  stock: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface OrderItem {
  id?: number;
  order_id?: number;
  product_id: number;
  product_name: string;
  price: string | number;
  quantity: number;
}

export interface Order {
  id: number;
  customer_name: string;
  mobile: string;
  address: string;
  payment_method: string;
  total: string | number;
  status: string;
  created_at: string;
  items?: OrderItem[];
}
`,

  'services/api.ts': `
import { Order, Product } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const api = {
  async getProducts(): Promise<Product[]> {
    const res = await fetch(\`\${API_BASE_URL}/api/products\`);
    if (!res.ok) throw new Error('Failed to fetch products');
    const data = await res.json();
    return data.products;
  },

  async getProduct(id: string | number): Promise<Product> {
    const res = await fetch(\`\${API_BASE_URL}/api/products/\${id}\`);
    if (!res.ok) throw new Error('Failed to fetch product details');
    const data = await res.json();
    return data.product;
  },

  async createOrder(orderData: any): Promise<{order_id: number}> {
    const res = await fetch(\`\${API_BASE_URL}/api/orders\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to place order');
    return data;
  },

  async getOrders(mobile: string): Promise<Order[]> {
    const res = await fetch(\`\${API_BASE_URL}/api/orders?mobile=\${encodeURIComponent(mobile)}\`);
    if (!res.ok) throw new Error('Failed to fetch orders');
    const data = await res.json();
    return data.orders;
  },

  async getOrder(id: string | number, mobile: string): Promise<{order: Order, items: OrderItem[]}> {
    const res = await fetch(\`\${API_BASE_URL}/api/orders/\${id}?mobile=\${encodeURIComponent(mobile)}\`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch order details');
    return data;
  },

  async cancelOrder(id: string | number, mobile: string): Promise<void> {
    const res = await fetch(\`\${API_BASE_URL}/api/orders/\${id}/cancel?mobile=\${encodeURIComponent(mobile)}\`, {
      method: 'PATCH'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to cancel order');
  }
};
`,

  'context/CartContext.tsx': `
import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product } from '../types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  increaseQuantity: (productId: number) => void;
  decreaseQuantity: (productId: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('eyekart_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('eyekart_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => setCart(prev => prev.filter(item => item.id !== id));
  
  const increaseQuantity = (id: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: item.quantity + 1 } : item));
  };
  
  const decreaseQuantity = (id: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: item.quantity - 1 } : item).filter(item => item.quantity > 0));
  };

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, increaseQuantity, decreaseQuantity, clearCart, cartCount, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
`,

  'context/ToastContext.tsx': `
import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={\`toast toast-\${toast.type}\`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};
`,

  'components/Navbar.tsx': `
import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export const Navbar = () => {
  const { cartCount } = useCart();
  return (
    <header className="navbar">
      <div className="logo">
        <Link to="/" style={{textDecoration: 'none', color: 'inherit'}}>EyeKart 👓</Link>
      </div>
      <nav>
        <Link to="/">Home</Link>
        <a href="/#products">Eyeglasses</a>
        <a href="/#products">Sunglasses</a>
        <Link to="/my-orders">My Orders</Link>
      </nav>
      <div className="actions">
        <Link to="/checkout" style={{textDecoration: 'none', color: 'inherit'}}>
          🛒 {cartCount > 0 && <span className="badge">{cartCount}</span>}
        </Link>
      </div>
    </header>
  );
};
`,

  'components/Footer.tsx': `
import React from 'react';

export const Footer = () => (
  <footer>
    <h2>EyeKart 👓</h2>
    <p>See Better. Look Better.</p>
    <p>© 2026 EyeKart. All Rights Reserved.</p>
  </footer>
);
`,

  'pages/Home.tsx': `
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export const Home = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(0);
  
  const { addToCart } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    api.getProducts()
      .then(setProducts)
      .catch(() => setError('Unable to load products. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = (p: Product) => {
    addToCart(p);
    showToast('Added to cart', 'success');
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === 0 || p.category_id === category;
    return matchesSearch && matchesCat;
  });

  return (
    <div>
      <section className="hero">
        <div className="hero-content">
          <p className="offer">NEW COLLECTION 2026</p>
          <h1>See Better.<br /><span>Look Better.</span></h1>
          <p className="hero-text">Discover stylish eyewear designed for your everyday look and comfort.</p>
          <button onClick={() => document.getElementById("products")?.scrollIntoView({behavior: "smooth"})}>Shop Now →</button>
        </div>
        <div className="hero-glasses">👓</div>
      </section>

      <section className="section">
        <h2>Shop By Category</h2>
        <div className="categories">
          <button className="category-card" onClick={() => setCategory(1)}>👓<h3>Eyeglasses</h3></button>
          <button className="category-card" onClick={() => setCategory(2)}>🕶️<h3>Sunglasses</h3></button>
          <button className="category-card" onClick={() => setCategory(3)}>💻<h3>Computer Glasses</h3></button>
          <button className="category-card" onClick={() => setCategory(4)}>👁️<h3>Contact Lenses</h3></button>
        </div>
      </section>

      <section className="section products-section" id="products">
        <h2>Featured Products</h2>
        <div className="search-box">
          <input type="text" placeholder="Search eyewear..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-buttons">
          <button onClick={() => setCategory(0)}>All</button>
          <button onClick={() => setCategory(1)}>👓 Eyeglasses</button>
          <button onClick={() => setCategory(2)}>🕶️ Sunglasses</button>
        </div>

        {loading && <p>Loading products...</p>}
        {error && <p className="error">{error} <button onClick={() => window.location.reload()}>Retry</button></p>}
        
        {!loading && !error && (
          <div className="products">
            {filtered.length === 0 ? <p>No products found.</p> : filtered.map(p => (
              <div className="product-card" key={p.id}>
                <div className="product-image">{p.category_id === 2 ? "🕶️" : "👓"}</div>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <strong>₹{Number(p.price).toLocaleString("en-IN")}</strong>
                <p>Stock: {p.stock}</p>
                <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                  <button disabled={p.stock <= 0} onClick={() => handleAdd(p)}>
                    {p.stock > 0 ? 'Add to Cart 🛒' : 'Out of Stock'}
                  </button>
                  <Link to={\`/product/\${p.id}\`}><button className="secondary-btn">View Details</button></Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
`,

  'pages/ProductDetails.tsx': `
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Product } from '../types';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export const ProductDetails = () => {
  const { id } = useParams<{id: string}>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addToCart } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    if (!id) return;
    api.getProduct(id)
      .then(setProduct)
      .catch(() => setError('Product not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="section"><p>Loading product...</p></div>;
  if (error || !product) return <div className="section"><p className="error">{error}</p><Link to="/">Go Back</Link></div>;

  return (
    <div className="section">
      <Link to="/">← Back to products</Link>
      <div className="product-details" style={{display: 'flex', gap: '40px', marginTop: '20px'}}>
        <div style={{fontSize: '100px', flex: 1, textAlign: 'center', background: '#f5f5f5', padding: '50px', borderRadius: '15px'}}>
           {product.category_id === 2 ? "🕶️" : "👓"}
        </div>
        <div style={{flex: 1}}>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <h2 style={{color: '#4f46e5'}}>₹{Number(product.price).toLocaleString("en-IN")}</h2>
          <p><strong>Stock:</strong> {product.stock > 0 ? product.stock : <span style={{color: 'red'}}>Out of Stock</span>}</p>
          
          <button 
            style={{marginTop: '20px', padding: '15px 30px', fontSize: '1.1rem'}}
            disabled={product.stock <= 0} 
            onClick={() => {
              addToCart(product);
              showToast('Added to cart', 'success');
            }}>
            {product.stock > 0 ? 'Add to Cart 🛒' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  );
};
`,

  'pages/Checkout.tsx': `
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const Checkout = () => {
  const { cart, cartTotal, increaseQuantity, decreaseQuantity, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    customer_name: '',
    mobile: '',
    address: '',
    payment_method: 'Cash on Delivery'
  });
  const [loading, setLoading] = useState(false);

  if (cart.length === 0) {
    return (
      <div className="section" style={{textAlign: 'center'}}>
        <h2>Your cart is empty</h2>
        <Link to="/"><button style={{marginTop: '20px'}}>Continue Shopping</button></Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const items = cart.map(i => ({ product_id: i.id, quantity: i.quantity }));
      const res = await api.createOrder({ ...form, items });
      localStorage.setItem('eyekart_customer_mobile', form.mobile);
      clearCart();
      showToast('Order placed successfully!', 'success');
      navigate(\`/order-success/\${res.order_id}\`);
    } catch (err: any) {
      showToast(err.message || 'Unable to place the order. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section" style={{display: 'flex', gap: '30px', flexWrap: 'wrap'}}>
      <div style={{flex: '1 1 400px'}}>
        <h2>ORDER SUMMARY</h2>
        <div className="cart" style={{display: 'block'}}>
          {cart.map(item => (
            <div key={item.id} className="cart-item" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
              <div>
                <h4>{item.name}</h4>
                <p>₹{Number(item.price).toLocaleString("en-IN")}</p>
              </div>
              <div className="quantity">
                <button type="button" onClick={() => decreaseQuantity(item.id)}>−</button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => increaseQuantity(item.id)}>+</button>
              </div>
              <div>
                <strong>₹{(Number(item.price) * item.quantity).toLocaleString("en-IN")}</strong>
                <button style={{marginLeft: '10px', background: '#ff4d4f'}} onClick={() => removeFromCart(item.id)}>X</button>
              </div>
            </div>
          ))}
          <div style={{borderTop: '2px solid #eee', paddingTop: '15px', marginTop: '15px', textAlign: 'right'}}>
            <h3>Subtotal: ₹{cartTotal.toLocaleString("en-IN")}</h3>
            <h2>Total: ₹{cartTotal.toLocaleString("en-IN")}</h2>
          </div>
        </div>
      </div>

      <div style={{flex: '1 1 300px'}}>
        <h2>Checkout Details</h2>
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
          <input required placeholder="Full Name" value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} />
          <input required placeholder="Mobile Number (10-15 digits)" pattern="\\d{10,15}" value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} />
          <textarea required placeholder="Address" rows={3} value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
          <select required value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
            <option>Cash on Delivery</option>
            <option>Credit Card</option>
            <option>UPI</option>
          </select>
          <button type="submit" disabled={loading} style={{padding: '15px'}}>
            {loading ? 'Placing order...' : 'Place Order'}
          </button>
        </form>
      </div>
    </div>
  );
};
`,

  'pages/OrderSuccess.tsx': `
import React from 'react';
import { useParams, Link } from 'react-router-dom';

export const OrderSuccess = () => {
  const { id } = useParams();
  return (
    <div className="section" style={{textAlign: 'center', padding: '50px 20px'}}>
      <h1 style={{color: '#10b981', fontSize: '3rem', marginBottom: '10px'}}>🎉</h1>
      <h2>Order placed successfully!</h2>
      <p style={{fontSize: '1.2rem', marginTop: '10px'}}>Order ID: <strong>#{id}</strong></p>
      <p>Thank you for shopping with EyeKart.</p>
      <div style={{marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'center'}}>
        <Link to="/my-orders"><button>View My Orders</button></Link>
        <Link to="/"><button className="secondary-btn">Continue Shopping</button></Link>
      </div>
    </div>
  );
};
`,

  'pages/MyOrders.tsx': `
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Order } from '../types';

export const MyOrders = () => {
  const [mobile, setMobile] = useState(localStorage.getItem('eyekart_customer_mobile') || '');
  const [inputMobile, setInputMobile] = useState(mobile);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchOrders = async (phone: string) => {
    if (!phone) return;
    setLoading(true);
    try {
      const data = await api.getOrders(phone);
      setOrders(data);
      setError('');
    } catch (err: any) {
      setError('Unable to load your orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mobile) fetchOrders(mobile);
  }, [mobile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('eyekart_customer_mobile', inputMobile);
    setMobile(inputMobile);
  };

  if (!mobile) {
    return (
      <div className="section" style={{textAlign: 'center', maxWidth: '400px', margin: '0 auto'}}>
        <h2>My Orders</h2>
        <p style={{fontSize: '0.9rem', color: '#666', marginBottom: '20px'}}>
          Currently using mobile number as temporary access until authentication is added.
        </p>
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
          <input required pattern="\\d{10,15}" placeholder="Enter your mobile number" value={inputMobile} onChange={e => setInputMobile(e.target.value)} />
          <button type="submit">View Orders</button>
        </form>
      </div>
    );
  }

  return (
    <div className="section">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2>My Orders</h2>
        <button className="secondary-btn" onClick={() => { localStorage.removeItem('eyekart_customer_mobile'); setMobile(''); setOrders([]); }}>Change Mobile</button>
      </div>
      
      {loading && <p>Loading orders...</p>}
      {error && <p className="error">{error}</p>}
      
      {!loading && !error && orders.length === 0 && (
        <p>No orders found for this number.</p>
      )}

      <div style={{display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px'}}>
        {orders.map(order => (
          <div key={order.id} style={{border: '1px solid #ddd', padding: '20px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <h3>Order #{order.id}</h3>
              <p>{new Date(order.created_at).toLocaleDateString()} - <strong>₹{Number(order.total).toLocaleString('en-IN')}</strong></p>
              <span className={\`badge status-\${order.status.toLowerCase()}\`}>{order.status}</span>
            </div>
            <Link to={\`/orders/\${order.id}\`}><button>View Details</button></Link>
          </div>
        ))}
      </div>
    </div>
  );
};
`,

  'pages/OrderDetails.tsx': `
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Order, OrderItem } from '../types';
import { useToast } from '../context/ToastContext';

export const OrderDetails = () => {
  const { id } = useParams();
  const mobile = localStorage.getItem('eyekart_customer_mobile') || '';
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const fetchOrder = async () => {
    try {
      const data = await api.getOrder(id!, mobile);
      setOrder(data.order);
      setItems(data.items);
    } catch (err: any) {
      setError(err.message || 'Unable to load order details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && mobile) fetchOrder();
    else { setLoading(false); setError("Authentication required"); }
  }, [id, mobile]);

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await api.cancelOrder(id!, mobile);
      showToast('Order cancelled successfully', 'success');
      fetchOrder();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel order', 'error');
    }
  };

  if (loading) return <div className="section"><p>Loading order...</p></div>;
  if (error || !order) return <div className="section"><p className="error">{error}</p><Link to="/my-orders">Go Back</Link></div>;

  return (
    <div className="section">
      <Link to="/my-orders">← Back to My Orders</Link>
      <div style={{marginTop: '20px', border: '1px solid #ddd', padding: '20px', borderRadius: '10px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
          <div>
            <h2>Order #{order.id}</h2>
            <p><strong>Date:</strong> {new Date(order.created_at).toLocaleString()}</p>
            <p><strong>Status:</strong> <span className={\`badge status-\${order.status.toLowerCase()}\`}>{order.status}</span></p>
          </div>
          {order.status !== 'Cancelled' && (
            <button style={{background: '#ff4d4f'}} onClick={handleCancel}>Cancel Order</button>
          )}
        </div>
        
        <div style={{marginTop: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '8px'}}>
          <h4>Customer Details</h4>
          <p>{order.customer_name} | {order.mobile}</p>
          <p>{order.address}</p>
          <p><strong>Payment:</strong> {order.payment_method}</p>
        </div>

        <h3 style={{marginTop: '20px'}}>Items</h3>
        <div style={{marginTop: '10px'}}>
          {items.map(item => (
            <div key={item.id} style={{display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee'}}>
              <span>{item.product_name} x {item.quantity}</span>
              <strong>₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}</strong>
            </div>
          ))}
          <div style={{textAlign: 'right', marginTop: '15px'}}>
            <h3>Total: ₹{Number(order.total).toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </div>
    </div>
  );
};
`,

  'App.tsx': `
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { ProductDetails } from './pages/ProductDetails';
import { Checkout } from './pages/Checkout';
import { OrderSuccess } from './pages/OrderSuccess';
import { MyOrders } from './pages/MyOrders';
import { OrderDetails } from './pages/OrderDetails';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <CartProvider>
          <div className="app">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-success/:id" element={<OrderSuccess />} />
              <Route path="/my-orders" element={<MyOrders />} />
              <Route path="/orders/:id" element={<OrderDetails />} />
              <Route path="*" element={<div className="section"><h2>404 - Not Found</h2></div>} />
            </Routes>
            <Footer />
          </div>
        </CartProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
`
};

for (const [relPath, content] of Object.entries(files)) {
  const absPath = path.join(srcDir, relPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content.trim() + '\\n');
}
console.log('Files generated successfully.');
