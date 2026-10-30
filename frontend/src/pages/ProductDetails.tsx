import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { Product, ProductVariant } from '../types';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { ProductImage } from '../components/ProductImage';
import { VirtualTryOnModal } from '../components/VirtualTryOnModal';
import { ProductReviewsSection } from '../components/ProductReviewsSection';

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [vtoOpen, setVtoOpen] = useState(false);

  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .getProduct(id)
      .then((data) => {
        setProduct(data);
        if (data?.variants && data.variants.length > 0) {
          const defaultVar = data.variants.find((v) => Boolean(v.is_default)) || data.variants[0];
          setSelectedVariant(defaultVar);
        } else {
          setSelectedVariant(null);
        }
        if (data?.name) {
          document.title = `EyeKart — ${data.name}`;
        }
        setError('');

        // Fetch related products based on category or brand
        api.getProducts().then((allProds) => {
          const related = allProds
            .filter((p) => p.id !== data.id && (p.category_id === data.category_id || p.brand_id === data.brand_id))
            .slice(0, 4);
          setRelatedProducts(related);
        }).catch(() => {
          setRelatedProducts([]);
        });
      })
      .catch(() => {
        setError('Product could not be found or has been removed from inventory.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="section" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>👓</div>
        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Loading eyewear specifications...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="section" style={{ maxWidth: '640px', margin: '40px auto', textAlign: 'center' }}>
        <div
          style={{
            padding: '36px',
            background: '#fee2e2',
            color: '#b91c1c',
            borderRadius: '16px',
            border: '1px solid #fecaca'
          }}
        >
          <span style={{ fontSize: '2.5rem' }}>⚠️</span>
          <h3 style={{ marginTop: '12px' }}>Product Not Found</h3>
          <p style={{ margin: '8px 0 20px 0' }}>{error || 'Unable to display product specifications.'}</p>
          <Link to="/">
            <button className="btn-primary" style={{ padding: '10px 24px' }}>
              ← Return to Catalog
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const priceNum = Number(product.price);
  const discountNum = Number(product.discount || 0);
  const hasDiscount = discountNum > 0;
  const originalPrice = hasDiscount ? Math.round(priceNum / (1 - discountNum / 100)) : null;
  const isInStock = product.stock > 0;

  const displayedImage = selectedVariant?.image || product.image;
  const displayedColor = selectedVariant?.color_name || product.color || 'Standard';

  const handleAddToCart = () => {
    const itemToAdd = {
      ...product,
      color: displayedColor,
      selected_color: displayedColor,
      image: displayedImage,
      selected_image: displayedImage,
      variant_id: selectedVariant?.id
    };
    for (let i = 0; i < quantity; i++) {
      addToCart(itemToAdd, {
        selected_color: displayedColor,
        selected_image: displayedImage,
        variant_id: selectedVariant?.id
      });
    }
    showToast(`Added ${quantity} × ${product.name} (${displayedColor}) to cart!`, 'success');
  };

  const handleBuyNow = () => {
    const itemToAdd = {
      ...product,
      color: displayedColor,
      selected_color: displayedColor,
      image: displayedImage,
      selected_image: displayedImage,
      variant_id: selectedVariant?.id
    };
    for (let i = 0; i < quantity; i++) {
      addToCart(itemToAdd, {
        selected_color: displayedColor,
        selected_image: displayedImage,
        variant_id: selectedVariant?.id
      });
    }
    navigate('/checkout');
  };

  return (
    <div className="section" style={{ maxWidth: '1160px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#64748b' }}>
          <Link to="/" style={{ color: '#475569', textDecoration: 'none', fontWeight: 600 }}>
            Home
          </Link>
          <span>/</span>
          <span>{product.category_name || 'Eyewear'}</span>
          <span>/</span>
          <span style={{ color: '#0f172a', fontWeight: 700 }}>{product.name}</span>
        </div>
      </nav>

      {/* Main Product Showcase Grid */}
      <div
        className="product-details-showcase"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
          gap: '48px',
          alignItems: 'start'
        }}
      >
        {/* Left: Product Gallery Card */}
        <div
          style={{
            background: 'white',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            position: 'relative'
          }}
        >
          {/* Wishlist Button On Image Card */}
          <button
            type="button"
            className={`details-wishlist-badge ${isInWishlist(product.id) ? 'active' : ''}`}
            onClick={() => toggleWishlist(product)}
            aria-label={isInWishlist(product.id) ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            title={isInWishlist(product.id) ? 'Saved in Wishlist' : 'Save to Wishlist'}
          >
            {isInWishlist(product.id) ? '♥ Saved' : '♡ Save'}
          </button>

          <div style={{ height: '380px', width: '100%', position: 'relative' }}>
            <ProductImage product={product} overrideImage={displayedImage} />
          </div>

          <div
            style={{
              padding: '20px 24px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>🛡️</span>
              <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                100% Genuine Optical Quality Guaranteed
              </span>
            </div>
            {hasDiscount && (
              <span className="discount-pill" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                Save {discountNum}%
              </span>
            )}
          </div>
        </div>

        {/* Right: Product Details & Actions */}
        <div>
          {/* Brand & Title & Wishlist */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#64748b'
                }}
              >
                {product.brand_name || 'EyeKart Studio'}
              </span>

              {/* Virtual Try-On Entry Button */}
              <button
                type="button"
                className="btn-vto-entry"
                onClick={() => setVtoOpen(true)}
                title="Try this frame virtually on your camera"
                aria-label="Open Virtual Try-On frame preview with camera"
              >
                <span>📷</span> Virtual Try-On
              </button>
            </div>

            <h1
              style={{
                fontSize: '2.2rem',
                fontWeight: 800,
                color: '#0f172a',
                margin: '8px 0 12px 0',
                lineHeight: 1.25,
                letterSpacing: '-0.02em'
              }}
            >
              {product.name}
            </h1>
          </div>

          {/* Pricing Row */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '20px' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
              ₹{priceNum.toLocaleString('en-IN')}
            </span>
            {originalPrice && (
              <span style={{ fontSize: '1.15rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                ₹{originalPrice.toLocaleString('en-IN')}
              </span>
            )}
            <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '3px 8px', borderRadius: '4px' }}>
              Inclusive of all taxes
            </span>
          </div>

          {/* Stock Status Badge */}
          <div style={{ marginBottom: '20px' }}>
            {isInStock ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.88rem',
                  fontWeight: 700
                }}
              >
                ● In Stock ({product.stock} units available)
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.88rem',
                  fontWeight: 700
                }}
              >
                ● Currently Out of Stock
              </span>
            )}
          </div>

          {/* Color Selection Variants */}
          {product.variants && product.variants.length > 0 && (
            <div
              className="color-variant-selector"
              style={{
                marginBottom: '24px',
                padding: '16px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}
              >
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' }}>
                  Select Frame Color:{' '}
                  <span style={{ color: '#0284c7', fontWeight: 800 }}>{displayedColor}</span>
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {product.variants.length} Available Colors
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        borderRadius: '9999px',
                        border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        background: isSelected ? '#f0f9ff' : '#ffffff',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
                        transition: 'all 0.2s ease',
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#0369a1' : '#334155'
                      }}
                      title={`Select ${v.color_name}`}
                      aria-label={`Select frame color ${v.color_name}`}
                    >
                      <span
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: v.color_code || '#000000',
                          border: '1.5px solid rgba(0,0,0,0.15)',
                          display: 'inline-block',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)'
                        }}
                      />
                      <span style={{ fontSize: '0.88rem' }}>{v.color_name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description */}
          <p
            style={{
              fontSize: '1.05rem',
              color: '#475569',
              lineHeight: 1.65,
              marginBottom: '28px'
            }}
          >
            {product.description ||
              'Expertly designed with an ergonomic bridge and premium finish to provide optimal optical focus and timeless elegance for all face shapes.'}
          </p>

          {/* Quantity & CTA Group */}
          {isInStock && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Quantity:</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    style={{ width: '36px', height: '36px', border: 'none', background: '#f8fafc', cursor: 'pointer', fontSize: '1rem', fontWeight: 700 }}
                  >
                    −
                  </button>
                  <span style={{ width: '40px', textAlign: 'center', fontWeight: 700, fontSize: '0.95rem' }}>{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    style={{ width: '36px', height: '36px', border: 'none', background: '#f8fafc', cursor: 'pointer', fontSize: '1rem', fontWeight: 700 }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <button
                  className="btn-primary"
                  onClick={handleAddToCart}
                  style={{ flex: '1 1 200px', padding: '14px 28px', fontSize: '1rem' }}
                >
                  Add to Cart 🛒
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleBuyNow}
                  style={{
                    flex: '1 1 180px',
                    padding: '14px 28px',
                    fontSize: '1rem',
                    background: '#0f172a',
                    color: 'white',
                    border: 'none'
                  }}
                >
                  Buy Now ⚡
                </button>
              </div>
            </div>
          )}

          {/* Product Specifications Table */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '24px',
              marginTop: '32px'
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
              Product Specifications
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '14px'
              }}
            >
              <div>
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
                  Category
                </span>
                <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>
                  {product.category_name || 'Standard Eyewear'}
                </strong>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
                  Gender
                </span>
                <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>
                  {product.gender || 'Unisex'}
                </strong>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
                  Frame Type
                </span>
                <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>
                  {product.frame_type || 'Full Rim'}
                </strong>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
                  Frame Material
                </span>
                <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>
                  {product.frame_material || 'Acetate / Titanium'}
                </strong>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
                  Lens Type
                </span>
                <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>
                  {product.lens_type || 'UV400 Clear / Anti-Glare'}
                </strong>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
                  Color
                </span>
                <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>
                  {displayedColor}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Virtual Try-On Modal */}
      {product && (
        <VirtualTryOnModal
          product={product}
          isOpen={vtoOpen}
          onClose={() => setVtoOpen(false)}
        />
      )}

      {/* Related Products Showcase */}
      {relatedProducts.length > 0 && (
        <div style={{ marginTop: '56px', borderTop: '1px solid #e2e8f0', paddingTop: '40px' }}>
          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Handpicked Recommendations
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0' }}>
              Similar &amp; Related Eyewear
            </h2>
          </div>

          <div className="products-grid">
            {relatedProducts.map((p) => {
              const priceNum = Number(p.price);
              const discountNum = Number(p.discount || 0);
              const hasDiscount = discountNum > 0;
              const originalPrice = hasDiscount ? Math.round(priceNum / (1 - discountNum / 100)) : null;

              return (
                <div className="product-card" key={`rel-${p.id}`}>
                  <div className="product-media">
                    <div className="product-badge-group">
                      {hasDiscount && <span className="discount-pill">{discountNum}% OFF</span>}
                      {p.gender && (
                        <span style={{ background: '#f1f5f9', color: '#334155', fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                          {p.gender}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className={`product-wishlist-btn ${isInWishlist(p.id) ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleWishlist(p);
                      }}
                      aria-label={isInWishlist(p.id) ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}
                    >
                      {isInWishlist(p.id) ? '♥' : '♡'}
                    </button>

                    <ProductImage product={p} />
                  </div>

                  <div className="product-body">
                    <span className="product-brand">{p.brand_name || 'EyeKart Optical'}</span>
                    <h3 className="product-title">{p.name}</h3>

                    <div className="product-meta-row">
                      <div className="product-pricing">
                        <span className="price-current">₹{priceNum.toLocaleString('en-IN')}</span>
                        {originalPrice && <span className="price-original">₹{originalPrice.toLocaleString('en-IN')}</span>}
                      </div>

                      <span className={`stock-status-badge ${p.stock <= 0 ? 'stock-out' : p.stock < 10 ? 'stock-low' : 'stock-in'}`}>
                        {p.stock <= 0 ? 'Out of Stock' : p.stock < 10 ? `${p.stock} left` : 'In Stock'}
                      </span>
                    </div>

                    <div className="product-actions">
                      <button
                        className="btn-add-cart"
                        disabled={p.stock <= 0}
                        onClick={() => {
                          addToCart(p);
                          showToast(`Added "${p.name}" to cart!`, 'success');
                        }}
                      >
                        {p.stock > 0 ? 'Add to Cart 🛒' : 'Out of Stock'}
                      </button>
                      <Link to={`/products/${p.id}`} className="btn-details" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Reviews & Ratings Section */}
      {product && (
        <div style={{ marginTop: '56px', borderTop: '1px solid #e2e8f0', paddingTop: '40px' }}>
          <ProductReviewsSection productId={product.id} />
        </div>
      )}
    </div>
  );
};

export default ProductDetails;

