import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { ProductImage } from '../components/ProductImage';

export const Wishlist: React.FC = () => {
  const { wishlist, removeFromWishlist, loading } = useWishlist();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    document.title = 'EyeKart — My Wishlist';
  }, []);

  const handleAddToCart = (product: any) => {
    if (product.stock <= 0) {
      showToast('Sorry, this product is currently out of stock.', 'error');
      return;
    }
    addToCart(product);
    showToast(`Added ${product.name} to cart!`, 'success');
  };

  return (
    <div className="container wishlist-page-container">
      <div className="wishlist-page-header">
        <div>
          <h1 className="page-title">My Wishlist</h1>
          <p className="page-subtitle">Saved frames and sunglasses you love</p>
        </div>
        <div className="wishlist-counter-badge">
          {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved
        </div>
      </div>

      {loading && wishlist.length === 0 ? (
        <div className="wishlist-loading-state">
          <div className="spinner"></div>
          <p>Loading your saved favorites...</p>
        </div>
      ) : wishlist.length === 0 ? (
        <div className="wishlist-empty-card">
          <div className="empty-heart-icon">♡</div>
          <h2>Your wishlist is waiting.</h2>
          <p>
            Explore our curated eyeglasses, sunglasses, and contact lenses. Tap the heart icon on any
            frame to save it here for later.
          </p>
          <Link to="/" className="btn btn-primary btn-explore">
            Explore Eyewear Catalog
          </Link>
        </div>
      ) : (
        <div className="wishlist-grid">
          {wishlist.map(product => {
            const priceNum = Number(product.price);
            const discountNum = Number(product.discount || 0);
            const hasDiscount = discountNum > 0;
            const originalPrice = hasDiscount ? Math.round(priceNum / (1 - discountNum / 100)) : null;
            const isOutOfStock = product.stock <= 0;

            return (
              <div key={product.id} className="wishlist-item-card">
                <button
                  type="button"
                  className="wishlist-remove-icon-btn"
                  onClick={() => removeFromWishlist(product.id)}
                  title="Remove from Wishlist"
                  aria-label={`Remove ${product.name} from wishlist`}
                >
                  &times;
                </button>

                <div className="wishlist-item-media">
                  <Link to={`/products/${product.id}`}>
                    <ProductImage
                      product={product}
                      className="wishlist-item-img"
                    />
                  </Link>
                  {isOutOfStock && <span className="wishlist-badge out-stock">Out of Stock</span>}
                  {hasDiscount && <span className="wishlist-badge sale">Sale</span>}
                </div>

                <div className="wishlist-item-content">
                  {product.brand_name && (
                    <span className="wishlist-item-brand">{product.brand_name}</span>
                  )}
                  <h3 className="wishlist-item-name">
                    <Link to={`/products/${product.id}`}>{product.name}</Link>
                  </h3>

                  <div className="wishlist-item-pricing">
                    <span className="current-price">₹{priceNum.toLocaleString('en-IN')}</span>
                    {hasDiscount && originalPrice && (
                      <span className="original-price">₹{originalPrice.toLocaleString('en-IN')}</span>
                    )}
                  </div>

                  <div className="wishlist-item-stock-status">
                    {isOutOfStock ? (
                      <span className="stock-indicator out">Out of Stock</span>
                    ) : (
                      <span className="stock-indicator in">In Stock ({product.stock} available)</span>
                    )}
                  </div>

                  <div className="wishlist-item-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm wishlist-cart-btn"
                      disabled={isOutOfStock}
                      onClick={() => handleAddToCart(product)}
                    >
                      {isOutOfStock ? 'Unavailable' : 'Add to Cart'}
                    </button>
                    <Link
                      to={`/products/${product.id}`}
                      className="btn btn-outline btn-sm wishlist-view-btn"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
