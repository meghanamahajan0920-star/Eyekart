import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Product, ProductVariant } from '../types';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { ProductImage } from '../components/ProductImage';
import heroImg from '../assets/hero-eyewear.jpg';
import promoImg from '../assets/promo-eyewear.jpg';

interface CategoryFilterItem {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
}

interface StorefrontProductCardProps {
  product: Product;
  keyPrefix?: string;
  isInWishlist: (id: number) => boolean;
  toggleWishlist: (p: Product) => void;
  onAddToCart: (p: Product, variant?: ProductVariant) => void;
}

const StorefrontProductCard: React.FC<StorefrontProductCardProps> = ({
  product: p,
  keyPrefix = '',
  isInWishlist,
  toggleWishlist,
  onAddToCart
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(() => {
    if (p.variants && p.variants.length > 0) {
      return p.variants.find((v) => Boolean(v.is_default)) || p.variants[0];
    }
    return null;
  });

  const priceNum = Number(p.price);
  const discountNum = Number(p.discount || 0);
  const hasDiscount = discountNum > 0;
  const originalPrice = hasDiscount ? Math.round(priceNum / (1 - discountNum / 100)) : null;

  const displayedImage = selectedVariant?.image || p.image;
  const displayedColor = selectedVariant?.color_name || p.color;

  const genderBadgeStyle = useMemo(() => {
    const g = (p.gender || '').toLowerCase();
    if (g === 'men') return { bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe' };
    if (g === 'women') return { bg: '#fce7f3', color: '#9d174d', border: '#fbcfe8' };
    if (g.includes('kid')) return { bg: '#fef3c7', color: '#92400e', border: '#fde68a' };
    return { bg: '#f1f5f9', color: '#334155', border: '#e2e8f0' };
  }, [p.gender]);

  return (
    <div className="product-card" key={`${keyPrefix}${p.id}`}>
      <div className="product-media">
        <div className="product-badge-group">
          {hasDiscount && <span className="discount-pill">{discountNum}% OFF</span>}
          {p.gender && (
            <span
              style={{
                background: genderBadgeStyle.bg,
                color: genderBadgeStyle.color,
                border: `1px solid ${genderBadgeStyle.border}`,
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px'
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

        <ProductImage product={p} overrideImage={displayedImage} />
      </div>

      <div className="product-body">
        <span className="product-brand">{p.brand_name || 'EyeKart Optical'}</span>
        <h3 className="product-title">{p.name}</h3>
        <p className="product-desc">{p.description || 'Precision optical craftsmanship with premium frame finish.'}</p>

        {/* Color Variants Swatches */}
        {p.variants && p.variants.length > 0 && (
          <div className="product-card-variants">
            {p.variants.map((v) => {
              const isSelected = selectedVariant?.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  className={`product-swatch-item ${isSelected ? 'active' : ''}`}
                  style={{ backgroundColor: v.color_code || '#0f172a' }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedVariant(v);
                  }}
                  title={v.color_name}
                  aria-label={`Select color ${v.color_name}`}
                />
              );
            })}
            <span className="product-swatch-label">
              {displayedColor || `${p.variants.length} colors`}
            </span>
          </div>
        )}

        <div className="product-meta-row">
          <div className="product-pricing">
            <span className="price-current">₹{priceNum.toLocaleString('en-IN')}</span>
            {originalPrice && (
              <span className="price-original">₹{originalPrice.toLocaleString('en-IN')}</span>
            )}
          </div>

          <span
            className={`stock-status-badge ${
              p.stock <= 0 ? 'stock-out' : p.stock < 10 ? `${p.stock} left` : 'In Stock'
            }`}
          >
            {p.stock <= 0 ? 'Out of Stock' : p.stock < 10 ? `${p.stock} left` : 'In Stock'}
          </span>
        </div>

        <div className="product-actions">
          <button
            className="btn-add-cart"
            disabled={p.stock <= 0}
            onClick={() => onAddToCart(p, selectedVariant || undefined)}
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

export const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Phase 6 Advanced Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mainCategory, setMainCategory] = useState<'frames' | 'lenses'>('frames');
  const [frameSubCategory, setFrameSubCategory] = useState<string>('all');
  const [lensSubCategory, setLensSubCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedFrameType, setSelectedFrameType] = useState<string>('all');
  const [selectedFrameMaterial, setSelectedFrameMaterial] = useState<string>('all');
  const [selectedLensType, setSelectedLensType] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(10000);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();

  const fetchProducts = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .getProducts()
      .then((data) => {
        setProducts(data);
        setError('');
        if (data.length > 0) {
          const highest = Math.max(...data.map(p => Number(p.price) || 0));
          setMaxPrice(highest > 0 ? highest : 10000);
        }
      })
      .catch(() => {
        setError('Unable to load products. Please check your connection and try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (window.location.pathname === '/categories' || window.location.hash === '#categories') {
      document.title = 'EyeKart — Categories (Frames & Lenses)';
      setTimeout(() => {
        document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.title = 'EyeKart — Premium Eyewear & Sunglasses';
    }
    fetchProducts();
  }, [fetchProducts]);

  // Sync category & gender state from URL query parameters (?category=... or ?main=...&sub=...&gender=...)
  useEffect(() => {
    const mainParam = searchParams.get('main');
    const subParam = searchParams.get('sub');
    const catParam = searchParams.get('category');
    const genderParam = searchParams.get('gender');

    let isExplicitNav = false;

    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearch(searchParam);
      isExplicitNav = true;
    }

    if (genderParam) {
      const g = genderParam.toLowerCase();
      if (g === 'men' || g === 'man') {
        setSelectedGender('Men');
        setMainCategory('frames');
        isExplicitNav = true;
      } else if (g === 'women' || g === 'woman') {
        setSelectedGender('Women');
        setMainCategory('frames');
        isExplicitNav = true;
      } else if (g === 'kids' || g === 'kid') {
        setSelectedGender('Kids');
        setMainCategory('frames');
        isExplicitNav = true;
      } else if (g === 'unisex') {
        setSelectedGender('Unisex');
        setMainCategory('frames');
        isExplicitNav = true;
      } else if (g === 'all') {
        setSelectedGender('all');
      }
    }

    if (mainParam === 'lenses' || catParam === 'lenses' || catParam === 'contact-lenses' || catParam === 'optical-lenses') {
      setMainCategory('lenses');
      const lensSub = subParam || (catParam === 'contact-lenses' || catParam === 'optical-lenses' ? catParam : 'all');
      setLensSubCategory(lensSub);
      setSelectedCategory(lensSub);
      isExplicitNav = true;
    } else if (mainParam === 'frames' || subParam || catParam) {
      setMainCategory('frames');
      const frameSub = subParam || catParam || 'all';
      setFrameSubCategory(frameSub);
      setSelectedCategory(frameSub);
      if (frameSub === 'kids') {
        setSelectedGender('Kids');
      }
      isExplicitNav = true;
    }

    if (isExplicitNav || window.location.pathname === '/categories' || window.location.hash === '#categories') {
      setTimeout(() => {
        document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    }
  }, [searchParams]);

  // Listen to navigation events from Navbar dropdown and search bar
  useEffect(() => {
    const handleCategoryEvent = (e: Event) => {
      const ce = e as CustomEvent<{ main?: 'frames' | 'lenses'; sub?: string; categoryId?: string; gender?: string }>;
      if (ce.detail) {
        if (ce.detail.gender) {
          setSelectedGender(ce.detail.gender);
          setMainCategory('frames');
        }
        if (ce.detail.main) {
          setMainCategory(ce.detail.main);
          if (ce.detail.main === 'frames') {
            setFrameSubCategory(ce.detail.sub || 'all');
            setSelectedCategory(ce.detail.sub || 'all');
          } else {
            setLensSubCategory(ce.detail.sub || 'all');
            setSelectedCategory(ce.detail.sub || 'all');
          }
        } else if (ce.detail.categoryId) {
          const catId = ce.detail.categoryId.toLowerCase();
          if (catId === 'lenses' || catId === 'contact-lenses' || catId === 'optical-lenses') {
            setMainCategory('lenses');
            setLensSubCategory(catId === 'lenses' ? 'all' : catId);
          } else {
            setMainCategory('frames');
            setFrameSubCategory(catId);
          }
          setSelectedCategory(catId);
        }

        setTimeout(() => {
          document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      }
    };

    const handleSearchEvent = (e: Event) => {
      const ce = e as CustomEvent<{ query: string }>;
      if (ce.detail && typeof ce.detail.query === 'string') {
        setSearch(ce.detail.query);
        setTimeout(() => {
          document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      }
    };

    window.addEventListener('eyekart-category-select', handleCategoryEvent);
    window.addEventListener('eyekart-search', handleSearchEvent);
    return () => {
      window.removeEventListener('eyekart-category-select', handleCategoryEvent);
      window.removeEventListener('eyekart-search', handleSearchEvent);
    };
  }, []);

  const handleAddToCart = (p: Product, variant?: ProductVariant) => {
    const itemToAdd = {
      ...p,
      color: variant?.color_name || p.selected_color || p.color,
      selected_color: variant?.color_name || p.selected_color || p.color,
      image: variant?.image || p.selected_image || p.image,
      selected_image: variant?.image || p.selected_image || p.image,
      variant_id: variant?.id || p.variant_id
    };
    addToCart(itemToAdd, {
      selected_color: variant?.color_name || p.selected_color || p.color,
      selected_image: variant?.image || p.selected_image || p.image,
      variant_id: variant?.id || p.variant_id
    });
    showToast(`Added "${p.name}" (${variant?.color_name || p.selected_color || p.color || 'Standard'}) to cart!`, 'success');
  };

  const handleAudienceSelect = (gender: 'all' | 'Men' | 'Women' | 'Kids' | 'Unisex') => {
    setSelectedGender(gender);
    setMainCategory('frames');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('main', 'frames');
      if (gender === 'all') {
        next.delete('gender');
      } else {
        next.set('gender', gender);
      }
      return next;
    });
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    setNewsletterSubscribed(true);
    showToast('Thank you for subscribing to EyeKart updates!', 'success');
    setNewsletterEmail('');
  };

  const frameSubcategories: CategoryFilterItem[] = [
    { id: 'all', name: 'All Frames', icon: '👓', subtitle: 'Browse all available frames' },
    { id: 'eyeglasses', name: 'Eyeglasses', icon: '👓', subtitle: 'Prescription & Classic Frames' },
    { id: 'sunglasses', name: 'Sunglasses', icon: '🕶️', subtitle: 'Polarized & UV400 Protection' },
    { id: 'blue-light', name: 'Blue Light Glasses', icon: '🛡️', subtitle: 'Anti-Glare Screen Defense' },
    { id: 'computer', name: 'Computer Glasses', icon: '💻', subtitle: 'Precision Digital Eyewear' },
    { id: 'kids', name: 'Kids Eyewear', icon: '👶', subtitle: 'Durable & Flexible Fits' }
  ];

  const handleCategorySelect = (categoryId: string) => {
    const nextCategory = selectedCategory === categoryId ? 'all' : categoryId;
    setSelectedCategory(nextCategory);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextCategory === 'all') {
        next.delete('category');
      } else {
        next.set('category', nextCategory);
      }
      return next;
    });
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Derive dynamic filter facets from current product list
  const availableBrands = useMemo(() => {
    return Array.from(new Set(products.map(p => p.brand_name).filter((b): b is string => !!b))).sort();
  }, [products]);

  const availableFrameTypes = useMemo(() => {
    return Array.from(new Set(products.map(p => p.frame_type).filter((f): f is string => !!f))).sort();
  }, [products]);

  const availableFrameMaterials = useMemo(() => {
    return Array.from(new Set(products.map(p => p.frame_material).filter((m): m is string => !!m))).sort();
  }, [products]);

  const availableLensTypes = useMemo(() => {
    return Array.from(new Set(products.map(p => p.lens_type).filter((l): l is string => !!l))).sort();
  }, [products]);

  const maxCatalogPrice = useMemo(() => {
    if (products.length === 0) return 10000;
    return Math.max(...products.map(p => Number(p.price) || 0), 1000);
  }, [products]);

  // Categorize products into Frames vs Lenses from active database
  const isLensProduct = useCallback((p: Product): boolean => {
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
    if (
      name.includes('contact lens') ||
      name.includes('optical lens') ||
      name.includes('progressive lens') ||
      name.includes('bifocal lens') ||
      name.includes('single-vision') ||
      name.includes('toric lens') ||
      name.includes('disposable lens') ||
      name.includes('daily lens')
    ) {
      return true;
    }
    return false;
  }, []);

  const isFrameProduct = useCallback((p: Product): boolean => {
    return !isLensProduct(p);
  }, [isLensProduct]);

  const frameProducts = useMemo(() => {
    return products.filter(isFrameProduct);
  }, [products, isFrameProduct]);

  const lensProducts = useMemo(() => {
    return products.filter(isLensProduct);
  }, [products, isLensProduct]);

  // Frame counts per audience
  const menFrameCount = useMemo(() => {
    return frameProducts.filter((p) => {
      const g = (p.gender || '').toLowerCase();
      return g === 'men' || g === 'unisex';
    }).length;
  }, [frameProducts]);

  const womenFrameCount = useMemo(() => {
    return frameProducts.filter((p) => {
      const g = (p.gender || '').toLowerCase();
      return g === 'women' || g === 'unisex';
    }).length;
  }, [frameProducts]);

  const kidsFrameCount = useMemo(() => {
    return frameProducts.filter((p) => {
      const g = (p.gender || '').toLowerCase();
      return g.includes('kid');
    }).length;
  }, [frameProducts]);

  const unisexFrameCount = useMemo(() => {
    return frameProducts.filter((p) => {
      const g = (p.gender || '').toLowerCase();
      return g === 'unisex';
    }).length;
  }, [frameProducts]);

  const resetAllFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedBrand('all');
    setSelectedGender('all');
    setSelectedFrameType('all');
    setSelectedFrameMaterial('all');
    setSelectedLensType('all');
    setMaxPrice(maxCatalogPrice);
    setMinDiscount(0);
    setInStockOnly(false);
    setSortBy('featured');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('category');
      next.delete('gender');
      return next;
    });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (selectedCategory !== 'all') count++;
    if (selectedBrand !== 'all') count++;
    if (selectedGender !== 'all') count++;
    if (selectedFrameType !== 'all') count++;
    if (selectedFrameMaterial !== 'all') count++;
    if (selectedLensType !== 'all') count++;
    if (maxPrice < maxCatalogPrice) count++;
    if (minDiscount > 0) count++;
    if (inStockOnly) count++;
    if (sortBy !== 'featured') count++;
    return count;
  }, [
    search,
    selectedCategory,
    selectedBrand,
    selectedGender,
    selectedFrameType,
    selectedFrameMaterial,
    selectedLensType,
    maxPrice,
    maxCatalogPrice,
    minDiscount,
    inStockOnly,
    sortBy
  ]);

  // Safe multi-facet filtering and sorting
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const q = search.toLowerCase().trim();
        const matchesSearch =
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.brand_name && p.brand_name.toLowerCase().includes(q)) ||
          (p.category_name && p.category_name.toLowerCase().includes(q));

        if (!matchesSearch) return false;

        // Category filter
        if (selectedCategory !== 'all') {
          if (selectedCategory === 'eyeglasses') {
            const matches =
              p.category_id === 1 ||
              (p.category_name && p.category_name.toLowerCase().includes('eyeglasses')) ||
              p.name.toLowerCase().includes('frame') ||
              p.name.toLowerCase().includes('eyeglasses');
            if (!matches) return false;
          } else if (selectedCategory === 'sunglasses') {
            const matches =
              p.category_id === 2 ||
              (p.category_name && p.category_name.toLowerCase().includes('sunglasses')) ||
              p.name.toLowerCase().includes('sunglass') ||
              p.name.toLowerCase().includes('aviator');
            if (!matches) return false;
          } else if (selectedCategory === 'blue-light' || selectedCategory === 'computer') {
            const matches =
              p.category_id === 3 ||
              (p.category_name && p.category_name.toLowerCase().includes('computer')) ||
              (p.lens_type && p.lens_type.toLowerCase().includes('blue')) ||
              (p.description && p.description.toLowerCase().includes('blue light')) ||
              p.name.toLowerCase().includes('blue') ||
              p.name.toLowerCase().includes('computer');
            if (!matches) return false;
          } else if (selectedCategory === 'kids') {
            const matches =
              (p.gender && p.gender.toLowerCase().includes('kid')) ||
              (p.description && p.description.toLowerCase().includes('kid')) ||
              p.name.toLowerCase().includes('kid');
            if (!matches) return false;
          } else if (selectedCategory === 'contact-lenses') {
            const matches =
              p.category_id === 4 ||
              (p.category_name && p.category_name.toLowerCase().includes('contact')) ||
              p.name.toLowerCase().includes('contact') ||
              p.name.toLowerCase().includes('disposable') ||
              p.name.toLowerCase().includes('toric');
            if (!matches) return false;
          } else if (selectedCategory === 'optical-lenses') {
            const matches =
              p.category_id === 11 ||
              (p.category_name && p.category_name.toLowerCase().includes('optical')) ||
              p.name.toLowerCase().includes('optical') ||
              p.name.toLowerCase().includes('progressive') ||
              p.name.toLowerCase().includes('bifocal') ||
              p.name.toLowerCase().includes('single-vision');
            if (!matches) return false;
          } else if (selectedCategory === 'lenses') {
            if (!isLensProduct(p)) return false;
          } else if (selectedCategory === 'frames') {
            if (!isFrameProduct(p)) return false;
          } else {
            const matches =
              String(p.category_id) === String(selectedCategory) ||
              (p.category_name && p.category_name.toLowerCase() === selectedCategory.toLowerCase());
            if (!matches) return false;
          }
        }

        // Brand filter
        if (selectedBrand !== 'all' && p.brand_name !== selectedBrand) {
          return false;
        }

        // Audience / Gender filter
        if (selectedGender !== 'all') {
          // Eyewear frame selections strictly exclude contact and optical lenses
          if (isLensProduct(p)) return false;

          const pGen = (p.gender || '').toLowerCase();
          const targetGen = selectedGender.toLowerCase();

          if (targetGen === 'kids' || targetGen === 'kid') {
            if (!pGen.includes('kid')) return false;
          } else if (targetGen === 'men' || targetGen === 'man') {
            // Selecting Men shows men's frames plus appropriate unisex frames
            if (pGen !== 'men' && pGen !== 'unisex') return false;
          } else if (targetGen === 'women' || targetGen === 'woman') {
            // Selecting Women shows women's frames plus appropriate unisex frames
            if (pGen !== 'women' && pGen !== 'unisex') return false;
          } else if (targetGen === 'unisex') {
            if (pGen !== 'unisex') return false;
          } else if (!pGen.includes(targetGen)) {
            return false;
          }
        }

        // Frame Type filter
        if (selectedFrameType !== 'all' && p.frame_type !== selectedFrameType) {
          return false;
        }

        // Frame Material filter
        if (selectedFrameMaterial !== 'all' && p.frame_material !== selectedFrameMaterial) {
          return false;
        }

        // Lens Type filter
        if (selectedLensType !== 'all' && p.lens_type !== selectedLensType) {
          return false;
        }

        // Price filter
        const price = Number(p.price) || 0;
        if (price > maxPrice) {
          return false;
        }

        // Discount filter
        const discount = Number(p.discount || 0);
        if (discount < minDiscount) {
          return false;
        }

        // Stock availability
        if (inStockOnly && p.stock <= 0) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const priceA = Number(a.price) || 0;
        const priceB = Number(b.price) || 0;
        const discA = Number(a.discount || 0);
        const discB = Number(b.discount || 0);

        switch (sortBy) {
          case 'price-asc':
            return priceA - priceB;
          case 'price-desc':
            return priceB - priceA;
          case 'discount':
            return discB - discA;
          case 'newest':
            return b.id - a.id;
          case 'popularity':
            return (discB * 2 + (100 - b.stock)) - (discA * 2 + (100 - a.stock));
          case 'rating':
            return b.id - a.id;
          case 'featured':
          default:
            return 0;
        }
      });
  }, [
    products,
    search,
    selectedCategory,
    selectedBrand,
    selectedGender,
    selectedFrameType,
    selectedFrameMaterial,
    selectedLensType,
    maxPrice,
    minDiscount,
    inStockOnly,
    sortBy
  ]);

  // Trending section from existing database
  const trendingProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => Number(b.discount || 0) - Number(a.discount || 0))
      .slice(0, 4);
  }, [products]);

  // Best Sellers subset from database
  const bestSellers = useMemo(() => {
    return [...products]
      .filter((p) => Number(p.price) > 0)
      .sort((a, b) => (Number(b.discount || 0) * 1.5 + (50 - b.stock)) - (Number(a.discount || 0) * 1.5 + (50 - a.stock)))
      .slice(0, 4);
  }, [products]);

  // New Arrivals subset from database
  const newArrivals = useMemo(() => {
    return [...products]
      .sort((a, b) => b.id - a.id)
      .slice(0, 4);
  }, [products]);

  // Discounted Products subset from database
  const discountedProducts = useMemo(() => {
    return [...products]
      .filter((p) => Number(p.discount || 0) > 0)
      .sort((a, b) => Number(b.discount || 0) - Number(a.discount || 0))
      .slice(0, 4);
  }, [products]);

  // Brand product counts
  const brandStats = useMemo(() => {
    const stats: { [name: string]: number } = {};
    products.forEach((p) => {
      if (p.brand_name) {
        stats[p.brand_name] = (stats[p.brand_name] || 0) + 1;
      }
    });
    return stats;
  }, [products]);

  // Real Eyeglasses & Sunglasses subsets from active database products
  const eyeglassesProducts = useMemo(() => {
    return products.filter((p) =>
      p.category_id === 1 ||
      (p.category_name && p.category_name.toLowerCase().includes('eyeglasses')) ||
      p.name.toLowerCase().includes('frame') ||
      p.name.toLowerCase().includes('eyeglasses')
    );
  }, [products]);

  const sunglassesProducts = useMemo(() => {
    return products.filter((p) =>
      p.category_id === 2 ||
      (p.category_name && p.category_name.toLowerCase().includes('sunglasses')) ||
      p.name.toLowerCase().includes('sunglass') ||
      p.name.toLowerCase().includes('aviator')
    );
  }, [products]);

  const lensSubcategories: CategoryFilterItem[] = [
    { id: 'all', name: 'All Lenses', icon: '🔍', subtitle: 'Browse all contact & optical lenses' },
    { id: 'contact-lenses', name: 'Contact Lenses', icon: '💧', subtitle: 'Daily, bi-weekly & monthly contact lenses' },
    { id: 'optical-lenses', name: 'Optical Lenses', icon: '🔬', subtitle: 'Single-vision, bifocal & progressive lenses' }
  ];

  const displayedLensProducts = useMemo(() => {
    if (lensSubCategory === 'all') {
      return lensProducts;
    }
    if (lensSubCategory === 'contact-lenses') {
      return lensProducts.filter(
        (p) =>
          p.category_id === 4 ||
          (p.category_name && p.category_name.toLowerCase().includes('contact')) ||
          p.name.toLowerCase().includes('contact') ||
          p.name.toLowerCase().includes('disposable') ||
          p.name.toLowerCase().includes('toric') ||
          (p.frame_material && p.frame_material.toLowerCase().includes('hydrogel'))
      );
    }
    if (lensSubCategory === 'optical-lenses') {
      return lensProducts.filter(
        (p) =>
          p.category_id === 11 ||
          (p.category_name && p.category_name.toLowerCase().includes('optical')) ||
          p.name.toLowerCase().includes('optical') ||
          p.name.toLowerCase().includes('crizal') ||
          p.name.toLowerCase().includes('progressive') ||
          p.name.toLowerCase().includes('bifocal') ||
          p.name.toLowerCase().includes('single-vision') ||
          p.name.toLowerCase().includes('scratch-resistant')
      );
    }
    return lensProducts;
  }, [lensProducts, lensSubCategory]);

  const displayedFrameProducts = useMemo(() => {
    let list = frameProducts;

    // Filter by audience / gender
    if (selectedGender !== 'all') {
      const g = selectedGender.toLowerCase();
      if (g === 'kids' || g === 'kid') {
        list = list.filter((p) => (p.gender || '').toLowerCase().includes('kid'));
      } else if (g === 'men' || g === 'man') {
        list = list.filter((p) => {
          const gen = (p.gender || '').toLowerCase();
          return gen === 'men' || gen === 'unisex';
        });
      } else if (g === 'women' || g === 'woman') {
        list = list.filter((p) => {
          const gen = (p.gender || '').toLowerCase();
          return gen === 'women' || gen === 'unisex';
        });
      } else if (g === 'unisex') {
        list = list.filter((p) => (p.gender || '').toLowerCase() === 'unisex');
      }
    }

    // Filter by style / subcategory
    if (frameSubCategory === 'all') {
      return list;
    }
    if (frameSubCategory === 'eyeglasses') {
      return list.filter(
        (p) =>
          p.category_id === 1 ||
          (p.category_name && p.category_name.toLowerCase().includes('eyeglasses')) ||
          p.name.toLowerCase().includes('eyeglasses') ||
          p.name.toLowerCase().includes('frame')
      );
    }
    if (frameSubCategory === 'sunglasses') {
      return list.filter(
        (p) =>
          p.category_id === 2 ||
          (p.category_name && p.category_name.toLowerCase().includes('sunglasses')) ||
          p.name.toLowerCase().includes('sunglass') ||
          p.name.toLowerCase().includes('aviator')
      );
    }
    if (frameSubCategory === 'blue-light') {
      return list.filter(
        (p) =>
          (p.lens_type && p.lens_type.toLowerCase().includes('blue')) ||
          (p.description && p.description.toLowerCase().includes('blue light')) ||
          p.name.toLowerCase().includes('blue')
      );
    }
    if (frameSubCategory === 'computer') {
      return list.filter(
        (p) =>
          p.category_id === 3 ||
          (p.category_name && p.category_name.toLowerCase().includes('computer')) ||
          p.name.toLowerCase().includes('computer') ||
          (p.description && p.description.toLowerCase().includes('computer'))
      );
    }
    if (frameSubCategory === 'kids') {
      return list.filter(
        (p) =>
          (p.gender && p.gender.toLowerCase().includes('kid')) ||
          (p.description && p.description.toLowerCase().includes('kid')) ||
          p.name.toLowerCase().includes('kid')
      );
    }
    return list;
  }, [frameProducts, selectedGender, frameSubCategory]);

  const renderProductCard = (p: Product, keyPrefix = '') => {
    return (
      <StorefrontProductCard
        key={`${keyPrefix}${p.id}`}
        product={p}
        keyPrefix={keyPrefix}
        isInWishlist={isInWishlist}
        toggleWishlist={toggleWishlist}
        onAddToCart={handleAddToCart}
      />
    );
  };

  return (
    <div className="home-page">
      {/* ----------------------------------------------------
          STEP 2: Hero Section
          ---------------------------------------------------- */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot"></span>
              Curated Eyewear Collection 2026
            </div>
            <h1 className="hero-headline">
              See Better.
              <br />
              <span>Look Better.</span>
            </h1>
            <p className="hero-subtitle">
              Discover stylish eyewear designed for your everyday vision and your personal style.
            </p>
            <div className="hero-cta-group">
              <button
                className="btn-primary"
                onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Shop Eyewear →
              </button>
              <button
                className="btn-secondary"
                onClick={() => document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Explore Collection
              </button>
            </div>
          </div>

          <div className="hero-image-card">
            <img src={heroImg} alt="Luxury titanium eyewear display" />
            <div className="hero-feature-pill">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <div>
                <strong>Engineered for Comfort</strong>
                <span>Lightweight • Anti-Reflective Lenses</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------
          STEP 3: Categories Section (Frames 👓 & Lenses 🔍)
          ---------------------------------------------------- */}
      <section className="section categories-section" id="categories">
        <div className="section-header">
          <span className="section-tag">Collections</span>
          <h2 className="section-title">Shop by Category</h2>
          <p className="section-subtitle">
            Explore our curated catalog organized into two main categories: premium optical Frames and specialized Lenses.
          </p>
        </div>

        {/* Dynamic Display for Selected Main Category on the Same Page */}
        <div className="main-category-switcher" style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${mainCategory === 'frames' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '12px 28px', borderRadius: '9999px', fontSize: '1rem', fontWeight: 700 }}
            onClick={() => {
              setMainCategory('frames');
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set('main', 'frames');
                return next;
              });
            }}
          >
            👓 Optical Frames Collection ({frameProducts.length})
          </button>
          <button
            type="button"
            className={`btn ${mainCategory === 'lenses' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '12px 28px', borderRadius: '9999px', fontSize: '1rem', fontWeight: 700 }}
            onClick={() => {
              setMainCategory('lenses');
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set('main', 'lenses');
                return next;
              });
            }}
          >
            🔍 Specialized Lenses ({lensProducts.length})
          </button>
        </div>

        <div className="category-products-display">
          {mainCategory === 'frames' ? (
            <div id="category-panel-frames" role="region" aria-label="Frames Catalog">


              {/* Real Frames Grid from Active Database */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  Loading frames from database...
                </div>
              ) : displayedFrameProducts.length > 0 ? (
                <div className="category-products-grid">
                  <div className="category-grid-info">
                    <span>
                      Displaying <strong>{displayedFrameProducts.length}</strong>{' '}
                      {displayedFrameProducts.length === 1 ? 'frame' : 'frames'} in{' '}
                      <strong>{frameSubcategories.find((s) => s.id === frameSubCategory)?.name || 'Frames'}</strong>
                      {selectedGender !== 'all' && (
                        <span> for <strong>{selectedGender === 'Kids' ? 'Kids' : `${selectedGender} (+ Unisex)`}</strong></span>
                      )}
                    </span>
                    {(frameSubCategory !== 'all' || selectedGender !== 'all') && (
                      <button
                        type="button"
                        className="btn-link-reset"
                        onClick={() => {
                          setFrameSubCategory('all');
                          setSelectedGender('all');
                          setSelectedCategory('all');
                          setSearchParams((prev) => {
                            const next = new URLSearchParams(prev);
                            next.set('main', 'frames');
                            next.set('sub', 'all');
                            next.delete('gender');
                            return next;
                          });
                        }}
                      >
                        View All Frames ({frameProducts.length})
                      </button>
                    )}
                  </div>
                  <div className="products-grid">
                    {displayedFrameProducts.map((p) => renderProductCard(p, 'cat-frame-'))}
                  </div>
                </div>
              ) : (
                <div className="category-empty-state">
                  <span className="empty-state-icon">
                    {frameSubcategories.find((s) => s.id === frameSubCategory)?.icon || '👓'}
                  </span>
                  <h4>
                    No products currently available in{' '}
                    "{frameSubcategories.find((s) => s.id === frameSubCategory)?.name || 'this frame category'}"
                    {selectedGender !== 'all' && ` for ${selectedGender}`}
                  </h4>
                  <p>
                    We are restocking this specific frame collection soon. Explore our full in-stock frames collection.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setFrameSubCategory('all');
                      setSelectedGender('all');
                      setSelectedCategory('all');
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.set('main', 'frames');
                        next.set('sub', 'all');
                        next.delete('gender');
                        return next;
                      });
                    }}
                  >
                    View All Available Frames ({frameProducts.length})
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div id="category-panel-lenses" role="region" aria-label="Lenses Catalog">
              {/* Real Lenses Grid from Active Database */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  Loading lens products from database...
                </div>
              ) : displayedLensProducts.length > 0 ? (
                <div className="category-products-grid">
                  <div className="category-grid-info">
                    <span>
                      Displaying <strong>{displayedLensProducts.length}</strong>{' '}
                      {displayedLensProducts.length === 1 ? 'lens product' : 'lens products'} in{' '}
                      <strong>{lensSubcategories.find((s) => s.id === lensSubCategory)?.name || 'Lenses'}</strong>
                    </span>
                    {lensSubCategory !== 'all' && (
                      <button
                        type="button"
                        className="btn-link-reset"
                        onClick={() => {
                          setLensSubCategory('all');
                          setSelectedCategory('all');
                          setSearchParams((prev) => {
                            const next = new URLSearchParams(prev);
                            next.set('main', 'lenses');
                            next.set('sub', 'all');
                            return next;
                          });
                        }}
                      >
                        View All Lenses ({lensProducts.length})
                      </button>
                    )}
                  </div>
                  <div className="products-grid">
                    {displayedLensProducts.map((p) => renderProductCard(p, 'cat-lens-'))}
                  </div>
                </div>
              ) : (
                <div className="lenses-empty-card">
                  <div className="lenses-empty-icon-wrap">
                    <span className="lenses-empty-icon">🔍</span>
                  </div>
                  <span className="lenses-badge-tag">Catalog Notice</span>
                  <h3 className="lenses-empty-heading">
                    No products currently available in "{lensSubcategories.find((s) => s.id === lensSubCategory)?.name || 'this lens category'}"
                  </h3>
                  <p className="lenses-empty-text">
                    Our inventory for this specific lens category is currently being restocked from certified optical laboratories.
                    You can view all available lenses or explore our frames collection.
                  </p>
                  <div className="lenses-empty-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setLensSubCategory('all');
                        setSelectedCategory('all');
                        setSearchParams((prev) => {
                          const next = new URLSearchParams(prev);
                          next.set('main', 'lenses');
                          next.set('sub', 'all');
                          return next;
                        });
                      }}
                    >
                      View All Lenses ({lensProducts.length})
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        setMainCategory('frames');
                        setSelectedCategory(frameSubCategory);
                        setSearchParams((prev) => {
                          const next = new URLSearchParams(prev);
                          next.set('main', 'frames');
                          next.set('sub', frameSubCategory);
                          return next;
                        });
                      }}
                    >
                      Browse Frames Collection 👓
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------
          STEP 5: Trending / Best Sellers Section
          ---------------------------------------------------- */}
      {trendingProducts.length > 0 && (
        <section className="trending-section">
          <div className="section" style={{ padding: '0 24px' }}>
            <div className="section-header">
              <span className="section-tag">Featured Selection</span>
              <h2 className="section-title">Trending Eyewear</h2>
              <p className="section-subtitle">
                Popular styles and standout optical craftsmanship handpicked from our current catalog.
              </p>
            </div>

            <div className="products-grid">
              {trendingProducts.map((p) => {
                const priceNum = Number(p.price);
                const discountNum = Number(p.discount || 0);
                const hasDiscount = discountNum > 0;
                const originalPrice = hasDiscount ? Math.round(priceNum / (1 - discountNum / 100)) : null;

                return (
                  <div className="product-card" key={`trending-${p.id}`}>
                    <div className="product-media">
                      <div className="product-badge-group">
                        <span className="trending-pill">★ Trending Pick</span>
                        {hasDiscount && <span className="discount-pill">{discountNum}% OFF</span>}
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

                      <ProductImage product={p} />
                    </div>

                    <div className="product-body">
                      <span className="product-brand">{p.brand_name || 'EyeKart Optical'}</span>
                      <h3 className="product-title">{p.name}</h3>
                      <p className="product-desc">{p.description || 'Premium durable frame with precision optical lenses.'}</p>

                      <div className="product-meta-row">
                        <div className="product-pricing">
                          <span className="price-current">₹{priceNum.toLocaleString('en-IN')}</span>
                          {originalPrice && (
                            <span className="price-original">₹{originalPrice.toLocaleString('en-IN')}</span>
                          )}
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
              })}
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------
          Best Sellers Showcase Section
          ---------------------------------------------------- */}
      {bestSellers.length > 0 && (
        <section className="bestsellers-section" id="bestsellers" style={{ padding: '48px 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
          <div className="section" style={{ padding: '0 24px' }}>
            <div className="section-header">
              <span className="section-tag">Most Popular Picks</span>
              <h2 className="section-title">Best Sellers</h2>
              <p className="section-subtitle">
                Our most sought-after optical frames and best-reviewed shades, crafted for long-wearing comfort.
              </p>
            </div>
            <div className="products-grid">
              {bestSellers.map((p) => renderProductCard(p, 'bestseller-'))}
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------
          New Arrivals Showcase Section
          ---------------------------------------------------- */}
      {newArrivals.length > 0 && (
        <section className="newarrivals-section" id="newarrivals" style={{ padding: '48px 0' }}>
          <div className="section" style={{ padding: '0 24px' }}>
            <div className="section-header">
              <span className="section-tag">Fresh Optical Drops</span>
              <h2 className="section-title">New Arrivals</h2>
              <p className="section-subtitle">
                The latest precision silhouettes, contemporary shapes, and specialized optical lenses just added to store inventory.
              </p>
            </div>
            <div className="products-grid">
              {newArrivals.map((p) => renderProductCard(p, 'newarrival-'))}
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------
          Discounted Products Showcase Section
          ---------------------------------------------------- */}
      {discountedProducts.length > 0 && (
        <section className="discounted-section" id="offers-showcase" style={{ padding: '48px 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
          <div className="section" style={{ padding: '0 24px' }}>
            <div className="section-header">
              <span className="section-tag">Limited-Time Discounts</span>
              <h2 className="section-title">Special Value Offers</h2>
              <p className="section-subtitle">
                Exclusive reductions on selected designer frames and sunglasses with active promotional pricing.
              </p>
            </div>
            <div className="products-grid">
              {discountedProducts.map((p) => renderProductCard(p, 'discount-'))}
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------
          Brand Showcase Section
          ---------------------------------------------------- */}
      {availableBrands.length > 0 && (
        <section className="brands-section" id="brands">
          <div className="section" style={{ padding: '0 24px' }}>
            <div className="section-header">
              <span className="section-tag">World-Class Eyewear</span>
              <h2 className="section-title">Shop by Brand</h2>
              <p className="section-subtitle">
                Explore iconic eyewear houses and precision lens makers trusted by millions worldwide.
              </p>
            </div>

            <div className="brands-grid">
              {availableBrands.map((brandName) => {
                const count = brandStats[brandName] || 0;
                const isSelected = selectedBrand === brandName;
                return (
                  <div
                    key={brandName}
                    className={`brand-card-item ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      const nextBrand = isSelected ? 'all' : brandName;
                      setSelectedBrand(nextBrand);
                      document.getElementById('catalog-results')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Filter by brand ${brandName}`}
                  >
                    <span className="brand-card-icon">🕶️</span>
                    <span className="brand-card-name">{brandName}</span>
                    <span className="brand-card-count">
                      {count} {count === 1 ? 'Design' : 'Designs'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------
          STEP 4: Featured Products Catalog & Advanced Filters
          ---------------------------------------------------- */}
      <section className="products-section" id="products">
        <div className="section" style={{ padding: '0 24px' }}>
          <div className="section-header">
            <span className="section-tag">Real Store Inventory</span>
            <h2 className="section-title">Explore All Eyewear</h2>
            <p className="section-subtitle">
              Everyday clarity and elevated looks. Search and filter through our live database of frames and sunglasses.
            </p>
          </div>

          {/* Real Eyeglasses & Sunglasses Products Showcases */}
          <div className="category-showcase-container" id="category-showcases">
            {/* Eyeglasses Products Section */}
            <div className="category-showcase-section" id="section-eyeglasses">
              <div className="category-showcase-header">
                <div className="showcase-header-left">
                  <span className="category-showcase-pill">👓 Eyeglasses Collection</span>
                  <h3 className="category-showcase-title">Eyeglasses</h3>
                  <p className="category-showcase-desc">Prescription and everyday frames directly from our store inventory.</p>
                </div>
                <span className="category-showcase-count">
                  {eyeglassesProducts.length} {eyeglassesProducts.length === 1 ? 'Frame' : 'Frames'} Available
                </span>
              </div>

              {loading && (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748b' }}>
                  Loading eyeglasses from database...
                </div>
              )}

              {error && (
                <div style={{ textAlign: 'center', padding: '20px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px' }}>
                  <p>{error}</p>
                  <button className="secondary-btn" onClick={fetchProducts} style={{ marginTop: '8px' }}>Retry Connection</button>
                </div>
              )}

              {!loading && !error && (
                eyeglassesProducts.length > 0 ? (
                  <div className="products-grid">
                    {eyeglassesProducts.map((p) => renderProductCard(p, 'showcase-eye-'))}
                  </div>
                ) : (
                  <p style={{ color: '#64748b', fontStyle: 'italic', padding: '16px 0', margin: 0 }}>
                    No eyeglasses currently available in inventory.
                  </p>
                )
              )}
            </div>

            {/* Sunglasses Products Section */}
            <div className="category-showcase-section" id="section-sunglasses">
              <div className="category-showcase-header">
                <div className="showcase-header-left">
                  <span className="category-showcase-pill sunglasses-pill">🕶️ Sunglasses Collection</span>
                  <h3 className="category-showcase-title">Sunglasses</h3>
                  <p className="category-showcase-desc">Designer sunglasses with UV protection from our store inventory.</p>
                </div>
                <span className="category-showcase-count">
                  {sunglassesProducts.length} {sunglassesProducts.length === 1 ? 'Pair' : 'Pairs'} Available
                </span>
              </div>

              {loading && (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748b' }}>
                  Loading sunglasses from database...
                </div>
              )}

              {error && (
                <div style={{ textAlign: 'center', padding: '20px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px' }}>
                  <p>{error}</p>
                  <button className="secondary-btn" onClick={fetchProducts} style={{ marginTop: '8px' }}>Retry Connection</button>
                </div>
              )}

              {!loading && !error && (
                sunglassesProducts.length > 0 ? (
                  <div className="products-grid">
                    {sunglassesProducts.map((p) => renderProductCard(p, 'showcase-sun-'))}
                  </div>
                ) : (
                  <p style={{ color: '#64748b', fontStyle: 'italic', padding: '16px 0', margin: 0 }}>
                    No sunglasses currently available in inventory.
                  </p>
                )
              )}
            </div>
          </div>

          {/* Search & Category Pills */}
          <div className="filter-bar">
            {/* Audience Quick Filter Row */}
            <div className="catalog-audience-row">
              <span className="catalog-audience-label">
                <span>👥</span> Audience:
              </span>
              <button
                type="button"
                className={`audience-pill ${selectedGender === 'all' ? 'active' : ''}`}
                onClick={() => handleAudienceSelect('all')}
              >
                <span>👓 All Frames</span>
                <span className="audience-pill-badge">{frameProducts.length}</span>
              </button>
              <button
                type="button"
                className={`audience-pill ${selectedGender === 'Men' ? 'active' : ''}`}
                onClick={() => handleAudienceSelect('Men')}
              >
                <span>👔 Men</span>
                <span className="audience-pill-badge">{menFrameCount}</span>
              </button>
              <button
                type="button"
                className={`audience-pill ${selectedGender === 'Women' ? 'active' : ''}`}
                onClick={() => handleAudienceSelect('Women')}
              >
                <span>👗 Women</span>
                <span className="audience-pill-badge">{womenFrameCount}</span>
              </button>
              <button
                type="button"
                className={`audience-pill ${selectedGender === 'Kids' ? 'active' : ''}`}
                onClick={() => handleAudienceSelect('Kids')}
              >
                <span>🧸 Kids</span>
                <span className="audience-pill-badge">{kidsFrameCount}</span>
              </button>
              <button
                type="button"
                className={`audience-pill ${selectedGender === 'Unisex' ? 'active' : ''}`}
                onClick={() => handleAudienceSelect('Unisex')}
              >
                <span>⚡ Unisex</span>
                <span className="audience-pill-badge">{unisexFrameCount}</span>
              </button>
            </div>

            <div className="search-input-wrap">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by name, description, brand, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search eyewear products"
              />
              {search && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearch('')}
                  aria-label="Clear search input"
                >
                  &times;
                </button>
              )}
            </div>

            <div className="filter-pills">
              <button
                className={`filter-pill ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => handleCategorySelect('all')}
              >
                All Products ({products.length})
              </button>
              <button
                className={`filter-pill ${selectedCategory === 'eyeglasses' ? 'active' : ''}`}
                onClick={() => handleCategorySelect('eyeglasses')}
              >
                👓 Eyeglasses ({eyeglassesProducts.length})
              </button>
              <button
                className={`filter-pill ${selectedCategory === 'sunglasses' ? 'active' : ''}`}
                onClick={() => handleCategorySelect('sunglasses')}
              >
                🕶️ Sunglasses ({sunglassesProducts.length})
              </button>
              <button
                className={`filter-pill ${selectedCategory === 'computer' ? 'active' : ''}`}
                onClick={() => handleCategorySelect('computer')}
              >
                💻 Computer Glasses
              </button>
              <button
                className={`filter-pill ${selectedCategory === 'contact-lenses' ? 'active' : ''}`}
                onClick={() => handleCategorySelect('contact-lenses')}
              >
                💧 Contact Lenses
              </button>
              <button
                className={`filter-pill ${selectedCategory === 'optical-lenses' ? 'active' : ''}`}
                onClick={() => handleCategorySelect('optical-lenses')}
              >
                🔬 Optical Lenses
              </button>
            </div>
          </div>

          {/* Sub-bar: Filter Toggle Button + Count + Sort */}
          <div className="catalog-control-strip" id="catalog-results">
            <div className="catalog-strip-left">
              <button
                type="button"
                className={`btn-filter-drawer-toggle ${mobileFilterOpen ? 'active' : ''}`}
                onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                aria-expanded={mobileFilterOpen}
              >
                <span>⚙️ Filters</span>
                {activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
              </button>

              <span className="catalog-results-count">
                <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'product' : 'products'} found
              </span>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  className="btn-clear-filters-link"
                  onClick={resetAllFilters}
                >
                  Clear all filters ✕
                </button>
              )}
            </div>

            <div className="catalog-strip-right">
              <label htmlFor="catalog-sort-select" className="sort-label">Sort by:</label>
              <select
                id="catalog-sort-select"
                className="sort-dropdown"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="popularity">Popularity / Best Sellers</option>
                <option value="rating">Top Customer Ratings</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="discount">Highest Discount</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>

          {/* Advanced Filter Panel / Drawer */}
          {mobileFilterOpen && (
            <div className="advanced-filters-panel">
              <div className="filters-panel-header">
                <h3>Refine Selection</h3>
                <button
                  type="button"
                  className="panel-close-btn"
                  onClick={() => setMobileFilterOpen(false)}
                  aria-label="Close filters panel"
                >
                  &times;
                </button>
              </div>

              <div className="filters-grid-row">
                {/* Brand Filter */}
                <div className="filter-facet-group">
                  <label>Brand</label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="facet-select"
                  >
                    <option value="all">All Brands ({availableBrands.length})</option>
                    {availableBrands.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Gender Filter */}
                <div className="filter-facet-group">
                  <label>Gender / Fit</label>
                  <select
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value)}
                    className="facet-select"
                  >
                    <option value="all">All Genders</option>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Unisex">Unisex</option>
                    <option value="Kids">Kids</option>
                  </select>
                </div>

                {/* Frame Type Filter */}
                {availableFrameTypes.length > 0 && (
                  <div className="filter-facet-group">
                    <label>Frame Type</label>
                    <select
                      value={selectedFrameType}
                      onChange={(e) => setSelectedFrameType(e.target.value)}
                      className="facet-select"
                    >
                      <option value="all">All Frame Types</option>
                      {availableFrameTypes.map((ft) => (
                        <option key={ft} value={ft}>
                          {ft}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Frame Material */}
                {availableFrameMaterials.length > 0 && (
                  <div className="filter-facet-group">
                    <label>Frame Material</label>
                    <select
                      value={selectedFrameMaterial}
                      onChange={(e) => setSelectedFrameMaterial(e.target.value)}
                      className="facet-select"
                    >
                      <option value="all">All Materials</option>
                      {availableFrameMaterials.map((fm) => (
                        <option key={fm} value={fm}>
                          {fm}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Lens Type */}
                {availableLensTypes.length > 0 && (
                  <div className="filter-facet-group">
                    <label>Lens Type</label>
                    <select
                      value={selectedLensType}
                      onChange={(e) => setSelectedLensType(e.target.value)}
                      className="facet-select"
                    >
                      <option value="all">All Lens Types</option>
                      {availableLensTypes.map((lt) => (
                        <option key={lt} value={lt}>
                          {lt}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Price Range */}
                <div className="filter-facet-group">
                  <div className="facet-label-split">
                    <label>Max Price</label>
                    <span className="facet-val">₹{maxPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max={maxCatalogPrice}
                    step="200"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="facet-slider"
                  />
                </div>

                {/* Discount */}
                <div className="filter-facet-group">
                  <label>Minimum Discount</label>
                  <div className="discount-pill-buttons">
                    {[0, 10, 20, 30].map((d) => (
                      <button
                        type="button"
                        key={d}
                        className={`pill-btn ${minDiscount === d ? 'active' : ''}`}
                        onClick={() => setMinDiscount(d)}
                      >
                        {d === 0 ? 'Any' : `${d}%+`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stock Checkbox */}
                <div className="filter-facet-group checkbox-facet">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                    />
                    <span>In-Stock Items Only</span>
                  </label>
                </div>
              </div>

              <div className="filters-panel-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={resetAllFilters}
                >
                  Clear All
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setMobileFilterOpen(false)}
                >
                  Apply Filters ({filteredProducts.length})
                </button>
              </div>
            </div>
          )}

          {/* Catalog States */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>👓</div>
              <p style={{ color: '#64748b', fontSize: '1.05rem' }}>Loading live eyewear catalog from server...</p>
            </div>
          )}

          {error && (
            <div
              style={{
                textAlign: 'center',
                padding: '36px 20px',
                background: '#fee2e2',
                color: '#b91c1c',
                borderRadius: '12px',
                border: '1px solid #fecaca',
                maxWidth: '600px',
                margin: '20px auto'
              }}
            >
              <p style={{ fontWeight: 600, margin: '0 0 12px 0' }}>{error}</p>
              <button className="secondary-btn" onClick={fetchProducts}>
                Retry Connection
              </button>
            </div>
          )}

          {!loading && !error && (
            <div>
              {filteredProducts.length === 0 ? (
                <div
                  className="empty-catalog-state"
                  style={{
                    textAlign: 'center',
                    padding: '50px 24px',
                    background: '#f8fafc',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    maxWidth: '680px',
                    margin: '30px auto'
                  }}
                >
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: '8px' }}>
                    {selectedCategory === 'eyeglasses' ? '👓' : selectedCategory === 'sunglasses' ? '🕶️' : selectedCategory === 'computer' ? '💻' : '🔍'}
                  </span>
                  <h3 style={{ marginTop: '12px', color: '#0f172a', fontSize: '1.3rem', fontWeight: 700 }}>
                    {selectedCategory !== 'all'
                      ? `No products currently available in "${selectedCategory === 'eyeglasses' ? 'Eyeglasses' : selectedCategory === 'sunglasses' ? 'Sunglasses' : selectedCategory === 'computer' ? 'Computer Glasses' : selectedCategory}"`
                      : search
                      ? `No products found matching "${search}"`
                      : 'No products match your filter criteria'}
                  </h3>
                  <p style={{ color: '#64748b', margin: '10px 0 24px 0', lineHeight: 1.6, fontSize: '0.95rem' }}>
                    {selectedCategory !== 'all'
                      ? 'We are restocking fresh inventory for this collection soon. You can explore our other categories or view all eyewear.'
                      : 'Try broadening your search keywords or clearing active filters to view all available frames.'}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={resetAllFilters}
                    >
                      View All Products ({products.length})
                    </button>
                    {selectedCategory !== 'all' && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleCategorySelect('all')}
                      >
                        Reset Category Filter
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="products-grid">
                  {filteredProducts.map((p) => renderProductCard(p, 'cat-main-'))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------
          STEP 6: Promotional Section
          ---------------------------------------------------- */}
      <section className="promo-section">
        <div className="promo-banner">
          <div className="promo-content">
            <span className="promo-tag">Style &amp; Vision Redefined</span>
            <h2 className="promo-title">Upgrade Your Look</h2>
            <p className="promo-desc">
              Premium eyewear designed for comfort, confidence and everyday style. Experience high-definition clarity
              with scratch-resistant finishes.
            </p>
            <button
              className="btn-primary"
              style={{ background: 'white', color: '#0f172a' }}
              onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Shop Now →
            </button>
          </div>
          <div>
            <img src={promoImg} alt="Model wearing stylish EyeKart eyeglasses" />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------
          STEP 7: Why Choose EyeKart
          ---------------------------------------------------- */}
      <section className="features-section" id="why-us">
        <div className="section" style={{ padding: '0 24px' }}>
          <div className="section-header">
            <span className="section-tag">The EyeKart Standard</span>
            <h2 className="section-title">Why Choose EyeKart</h2>
            <p className="section-subtitle">
              We combine optical expertise with modern aesthetics to give you eyewear that lasts.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-box">✨</div>
              <h3>Quality Eyewear</h3>
              <p>Premium products selected for everyday comfort, hand-finished acetate, and durable alloy hinges.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">🔒</div>
              <h3>Secure Payments</h3>
              <p>Safe and secure checkout experience with Cash on Delivery and encrypted Razorpay payments.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">🚚</div>
              <h3>Fast Delivery</h3>
              <p>Get your eyewear delivered safely to your doorstep with tracking updates every step of the way.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">🔄</div>
              <h3>Easy Returns</h3>
              <p>Simple customer-friendly return experience so you can shop with complete peace of mind.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------
          STEP 8: Customer Highlights / Testimonials Section
          ---------------------------------------------------- */}
      <section className="testimonials-section">
        <div className="section" style={{ padding: '0 24px' }}>
          <div className="section-header">
            <span className="section-tag">Customer Impressions (Sample Highlights)</span>
            <h2 className="section-title">What Wearers Appreciate</h2>
            <p className="section-subtitle">
              Feedback and demo highlights reflecting our commitment to fit, optical sharpness, and design.
            </p>
          </div>

          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div>
                <div className="testimonial-stars">★★★★★</div>
                <p className="testimonial-text">
                  “Great collection and very comfortable glasses. The blue light filtering really helped with my daily
                  screen fatigue.”
                </p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">AR</div>
                <div className="author-info">
                  <strong>Aarav R.</strong>
                  <span>Verified EyeKart Customer (Sample)</span>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div>
                <div className="testimonial-stars">★★★★★</div>
                <p className="testimonial-text">
                  “The frames feel extremely sturdy yet surprisingly lightweight. The aviator sunglasses exceeded my
                  expectations.”
                </p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">PS</div>
                <div className="author-info">
                  <strong>Pooja S.</strong>
                  <span>Verified EyeKart Customer (Sample)</span>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div>
                <div className="testimonial-stars">★★★★★</div>
                <p className="testimonial-text">
                  “Seamless checkout and quick doorstep delivery. The packaging kept the spectacles completely safe.”
                </p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">MK</div>
                <div className="author-info">
                  <strong>Manish K.</strong>
                  <span>Verified EyeKart Customer (Sample)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------
          STEP 9: Newsletter / CTA Section
          ---------------------------------------------------- */}
      <section className="newsletter-section">
        <div className="newsletter-card">
          <span className="section-tag">Newsletter</span>
          <h2 className="section-title" style={{ margin: '8px 0 12px 0' }}>
            Stay Ahead of the Trend
          </h2>
          <p className="section-subtitle" style={{ maxWidth: '520px', margin: '0 auto' }}>
            Get updates about new eyewear collections, seasonal drops, and special offers.
          </p>

          {newsletterSubscribed ? (
            <div
              style={{
                marginTop: '24px',
                padding: '14px 20px',
                background: '#dcfce7',
                color: '#15803d',
                borderRadius: '8px',
                fontWeight: 600,
                display: 'inline-block'
              }}
            >
              ✓ Thank you for subscribing! We'll keep you updated on new eyewear drops.
            </div>
          ) : (
            <form className="newsletter-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                required
                placeholder="Enter your email address..."
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                aria-label="Email address for eyewear newsletter"
              />
              <button type="submit">Subscribe</button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
