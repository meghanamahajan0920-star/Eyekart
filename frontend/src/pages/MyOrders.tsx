import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const MyOrders: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getOrders();
      setOrders(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Unable to load your orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'EyeKart — My Orders';
    fetchOrders();
  }, []);

  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm(`Are you sure you want to cancel order #${orderId}? All items will be restored to store inventory.`)) {
      return;
    }

    setCancellingId(orderId);
    try {
      await api.cancelOrder(orderId);
      showToast(`Order #${orderId} cancelled successfully.`, 'success');
      await fetchOrders();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel order', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const s = (status || '').trim().toLowerCase();
    switch (s) {
      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-processing';
      case 'processing': return 'status-processing';
      case 'shipped':
      case 'dispatched':
      case 'dispatch': return 'status-shipped';
      case 'delivered':
      case 'complete':
      case 'completed': return 'status-delivered';
      case 'cancelled':
      case 'canceled': return 'status-cancelled';
      default: return 'status-pending';
    }
  };

  const getDisplayStatus = (status: string): string => {
    const s = (status || '').trim().toLowerCase();
    if (s === 'pending') return 'Pending';
    if (s === 'confirmed') return 'Confirmed';
    if (s === 'processing') return 'Processing';
    if (s === 'shipped') return 'Shipped';
    if (s === 'dispatched' || s === 'dispatch') return 'Dispatched';
    if (s === 'delivered') return 'Delivered';
    if (s === 'complete') return 'Complete';
    if (s === 'completed') return 'Completed';
    if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
    return status || 'Pending';
  };

  const getPaymentBadge = (order: Order) => {
    if (order.payment_status === 'Paid') {
      return {
        text: 'Paid Online',
        bg: '#dcfce7',
        color: '#15803d'
      };
    }
    if (order.payment_method === 'Cash on Delivery' || order.payment_method === 'COD') {
      return {
        text: 'Cash on Delivery (Pending)',
        bg: '#fef3c7',
        color: '#b45309'
      };
    }
    if (order.payment_status === 'Failed') {
      return {
        text: 'Payment Failed',
        bg: '#fee2e2',
        color: '#b91c1c'
      };
    }
    return {
      text: order.payment_status || 'Pending',
      bg: '#fef3c7',
      color: '#b45309'
    };
  };

  return (
    <div className="section" style={{ maxWidth: '1080px', margin: '0 auto', minHeight: '65vh', padding: '40px 24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '2.1rem', fontWeight: 800, color: '#0f172a' }}>
            My Orders
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.96rem', margin: 0 }}>
            Viewing orders for <strong>{user?.name}</strong> ({user?.email})
          </p>
        </div>
        <button
          className="btn-secondary"
          onClick={fetchOrders}
          style={{ padding: '10px 20px', fontSize: '0.9rem' }}
          aria-label="Refresh orders list"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ color: '#64748b', fontSize: '1.05rem' }}>Loading your order history...</p>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '20px',
            background: '#fee2e2',
            color: '#b91c1c',
            borderRadius: '12px',
            border: '1px solid #fecaca',
            marginBottom: '24px'
          }}
        >
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && orders.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '72px 24px',
            background: 'white',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              fontSize: '2rem'
            }}
          >
            🛍️
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            No Orders Placed Yet
          </h3>
          <p style={{ color: '#64748b', maxWidth: '420px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
            You haven't placed any eyewear orders yet. Discover stylish frames and sunglasses tailored to your style.
          </p>
          <Link to="/">
            <button className="btn-primary" style={{ padding: '12px 28px' }}>
              Explore Eyewear Catalog →
            </button>
          </Link>
        </div>
      )}

      {/* Orders List */}
      {!loading && !error && orders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {orders.map((order) => {
            const paymentBadge = getPaymentBadge(order);
            const s = (order.status || '').trim().toLowerCase();
            const isCancelled = s === 'cancelled' || s === 'canceled';
            const isCancellable = !isCancelled && s !== 'shipped' && s !== 'dispatched' && s !== 'dispatch' && s !== 'delivered' && s !== 'complete' && s !== 'completed';

            return (
              <div
                key={order.id}
                style={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px 28px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '20px',
                  transition: 'border-color 0.2s ease'
                }}
              >
                {/* Order Details Column */}
                <div style={{ flex: '1 1 360px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                      Order #{order.id}
                    </h3>
                    <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                      {getDisplayStatus(order.status)}
                    </span>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '6px',
                        background: paymentBadge.bg,
                        color: paymentBadge.color
                      }}
                    >
                      {paymentBadge.text}
                    </span>
                  </div>

                  <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '0.92rem', lineHeight: 1.5 }}>
                    Placed on{' '}
                    <strong>
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </strong>{' '}
                    • Total: <strong style={{ color: '#0f172a' }}>₹{Number(order.total).toLocaleString('en-IN')}</strong>{' '}
                    • Mode: {order.payment_method === 'COD' || order.payment_method === 'Cash on Delivery' ? 'Cash on Delivery (COD)' : order.payment_method}
                  </p>
                </div>

                {/* Actions Group */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {isCancellable && (
                    <button
                      disabled={cancellingId === order.id}
                      onClick={() => handleCancelOrder(order.id)}
                      style={{
                        padding: '10px 18px',
                        background: '#fee2e2',
                        color: '#b91c1c',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        cursor: cancellingId === order.id ? 'not-allowed' : 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  )}

                  <Link to={`/orders/${order.id}`}>
                    <button className="btn-primary" style={{ padding: '10px 22px', fontSize: '0.9rem' }}>
                      View Details &amp; Track →
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
