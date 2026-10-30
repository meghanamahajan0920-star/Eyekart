import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Home } from './pages/Home';
import { Offers } from './pages/Offers';
import { ProductDetails } from './pages/ProductDetails';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Checkout } from './pages/Checkout';
import { OrderSuccess } from './pages/OrderSuccess';
import { MyOrders } from './pages/MyOrders';
import { OrderDetails } from './pages/OrderDetails';
import { Wishlist } from './pages/Wishlist';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminProducts } from './pages/AdminProducts';
import { AdminOrders } from './pages/AdminOrders';
import { AdminReviews } from './pages/AdminReviews';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <div className="app">
                <Navbar />
                <main style={{ minHeight: 'calc(100vh - 200px)' }}>
                  <Routes>
                    {/* Public Storefront Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/categories" element={<Home />} />
                    <Route path="/offers" element={<Offers />} />
                    <Route path="/product/:id" element={<ProductDetails />} />
                    <Route path="/products/:id" element={<ProductDetails />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Customer Protected Routes */}
                    <Route
                      path="/wishlist"
                      element={
                        <ProtectedRoute>
                          <Wishlist />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/checkout"
                      element={
                        <ProtectedRoute>
                          <Checkout />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/order-success/:id"
                      element={
                        <ProtectedRoute>
                          <OrderSuccess />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/my-orders"
                      element={
                        <ProtectedRoute>
                          <MyOrders />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/orders/:id"
                      element={
                        <ProtectedRoute>
                          <OrderDetails />
                        </ProtectedRoute>
                      }
                    />

                    {/* Admin Protected Routes */}
                    <Route
                      path="/admin"
                      element={
                        <AdminRoute>
                          <AdminDashboard />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/products"
                      element={
                        <AdminRoute>
                          <AdminProducts />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/orders"
                      element={
                        <AdminRoute>
                          <AdminOrders />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/reviews"
                      element={
                        <AdminRoute>
                          <AdminReviews />
                        </AdminRoute>
                      }
                    />

                    {/* 404 Fallback Route */}
                    <Route
                      path="*"
                      element={
                        <div className="section" style={{ textAlign: 'center', padding: '80px 20px', maxWidth: '600px', margin: '40px auto' }}>
                          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👓</div>
                          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                            404 - Page Not Found
                          </h2>
                          <p style={{ color: '#64748b', margin: '0 0 28px 0', lineHeight: 1.6 }}>
                            The page you are looking for does not exist or has been relocated.
                          </p>
                          <Link to="/">
                            <button className="btn-primary" style={{ padding: '12px 28px' }}>
                              ← Return to Eyewear Catalog
                            </button>
                          </Link>
                        </div>
                      }
                    />
                  </Routes>
                </main>
                <Footer />
              </div>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export { App };
export default App;