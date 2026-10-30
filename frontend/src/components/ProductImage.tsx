import React, { useState } from 'react';
import type { Product } from '../types';

interface ProductImageProps {
  product: Product;
  className?: string;
  style?: React.CSSProperties;
  aspectRatio?: string;
  overrideImage?: string;
  alt?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  product,
  className = '',
  style = {},
  overrideImage,
  alt
}) => {
  const [imgError, setImgError] = useState(false);

  const activeImage = overrideImage || product.selected_image || product.image;

  React.useEffect(() => {
    setImgError(false);
  }, [activeImage]);

  const isUrl =
    activeImage &&
    typeof activeImage === 'string' &&
    (activeImage.startsWith('http://') ||
      activeImage.startsWith('https://') ||
      activeImage.startsWith('/') ||
      activeImage.startsWith('data:image/'));

  if (isUrl && !imgError) {
    return (
      <img
        src={activeImage}
        alt={alt || product.name}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          ...style
        }}
        onError={() => setImgError(true)}
      />
    );
  }

  // Clean studio fallback if image cannot load
  return (
    <div
      className={`product-fallback-placeholder ${className}`}
      role="img"
      aria-label={alt || `Product photo preview for ${product.name}`}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        position: 'relative',
        padding: '20px',
        textAlign: 'center',
        color: '#64748b',
        boxSizing: 'border-box',
        ...style
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          fontSize: '0.68rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#475569',
          background: 'rgba(255, 255, 255, 0.92)',
          padding: '3px 8px',
          borderRadius: '4px',
          border: '1px solid #cbd5e1'
        }}
      >
        {product.brand_name || 'EyeKart Studio'}
      </span>

      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0284c7"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="6" cy="12" r="4" />
          <circle cx="18" cy="12" r="4" />
          <line x1="10" y1="12" x2="14" y2="12" />
        </svg>
      </div>

      <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
        {product.name}
      </p>
      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
        Optical Studio Photography
      </span>
    </div>
  );
};

export default ProductImage;
