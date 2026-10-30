import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { AdminStats, Customer } from '../types';
import { useToast } from '../context/ToastContext';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStockId, setUpdatingStockId] = useState<number | null>(null);
  const [stockInputVal, setStockInputVal] = useState<{ [id: number]: number }>({});
  const { showToast } = useToast();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [data, custList] = await Promise.all([
        api.getAdminStats(),
        api.getAdminCustomers().catch(() => [])
      ]);
      setStats(data);
      setCustomers(custList);
      // initialize stock inputs
      const initialStock: { [id: number]: number } = {};
      data.lowStockProducts.forEach((p) => {
        initialStock[p.id] = p.stock;
      });
      setStockInputVal(initialStock);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load administrator statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'EyeKart Admin — Dashboard';
    fetchStats();
  }, []);

  const handleQuickRestock = async (productId: number) => {
    const newStock = stockInputVal[productId];
    if (newStock === undefined || newStock < 0) {
      showToast('Please enter a valid stock amount', 'error');
      return;
    }

    setUpdatingStockId(productId);
    try {
      await api.updateAdminProductStock(productId, newStock);
      showToast(`Stock updated to ${newStock} successfully!`, 'success');
      fetchStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to update stock', 'error');
    } finally {
      setUpdatingStockId(null);
    }
  };

  if (loading) {
    return (
      <div className="section" style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ fontSize: '1.2rem', color: '#4b5563' }}>Loading administrator dashboard...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="section" style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center' }}>
        <div style={{ padding: '24px', background: '#fee2e2', borderRadius: '12px', border: '1px solid #fecaca' }}>
          <h3 style={{ color: '#b91c1c' }}>Dashboard Error</h3>
          <p style={{ color: '#7f1d1d', margin: '12px 0 20px' }}>{error || 'Unable to retrieve statistics.'}</p>
          <button
            onClick={fetchStats}
            style={{
              padding: '10px 20px',
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="section" style={{ maxWidth: '1150px', margin: '0 auto', padding: '30px 20px' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '20px'
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '1.85rem', color: '#111827' }}>Admin Control Center</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>
            Real-time store metrics, inventory alerts, and management console.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/admin/products">
            <button
              style={{
                padding: '10px 18px',
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
            >
              📦 Manage Products
            </button>
          </Link>
          <Link to="/admin/orders">
            <button
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
              📑 Manage Orders
            </button>
          </Link>
          <Link to="/admin/reviews">
            <button
              style={{
                padding: '10px 18px',
                background: '#eab308',
                color: '#1e293b',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
            >
              💬 Reviews
            </button>
          </Link>
          <button
            onClick={fetchStats}
            className="secondary-btn"
            style={{ padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}
            title="Refresh Metrics"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Primary KPI Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}
      >
        {/* Revenue */}
        <div
          style={{
            background: 'white',
            padding: '24px',
            borderRadius: '14px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 600 }}>Total Revenue</span>
            <span style={{ fontSize: '1.5rem' }}>💰</span>
          </div>
          <h2 style={{ margin: '14px 0 6px', fontSize: '1.9rem', color: '#111827' }}>
            ₹{stats.totalRevenue.toLocaleString('en-IN')}
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Verified Paid & Delivered Orders</span>
        </div>

        {/* Total Orders */}
        <div
          style={{
            background: 'white',
            padding: '24px',
            borderRadius: '14px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 600 }}>Total Orders</span>
            <span style={{ fontSize: '1.5rem' }}>🛍️</span>
          </div>
          <h2 style={{ margin: '14px 0 6px', fontSize: '1.9rem', color: '#111827' }}>
            {stats.totalOrders}
          </h2>
          <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>{stats.pendingOrders} Pending</span> •{' '}
            <span style={{ color: '#10b981', fontWeight: 600 }}>{stats.paidOrders} Paid</span> •{' '}
            <span style={{ color: '#ef4444', fontWeight: 600 }}>{stats.cancelledOrders} Cancelled</span>
          </div>
        </div>

        {/* Total Products */}
        <div
          style={{
            background: 'white',
            padding: '24px',
            borderRadius: '14px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 600 }}>Catalog Products</span>
            <span style={{ fontSize: '1.5rem' }}>👓</span>
          </div>
          <h2 style={{ margin: '14px 0 6px', fontSize: '1.9rem', color: '#111827' }}>
            {stats.totalProducts}
          </h2>
          <span style={{ fontSize: '0.8rem', color: stats.lowStockCount > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
            {stats.lowStockCount > 0 ? `⚠️ ${stats.lowStockCount} Items Low in Stock` : 'All items in stock'}
          </span>
        </div>

        {/* Customer Reviews */}
        <div
          style={{
            background: 'white',
            padding: '24px',
            borderRadius: '14px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 600 }}>Customer Reviews</span>
            <span style={{ fontSize: '1.5rem' }}>💬</span>
          </div>
          <h2 style={{ margin: '14px 0 6px', fontSize: '1.9rem', color: '#111827' }}>
            {stats.totalReviews ?? 0}
          </h2>
          <Link to="/admin/reviews" style={{ fontSize: '0.8rem', color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
            Moderate reviews &rarr;
          </Link>
        </div>

        {/* Registered Users */}
        <div
          style={{
            background: 'white',
            padding: '24px',
            borderRadius: '14px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 600 }}>Registered Users</span>
            <span style={{ fontSize: '1.5rem' }}>👥</span>
          </div>
          <h2 style={{ margin: '14px 0 6px', fontSize: '1.9rem', color: '#111827' }}>
            {stats.totalUsers}
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Active customer accounts</span>
        </div>
      </div>

      {/* Order Status Breakdown Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '36px'
        }}
      >
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '16px' }}>
          <span style={{ color: '#b45309', fontWeight: 600, fontSize: '0.85rem' }}>Pending Orders</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#92400e', marginTop: '4px' }}>
            {stats.pendingOrders}
          </div>
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px' }}>
          <span style={{ color: '#15803d', fontWeight: 600, fontSize: '0.85rem' }}>Paid Orders</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#166534', marginTop: '4px' }}>
            {stats.paidOrders}
          </div>
        </div>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px' }}>
          <span style={{ color: '#b91c1c', fontWeight: 600, fontSize: '0.85rem' }}>Cancelled Orders</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#991b1b', marginTop: '4px' }}>
            {stats.cancelledOrders}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts Section */}
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          padding: '28px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', color: '#111827', fontSize: '1.25rem' }}>
              Inventory Alert: Low Stock Products (≤ 10 Units)
            </h3>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem' }}>
              Products needing restocking to avoid checkout out-of-stock errors.
            </p>
          </div>
          <Link to="/admin/products" style={{ textDecoration: 'none', color: '#4f46e5', fontWeight: 600, fontSize: '0.9rem' }}>
            View Full Inventory →
          </Link>
        </div>

        {stats.lowStockProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', background: '#f9fafb', borderRadius: '8px' }}>
            <span style={{ fontSize: '2rem' }}>🎉</span>
            <p style={{ margin: '8px 0 0', color: '#374151', fontWeight: 600 }}>All product stock levels are healthy!</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontSize: '0.85rem' }}>
                  <th style={{ padding: '12px' }}>Product</th>
                  <th style={{ padding: '12px' }}>Price</th>
                  <th style={{ padding: '12px' }}>Current Stock</th>
                  <th style={{ padding: '12px' }}>Quick Restock</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.lowStockProducts.map((prod) => (
                  <tr key={prod.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 12px', fontWeight: 600, color: '#111827' }}>
                      #{prod.id} - {prod.name}
                    </td>
                    <td style={{ padding: '14px 12px', color: '#4b5563' }}>
                      ₹{Number(prod.price).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          background: prod.stock === 0 ? '#fee2e2' : '#fef3c7',
                          color: prod.stock === 0 ? '#b91c1c' : '#b45309'
                        }}
                      >
                        {prod.stock === 0 ? 'Out of Stock (0)' : `${prod.stock} units left`}
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <input
                        type="number"
                        min="0"
                        value={stockInputVal[prod.id] !== undefined ? stockInputVal[prod.id] : prod.stock}
                        onChange={(e) =>
                          setStockInputVal({
                            ...stockInputVal,
                            [prod.id]: parseInt(e.target.value, 10) || 0
                          })
                        }
                        style={{
                          width: '90px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.9rem'
                        }}
                      />
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleQuickRestock(prod.id)}
                        disabled={updatingStockId === prod.id}
                        style={{
                          padding: '6px 14px',
                          background: '#4f46e5',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: updatingStockId === prod.id ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {updatingStockId === prod.id ? 'Saving...' : 'Update Stock'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Registered Customers Overview Section */}
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          padding: '28px',
          marginTop: '28px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', color: '#111827', fontSize: '1.25rem' }}>
              Customer Accounts Overview
            </h3>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem' }}>
              Registered customer accounts, orders placed, and cumulative spend.
            </p>
          </div>
          <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 600 }}>
            {customers.length} Registered Accounts
          </span>
        </div>

        {customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', background: '#f9fafb', borderRadius: '8px' }}>
            <p style={{ margin: 0, color: '#6b7280' }}>No customer accounts registered yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontSize: '0.85rem' }}>
                  <th style={{ padding: '12px' }}>Customer ID</th>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th style={{ padding: '12px' }}>Email</th>
                  <th style={{ padding: '12px' }}>Role</th>
                  <th style={{ padding: '12px' }}>Orders</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 12px', color: '#6b7280', fontWeight: 600 }}>
                      #{c.id}
                    </td>
                    <td style={{ padding: '14px 12px', fontWeight: 600, color: '#111827' }}>
                      {c.name}
                    </td>
                    <td style={{ padding: '14px 12px', color: '#4b5563' }}>
                      {c.email}
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: c.role === 'admin' ? '#0f172a' : '#e0f2fe',
                          color: c.role === 'admin' ? '#ffffff' : '#0369a1'
                        }}
                      >
                        {c.role}
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px', color: '#374151', fontWeight: 600 }}>
                      {c.order_count || 0}
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                      ₹{Number(c.total_spent || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
