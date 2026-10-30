export interface User {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: 'user' | 'admin' | string;
  created_at?: string;
}

export interface Customer extends User {
  total_orders?: number;
  order_count?: number;
  total_spent: number | string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Brand {
  id: number;
  name: string;
  description?: string;
  logo?: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  color_name: string;
  color_code: string;
  image: string;
  thumbnail?: string | null;
  stock?: number;
  price_adjustment?: string | number;
  is_default?: boolean | number;
}

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  category_id?: number | null;
  category_name?: string;
  brand_id?: number | null;
  brand_name?: string;
  price: string | number;
  discount?: string | number;
  stock: number;
  gender?: string;
  frame_type?: string;
  frame_material?: string;
  lens_type?: string;
  color?: string;
  image?: string;
  variants?: ProductVariant[];
  selected_color?: string;
  selected_image?: string;
  variant_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem extends Product {
  quantity: number;
  selected_color?: string;
  selected_image?: string;
  variant_id?: number;
}

export interface OrderItem {
  id?: number;
  order_id?: number;
  product_id: number;
  product_name: string;
  price: string | number;
  quantity: number;
  selected_color?: string | null;
  selected_image?: string | null;
  variant_id?: number | null;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Complete' | 'Cancelled';
export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

export interface Order {
  id: number;
  user_id?: number;
  user_email?: string;
  customer_name: string;
  mobile: string;
  address: string;
  payment_method: string;
  total: string | number;
  status: OrderStatus | string;
  payment_status?: PaymentStatus | string;
  payment_order_id?: string | null;
  payment_id?: string | null;
  payment_signature?: string | null;
  created_at: string;
  items?: OrderItem[];
  prescription?: PrescriptionData | null;
}

export interface PrescriptionData {
  id?: number;
  order_id?: number;
  user_id?: number;
  has_prescription: boolean;
  right_sph?: string | null;
  right_cyl?: string | null;
  right_axis?: string | null;
  left_sph?: string | null;
  left_cyl?: string | null;
  left_axis?: string | null;
  pupillary_distance?: string | null;
  prescription_file_url?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface Review {
  id: number;
  product_id: number;
  product_name?: string;
  user_id: number;
  user_name: string;
  user_email?: string;
  order_id?: number | null;
  rating: number;
  review: string;
  created_at: string;
  updated_at?: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingCounts: { [key: number]: number };
}

export interface ReviewEligibility {
  canReview: boolean;
  hasPurchased: boolean;
  alreadyReviewed: boolean;
  existingReview: Review | null;
  orderId: number | null;
}

export interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  lowStockCount: number;
  lowStockProducts: {
    id: number;
    name: string;
    price: string | number;
    stock: number;
  }[];
  totalReviews?: number;
}

export interface PaymentConfigResponse {
  success: boolean;
  configured: boolean;
  keyId: string | null;
  mode: string;
  message?: string;
}

export interface PaymentOrderResponse {
  success: boolean;
  configured?: boolean;
  razorpayOrderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  message?: string;
}

export interface PaymentVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  order_data: {
    customer_name: string;
    mobile: string;
    address: string;
    payment_method?: string;
    items: {
      product_id: number;
      quantity: number;
      selected_color?: string;
      selected_image?: string;
      variant_id?: number;
    }[];
    prescription?: PrescriptionData | null;
  };
}
