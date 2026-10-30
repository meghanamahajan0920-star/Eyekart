import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Product, Category, Brand, ProductVariant } from '../types';
import { useToast } from '../context/ToastContext';

export const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Variant Modal state
  const [variantModalProduct, setVariantModalProduct] = useState<Product | null>(null);
  const [variantsList, setVariantsList] = useState<ProductVariant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantSubmitting, setVariantSubmitting] = useState(false);
  const [newVariantData, setNewVariantData] = useState({
    color_name: '',
    color_code: '#000000',
    image: '',
    stock: '20',
    is_default: false
  });

  // Category & Brand Management Modal state
  const [isCatBrandModalOpen, setIsCatBrandModalOpen] = useState(false);
  const [activeCatBrandTab, setActiveCatBrandTab] = useState<'categories' | 'brands'>('categories');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandDesc, setNewBrandDesc] = useState('');
  const [catBrandSubmitting, setCatBrandSubmitting] = useState(false);

  // Product Form Fields
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: 1,
    brand_id: 1,
    price: '',
    discount: '0',
    stock: '10',
    gender: 'Unisex',
    frame_type: 'Full Rim',
    frame_material: 'Acetate',
    lens_type: 'Clear',
    color: 'Black',
    image: '👓'
  });

  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats, brs] = await Promise.all([
        api.getAdminProducts(),
        api.getCategories().catch(() => []),
        api.getBrands().catch(() => [])
      ]);
      setProducts(prods);
      setCategories(cats);
      setBrands(brs);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'EyeKart Admin — Products';
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      category_id: categories.length > 0 ? categories[0].id : 1,
      brand_id: brands.length > 0 ? brands[0].id : 1,
      price: '',
      discount: '0',
      stock: '10',
      gender: 'Unisex',
      frame_type: 'Full Rim',
      frame_material: 'Acetate',
      lens_type: 'Clear',
      color: 'Black',
      image: '👓'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      description: prod.description || '',
      category_id: prod.category_id || 1,
      brand_id: prod.brand_id || 1,
      price: String(prod.price),
      discount: String(prod.discount || 0),
      stock: String(prod.stock),
      gender: prod.gender || 'Unisex',
      frame_type: prod.frame_type || 'Full Rim',
      frame_material: prod.frame_material || 'Acetate',
      lens_type: prod.lens_type || 'Clear',
      color: prod.color || 'Black',
      image: prod.image || '👓'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      showToast('Product name must be at least 2 characters', 'error');
      return;
    }
    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      showToast('Price must be a positive number', 'error');
      return;
    }
    const stockNum = parseInt(formData.stock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      showToast('Stock must be a non-negative number', 'error');
      return;
    }

    setFormLoading(true);
    try {
      const payload: Partial<Product> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category_id: Number(formData.category_id),
        brand_id: Number(formData.brand_id),
        price: priceNum,
        discount: parseFloat(formData.discount) || 0,
        stock: stockNum,
        gender: formData.gender,
        frame_type: formData.frame_type,
        frame_material: formData.frame_material,
        lens_type: formData.lens_type,
        color: formData.color,
        image: formData.image
      };

      if (editingProduct) {
        await api.updateAdminProduct(editingProduct.id, payload);
        showToast('Product updated successfully!', 'success');
      } else {
        await api.createAdminProduct(payload);
        showToast('Product added successfully!', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await api.deleteAdminProduct(id);
      showToast('Product deleted successfully', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Unable to delete product', 'error');
    }
  };

  const openVariantsModal = async (prod: Product) => {
    setVariantModalProduct(prod);
    setNewVariantData({
      color_name: '',
      color_code: '#000000',
      image: prod.image || '',
      stock: '20',
      is_default: false
    });
    setVariantsLoading(true);
    try {
      const vars = await api.getAdminProductVariants(prod.id);
      setVariantsList(vars);
    } catch {
      showToast('Failed to load product variants', 'error');
    } finally {
      setVariantsLoading(false);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantModalProduct) return;
    if (!newVariantData.color_name.trim()) {
      showToast('Variant color name is required', 'error');
      return;
    }
    if (!newVariantData.image.trim()) {
      showToast('Variant image URL or path is required', 'error');
      return;
    }

    setVariantSubmitting(true);
    try {
      await api.createAdminProductVariant(variantModalProduct.id, {
        color_name: newVariantData.color_name.trim(),
        color_code: newVariantData.color_code.trim(),
        image: newVariantData.image.trim(),
        stock: parseInt(newVariantData.stock, 10) || 0,
        is_default: newVariantData.is_default
      });
      showToast('Color variant added successfully!', 'success');
      const updatedVars = await api.getAdminProductVariants(variantModalProduct.id);
      setVariantsList(updatedVars);
      setNewVariantData({
        color_name: '',
        color_code: '#000000',
        image: variantModalProduct.image || '',
        stock: '20',
        is_default: false
      });
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add variant', 'error');
    } finally {
      setVariantSubmitting(false);
    }
  };

  const handleDeleteVariant = async (variantId: number, colorName: string) => {
    if (!window.confirm(`Delete variant color "${colorName}"?`)) return;
    try {
      await api.deleteAdminProductVariant(variantId);
      showToast(`Variant "${colorName}" deleted`, 'success');
      if (variantModalProduct) {
        const updatedVars = await api.getAdminProductVariants(variantModalProduct.id);
        setVariantsList(updatedVars);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete variant', 'error');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      showToast('Category name is required', 'error');
      return;
    }
    setCatBrandSubmitting(true);
    try {
      await api.createAdminCategory({ name: newCategoryName.trim(), description: newCategoryDesc.trim() });
      showToast('Category added successfully', 'success');
      setNewCategoryName('');
      setNewCategoryDesc('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add category', 'error');
    } finally {
      setCatBrandSubmitting(false);
    }
  };

  const handleDeleteCategory = async (catId: number, catName: string) => {
    if (!window.confirm(`Delete category "${catName}"? This cannot be undone.`)) return;
    try {
      await api.deleteAdminCategory(catId);
      showToast(`Category "${catName}" deleted`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category', 'error');
    }
  };

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) {
      showToast('Brand name is required', 'error');
      return;
    }
    setCatBrandSubmitting(true);
    try {
      await api.createAdminBrand({ name: newBrandName.trim(), description: newBrandDesc.trim() });
      showToast('Brand added successfully', 'success');
      setNewBrandName('');
      setNewBrandDesc('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add brand', 'error');
    } finally {
      setCatBrandSubmitting(false);
    }
  };

  const handleDeleteBrand = async (brandId: number, brandName: string) => {
    if (!window.confirm(`Delete brand "${brandName}"? This cannot be undone.`)) return;
    try {
      await api.deleteAdminBrand(brandId);
      showToast(`Brand "${brandName}" deleted`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete brand', 'error');
    }
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      (p.brand_name && p.brand_name.toLowerCase().includes(q)) ||
      (p.category_name && p.category_name.toLowerCase().includes(q)) ||
      (p.gender && p.gender.toLowerCase().includes(q));
    if (!matchesSearch) return false;

    if (genderFilter !== 'all') {
      const g = (p.gender || 'Unisex').toLowerCase();
      if (g !== genderFilter.toLowerCase()) return false;
    }
    return true;
  });

  return (
    <div className="section" style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link to="/admin" style={{ textDecoration: 'none', color: '#4f46e5', fontWeight: 600 }}>
              ← Admin Dashboard
            </Link>
          </div>
          <h1 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', color: '#111827' }}>Product Management</h1>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsCatBrandModalOpen(true)}
            style={{
              padding: '10px 18px',
              background: '#0284c7',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            🏷️ Manage Categories &amp; Brands
          </button>
          <button
            onClick={openAddModal}
            style={{
              padding: '10px 20px',
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            ➕ Add New Product
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name, brand, gender, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            minWidth: '280px',
            fontSize: '0.95rem',
            flex: '1 1 280px'
          }}
        />
        <select
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.95rem',
            background: 'white',
            color: '#374151',
            cursor: 'pointer'
          }}
          aria-label="Filter products by gender"
        >
          <option value="all">All Genders / Fits</option>
          <option value="Men">Men</option>
          <option value="Women">Women</option>
          <option value="Kids">Kids</option>
          <option value="Unisex">Unisex</option>
        </select>
        <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Showing {filtered.length} of {products.length} products
        </span>
      </div>

      {loading && <p>Loading catalog products...</p>}
      {error && (
        <div style={{ padding: '16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Products Table */}
      {!loading && !error && (
        <div
          style={{
            background: 'white',
            borderRadius: '14px',
            border: '1px solid #e5e7eb',
            overflowX: 'auto',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb', color: '#4b5563', fontSize: '0.85rem' }}>
                <th style={{ padding: '12px 16px' }}>Image</th>
                <th style={{ padding: '12px 16px' }}>Product Name</th>
                <th style={{ padding: '12px 16px' }}>Gender</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Brand</th>
                <th style={{ padding: '12px 16px' }}>Price</th>
                <th style={{ padding: '12px 16px' }}>Stock</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((prod) => (
                <tr key={prod.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #e5e7eb',
                        background: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {prod.image && (prod.image.startsWith('/') || prod.image.startsWith('http')) ? (
                        <img
                          src={prod.image}
                          alt={prod.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: '1.4rem' }}>{prod.image || '👓'}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <strong style={{ color: '#111827' }}>{prod.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {prod.frame_type} • {prod.frame_material} • {prod.color}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background:
                          prod.gender === 'Men'
                            ? '#e0e7ff'
                            : prod.gender === 'Women'
                            ? '#fce7f3'
                            : prod.gender === 'Kids'
                            ? '#fef3c7'
                            : '#f1f5f9',
                        color:
                          prod.gender === 'Men'
                            ? '#4338ca'
                            : prod.gender === 'Women'
                            ? '#be185d'
                            : prod.gender === 'Kids'
                            ? '#b45309'
                            : '#334155'
                      }}
                    >
                      {prod.gender === 'Kids' ? '🧒 Kids' : prod.gender === 'Men' ? '👨 Men' : prod.gender === 'Women' ? '👩 Women' : '👓 Unisex'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#4b5563' }}>{prod.category_name || 'Standard'}</td>
                  <td style={{ padding: '12px 16px', color: '#4b5563' }}>{prod.brand_name || 'EyeKart'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                    ₹{Number(prod.price).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        background: prod.stock > 10 ? '#dcfce7' : prod.stock > 0 ? '#fef3c7' : '#fee2e2',
                        color: prod.stock > 10 ? '#15803d' : prod.stock > 0 ? '#b45309' : '#b91c1c'
                      }}
                    >
                      {prod.stock} units
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => openVariantsModal(prod)}
                      style={{
                        padding: '6px 12px',
                        background: '#f0fdf4',
                        color: '#15803d',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        marginRight: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.85rem'
                      }}
                      title="Manage selectable colors and photography for this frame"
                    >
                      🎨 Variants {prod.variants && prod.variants.length > 0 ? `(${prod.variants.length})` : ''}
                    </button>
                    <button
                      onClick={() => openEditModal(prod)}
                      style={{
                        padding: '6px 12px',
                        background: '#e0e7ff',
                        color: '#4338ca',
                        border: 'none',
                        borderRadius: '6px',
                        marginRight: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.85rem'
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(prod.id, prod.name)}
                      style={{
                        padding: '6px 12px',
                        background: '#fee2e2',
                        color: '#b91c1c',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.85rem'
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '28px',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#111827' }}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Product Name *
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value, 10) })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Brand
                  </label>
                  <select
                    value={formData.brand_id}
                    onChange={(e) => setFormData({ ...formData, brand_id: parseInt(e.target.value, 10) })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Price (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="1"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Stock Units *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Frame Type
                  </label>
                  <select
                    value={formData.frame_type}
                    onChange={(e) => setFormData({ ...formData, frame_type: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  >
                    <option value="Full Rim">Full Rim</option>
                    <option value="Half Rim">Half Rim</option>
                    <option value="Rimless">Rimless</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  >
                    <option value="Unisex">Unisex</option>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Kids">Kids</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Material
                  </label>
                  <input
                    type="text"
                    value={formData.frame_material}
                    onChange={(e) => setFormData({ ...formData, frame_material: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Color
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Emoji / Icon
                  </label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="secondary-btn"
                  style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  style={{
                    padding: '10px 24px',
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: formLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {formLoading ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Variant Management Modal */}
      {variantModalProduct && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
            backdropFilter: 'blur(3px)'
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '28px',
              width: '100%',
              maxWidth: '750px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#111827', fontSize: '1.4rem' }}>
                  🎨 Manage Color Variants & Images
                </h2>
                <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
                  {variantModalProduct.name} <span style={{ color: '#9ca3af' }}>• ID #{variantModalProduct.id} • Base Color: {variantModalProduct.color}</span>
                </p>
              </div>
              <button
                onClick={() => setVariantModalProduct(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#6b7280' }}
              >
                ✕
              </button>
            </div>

            {/* Existing Variants Section */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#1f2937', marginBottom: '12px', fontWeight: 600 }}>
                Current Frame Variants ({variantsList.length})
              </h3>

              {variantsLoading ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                  Loading color variants...
                </div>
              ) : variantsList.length === 0 ? (
                <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '8px', textAlign: 'center', color: '#6b7280', border: '1px dashed #d1d5db' }}>
                  No extra color variants configured yet. Add your first color variant below.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {variantsList.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#f9fafb',
                        borderRadius: '10px',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: v.color_code || '#000000',
                            display: 'inline-block',
                            border: '2px solid #ffffff',
                            boxShadow: '0 0 0 1px #d1d5db'
                          }}
                          title={v.color_name}
                        />
                        <div style={{ width: '48px', height: '36px', borderRadius: '6px', overflow: 'hidden', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb' }}>
                          <img
                            src={v.image}
                            alt={v.color_name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {v.color_name}
                            {v.is_default && (
                              <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '4px', fontWeight: 600 }}>
                                Default
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#6b7280', maxWidth: '320px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {v.image}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#374151', background: '#ffffff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                          {v.stock} in stock
                        </span>
                        <button
                          onClick={() => handleDeleteVariant(v.id, v.color_name)}
                          style={{
                            padding: '6px 12px',
                            background: '#fee2e2',
                            color: '#b91c1c',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Variant Form */}
            <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '1rem', fontWeight: 600 }}>
                ➕ Add New Color Variant
              </h4>
              <form onSubmit={handleAddVariant} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                      Color Name *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Matte Black, Tortoise Havana"
                      value={newVariantData.color_name}
                      onChange={(e) => setNewVariantData({ ...newVariantData, color_name: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                      Color Hex *
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="color"
                        value={newVariantData.color_code}
                        onChange={(e) => setNewVariantData({ ...newVariantData, color_code: e.target.value })}
                        style={{ width: '38px', height: '38px', border: 'none', padding: 0, borderRadius: '6px', cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        value={newVariantData.color_code}
                        onChange={(e) => setNewVariantData({ ...newVariantData, color_code: e.target.value })}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                      Stock Units
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newVariantData.stock}
                      onChange={(e) => setNewVariantData({ ...newVariantData, stock: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                    Image Path or URL *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. /images/products/prod_144_matte_black.jpg"
                    value={newVariantData.image}
                    onChange={(e) => setNewVariantData({ ...newVariantData, image: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                    Tip: Store local frame assets in <code>/images/products/...</code> or provide a direct web image link.
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newVariantData.is_default}
                      onChange={(e) => setNewVariantData({ ...newVariantData, is_default: e.target.checked })}
                    />
                    Set as default color variant
                  </label>

                  <button
                    type="submit"
                    disabled={variantSubmitting}
                    style={{
                      padding: '8px 20px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 600,
                      cursor: variantSubmitting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {variantSubmitting ? 'Adding...' : '➕ Add Variant'}
                  </button>
                </div>
              </form>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setVariantModalProduct(null)}
                style={{
                  padding: '10px 22px',
                  background: '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close & Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category & Brand Management Modal */}
      {isCatBrandModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setIsCatBrandModalOpen(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', color: '#111827' }}>
                  Manage Categories &amp; Brands
                </h2>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.88rem' }}>
                  Add or remove product categories and designer brands in your live catalog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCatBrandModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.6rem', cursor: 'pointer', color: '#6b7280' }}
              >
                &times;
              </button>
            </div>

            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e5e7eb', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setActiveCatBrandTab('categories')}
                style={{
                  padding: '10px 18px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeCatBrandTab === 'categories' ? '3px solid #0284c7' : '3px solid transparent',
                  fontWeight: activeCatBrandTab === 'categories' ? 700 : 500,
                  color: activeCatBrandTab === 'categories' ? '#0284c7' : '#6b7280',
                  cursor: 'pointer',
                  fontSize: '0.95rem'
                }}
              >
                📂 Categories ({categories.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCatBrandTab('brands')}
                style={{
                  padding: '10px 18px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeCatBrandTab === 'brands' ? '3px solid #0284c7' : '3px solid transparent',
                  fontWeight: activeCatBrandTab === 'brands' ? 700 : 500,
                  color: activeCatBrandTab === 'brands' ? '#0284c7' : '#6b7280',
                  cursor: 'pointer',
                  fontSize: '0.95rem'
                }}
              >
                🏷️ Brands ({brands.length})
              </button>
            </div>

            {activeCatBrandTab === 'categories' ? (
              <div>
                {/* Add Category Form */}
                <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="New category name (e.g. Sports Glasses)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    style={{ flex: '1 1 200px', padding: '9px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newCategoryDesc}
                    onChange={(e) => setNewCategoryDesc(e.target.value)}
                    style={{ flex: '1 1 200px', padding: '9px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                  />
                  <button
                    type="submit"
                    disabled={catBrandSubmitting}
                    style={{ padding: '9px 18px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {catBrandSubmitting ? 'Saving...' : 'Add Category'}
                  </button>
                </form>

                {/* Categories List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <div>
                        <strong style={{ color: '#0f172a' }}>{cat.name}</strong>
                        {cat.description && (
                          <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '10px' }}>
                            {cat.description}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '5px 12px',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {/* Add Brand Form */}
                <form onSubmit={handleAddBrand} style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="New brand name (e.g. Prada Eyewear)"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    style={{ flex: '1 1 200px', padding: '9px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newBrandDesc}
                    onChange={(e) => setNewBrandDesc(e.target.value)}
                    style={{ flex: '1 1 200px', padding: '9px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                  />
                  <button
                    type="submit"
                    disabled={catBrandSubmitting}
                    style={{ padding: '9px 18px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {catBrandSubmitting ? 'Saving...' : 'Add Brand'}
                  </button>
                </form>

                {/* Brands List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {brands.map((b) => (
                    <div
                      key={b.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <div>
                        <strong style={{ color: '#0f172a' }}>{b.name}</strong>
                        {b.description && (
                          <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '10px' }}>
                            {b.description}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteBrand(b.id, b.name)}
                        style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '5px 12px',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => setIsCatBrandModalOpen(false)}
                style={{
                  padding: '9px 20px',
                  background: '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
