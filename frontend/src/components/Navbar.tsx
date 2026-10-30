import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Navbar: React.FC = () => {
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, isAuthenticated, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleNavSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (navSearch.trim()) {
      window.dispatchEvent(
        new CustomEvent('eyekart-search', { detail: { query: navSearch.trim() } })
      );
      navigate(`/?search=${encodeURIComponent(navSearch.trim())}#catalog-results`);
      setTimeout(() => {
        document.getElementById('catalog-results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCategoriesDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCategoriesDropdownOpen(false);
      }
    };
    if (categoriesDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [categoriesDropdownOpen]);

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'info');
    navigate('/');
    setMobileMenuOpen(false);
  };

  const handleCategoryClick = (main: 'frames' | 'lenses', sub: string, gender?: string) => {
    setCategoriesDropdownOpen(false);
    setMobileMenuOpen(false);
    setMobileCategoriesOpen(false);

    const resolvedGender = gender || (sub === 'kids' ? 'Kids' : undefined);

    // Dispatch global event for instant in-page updates
    window.dispatchEvent(
      new CustomEvent('eyekart-category-select', {
        detail: { main, sub, gender: resolvedGender }
      })
    );

    const q = new URLSearchParams();
    q.set('main', main);
    q.set('sub', sub);
    if (resolvedGender && resolvedGender !== 'all') {
      q.set('gender', resolvedGender);
    }
    navigate(`/categories?${q.toString()}`);
    setTimeout(() => {
      document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  const isAdmin = isAuthenticated && user?.role === 'admin';

  return (
    <header className="navbar">
      {/* Brand Logo */}
      <div className="logo-container">
        <Link to="/" className="logo-link" onClick={() => setMobileMenuOpen(false)} aria-label="EyeKart Homepage">
          <span className="logo-text">
            EyeKart
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: '#0f172a' }}
            >
              <circle cx="6" cy="12" r="4" />
              <circle cx="18" cy="12" r="4" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          </span>
        </Link>
        {isAdmin && <span className="admin-badge">Admin Panel</span>}
      </div>

      {/* Desktop Navigation */}
      <nav className="desktop-nav" aria-label="Main Navigation">
        {isAdmin ? (
          <>
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
              Storefront
            </Link>
            <Link to="/offers" className={location.pathname === '/offers' ? 'active' : ''}>
              Offers 🏷️
            </Link>
            <Link to="/admin/products" className={location.pathname === '/admin/products' ? 'active' : ''}>
              Manage Products
            </Link>
            <Link to="/admin/orders" className={location.pathname === '/admin/orders' ? 'active' : ''}>
              Manage Orders
            </Link>
            <Link to="/admin/reviews" className={location.pathname === '/admin/reviews' ? 'active' : ''}>
              Reviews
            </Link>
            <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>
              Admin Dashboard
            </Link>
          </>
        ) : (
          <>
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
              Home
            </Link>

            {/* Categories Dropdown Menu */}
            <div className="nav-dropdown-wrapper" ref={dropdownRef}>
              <button
                type="button"
                className={`nav-dropdown-trigger ${categoriesDropdownOpen ? 'active' : ''}`}
                onClick={() => setCategoriesDropdownOpen((prev) => !prev)}
                aria-expanded={categoriesDropdownOpen}
                aria-haspopup="true"
                aria-label="Toggle categories menu"
              >
                Categories
                <svg
                  className={`nav-chevron-icon ${categoriesDropdownOpen ? 'open' : ''}`}
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {categoriesDropdownOpen && (
                <div className="nav-dropdown-menu" role="menu">
                  <div className="nav-dropdown-container">
                    {/* 1. Frames 👓 */}
                    <div className="nav-dropdown-column">
                      <div
                        className="nav-dropdown-header"
                        onClick={() => handleCategoryClick('frames', 'all')}
                        role="button"
                        tabIndex={0}
                      >
                        <span className="nav-dropdown-icon">👓</span>
                        <span className="nav-dropdown-title">Frames</span>
                        <span className="nav-dropdown-badge">Browse All →</span>
                      </div>
                      <div className="nav-dropdown-links">
                        <button
                          type="button"
                          className="nav-dropdown-link"
                          onClick={() => handleCategoryClick('frames', 'all', 'all')}
                        >
                          All Frames
                        </button>
                        <button
                          type="button"
                          className="nav-dropdown-link"
                          onClick={() => handleCategoryClick('frames', 'all', 'Men')}
                        >
                          👨 Men's Eyewear
                        </button>
                        <button
                          type="button"
                          className="nav-dropdown-link"
                          onClick={() => handleCategoryClick('frames', 'all', 'Women')}
                        >
                          👩 Women's Eyewear
                        </button>
                        <button
                          type="button"
                          className="nav-dropdown-link"
                          onClick={() => handleCategoryClick('frames', 'kids', 'Kids')}
                        >
                          🧒 Kids' Eyewear
                        </button>
                        <button
                          type="button"
                          className="nav-dropdown-link"
                          onClick={() => handleCategoryClick('frames', 'all', 'Unisex')}
                        >
                          ⚡ Unisex Eyewear
                        </button>
                        <button
                          type="button"
                          className="nav-dropdown-link"
                          onClick={() => handleCategoryClick('frames', 'eyeglasses')}
                        >
                          Eyeglasses
                        </button>
                        <button
                          type="button"
                          className="nav-dropdown-link"
                          onClick={() => handleCategoryClick('frames', 'sunglasses')}
                        >
                          Sunglasses
                        </button>
                        <button
                          type="button"
                          className="nav-dropdown-link"
                          onClick={() => handleCategoryClick('frames', 'blue-light')}
                        >
                          Blue Light Glasses
                        </button>
                        <button
                          type="button"
                          className="nav-dropdown-link"
                          onClick={() => handleCategoryClick('frames', 'computer')}
                        >
                          Computer Glasses
                        </button>
                      </div>
                    </div>

                    {/* 2. Lenses 🔍 */}
                    <div className="nav-dropdown-column">
                      <div
                        className="nav-dropdown-header"
                        onClick={() => handleCategoryClick('lenses', 'all')}
                        role="button"
                        tabIndex={0}
                      >
                        <span className="nav-dropdown-icon">🔍</span>
                        <span className="nav-dropdown-title">Lenses</span>
                        <span className="nav-dropdown-badge">Browse All →</span>
                      </div>
                      <div className="nav-dropdown-links">
                        <button
                          type="button"
                          className="nav-dropdown-link"
                          onClick={() => handleCategoryClick('lenses', 'all')}
                        >
                          All Lenses
                        </button>
                        <button
                          type="button"
                          className="nav-dropdown-link"
                          onClick={() => handleCategoryClick('lenses', 'contact-lenses')}
                        >
                          Contact Lenses
                        </button>
                        <button
                          type="button"
                          className="nav-dropdown-link"
                          onClick={() => handleCategoryClick('lenses', 'optical-lenses')}
                        >
                          Optical Lenses
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Offers 🏷️ Link */}
            <Link to="/offers" className={location.pathname === '/offers' ? 'active' : ''}>
              Offers 🏷️
            </Link>

            {isAuthenticated && (
              <Link to="/my-orders" className={location.pathname === '/my-orders' ? 'active' : ''}>
                My Orders
              </Link>
            )}
          </>
        )}
      </nav>

      {/* Header Search Bar */}
      <form className="nav-search-form" onSubmit={handleNavSearch} role="search">
        <div className="nav-search-box">
          <svg
            className="nav-search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="nav-search-input"
            placeholder="Search frames, lenses, brands..."
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            aria-label="Search catalog"
          />
          {navSearch && (
            <button
              type="button"
              className="nav-search-clear"
              onClick={() => setNavSearch('')}
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>
      </form>

      {/* Actions */}
      <div className="actions">
        {/* Wishlist Icon Button */}
        <Link
          to="/wishlist"
          className="cart-btn wishlist-nav-btn"
          title="My Wishlist"
          aria-label={`Wishlist with ${wishlistCount} items`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={wishlistCount > 0 ? '#ef4444' : 'none'}
            stroke={wishlistCount > 0 ? '#ef4444' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {wishlistCount > 0 && <span className="cart-badge wishlist-badge-count">{wishlistCount}</span>}
        </Link>

        {/* Shopping Cart Button */}
        <Link to="/checkout" className="cart-btn" title="Shopping Cart" aria-label={`View Cart with ${cartCount} items`}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </Link>

        {isAuthenticated ? (
          <div className="user-profile-menu">
            <span className="user-greeting">
              {isAdmin ? `Admin: ${user?.name?.split(' ')[0]}` : `Hi, ${user?.name?.split(' ')[0]}`}
            </span>
            <button
              onClick={handleLogout}
              className="secondary-btn"
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              aria-label="Logout of account"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="auth-links" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link to="/login" className="btn-login">
              Login
            </Link>
            <Link to="/register" className="btn-register">
              Register
            </Link>
          </div>
        )}

        {/* Mobile menu toggle */}
        <button
          className="mobile-toggle-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer" role="menu">
          {isAdmin ? (
            <>
              <Link to="/" className={location.pathname === '/' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
                Storefront
              </Link>
              <Link to="/offers" className={location.pathname === '/offers' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
                Offers 🏷️
              </Link>
              <Link to="/admin/products" className={location.pathname === '/admin/products' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
                Manage Products
              </Link>
              <Link to="/admin/orders" className={location.pathname === '/admin/orders' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
                Manage Orders
              </Link>
              <Link to="/admin/reviews" className={location.pathname === '/admin/reviews' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
                Customer Reviews
              </Link>
              <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
                Admin Dashboard
              </Link>
            </>
          ) : (
            <>
              {/* Mobile Search Bar */}
              <form
                className="mobile-search-form"
                onSubmit={(e) => {
                  handleNavSearch(e);
                  setMobileMenuOpen(false);
                }}
                role="search"
              >
                <div className="nav-search-box">
                  <svg
                    className="nav-search-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="text"
                    className="nav-search-input"
                    placeholder="Search eyewear &amp; brands..."
                    value={navSearch}
                    onChange={(e) => setNavSearch(e.target.value)}
                    aria-label="Search catalog on mobile"
                  />
                </div>
              </form>

              <Link to="/" className={location.pathname === '/' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
                Home
              </Link>

              {/* Mobile Categories Accordion */}
              <div className="mobile-categories-wrapper">
                <button
                  type="button"
                  className={`mobile-categories-toggle ${mobileCategoriesOpen ? 'active' : ''}`}
                  onClick={() => setMobileCategoriesOpen((prev) => !prev)}
                >
                  <span>Categories</span>
                  <svg
                    className={`nav-chevron-icon ${mobileCategoriesOpen ? 'open' : ''}`}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>

                {mobileCategoriesOpen && (
                  <div className="mobile-categories-subnav">
                    {/* Frames Group */}
                    <div className="mobile-subgroup">
                      <div
                        className="mobile-subgroup-title"
                        onClick={() => handleCategoryClick('frames', 'all')}
                      >
                        <span>👓 Frames</span>
                        <span className="mobile-view-all">All →</span>
                      </div>
                      <div className="mobile-subgroup-items">
                        <button type="button" onClick={() => handleCategoryClick('frames', 'all', 'all')}>
                          All Frames
                        </button>
                        <button type="button" onClick={() => handleCategoryClick('frames', 'all', 'Men')}>
                          👨 Men's Frames
                        </button>
                        <button type="button" onClick={() => handleCategoryClick('frames', 'all', 'Women')}>
                          👩 Women's Frames
                        </button>
                        <button type="button" onClick={() => handleCategoryClick('frames', 'kids', 'Kids')}>
                          🧒 Kids' Eyewear
                        </button>
                        <button type="button" onClick={() => handleCategoryClick('frames', 'all', 'Unisex')}>
                          ⚡ Unisex Frames
                        </button>
                        <button type="button" onClick={() => handleCategoryClick('frames', 'eyeglasses')}>
                          Eyeglasses
                        </button>
                        <button type="button" onClick={() => handleCategoryClick('frames', 'sunglasses')}>
                          Sunglasses
                        </button>
                        <button type="button" onClick={() => handleCategoryClick('frames', 'blue-light')}>
                          Blue Light Glasses
                        </button>
                        <button type="button" onClick={() => handleCategoryClick('frames', 'computer')}>
                          Computer Glasses
                        </button>
                      </div>
                    </div>

                    {/* Lenses Group */}
                    <div className="mobile-subgroup">
                      <div
                        className="mobile-subgroup-title"
                        onClick={() => handleCategoryClick('lenses', 'all')}
                      >
                        <span>🔍 Lenses</span>
                        <span className="mobile-view-all">All →</span>
                      </div>
                      <div className="mobile-subgroup-items">
                        <button type="button" onClick={() => handleCategoryClick('lenses', 'all')}>
                          All Lenses
                        </button>
                        <button type="button" onClick={() => handleCategoryClick('lenses', 'contact-lenses')}>
                          Contact Lenses
                        </button>
                        <button type="button" onClick={() => handleCategoryClick('lenses', 'optical-lenses')}>
                          Optical Lenses
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Offers 🏷️ Link */}
              <Link
                to="/offers"
                className={location.pathname === '/offers' ? 'active' : ''}
                onClick={() => setMobileMenuOpen(false)}
              >
                Offers 🏷️
              </Link>

              {isAuthenticated && (
                <>
                  <Link to="/wishlist" className={location.pathname === '/wishlist' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
                    My Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
                  </Link>
                  <Link to="/my-orders" className={location.pathname === '/my-orders' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
                    My Orders
                  </Link>
                </>
              )}
            </>
          )}

          {!isAuthenticated && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <Link
                to="/login"
                className="btn-secondary"
                style={{ flex: 1, textAlign: 'center', padding: '10px' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="btn-primary"
                style={{ flex: 1, textAlign: 'center', padding: '10px' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;

