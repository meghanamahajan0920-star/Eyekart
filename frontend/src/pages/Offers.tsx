import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { ProductImage } from '../components/ProductImage';

export const Offers: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'frames' | 'lenses'>('all');
  const [sortBy, setSortBy] = useState<string>('highest-discount');

  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();

  useEffect(() => {
    document.title = 'EyeKart — Special Offers & Discounts';
    setLoading(true);
    setError('');
    api
      .getProducts()
      .then((data) => {
        setProducts(data);
      })
      .catch(() => {
        setError('Unable to load offers. Please check your connection and try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleAddToCart = (p: Product) => {
    if (p.stock <= 0) {
      showToast(`Sorry, "${p.name}" is currently out of stock.`, 'error');
      return;
    }
    addToCart(p);
    showToast(`Added "${p.name}" to cart at discounted price!`, 'success');
  };

  const isLensProduct = (p: Product): boolean => {
    if (p.category_id === 4 || p.category_id === 11) return true;
    const catName = (p.category_name || '').toLowerCase();
    if (
      catName.includes('contact lens') ||
      catName.includes('optical lens') ||
      catName === 'lenses' ||
      catName === 'contact lenses' ||
      catName === 'optical lenses'
    ) {
      return true;
    }
    const name = (p.name || '').toLowerCase();
    return (
      name.includes('contact lens') ||
      name.includes('optical lens') ||
      name.includes('progressive lens') ||
      name.includes('bifocal lens') ||
      name.includes('single-vision') ||
      name.includes('toric lens')
    );
  };

  // Filter only real products from database that have a valid discount > 0
  const discountedProducts = useMemo(() => {
    return products.filter((p) => {
      const discountNum = Number(p.discount || 0);
      return !isNaN(discountNum) && discountNum > 0;
    });
  }, [products]);

  // Filtered by category (All, Frames, Lenses) and sorted
  const displayedOffers = useMemo(() => {
    return discountedProducts
      .filter((p) => {
        if (selectedCategory === 'frames') return !isLensProduct(p);
        if (selectedCategory === 'lenses') return isLensProduct(p);
        return true;
      })
      .sort((a, b) => {
        const discA = Number(a.discount || 0);
        const discB = Number(b.discount || 0);
        const priceA = Number(a.price || 0);
        const priceB = Number(b.price || 0);

        switch (sortBy) {
          case 'highest-discount':
            return discB - discA;
          case 'lowest-discount':
            return discA - discB;
          case 'price-asc':
            return priceA - priceB;
          case 'price-desc':
            return priceB - priceA;
          case 'newest':
            return b.id - a.id;
          default:
            return discB - discA;
        }
      });
  }, [discountedProducts, selectedCategory, sortBy]);

  const frameOfferCount = useMemo(() => {
    return discountedProducts.filter((p) => !isLensProduct(p)).length;
  }, [discountedProducts]);

  const lensOfferCount = useMemo(() => {
    return discountedProducts.filter(isLensProduct).length;
  }, [discountedProducts]);

  const maxDiscountPercentage = useMemo(() => {
    if (discountedProducts.length === 0) return 0;
    return Math.max(...discountedProducts.map((p) => Number(p.discount || 0)));
  }, [discountedProducts]);

  const renderOfferCard = (p: Product) => {
    const priceNum = Number(p.price);
    const discountNum = Number(p.discount || 0);
    const originalPrice = Math.round(priceNum / (1 - discountNum / 100));
    const savings = originalPrice - priceNum;

    return (
      <div className="product-card offer-product-card" key={`offer-${p.id}`}>
        <div className="product-media">
          <div className="product-badge-group">
            <span className="discount-pill">🏷️ {discountNum}% OFF</span>
            {p.gender && (
              <span
                style={{
                  background: 'rgba(255,255,255,0.92)',
                  color: '#0f172a',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '3px'
                }}
              >
                {p.gender}
              </span>
            )}
          </div>

          {/* Wishlist Heart Button */}
          <button
            type="button"
            className={`product-wishlist-btn ${isInWishlist(p.id) ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(p);
            }}
            aria-label={isInWishlist(p.id) ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}
            title={isInWishlist(p.id) ? 'Saved in Wishlist' : 'Save to Wishlist'}
          >
            {isInWishlist(p.id) ? '♥' : '♡'}
          </button>

          <Link to={`/products/${p.id}`}>
            <ProductImage product={p} />
          </Link>
        </div>

        <div className="product-body">
          <div className="offer-brand-category-row">
            <span className="product-brand">{p.brand_name || 'EyeKart Optical'}</span>
            {savings > 0 && <span className="offer-savings-tag">Save ₹{savings.toLocaleString('en-IN')}</span>}
          </div>

          <h3 className="product-title">
            <Link to={`/products/${p.id}`}>{p.name}</Link>
          </h3>

          <p className="product-desc">{p.description || 'Special limited-time discounted optical eyewear.'}</p>

          <div className="product-meta-row">
            <div className="product-pricing">
              <span className="price-current">₹{priceNum.toLocaleString('en-IN')}</span>
              <span className="price-original">₹{originalPrice.toLocaleString('en-IN')}</span>
            </div>

            <span
              className={`stock-status-badge ${
                p.stock <= 0 ? 'stock-out' : p.stock < 10 ? 'stock-low' : 'stock-in'
              }`}
            >
              {p.stock <= 0 ? 'Out of Stock' : p.stock < 10 ? `${p.stock} left` : 'In Stock'}
            </span>
          </div>

          <div className="product-actions">
            <button
              className="btn-add-cart"
              disabled={p.stock <= 0}
              onClick={() => handleAddToCart(p)}
            >
              {p.stock > 0 ? 'Add to Cart 🛒' : 'Out of Stock'}
            </button>
            <Link to={`/products/${p.id}`} className="btn-details">
              View Details
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="offers-page">
      {/* Offers Hero Banner */}
      <section className="offers-hero-section">
        <div className="offers-hero-container">
          <div className="offers-hero-badge">
            <span className="offers-hero-badge-dot"></span>
            <span>Special Eyewear Offers 🏷️</span>
            {maxDiscountPercentage > 0 && (
              <span className="offers-hero-badge-highlight">Up to {maxDiscountPercentage}% OFF</span>
            )}
          </div>
          <h1 className="offers-headline">
            Exclusive Deals & Discounts
          </h1>
          <p className="offers-subtitle">
            Authentic designer frames, sunglasses, computer glasses, and precision optical lenses with verified database savings in INR.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="container" style={{ padding: '0 24px 60px 24px', maxWidth: '1280px', margin: '0 auto' }}>
        {/* Toolbar: Category filter pills + Sort dropdown */}
        <div className="offers-toolbar">
          <div className="offers-filter-pills">
            <button
              type="button"
              className={`offers-filter-pill ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All Offers ({discountedProducts.length})
            </button>
            <button
              type="button"
              className={`offers-filter-pill ${selectedCategory === 'frames' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('frames')}
            >
              👓 Frames Offers ({frameOfferCount})
            </button>
            <button
              type="button"
              className={`offers-filter-pill ${selectedCategory === 'lenses' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('lenses')}
            >
              🔍 Lenses Offers ({lensOfferCount})
            </button>
          </div>

          <div className="offers-sort-wrap">
            <label htmlFor="offers-sort-select">Sort by:</label>
            <select
              id="offers-sort-select"
              className="sort-dropdown"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="highest-discount">Highest Discount First</option>
              <option value="lowest-discount">Lowest Discount First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>

        {/* Results summary bar */}
        <div className="offers-summary-bar">
          <span>
            Showing <strong>{displayedOffers.length}</strong>{' '}
            {displayedOffers.length === 1 ? 'discounted product' : 'discounted products'} with active deals
          </span>
          {selectedCategory !== 'all' && (
            <button
              type="button"
              className="btn-link-reset"
              onClick={() => setSelectedCategory('all')}
            >
              View All Offers ({discountedProducts.length})
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 16px auto' }}></div>
            <p>Loading active offers from database...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{ textAlign: 'center', padding: '24px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', margin: '20px 0' }}>
            <p>{error}</p>
            <button
              className="secondary-btn"
              onClick={() => {
                setLoading(true);
                setError('');
                api.getProducts().then(setProducts).catch(() => setError('Unable to load offers.')).finally(() => setLoading(false));
              }}
              style={{ marginTop: '10px' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Active Offers Grid */}
        {!loading && !error && (
          displayedOffers.length > 0 ? (
            <div className="products-grid">
              {displayedOffers.map(renderOfferCard)}
            </div>
          ) : (
            <div className="offers-empty-state">
              <div className="offers-empty-icon">🏷️</div>
              <h2>No active offers currently.</h2>
              <p>
                There are currently no discounted products matching this selection. Check back soon for exciting deals!
              </p>
              <Link to="/categories" className="btn-primary" style={{ display: 'inline-block', marginTop: '16px' }}>
                Browse Full Catalog →
              </Link>
            </div>
          )
        )}
      </div>
    </div>
  );
};
