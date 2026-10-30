import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Order, OrderItem } from '../types';
import { useToast } from '../context/ToastContext';

export const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [downloadingRx, setDownloadingRx] = useState(false);
  const { showToast } = useToast();

  const handleDownloadRx = async () => {
    if (!order?.prescription?.prescription_file_url) return;
    setDownloadingRx(true);
    try {
      await api.downloadPrescriptionFile(order.prescription.prescription_file_url);
      showToast('Prescription document opened.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to view prescription document';
      showToast(msg, 'error');
    } finally {
      setDownloadingRx(false);
    }
  };

  const fetchOrder = async () => {
    if (!id) return;
    try {
      const data = await api.getOrder(id);
      setOrder(data.order);
      setItems(data.items);
      setError('');
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('authorized')) {
        setError('You are not authorized to view this order.');
      } else {
        setError(err.message || 'Unable to load order details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = id ? `EyeKart — Order #${id}` : 'EyeKart — Order Details';
    fetchOrder();
  }, [id]);

  const handleCancel = async () => {
    if (!order || order.status === 'Cancelled') return;
    if (!window.confirm('Are you sure you want to cancel this order? All items will be restored to store inventory.')) {
      return;
    }

    setCancelling(true);
    try {
      await api.cancelOrder(order.id);
      showToast('Order cancelled successfully. Inventory restored.', 'success');
      await fetchOrder();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel order', 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="section" style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center', padding: '80px 20px' }}>
        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Loading order specifications and tracking...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="section" style={{ maxWidth: '720px', margin: '40px auto', textAlign: 'center' }}>
        <div
          style={{
            padding: '36px',
            background: '#fee2e2',
            color: '#b91c1c',
            borderRadius: '16px',
            marginBottom: '24px',
            border: '1px solid #fecaca'
          }}
        >
          <span style={{ fontSize: '2.5rem' }}>🔒</span>
          <h3 style={{ marginTop: '12px' }}>Access Restricted</h3>
          <p style={{ margin: '8px 0 20px 0' }}>{error || 'Order could not be found.'}</p>
          <Link to="/my-orders">
            <button className="btn-primary" style={{ padding: '10px 24px' }}>
              ← Return to My Orders
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const s = (order.status || '').trim().toLowerCase();
  const isCancelled = s === 'cancelled' || s === 'canceled';
  const isCancellable = !isCancelled && s !== 'shipped' && s !== 'dispatched' && s !== 'dispatch' && s !== 'delivered' && s !== 'complete' && s !== 'completed';

  const getStatusBadgeClass = (status: string) => {
    const st = (status || '').trim().toLowerCase();
    switch (st) {
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
    const st = (status || '').trim().toLowerCase();
    if (st === 'pending') return 'Pending';
    if (st === 'confirmed') return 'Confirmed';
    if (st === 'processing') return 'Processing';
    if (st === 'shipped') return 'Shipped';
    if (st === 'dispatched' || st === 'dispatch') return 'Dispatched';
    if (st === 'delivered') return 'Delivered';
    if (st === 'complete') return 'Complete';
    if (st === 'completed') return 'Completed';
    if (st === 'cancelled' || st === 'canceled') return 'Cancelled';
    return status || 'Pending';
  };

  // Order progression tracker
  const finalStepLabel = (s === 'complete' || s === 'completed') ? 'Complete' : 'Delivered';
  const TIMELINE_STEPS = ['Pending', 'Confirmed', 'Processing', 'Shipped', finalStepLabel];
  const getStepIndex = (status: string): number => {
    const st = (status || '').trim().toLowerCase();
    if (st === 'pending') return 0;
    if (st === 'confirmed') return 1;
    if (st === 'processing') return 2;
    if (st === 'shipped' || st === 'dispatched' || st === 'dispatch') return 3;
    if (st === 'delivered' || st === 'complete' || st === 'completed') return 4;
    return 0;
  };
  const currentStepIndex = getStepIndex(order.status);

  const getPaymentDetails = () => {
    if (order.payment_status === 'Paid') {
      return {
        label: 'Paid Online',
        bg: '#dcfce7',
        color: '#15803d',
        desc: order.payment_id ? `Razorpay Payment ID: ${order.payment_id}` : 'Payment successfully settled.'
      };
    }
    if (order.payment_method === 'Cash on Delivery' || order.payment_method === 'COD') {
      return {
        label: 'Cash on Delivery (Pending)',
        bg: '#fef3c7',
        color: '#b45309',
        desc: 'Payment due upon safe doorstep delivery.'
      };
    }
    return {
      label: order.payment_status || 'Pending',
      bg: '#fef3c7',
      color: '#b45309',
      desc: 'Payment processing or awaiting settlement.'
    };
  };

  const paymentInfo = getPaymentDetails();

  return (
    <div className="section" style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px' }}>
      <Link
        to="/my-orders"
        style={{
          textDecoration: 'none',
          color: '#0f172a',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '24px'
        }}
      >
        ← Back to My Orders
      </Link>

      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          background: 'white',
          padding: '36px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
        }}
      >
        {/* Header with Title and Cancel button */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '20px',
            paddingBottom: '24px',
            borderBottom: '1px solid #f1f5f9'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
                Order #{order.id}
              </h1>
              <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                {getDisplayStatus(order.status)}
              </span>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: paymentInfo.bg,
                  color: paymentInfo.color
                }}
              >
                Payment: {paymentInfo.label}
              </span>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
              Ordered on{' '}
              {new Date(order.created_at).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          {isCancellable && (
            <button
              disabled={cancelling}
              onClick={handleCancel}
              style={{
                background: '#fee2e2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: cancelling ? 'not-allowed' : 'pointer'
              }}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>

        {/* Stepper Timeline Tracking */}
        <div
          style={{
            margin: '36px 0',
            padding: '32px 20px',
            background: '#f8fafc',
            borderRadius: '16px',
            border: '1px solid #e2e8f0'
          }}
        >
          <h3
            style={{
              margin: '0 0 28px 0',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: '#0f172a',
              textAlign: 'center'
            }}
          >
            Order Tracking &amp; Delivery Progress
          </h3>

          {isCancelled ? (
            <div
              style={{
                textAlign: 'center',
                padding: '20px',
                background: '#fee2e2',
                borderRadius: '10px',
                color: '#991b1b',
                maxWidth: '560px',
                margin: '0 auto'
              }}
            >
              <strong style={{ fontSize: '1.15rem', display: 'block', marginBottom: '4px' }}>
                ❌ Order Has Been Cancelled
              </strong>
              <p style={{ margin: 0, fontSize: '0.92rem' }}>
                All ordered spectacles and accessories have been returned to store stock.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
                maxWidth: '680px',
                margin: '0 auto'
              }}
            >
              {/* Progress Line */}
              <div
                style={{
                  position: 'absolute',
                  top: '18px',
                  left: '34px',
                  right: '34px',
                  height: '4px',
                  background: '#e2e8f0',
                  zIndex: 1
                }}
              >
                <div
                  style={{
                    height: '100%',
                    background: '#0f172a',
                    width: `${Math.max(0, (currentStepIndex / (TIMELINE_STEPS.length - 1)) * 100)}%`,
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>

              {TIMELINE_STEPS.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div
                    key={step}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                      zIndex: 2,
                      width: '80px',
                      textAlign: 'center'
                    }}
                  >
                    <div
                      className="order-timeline-step-circle"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: isPassed ? '#0f172a' : 'white',
                        border: isPassed ? '2px solid #0f172a' : '2px solid #cbd5e1',
                        color: isPassed ? 'white' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        boxShadow: isCurrent ? '0 0 0 4px rgba(15, 23, 42, 0.15)' : 'none',
                        transition: 'all 0.3s'
                      }}
                    >
                      {isPassed ? '✓' : idx + 1}
                    </div>
                    <span
                      className="order-timeline-step-label"
                      style={{
                        marginTop: '10px',
                        fontSize: '0.8rem',
                        fontWeight: isCurrent ? 800 : isPassed ? 600 : 500,
                        color: isCurrent ? '#0f172a' : isPassed ? '#334155' : '#94a3b8'
                      }}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Customer & Delivery Information Card */}
        <div
          style={{
            padding: '24px',
            background: '#f8fafc',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            marginBottom: '32px'
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            Recipient &amp; Delivery Details
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
                Customer Name
              </span>
              <strong style={{ color: '#0f172a', fontSize: '0.98rem' }}>{order.customer_name}</strong>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
                Mobile Number
              </span>
              <strong style={{ color: '#0f172a', fontSize: '0.98rem' }}>{order.mobile}</strong>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
                Payment Method
              </span>
              <strong style={{ color: '#0f172a', fontSize: '0.98rem' }}>
                {order.payment_method === 'COD' || order.payment_method === 'Cash on Delivery' ? 'Cash on Delivery (COD)' : order.payment_method}
              </strong>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
                Payment Status
              </span>
              <strong style={{ color: paymentInfo.color, fontSize: '0.98rem' }}>{order.payment_status}</strong>
            </div>
          </div>

          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Shipping Address
            </span>
            <p style={{ margin: 0, color: '#334155', fontSize: '0.95rem', lineHeight: 1.5 }}>{order.address}</p>
            {paymentInfo.desc && (
              <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '0.82rem', fontStyle: 'italic' }}>
                {paymentInfo.desc}
              </p>
            )}
          </div>
        </div>

        {/* Prescription Details Card (Phase 6) */}
        {order.prescription && order.prescription.has_prescription && (
          <div
            style={{
              padding: '24px',
              background: '#f0fdf4',
              borderRadius: '14px',
              border: '1px solid #bbf7d0',
              marginBottom: '32px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#166534' }}>
                👓 Attached Optical Prescription
              </h3>
              <span style={{ fontSize: '0.8rem', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                Verified Custom Power
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#166534', fontWeight: 700 }}>Right Eye (OD)</span>
                <div style={{ fontSize: '0.9rem', color: '#1e293b', marginTop: '4px' }}>
                  SPH: <strong>{order.prescription.right_sph || 'Plano'}</strong> | CYL: <strong>{order.prescription.right_cyl || '—'}</strong> | AXIS: <strong>{order.prescription.right_axis || '—'}</strong>
                </div>
              </div>

              <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#166534', fontWeight: 700 }}>Left Eye (OS)</span>
                <div style={{ fontSize: '0.9rem', color: '#1e293b', marginTop: '4px' }}>
                  SPH: <strong>{order.prescription.left_sph || 'Plano'}</strong> | CYL: <strong>{order.prescription.left_cyl || '—'}</strong> | AXIS: <strong>{order.prescription.left_axis || '—'}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              {order.prescription.pupillary_distance && (
                <div style={{ fontSize: '0.88rem', color: '#166534' }}>
                  Pupillary Distance (PD): <strong>{order.prescription.pupillary_distance} mm</strong>
                </div>
              )}

              {order.prescription.prescription_file_url && (
                <div style={{ fontSize: '0.88rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span>📎 Attached Document: <strong style={{ wordBreak: 'break-all' }}>{order.prescription.prescription_file_url.split('/').pop()}</strong></span>
                  <button
                    type="button"
                    onClick={handleDownloadRx}
                    disabled={downloadingRx}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: '#15803d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: downloadingRx ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {downloadingRx ? 'Opening...' : 'View Document ↗'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Purchased Eyewear List */}
        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
            Purchased Eyewear ({items.length} {items.length === 1 ? 'item' : 'items'})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {items.map((item) => (
              <div
                key={item.id || item.product_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 0',
                  borderBottom: '1px solid #f1f5f9'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {item.selected_image && (
                    <img
                      src={item.selected_image}
                      alt={item.product_name}
                      style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0', background: '#f8fafc' }}
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  )}
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1.02rem', fontWeight: 700, color: '#0f172a' }}>
                      {item.product_name}
                    </h4>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {item.selected_color && (
                        <span style={{ fontSize: '0.78rem', background: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                          Color: <strong style={{ color: '#0284c7' }}>{item.selected_color}</strong>
                        </span>
                      )}
                      <span style={{ color: '#64748b', fontSize: '0.88rem' }}>
                        Qty: <strong>{item.quantity}</strong> • ₹{Number(item.price).toLocaleString('en-IN')} each
                      </span>
                    </div>
                  </div>
                </div>

                <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                  ₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}
                </strong>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '2px solid #e2e8f0'
            }}
          >
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Total Amount Paid</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
              ₹{Number(order.total).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
