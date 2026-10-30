import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Order, OrderStatus, OrderItem, PrescriptionData } from '../types';
import { useToast } from '../context/ToastContext';

export const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  // Selected Order for viewing items
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionData | null>(null);
  const [downloadingRx, setDownloadingRx] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const { showToast } = useToast();

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminOrders();
      setOrders(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customer orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'EyeKart Admin — Orders';
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    if (newStatus === 'Cancelled') {
      if (!window.confirm(`Warning: Changing Order #${orderId} to Cancelled will restore product inventory. Proceed?`)) {
        return;
      }
    }

    setUpdatingOrderId(orderId);
    try {
      const res = await api.updateOrderStatus(orderId, newStatus);
      showToast(res.message || `Order #${orderId} status updated to ${newStatus}`, 'success');

      const updatedStatus = (res.order?.status || newStatus) as OrderStatus;
      const updatedPaymentStatus = res.order?.payment_status;

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: updatedStatus,
                ...(updatedPaymentStatus ? { payment_status: updatedPaymentStatus } : {})
              }
            : o
        )
      );

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                status: updatedStatus,
                ...(updatedPaymentStatus ? { payment_status: updatedPaymentStatus } : {})
              }
            : null
        );
      }

      // Re-sync with backend database
      try {
        const refreshedData = await api.getAdminOrders();
        setOrders(refreshedData);
      } catch {
        // Local state was already updated
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update order status', 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    setSelectedPrescription(null);
    setModalLoading(true);
    try {
      const detail = await api.getAdminOrder(order.id);
      setSelectedItems(detail.items || []);
      setSelectedPrescription(detail.prescription || null);
    } catch (err: any) {
      showToast(err.message || 'Failed to load order details', 'error');
      setSelectedItems([]);
      setSelectedPrescription(null);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDownloadRx = async (fileUrl: string) => {
    setDownloadingRx(true);
    try {
      await api.downloadPrescriptionFile(fileUrl);
      showToast('Prescription document opened.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to view prescription document';
      showToast(msg, 'error');
    } finally {
      setDownloadingRx(false);
    }
  };

  const isOrderStatusMatching = (orderStatus: string, filter: string): boolean => {
    if (!filter || filter.trim().toLowerCase() === 'all') return true;
    const s = (orderStatus || '').trim().toLowerCase();
    const f = filter.trim().toLowerCase();

    if (f === 'pending') {
      return s === 'pending';
    }
    if (f === 'confirmed') {
      return s === 'confirmed';
    }
    if (f === 'processing') {
      return s === 'processing';
    }
    if (f === 'shipped') {
      return s === 'shipped' || s === 'dispatched' || s === 'dispatch';
    }
    if (f === 'delivered') {
      return s === 'delivered';
    }
    if (f === 'complete') {
      return s === 'complete' || s === 'completed';
    }
    if (f === 'cancelled') {
      return s === 'cancelled' || s === 'canceled';
    }

    return s === f;
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toString().includes(search) ||
      order.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      order.mobile.includes(search) ||
      (order.user_email && order.user_email.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = isOrderStatusMatching(order.status, statusFilter);
    return matchesSearch && matchesStatus;
  });

  const getCanonicalStatus = (status: string): OrderStatus => {
    const s = (status || '').trim().toLowerCase();
    if (s === 'pending') return 'Pending';
    if (s === 'confirmed') return 'Confirmed';
    if (s === 'processing') return 'Processing';
    if (s === 'shipped' || s === 'dispatched' || s === 'dispatch') return 'Shipped';
    if (s === 'delivered') return 'Delivered';
    if (s === 'complete' || s === 'completed') return 'Complete';
    if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
    return 'Pending';
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

  const ALL_STATUSES: OrderStatus[] = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Complete', 'Cancelled'];
  const FILTER_STATUSES = ['All', 'Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Complete', 'Cancelled'];

  const getStatusBadgeClass = (status: string) => {
    switch ((status || '').trim().toLowerCase()) {
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

  // Helper to determine payment status and badge formatting
  const getPaymentBadgeInfo = (order: Order) => {
    const rawMethod = (order.payment_method || '').trim();
    const isCod = rawMethod.toLowerCase() === 'cod' || rawMethod.toLowerCase() === 'cash on delivery';
    const isOnline = !isCod || Boolean(order.payment_id || order.payment_order_id);
    const rawPaymentStatus = (order.payment_status || '').trim();
    const statusLower = rawPaymentStatus.toLowerCase();

    // Check if backend has verified payment successfully (Razorpay online payment)
    const hasVerificationData = Boolean(
      (order.payment_id && order.payment_id.trim().length > 0) ||
      (order.payment_signature && order.payment_signature.trim().length > 0)
    );
    const isVerifiedRazorpaySuccess =
      isOnline &&
      (statusLower === 'paid' || statusLower === 'success') &&
      hasVerificationData;

    if (isOnline) {
      if (isVerifiedRazorpaySuccess) {
        return {
          label: 'Success',
          style: {
            background: '#dcfce7',
            color: '#15803d',
            border: '1px solid #86efac'
          }
        };
      }
      if (statusLower === 'failed') {
        return {
          label: 'Failed',
          style: {
            background: '#fee2e2',
            color: '#b91c1c',
            border: '1px solid #fca5a5'
          }
        };
      }
      return {
        label: rawPaymentStatus || 'Pending',
        style: {
          background: '#fef3c7',
          color: '#b45309',
          border: '1px solid #fde68a'
        }
      };
    }

    // COD and all other payment methods: keep working exactly as they currently do
    const isPaid = statusLower === 'paid';
    return {
      label: rawPaymentStatus || 'Pending',
      style: {
        background: isPaid ? '#dcfce7' : '#fef3c7',
        color: isPaid ? '#15803d' : '#b45309',
        border: isPaid ? '1px solid #86efac' : '1px solid #fde68a'
      }
    };
  };

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
          <h1 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', color: '#111827' }}>Customer Order Management</h1>
        </div>

        <button
          onClick={loadOrders}
          className="secondary-btn"
          style={{ padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          🔄 Refresh Orders
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          marginBottom: '24px',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <input
          type="text"
          placeholder="Search by Order ID, Customer, Mobile, or Email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            minWidth: '280px',
            flex: '1 1 300px',
            fontSize: '0.95rem'
          }}
        />

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563' }}>Filter:</span>
          {FILTER_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 600,
                background: statusFilter === status ? '#4f46e5' : '#f9fafb',
                color: statusFilter === status ? 'white' : '#4b5563'
              }}
            >
              {status}
            </button>
          ))}
        </div>

        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.85rem', color: '#6b7280' }}>
          <span>Active Filter: <strong>{statusFilter}</strong></span>
          <span>Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> orders</span>
        </div>
      </div>

      {loading && <p>Loading orders...</p>}
      {error && (
        <div style={{ padding: '16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Orders Table */}
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
                <th style={{ padding: '12px 14px' }}>Order ID</th>
                <th style={{ padding: '12px 14px' }}>Customer Info</th>
                <th style={{ padding: '12px 14px' }}>Total Amount</th>
                <th style={{ padding: '12px 14px' }}>Payment Status</th>
                <th style={{ padding: '12px 14px' }}>Order Status</th>
                <th style={{ padding: '12px 14px' }}>Update Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#6b7280' }}>
                    No orders matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px', fontWeight: 700, color: '#111827' }}>
                      #{order.id}
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 'normal' }}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    <td style={{ padding: '14px' }}>
                      <strong style={{ color: '#111827' }}>{order.customer_name}</strong>
                      <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>📱 {order.mobile}</div>
                      {order.user_email && (
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>✉️ {order.user_email}</div>
                      )}
                    </td>

                    <td style={{ padding: '14px', fontWeight: 700, color: '#111827' }}>
                      ₹{Number(order.total).toLocaleString('en-IN')}
                    </td>

                    <td style={{ padding: '14px' }}>
                      {(() => {
                        const badgeInfo = getPaymentBadgeInfo(order);
                        return (
                          <span
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              padding: '4px 8px',
                              borderRadius: '4px',
                              display: 'inline-block',
                              ...badgeInfo.style
                            }}
                          >
                            {badgeInfo.label}
                          </span>
                        );
                      })()}
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                        {order.payment_method === 'COD' || order.payment_method === 'Cash on Delivery' ? 'Cash on Delivery (COD)' : order.payment_method}
                      </div>
                    </td>

                    <td style={{ padding: '14px' }}>
                      <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                        {getDisplayStatus(order.status)}
                      </span>
                    </td>

                    <td style={{ padding: '14px' }}>
                      <select
                        value={getCanonicalStatus(order.status)}
                        disabled={updatingOrderId === order.id}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          background: updatingOrderId === order.id ? '#f3f4f6' : 'white',
                          cursor: updatingOrderId === order.id ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {ALL_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleViewOrder(order)}
                        style={{
                          padding: '6px 14px',
                          background: '#4f46e5',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Details →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
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
              <div>
                <h2 style={{ margin: 0, color: '#111827' }}>Order #{selectedOrder.id} Details</h2>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  Placed on {new Date(selectedOrder.created_at).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                <div>
                  <strong>Customer:</strong> {selectedOrder.customer_name}
                </div>
                <div>
                  <strong>Mobile:</strong> {selectedOrder.mobile}
                </div>
                <div>
                  <strong>Email:</strong> {selectedOrder.user_email || 'N/A'}
                </div>
                <div>
                  <strong>Payment Method:</strong> {selectedOrder.payment_method === 'COD' || selectedOrder.payment_method === 'Cash on Delivery' ? 'Cash on Delivery (COD)' : selectedOrder.payment_method}
                </div>
                <div>
                  <strong>Payment Status:</strong>{' '}
                  {(() => {
                    const badgeInfo = getPaymentBadgeInfo(selectedOrder);
                    return (
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          display: 'inline-block',
                          marginLeft: '4px',
                          ...badgeInfo.style
                        }}
                      >
                        {badgeInfo.label}
                      </span>
                    );
                  })()}
                  {selectedOrder.payment_id && (
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                      Txn: {selectedOrder.payment_id}
                    </span>
                  )}
                </div>
                <div>
                  <strong>Order Status:</strong>{' '}
                  <span className={`badge ${getStatusBadgeClass(selectedOrder.status)}`}>
                    {getDisplayStatus(selectedOrder.status)}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '0.9rem' }}>
                <strong>Delivery Address:</strong> {selectedOrder.address}
              </div>
            </div>

            {selectedPrescription && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '1.2rem' }}>👓</span>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#166534' }}>
                    Optical Prescription Attached
                  </h4>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    marginBottom: '12px',
                    fontSize: '0.86rem',
                    color: '#15803d'
                  }}
                >
                  <div style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                    <strong>Right Eye (OD):</strong>
                    <div>SPH: {selectedPrescription.right_sph || 'Plano'} | CYL: {selectedPrescription.right_cyl || '—'} | AXIS: {selectedPrescription.right_axis || '—'}</div>
                  </div>
                  <div style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                    <strong>Left Eye (OS):</strong>
                    <div>SPH: {selectedPrescription.left_sph || 'Plano'} | CYL: {selectedPrescription.left_cyl || '—'} | AXIS: {selectedPrescription.left_axis || '—'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.86rem', color: '#166534' }}>
                  {selectedPrescription.pupillary_distance && (
                    <div>Pupillary Distance (PD): <strong>{selectedPrescription.pupillary_distance} mm</strong></div>
                  )}
                  {selectedPrescription.notes && (
                    <div>Notes: <em>{selectedPrescription.notes}</em></div>
                  )}
                  {selectedPrescription.prescription_file_url && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>📎 File: <strong style={{ wordBreak: 'break-all' }}>{selectedPrescription.prescription_file_url.split('/').pop()}</strong></span>
                      <button
                        type="button"
                        onClick={() => handleDownloadRx(selectedPrescription.prescription_file_url!)}
                        disabled={downloadingRx}
                        style={{
                          padding: '3px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          background: '#15803d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: downloadingRx ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {downloadingRx ? 'Opening...' : 'Inspect Doc ↗'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <h3 style={{ margin: '0 0 12px 0', color: '#111827' }}>Ordered Items</h3>
            {modalLoading ? (
              <p>Loading items...</p>
            ) : (
              <div>
                {selectedItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid #f3f4f6'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {item.selected_image && (
                        <img
                          src={item.selected_image}
                          alt={item.product_name}
                          style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e5e7eb', background: '#f9fafb' }}
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      )}
                      <div>
                        <strong style={{ color: '#111827' }}>{item.product_name}</strong>
                        <span style={{ color: '#6b7280', marginLeft: '8px' }}>x {item.quantity}</span>
                        {item.selected_color && (
                          <div style={{ marginTop: '3px' }}>
                            <span style={{ fontSize: '0.78rem', background: '#f3f4f6', color: '#374151', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              Variant Color: <strong style={{ color: '#4f46e5' }}>{item.selected_color}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <strong style={{ color: '#111827' }}>
                      ₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}
                    </strong>
                  </div>
                ))}

                <div style={{ textAlign: 'right', marginTop: '18px', paddingTop: '12px', borderTop: '2px solid #e5e7eb' }}>
                  <h3 style={{ margin: 0, color: '#111827' }}>
                    Total: ₹{Number(selectedOrder.total).toLocaleString('en-IN')}
                  </h3>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  padding: '10px 20px',
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600
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

export default AdminOrders;
