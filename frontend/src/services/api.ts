import type {
  Order,
  OrderItem,
  Product,
  User,
  AuthResponse,
  Category,
  Brand,
  AdminStats,
  PaymentOrderResponse,
  PaymentConfigResponse,
  PaymentVerifyPayload,
  Review,
  ReviewStats,
  ReviewEligibility,
  PrescriptionData,
  ProductVariant,
  Customer
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('eyekart_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Products (Public)
  async getProducts(params?: {
    category?: string;
    search?: string;
    brand?: string;
    gender?: string;
    min_price?: number | string;
    max_price?: number | string;
    frame_type?: string;
    in_stock?: boolean | string;
  }): Promise<Product[]> {
    let url = `${API_BASE_URL}/api/products`;
    if (params) {
      const q = new URLSearchParams();
      if (params.category && params.category !== 'all') q.set('category', params.category);
      if (params.search && params.search.trim()) q.set('search', params.search.trim());
      if (params.brand && params.brand !== 'all') q.set('brand', params.brand);
      if (params.gender && params.gender !== 'all') q.set('gender', params.gender);
      if (params.frame_type && params.frame_type !== 'all') q.set('frame_type', params.frame_type);
      if (params.min_price !== undefined) q.set('min_price', String(params.min_price));
      if (params.max_price !== undefined) q.set('max_price', String(params.max_price));
      if (params.in_stock) q.set('in_stock', 'true');
      const qs = q.toString();
      if (qs) url += `?${qs}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('Unable to load products.');
    const data = await res.json();
    return (data.products || []).filter((p: Product) => !p.name.includes('Test Frame'));
  },

  async getProduct(id: string | number): Promise<Product> {
    const res = await fetch(`${API_BASE_URL}/api/products/${id}`);
    if (!res.ok) throw new Error('Unable to load product details.');
    const data = await res.json();
    return data.product;
  },

  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${API_BASE_URL}/api/categories`);
    if (!res.ok) throw new Error('Failed to load categories');
    const data = await res.json();
    return data.categories;
  },

  async getBrands(): Promise<Brand[]> {
    const res = await fetch(`${API_BASE_URL}/api/brands`);
    if (!res.ok) throw new Error('Failed to load brands');
    const data = await res.json();
    return data.brands;
  },

  // Auth
  async register(userData: { name: string; email: string; mobile: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    return data;
  },

  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    return data;
  },

  async getCurrentUser(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch user profile');
    return data.user;
  },

  // Orders (Customer)
  async createOrder(orderData: {
    customer_name: string;
    mobile: string;
    address: string;
    payment_method: string;
    items: {
      product_id: number;
      quantity: number;
      selected_color?: string;
      selected_image?: string;
      variant_id?: number;
    }[];
    prescription?: PrescriptionData | null;
  }): Promise<{ order_id: number; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(orderData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to place order');
    return data;
  },

  async getOrders(): Promise<Order[]> {
    const res = await fetch(`${API_BASE_URL}/api/orders`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch orders');
    return data.orders;
  },

  async getOrder(id: string | number): Promise<{ order: Order; items: OrderItem[] }> {
    const res = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch order details');
    return data;
  },

  async cancelOrder(id: string | number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/orders/${id}/cancel`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Order could not be cancelled.');
    return data;
  },

  // Razorpay Payments
  async getPaymentConfig(): Promise<PaymentConfigResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/config`);
      if (!res.ok) {
        return {
          success: false,
          configured: false,
          keyId: null,
          mode: 'unconfigured',
          message: 'Unable to check Razorpay payment configuration from backend.'
        };
      }
      return await res.json();
    } catch {
      return {
        success: false,
        configured: false,
        keyId: null,
        mode: 'unconfigured',
        message: 'Could not connect to EyeKart backend server.'
      };
    }
  },

  async createPaymentOrder(items: { product_id: number; quantity: number }[]): Promise<PaymentOrderResponse> {
    const res = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ items })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Online payment is currently unavailable. Please choose Cash on Delivery.');
    }
    return data;
  },

  async verifyPayment(payload: PaymentVerifyPayload): Promise<{ order_id: number; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/payments/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 409 && data.order_id) {
        return { order_id: data.order_id, message: data.message };
      }
      throw new Error(data.message || 'Payment failed. Please try again.');
    }
    return data;
  },

  // Wishlist APIs (Phase 6)
  async getWishlist(): Promise<Product[]> {
    const res = await fetch(`${API_BASE_URL}/api/wishlist`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch wishlist.');
    return data.wishlist || [];
  },

  async addToWishlist(productId: number): Promise<{ message: string; wishlist: Product[] }> {
    const res = await fetch(`${API_BASE_URL}/api/wishlist/${productId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to add item to wishlist.');
    return data;
  },

  async removeFromWishlist(productId: number): Promise<{ message: string; wishlist: Product[] }> {
    const res = await fetch(`${API_BASE_URL}/api/wishlist/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to remove item from wishlist.');
    return data;
  },

  async checkWishlist(productId: number): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/api/wishlist/check/${productId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.inWishlist;
  },

  // Reviews APIs (Phase 6)
  async getProductReviews(productId: number | string): Promise<{ reviews: Review[]; stats: ReviewStats }> {
    const res = await fetch(`${API_BASE_URL}/api/products/${productId}/reviews`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load reviews.');
    return {
      reviews: data.reviews || [],
      stats: data.stats || { averageRating: 0, totalReviews: 0, ratingCounts: {} }
    };
  },

  async getReviewEligibility(productId: number | string): Promise<ReviewEligibility> {
    const res = await fetch(`${API_BASE_URL}/api/products/${productId}/review-eligibility`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        canReview: false,
        hasPurchased: false,
        alreadyReviewed: false,
        existingReview: null,
        orderId: null
      };
    }
    return data;
  },

  async submitReview(productId: number | string, reviewData: { rating: number; review?: string }): Promise<{ message: string; review: Review }> {
    const res = await fetch(`${API_BASE_URL}/api/products/${productId}/reviews`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(reviewData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to submit review.');
    return data;
  },

  async updateReview(reviewId: number | string, reviewData: { rating: number; review?: string }): Promise<{ message: string; review: Review }> {
    const res = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(reviewData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update review.');
    return data;
  },

  async deleteReview(reviewId: number | string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete review.');
    return data;
  },

  async getAdminReviews(): Promise<Review[]> {
    const res = await fetch(`${API_BASE_URL}/api/admin/reviews`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load reviews.');
    return data.reviews || [];
  },

  // Prescription Upload (Phase 6)
  async uploadPrescription(fileData: { filename: string; mimeType: string; data: string }): Promise<{ success: boolean; filePath: string; originalName: string; mimeType: string; message: string }> {
    const payload = {
      filename: fileData.filename,
      file_name: fileData.filename,
      data: fileData.data,
      file_data: fileData.data,
      mimeType: fileData.mimeType
    };
    const res = await fetch(`${API_BASE_URL}/api/prescriptions/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Prescription upload failed.');
    return {
      ...data,
      filePath: data.filePath || data.file_url || '',
      originalName: data.originalName || fileData.filename,
      mimeType: data.mimeType || fileData.mimeType
    };
  },

  async downloadPrescriptionFile(fileUrl: string): Promise<void> {
    const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${API_BASE_URL}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
    const token = localStorage.getItem('eyekart_token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(fullUrl, { headers });
    if (!res.ok) throw new Error('Failed to load prescription document.');
    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const filename = fileUrl.split('/').pop() || 'prescription_document';

    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
  },

  // Admin APIs (Protected by requireAdmin)
  async getAdminStats(): Promise<AdminStats> {
    const res = await fetch(`${API_BASE_URL}/api/admin/stats`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'You are not authorized to access admin statistics.');
    return data.stats;
  },

  async getAdminProducts(): Promise<Product[]> {
    const res = await fetch(`${API_BASE_URL}/api/admin/products`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch admin products.');
    return data.products;
  },

  async createAdminProduct(productData: Partial<Product>): Promise<{ success: boolean; message: string; product_id: number }> {
    const res = await fetch(`${API_BASE_URL}/api/admin/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create product.');
    return data;
  },

  async updateAdminProduct(id: number | string, productData: Partial<Product>): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/admin/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update product.');
    return data;
  },

  async updateAdminProductStock(id: number | string, stock: number): Promise<{ success: boolean; message: string; stock: number }> {
    const res = await fetch(`${API_BASE_URL}/api/admin/products/${id}/stock`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ stock })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update stock.');
    return data;
  },

  async deleteAdminProduct(id: number | string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete product.');
    return data;
  },

  // Admin Product Variants (Phase 8)
  async getAdminProductVariants(productId: number | string): Promise<ProductVariant[]> {
    const res = await fetch(`${API_BASE_URL}/api/admin/products/${productId}/variants`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch variants.');
    return data.variants || [];
  },

  async createAdminProductVariant(productId: number | string, variantData: Partial<ProductVariant>): Promise<{ success: boolean; message: string; variant_id: number }> {
    const res = await fetch(`${API_BASE_URL}/api/admin/products/${productId}/variants`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(variantData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create variant.');
    return data;
  },

  async updateAdminProductVariant(variantId: number | string, variantData: Partial<ProductVariant>): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/admin/variants/${variantId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(variantData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update variant.');
    return data;
  },

  async deleteAdminProductVariant(variantId: number | string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/admin/variants/${variantId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete variant.');
    return data;
  },

  async getAdminOrders(status?: string): Promise<Order[]> {
    let url = `${API_BASE_URL}/api/admin/orders`;
    if (status && status !== 'All') {
      url += `?status=${encodeURIComponent(status)}`;
    }
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch admin orders.');
    return data.orders;
  },

  async getAdminOrder(id: number | string): Promise<{ order: Order; items: OrderItem[]; prescription?: PrescriptionData | null }> {
    const res = await fetch(`${API_BASE_URL}/api/admin/orders/${id}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch order details.');
    return data;
  },

  async updateOrderStatus(id: number | string, status: string): Promise<{ success: boolean; message: string; order: Partial<Order> }> {
    const res = await fetch(`${API_BASE_URL}/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update order status.');
    return data;
  },

  // Admin Categories Management
  async createAdminCategory(categoryData: { name: string; description?: string }): Promise<{ success: boolean; message: string; category: Category }> {
    const res = await fetch(`${API_BASE_URL}/api/admin/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create category.');
    return data;
  },

  async updateAdminCategory(id: number | string, categoryData: { name: string; description?: string }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/admin/categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update category.');
    return data;
  },

  async deleteAdminCategory(id: number | string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete category.');
    return data;
  },

  // Admin Brands Management
  async createAdminBrand(brandData: { name: string; description?: string }): Promise<{ success: boolean; message: string; brand: Brand }> {
    const res = await fetch(`${API_BASE_URL}/api/admin/brands`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(brandData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create brand.');
    return data;
  },

  async updateAdminBrand(id: number | string, brandData: { name: string; description?: string }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/admin/brands/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(brandData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update brand.');
    return data;
  },

  async deleteAdminBrand(id: number | string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/admin/brands/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete brand.');
    return data;
  },

  // Admin Customers Overview
  async getAdminCustomers(): Promise<Customer[]> {
    const res = await fetch(`${API_BASE_URL}/api/admin/customers`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch customer list.');
    return data.customers || [];
  }
};

export default api;

